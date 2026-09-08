"use server";

import { createClient } from "@/lib/supabase/server";
import bcrypt from "bcrypt";
import {
  setGalleryAccessCookie,
  verifyGalleryAccess,
} from "@/lib/gallery-access";
import type { Database } from "@/types/database";

type GalleryRow = Database["public"]["Tables"]["galleries"]["Row"];

export interface GalleryPhoto {
  id: string;
  filename: string;
  url: string;
}

export interface VerifyPinResult {
  success: boolean;
  error?: string;
}

export interface GalleryState {
  status: "not_found" | "unavailable" | "pin_required" | "authorized";
  gallery?: {
    id: string;
    name: string;
    slug: string;
    photo_count: number;
  };
}

const PIN_REGEX = /^\d{6}$/;
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// Simple in-memory rate limiter (resets on server restart)
const attemptStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(slug: string): boolean {
  const now = Date.now();
  const record = attemptStore.get(slug);

  if (!record || now > record.resetAt) {
    attemptStore.set(slug, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS });
    return true;
  }

  if (record.count >= MAX_ATTEMPTS) {
    return false;
  }

  record.count++;
  return true;
}

export async function getGalleryState(slug: string): Promise<GalleryState> {
  const supabase = await createClient();

  const { data: galleryData } = await supabase
    .from("galleries")
    .select("id, name, slug, status, pin_hash")
    .eq("slug", slug)
    .single();

  if (!galleryData) {
    return { status: "not_found" };
  }

  const gallery = galleryData as unknown as GalleryRow;

  if (gallery.status !== "PUBLISHED") {
    return { status: "unavailable" };
  }

  if (!gallery.pin_hash) {
    return { status: "unavailable" };
  }

  const isAuthorized = await verifyGalleryAccess(gallery.id, slug);

  if (isAuthorized) {
    const { count } = await supabase
      .from("gallery_photos")
      .select("id", { count: "exact", head: true })
      .eq("gallery_id", gallery.id);

    return {
      status: "authorized",
      gallery: {
        id: gallery.id,
        name: gallery.name,
        slug: gallery.slug,
        photo_count: count ?? 0,
      },
    };
  }

  return {
    status: "pin_required",
    gallery: {
      id: gallery.id,
      name: gallery.name,
      slug: gallery.slug,
      photo_count: 0,
    },
  };
}

export async function verifyGalleryPin(
  slug: string,
  pin: string
): Promise<VerifyPinResult> {
  if (!PIN_REGEX.test(pin)) {
    return { success: false, error: "Please enter a valid 6-digit PIN." };
  }

  if (!checkRateLimit(slug)) {
    return {
      success: false,
      error: "Too many attempts. Please try again later.",
    };
  }

  const supabase = await createClient();

  const { data: galleryData } = await supabase
    .from("galleries")
    .select("id, slug, status, pin_hash")
    .eq("slug", slug)
    .single();

  if (!galleryData) {
    return { success: false, error: "Gallery not found." };
  }

  const gallery = galleryData as unknown as GalleryRow;

  if (gallery.status !== "PUBLISHED") {
    return { success: false, error: "Gallery is not available." };
  }

  if (!gallery.pin_hash) {
    return { success: false, error: "Gallery PIN is not configured." };
  }

  const isValid = await bcrypt.compare(pin, gallery.pin_hash);

  if (!isValid) {
    return {
      success: false,
      error: "Incorrect PIN. Please check the PIN provided by your photographer.",
    };
  }

  await setGalleryAccessCookie(gallery.id, slug);

  return { success: true };
}

export async function getGalleryPhotos(
  slug: string
): Promise<GalleryPhoto[]> {
  const supabase = await createClient();

  const { data: galleryData } = await supabase
    .from("galleries")
    .select("id, status")
    .eq("slug", slug)
    .single();

  if (!galleryData) return [];

  const gallery = galleryData as unknown as GalleryRow;

  if (gallery.status !== "PUBLISHED") return [];

  const isAuthorized = await verifyGalleryAccess(gallery.id, slug);

  if (!isAuthorized) return [];

  const { data: galleryPhotosData } = await supabase
    .from("gallery_photos")
    .select("photo_id")
    .eq("gallery_id", gallery.id);

  if (!galleryPhotosData) return [];

  const photoIds = (galleryPhotosData as unknown as Array<{ photo_id: string }>).map(
    (gp) => gp.photo_id
  );

  if (photoIds.length === 0) return [];

  const { data: photosData } = await supabase
    .from("photos")
    .select("id, filename, storage_path")
    .in("id", photoIds);

  if (!photosData) return [];

  const photos = photosData as unknown as Array<{
    id: string;
    filename: string;
    storage_path: string;
  }>;

  const photosWithUrls: GalleryPhoto[] = await Promise.all(
    photos.map(async (photo) => {
      const { data } = await supabase.storage
        .from("event-photos")
        .createSignedUrl(photo.storage_path, 900); // 15 minutes

      return {
        id: photo.id,
        filename: photo.filename,
        url: data?.signedUrl || "",
      };
    })
  );

  return photosWithUrls;
}
