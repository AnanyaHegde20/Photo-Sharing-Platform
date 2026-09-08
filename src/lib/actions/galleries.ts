"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import bcrypt from "bcrypt";
import type { Database } from "@/types/database";

type GalleryRow = Database["public"]["Tables"]["galleries"]["Row"];
type GalleryInsert = Database["public"]["Tables"]["galleries"]["Insert"];
type GalleryPhotoInsert = Database["public"]["Tables"]["gallery_photos"]["Insert"];

const SALT_ROUNDS = 12;
const PIN_LENGTH = 6;
const SLUG_LENGTH = 24;
const SLUG_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

export interface ActionResult {
  success: boolean;
  error?: string;
}

export interface SafeGallery {
  id: string;
  event_id: string;
  name: string;
  slug: string;
  status: GalleryRow["status"];
  published_at: string | null;
  created_at: string;
  updated_at: string;
  has_pin: boolean;
  photo_count: number;
}

function generateSlug(): string {
  const bytes = new Uint8Array(SLUG_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => SLUG_CHARS[b % SLUG_CHARS.length]).join("");
}

function randomPin(): string {
  const digits = new Uint8Array(PIN_LENGTH);
  crypto.getRandomValues(digits);
  return Array.from(digits, (d) => (d % 10).toString()).join("");
}

function validatePin(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

async function verifyEventOwnership(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  eventId: string,
  adminId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("created_by", adminId)
    .single();

  return !!data;
}

function toSafeGallery(gallery: GalleryRow, photoCount: number): SafeGallery {
  return {
    id: gallery.id,
    event_id: gallery.event_id,
    name: gallery.name,
    slug: gallery.slug,
    status: gallery.status,
    published_at: gallery.published_at,
    created_at: gallery.created_at,
    updated_at: gallery.updated_at,
    has_pin: !!gallery.pin_hash,
    photo_count: photoCount,
  };
}

export async function getGalleryForEvent(
  eventId: string
): Promise<SafeGallery | null> {
  const supabase = await createClient();

  const { data: galleryData } = await supabase
    .from("galleries")
    .select("*")
    .eq("event_id", eventId)
    .single();

  if (!galleryData) return null;

  const gallery = galleryData as unknown as GalleryRow;

  const { count } = await supabase
    .from("gallery_photos")
    .select("id", { count: "exact", head: true })
    .eq("gallery_id", gallery.id);

  return toSafeGallery(gallery, count ?? 0);
}

export async function createGallery(
  eventId: string
): Promise<ActionResult & { galleryId?: string; slug?: string }> {
  const admin = await requireAdmin();
  const supabase = await createClient();

  // Verify event ownership
  if (!(await verifyEventOwnership(supabase, eventId, admin.id))) {
    return { success: false, error: "Event not found or access denied" };
  }

  // Check if gallery already exists
  const { data: existing } = await supabase
    .from("galleries")
    .select("id")
    .eq("event_id", eventId)
    .single();

  if (existing) {
    return { success: false, error: "A gallery already exists for this event" };
  }

  // Fetch selected photos
  const { data: selectedPhotos } = await supabase
    .from("photos")
    .select("id")
    .eq("event_id", eventId)
    .eq("is_selected", true);

  const typedPhotos = (selectedPhotos ?? []) as unknown as Array<{ id: string }>;

  if (typedPhotos.length === 0) {
    return {
      success: false,
      error: "No photos selected. Select at least one photo before creating a gallery.",
    };
  }

  // Generate unique slug
  let slug = generateSlug();
  let attempts = 0;
  while (attempts < 5) {
    const { data: slugExists } = await supabase
      .from("galleries")
      .select("id")
      .eq("slug", slug)
      .single();

    if (!slugExists) break;
    slug = generateSlug();
    attempts++;
  }

  // Get event name for gallery name
  const { data: eventData } = await supabase
    .from("events")
    .select("name")
    .eq("id", eventId)
    .single();

  const event = eventData as unknown as { name: string } | null;

  // Create gallery
  const galleryInsert: GalleryInsert = {
    event_id: eventId,
    name: event?.name || "Gallery",
    slug,
    status: "DRAFT",
    created_by: admin.id,
  };

  const { data: galleryData, error: galleryError } = await supabase
    .from("galleries")
    // @ts-expect-error -- Supabase SSR type inference issue
    .insert(galleryInsert)
    .select("id")
    .single();

  if (galleryError || !galleryData) {
    return { success: false, error: "Failed to create gallery" };
  }

  const gallery = galleryData as unknown as { id: string };

  // Create gallery_photo associations
  const associations: GalleryPhotoInsert[] = typedPhotos.map((photo) => ({
    gallery_id: gallery.id,
    photo_id: photo.id,
  }));

  const { error: assocError } = await supabase
    .from("gallery_photos")
    // @ts-expect-error -- Supabase SSR type inference issue
    .insert(associations);

  if (assocError) {
    // Cleanup: delete the gallery if association fails
    await supabase.from("galleries").delete().eq("id", gallery.id);
    return { success: false, error: "Failed to associate photos with gallery" };
  }

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/admin/events/${eventId}/gallery`);

  return { success: true, galleryId: gallery.id, slug };
}

export async function updateGalleryPin(
  galleryId: string,
  pin: string
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supabase = await createClient();

  // Validate PIN format
  if (!validatePin(pin)) {
    return { success: false, error: "PIN must be exactly 6 digits" };
  }

  // Get gallery and verify ownership through event
  const { data: galleryData } = await supabase
    .from("galleries")
    .select("id, event_id")
    .eq("id", galleryId)
    .single();

  if (!galleryData) {
    return { success: false, error: "Gallery not found" };
  }

  const gallery = galleryData as unknown as { id: string; event_id: string };

  // Verify event ownership
  if (!(await verifyEventOwnership(supabase, gallery.event_id, admin.id))) {
    return { success: false, error: "Access denied" };
  }

  // Hash the PIN
  const pinHash = await bcrypt.hash(pin, SALT_ROUNDS);

  // Update gallery
  const { error } = await supabase
    .from("galleries")
    // @ts-expect-error -- Supabase SSR type inference issue
    .update({ pin_hash: pinHash })
    .eq("id", galleryId);

  if (error) {
    return { success: false, error: "Failed to update PIN" };
  }

  revalidatePath(`/admin/events/${gallery.event_id}/gallery`);
  return { success: true };
}

export async function publishGallery(
  galleryId: string
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supabase = await createClient();

  // Get gallery
  const { data: galleryData } = await supabase
    .from("galleries")
    .select("id, event_id, pin_hash")
    .eq("id", galleryId)
    .single();

  if (!galleryData) {
    return { success: false, error: "Gallery not found" };
  }

  const gallery = galleryData as unknown as {
    id: string;
    event_id: string;
    pin_hash: string | null;
  };

  // Verify event ownership
  if (!(await verifyEventOwnership(supabase, gallery.event_id, admin.id))) {
    return { success: false, error: "Access denied" };
  }

  // Verify PIN is configured
  if (!gallery.pin_hash) {
    return {
      success: false,
      error: "Gallery cannot be published yet. Configure a 6-digit PIN first.",
    };
  }

  // Verify photos exist
  const { count } = await supabase
    .from("gallery_photos")
    .select("id", { count: "exact", head: true })
    .eq("gallery_id", galleryId);

  if (!count || count === 0) {
    return {
      success: false,
      error: "Gallery cannot be published yet. Add at least one selected photo.",
    };
  }

  // Publish
  const { error } = await supabase
    .from("galleries")
    // @ts-expect-error -- Supabase SSR type inference issue
    .update({
      status: "PUBLISHED",
      published_at: new Date().toISOString(),
    })
    .eq("id", galleryId);

  if (error) {
    return { success: false, error: "Failed to publish gallery" };
  }

  revalidatePath(`/admin/events/${gallery.event_id}/gallery`);
  revalidatePath(`/admin/events/${gallery.event_id}`);
  revalidatePath(`/gallery/${gallery.id}`);

  return { success: true };
}

export async function unpublishGallery(
  galleryId: string
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supabase = await createClient();

  // Get gallery
  const { data: galleryData } = await supabase
    .from("galleries")
    .select("id, event_id")
    .eq("id", galleryId)
    .single();

  if (!galleryData) {
    return { success: false, error: "Gallery not found" };
  }

  const gallery = galleryData as unknown as { id: string; event_id: string };

  // Verify event ownership
  if (!(await verifyEventOwnership(supabase, gallery.event_id, admin.id))) {
    return { success: false, error: "Access denied" };
  }

  // Unpublish
  const { error } = await supabase
    .from("galleries")
    // @ts-expect-error -- Supabase SSR type inference issue
    .update({
      status: "DRAFT",
      published_at: null,
    })
    .eq("id", galleryId);

  if (error) {
    return { success: false, error: "Failed to unpublish gallery" };
  }

  revalidatePath(`/admin/events/${gallery.event_id}/gallery`);
  revalidatePath(`/admin/events/${gallery.event_id}`);
  revalidatePath(`/gallery/${gallery.id}`);

  return { success: true };
}

export async function syncGalleryPhotos(
  galleryId: string
): Promise<ActionResult & { added?: number; removed?: number }> {
  const admin = await requireAdmin();
  const supabase = await createClient();

  // Get gallery
  const { data: galleryData } = await supabase
    .from("galleries")
    .select("id, event_id")
    .eq("id", galleryId)
    .single();

  if (!galleryData) {
    return { success: false, error: "Gallery not found" };
  }

  const gallery = galleryData as unknown as { id: string; event_id: string };

  // Verify event ownership
  if (!(await verifyEventOwnership(supabase, gallery.event_id, admin.id))) {
    return { success: false, error: "Access denied" };
  }

  // Get current selected photos for the event
  const { data: selectedData } = await supabase
    .from("photos")
    .select("id")
    .eq("event_id", gallery.event_id)
    .eq("is_selected", true);

  const selectedIds = new Set(
    ((selectedData ?? []) as unknown as Array<{ id: string }>).map((p) => p.id)
  );

  // Get current gallery photo associations
  const { data: galleryPhotoData } = await supabase
    .from("gallery_photos")
    .select("id, photo_id")
    .eq("gallery_id", galleryId);

  const existingAssociations = (galleryPhotoData ?? []) as unknown as Array<{
    id: string;
    photo_id: string;
  }>;
  const existingIds = new Set(existingAssociations.map((gp) => gp.photo_id));

  // Photos to add (selected but not in gallery)
  const toAdd = [...selectedIds].filter((id) => !existingIds.has(id));
  // Photos to remove (in gallery but no longer selected)
  const toRemove = existingAssociations
    .filter((gp) => !selectedIds.has(gp.photo_id))
    .map((gp) => gp.id);

  // Remove stale associations
  if (toRemove.length > 0) {
    await supabase
      .from("gallery_photos")
      .delete()
      .in("id", toRemove);
  }

  // Add new associations
  if (toAdd.length > 0) {
    const newAssociations: GalleryPhotoInsert[] = toAdd.map((photoId) => ({
      gallery_id: galleryId,
      photo_id: photoId,
    }));

    await supabase
      .from("gallery_photos")
      // @ts-expect-error -- Supabase SSR type inference issue
      .insert(newAssociations);
  }

  revalidatePath(`/admin/events/${gallery.event_id}/gallery`);

  return {
    success: true,
    added: toAdd.length,
    removed: toRemove.length,
  };
}

export async function generatePin(): Promise<string> {
  // Avoid weak PINs
  const forbidden = ["000000", "111111", "123456"];
  let pin: string;
  do {
    pin = randomPin();
  } while (forbidden.includes(pin));
  return pin;
}

export async function getGalleryBySlug(
  slug: string
): Promise<SafeGallery | null> {
  const supabase = await createClient();

  const { data: galleryData } = await supabase
    .from("galleries")
    .select("id, event_id, name, slug, status, published_at, created_at, updated_at, pin_hash")
    .eq("slug", slug)
    .single();

  if (!galleryData) return null;

  const gallery = galleryData as unknown as GalleryRow;

  // Only return published galleries
  if (gallery.status !== "PUBLISHED") return null;

  const { count } = await supabase
    .from("gallery_photos")
    .select("id", { count: "exact", head: true })
    .eq("gallery_id", gallery.id);

  return toSafeGallery(gallery, count ?? 0);
}
