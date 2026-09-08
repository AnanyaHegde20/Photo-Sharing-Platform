"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireTeamMember, requireAdmin } from "@/lib/auth";
import type { Database } from "@/types/database";

type PhotoRow = Database["public"]["Tables"]["photos"]["Row"];
type PhotoInsert = Database["public"]["Tables"]["photos"]["Insert"];

export interface ActionResult {
  success: boolean;
  error?: string;
}

export interface PhotoWithUrl extends PhotoRow {
  url: string;
  uploader_name?: string;
}

export interface UploadResult {
  photoId: string;
  storagePath: string;
  filename: string;
  fileSize: number;
  mimeType: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];
const MAX_FILES_PER_UPLOAD = 20;

export async function uploadPhotos(
  eventId: string,
  files: Array<{
    name: string;
    size: number;
    type: string;
    buffer: ArrayBuffer;
  }>
): Promise<{ success: boolean; uploaded: number; errors: string[] }> {
  const profile = await requireTeamMember();
  const supabase = await createClient();

  // Verify team member is assigned to this event
  const { data: membershipData } = await supabase
    .from("event_members")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", profile.id)
    .single();

  const membership = membershipData as unknown as { id: string } | null;

  if (!membership) {
    return { success: false, uploaded: 0, errors: ["Not assigned to this event"] };
  }

  const errors: string[] = [];
  let uploaded = 0;

  if (files.length > MAX_FILES_PER_UPLOAD) {
    return {
      success: false,
      uploaded: 0,
      errors: [`Maximum ${MAX_FILES_PER_UPLOAD} files allowed per upload`],
    };
  }

  for (const file of files) {
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`${file.name}: exceeds 10MB limit`);
      continue;
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      errors.push(`${file.name}: unsupported file type (${file.type})`);
      continue;
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const storagePath = `${eventId}/${Date.now()}_${uploaded}.${ext}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("event-photos")
      .upload(storagePath, file.buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      errors.push(`${file.name}: ${uploadError.message}`);
      continue;
    }

    // Insert photo record
    const { error: insertError } = await supabase
      .from("photos")
      // @ts-expect-error -- Supabase SSR type inference issue
      .insert({ event_id: eventId, uploaded_by: profile.id, filename: file.name, storage_path: storagePath, file_size: file.size, mime_type: file.type } as PhotoInsert);

    if (insertError) {
      // Rollback storage upload
      await supabase.storage.from("event-photos").remove([storagePath]);
      errors.push(`${file.name}: failed to save record`);
      continue;
    }

    uploaded++;
  }

  if (uploaded > 0) {
    revalidatePath(`/team/events/${eventId}`);
    revalidatePath(`/admin/events/${eventId}`);
  }

  return { success: uploaded > 0, uploaded, errors };
}

export async function getEventPhotos(
  eventId: string
): Promise<PhotoWithUrl[]> {
  const supabase = await createClient();

  const { data: photos, error } = await supabase
    .from("photos")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error || !photos) return [];

  const typedPhotos = photos as unknown as PhotoRow[];

  // Batch-fetch uploader profiles
  const uniqueUserIds = [...new Set(typedPhotos.map((p) => p.uploaded_by))];
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", uniqueUserIds);

  const profiles = (profilesData ?? []) as unknown as Array<{ id: string; full_name: string }>;
  const profileMap = new Map(profiles.map((p) => [p.id, p.full_name]));

  // Generate signed URLs
  const photosWithUrls: PhotoWithUrl[] = await Promise.all(
    typedPhotos.map(async (photo) => {
      const { data } = await supabase.storage
        .from("event-photos")
        .createSignedUrl(photo.storage_path, 3600);

      return {
        ...photo,
        url: data?.signedUrl || "",
        uploader_name: profileMap.get(photo.uploaded_by) || "Unknown",
      };
    })
  );

  return photosWithUrls;
}

export async function getMyUploadedPhotos(
  eventId: string
): Promise<PhotoWithUrl[]> {
  const profile = await requireTeamMember();
  const supabase = await createClient();

  const { data: photos, error } = await supabase
    .from("photos")
    .select("*")
    .eq("event_id", eventId)
    .eq("uploaded_by", profile.id)
    .order("created_at", { ascending: false });

  if (error || !photos) return [];

  const typedPhotos = photos as unknown as PhotoRow[];

  const photosWithUrls: PhotoWithUrl[] = await Promise.all(
    typedPhotos.map(async (photo) => {
      const { data } = await supabase.storage
        .from("event-photos")
        .createSignedUrl(photo.storage_path, 3600);

      return {
        ...photo,
        url: data?.signedUrl || "",
        uploader_name: profile.full_name,
      };
    })
  );

  return photosWithUrls;
}

export async function deletePhoto(
  photoId: string,
  eventId: string
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supabase = await createClient();

  // Verify event belongs to this admin
  const { data: eventData } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("created_by", admin.id)
    .single();

  if (!eventData) {
    return { success: false, error: "Event not found or access denied" };
  }

  // Get photo record and verify it belongs to this event
  const { data: photoData, error: fetchError } = await supabase
    .from("photos")
    .select("storage_path, event_id")
    .eq("id", photoId)
    .single();

  if (fetchError || !photoData) {
    return { success: false, error: "Photo not found" };
  }

  const photo = photoData as unknown as { storage_path: string; event_id: string };

  if (photo.event_id !== eventId) {
    return { success: false, error: "Photo does not belong to this event" };
  }

  // Remove from storage
  const { error: storageError } = await supabase.storage
    .from("event-photos")
    .remove([photo.storage_path]);

  if (storageError) {
    return { success: false, error: storageError.message };
  }

  // Delete record
  const { error: deleteError } = await supabase
    .from("photos")
    .delete()
    .eq("id", photoId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  revalidatePath(`/admin/events/${eventId}`);
  return { success: true };
}

export async function togglePhotoSelection(
  photoId: string,
  eventId: string
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supabase = await createClient();

  // Verify event belongs to this admin
  const { data: eventData } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("created_by", admin.id)
    .single();

  if (!eventData) {
    return { success: false, error: "Event not found or access denied" };
  }

  // Get current state and verify photo belongs to this event
  const { data: photoData, error: fetchError } = await supabase
    .from("photos")
    .select("is_selected, event_id")
    .eq("id", photoId)
    .single();

  if (fetchError || !photoData) {
    return { success: false, error: "Photo not found" };
  }

  const photo = photoData as unknown as { is_selected: boolean; event_id: string };

  if (photo.event_id !== eventId) {
    return { success: false, error: "Photo does not belong to this event" };
  }

  // Toggle
  const { error: updateError } = await supabase
    .from("photos")
    // @ts-expect-error -- Supabase SSR type inference issue
    .update({ is_selected: !photo.is_selected })
    .eq("id", photoId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath(`/admin/events/${eventId}`);
  return { success: true };
}

export async function setPhotosSelected(
  photoIds: string[],
  eventId: string,
  selected: boolean
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supabase = await createClient();

  if (photoIds.length === 0) {
    return { success: true };
  }

  // Verify event belongs to this admin
  const { data: eventData } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("created_by", admin.id)
    .single();

  if (!eventData) {
    return { success: false, error: "Event not found or access denied" };
  }

  // Verify all photo IDs belong to this event
  const { data: existingPhotos } = await supabase
    .from("photos")
    .select("id, event_id")
    .in("id", photoIds);

  const typedExisting = (existingPhotos ?? []) as unknown as Array<{ id: string; event_id: string }>;

  const unauthorized = typedExisting.filter((p) => p.event_id !== eventId);
  if (unauthorized.length > 0) {
    return {
      success: false,
      error: `${unauthorized.length} photo(s) do not belong to this event`,
    };
  }

  if (typedExisting.length !== photoIds.length) {
    return {
      success: false,
      error: "Some photos were not found",
    };
  }

  // Update all matching photos
  const { error: updateError } = await supabase
    .from("photos")
    // @ts-expect-error -- Supabase SSR type inference issue
    .update({ is_selected: selected })
    .in("id", photoIds)
    .eq("event_id", eventId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath(`/admin/events/${eventId}`);
  return { success: true };
}

export async function getPhotoStats(
  eventId: string
): Promise<{ total: number; selected: number; byUser: number }> {
  const supabase = await createClient();

  const [{ count: total }, { count: selected }] = await Promise.all([
    supabase
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId),
    supabase
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("is_selected", true),
  ]);

  return {
    total: total ?? 0,
    selected: selected ?? 0,
    byUser: 0,
  };
}
