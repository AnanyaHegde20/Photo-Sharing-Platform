"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { Database } from "@/types/database";

type EventRow = Database["public"]["Tables"]["events"]["Row"];
type EventInsert = Database["public"]["Tables"]["events"]["Insert"];
type EventUpdate = Database["public"]["Tables"]["events"]["Update"];
type EventMemberInsert = Database["public"]["Tables"]["event_members"]["Insert"];

export interface ActionResult {
  success: boolean;
  error?: string;
}

export async function getAdminEvents(): Promise<
  Array<{
    id: string;
    name: string;
    description: string;
    event_date: string | null;
    created_at: string;
    member_count: number;
  }>
> {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const { data: events, error } = await supabase
    .from("events")
    .select("id, name, description, event_date, created_at")
    .eq("created_by", profile.id)
    .order("created_at", { ascending: false });

  if (error || !events) return [];

  const typedEvents = events as unknown as Array<{
    id: string;
    name: string;
    description: string;
    event_date: string | null;
    created_at: string;
  }>;

  const eventsWithCounts = await Promise.all(
    typedEvents.map(async (event) => {
      const { count } = await supabase
        .from("event_members")
        .select("*", { count: "exact", head: true })
        .eq("event_id", event.id);

      return {
        ...event,
        member_count: count ?? 0,
      };
    })
  );

  return eventsWithCounts;
}

export async function getEventById(eventId: string): Promise<(EventRow & { member_count: number }) | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) return null;

  const typedProfile = profile as unknown as { role: string };

  let query = supabase.from("events").select("*").eq("id", eventId);

  if (typedProfile.role === "ADMIN") {
    query = query.eq("created_by", user.id);
  } else {
    const { data: membership } = await supabase
      .from("event_members")
      .select("event_id")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) return null;
  }

  const { data: event, error } = await query.single();
  if (error || !event) return null;

  const typedEvent = event as unknown as EventRow;

  const { count: memberCount } = await supabase
    .from("event_members")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  return { ...typedEvent, member_count: memberCount ?? 0 };
}

export async function getEventMembers(eventId: string) {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("created_by", profile.id)
    .single();

  if (!event) return [];

  const { data: members, error } = await supabase
    .from("event_members")
    .select("id, user_id, assigned_at")
    .eq("event_id", eventId);

  if (error || !members) return [];

  const typedMembers = members as unknown as Array<{
    id: string;
    user_id: string;
    assigned_at: string;
  }>;

  const memberIds = typedMembers.map((m) => m.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", memberIds);

  const typedProfiles = (profiles ?? []) as unknown as Array<{
    id: string;
    full_name: string;
  }>;
  const profileMap = new Map(typedProfiles.map((p) => [p.id, p.full_name]));

  return typedMembers.map((m) => ({
    id: m.id,
    user_id: m.user_id,
    assigned_at: m.assigned_at,
    full_name: profileMap.get(m.user_id) ?? "Unknown",
  }));
}

export async function getAvailableTeamMembers(eventId: string) {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("created_by", profile.id)
    .single();

  if (!event) return [];

  const { data: assignedMembers } = await supabase
    .from("event_members")
    .select("user_id")
    .eq("event_id", eventId);

  const typedAssigned = (assignedMembers ?? []) as unknown as Array<{ user_id: string }>;
  const assignedIds = typedAssigned.map((m) => m.user_id);

  let query = supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "TEAM_MEMBER");

  if (assignedIds.length > 0) {
    query = query.not("id", "in", `(${assignedIds.join(",")})`);
  }

  const { data: members, error } = await query;

  if (error || !members) return [];

  return (members as unknown as Array<{ id: string; full_name: string }>).map((m) => ({
    id: m.id,
    full_name: m.full_name,
  }));
}

export async function createEvent(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const profile = await requireAdmin();

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || "";
  const eventDate = (formData.get("event_date") as string) || null;

  if (!name || name.trim().length === 0) {
    return { success: false, error: "Event name is required." };
  }

  if (name.trim().length > 200) {
    return { success: false, error: "Event name must be 200 characters or less." };
  }

  if (description.trim().length > 2000) {
    return { success: false, error: "Description must be 2000 characters or less." };
  }

  const eventDateValue = eventDate && eventDate.trim().length > 0 ? eventDate : null;
  if (eventDateValue && isNaN(Date.parse(eventDateValue))) {
    return { success: false, error: "Please enter a valid date." };
  }

  const supabase = await createClient();

  const newEvent = {
    name: name.trim(),
    description: description.trim(),
    event_date: eventDateValue,
    created_by: profile.id,
  } satisfies EventInsert;

  const { error } = await supabase.from("events")
    // @ts-expect-error -- Supabase SSR type inference issue
    .insert(newEvent);

  if (error) {
    return { success: false, error: "Failed to create event. Please try again." };
  }

  revalidatePath("/admin");
  redirect("/admin");
}

export async function updateEvent(
  eventId: string,
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("created_by", profile.id)
    .single();

  if (!event) {
    return { success: false, error: "Event not found or you don't have permission to edit it." };
  }

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || "";
  const eventDate = (formData.get("event_date") as string) || null;

  if (!name || name.trim().length === 0) {
    return { success: false, error: "Event name is required." };
  }

  if (name.trim().length > 200) {
    return { success: false, error: "Event name must be 200 characters or less." };
  }

  if (description.trim().length > 2000) {
    return { success: false, error: "Description must be 2000 characters or less." };
  }

  const eventDateValue = eventDate && eventDate.trim().length > 0 ? eventDate : null;
  if (eventDateValue && isNaN(Date.parse(eventDateValue))) {
    return { success: false, error: "Please enter a valid date." };
  }

  const updates = {
    name: name.trim(),
    description: description.trim(),
    event_date: eventDateValue,
  } satisfies EventUpdate;

  const { error } = await supabase
    .from("events")
    // @ts-expect-error -- Supabase SSR type inference issue
    .update(updates)
    .eq("id", eventId);

  if (error) {
    return { success: false, error: "Failed to update event. Please try again." };
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/events/${eventId}`);
  redirect(`/admin/events/${eventId}`);
}

export async function deleteEvent(eventId: string): Promise<ActionResult> {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("created_by", profile.id)
    .single();

  if (!event) {
    return { success: false, error: "Event not found or you don't have permission to delete it." };
  }

  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId);

  if (error) {
    if (error.code === "23503") {
      return {
        success: false,
        error: "This event cannot be deleted because it has related data. Remove associated records first.",
      };
    }
    return { success: false, error: "Failed to delete event. Please try again." };
  }

  revalidatePath("/admin");
  redirect("/admin");
}

export async function assignTeamMember(
  eventId: string,
  userId: string
): Promise<ActionResult> {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("created_by", profile.id)
    .single();

  if (!event) {
    return { success: false, error: "Event not found or you don't have permission to manage it." };
  }

  const { data: targetUser } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .single();

  if (!targetUser) {
    return { success: false, error: "User not found." };
  }

  const typedUser = targetUser as unknown as { role: string };
  if (typedUser.role !== "TEAM_MEMBER") {
    return { success: false, error: "Only Team Members can be assigned to events." };
  }

  const { data: existing } = await supabase
    .from("event_members")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    return { success: false, error: "This team member is already assigned to this event." };
  }

  const assignment = {
    event_id: eventId,
    user_id: userId,
  } satisfies EventMemberInsert;

  const { error } = await supabase.from("event_members")
    // @ts-expect-error -- Supabase SSR type inference issue
    .insert(assignment);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "This team member is already assigned to this event." };
    }
    return { success: false, error: "Failed to assign team member. Please try again." };
  }

  revalidatePath(`/admin/events/${eventId}`);
  return { success: true };
}

export async function removeTeamMember(
  eventId: string,
  membershipId: string
): Promise<ActionResult> {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("created_by", profile.id)
    .single();

  if (!event) {
    return { success: false, error: "Event not found or you don't have permission to manage it." };
  }

  const { error } = await supabase
    .from("event_members")
    .delete()
    .eq("id", membershipId)
    .eq("event_id", eventId);

  if (error) {
    return { success: false, error: "Failed to remove team member. Please try again." };
  }

  revalidatePath(`/admin/events/${eventId}`);
  return { success: true };
}

export async function getAssignedEvents() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: memberships, error: memberError } = await supabase
    .from("event_members")
    .select("event_id, assigned_at")
    .eq("user_id", user.id);

  if (memberError || !memberships || memberships.length === 0) return [];

  const typedMemberships = memberships as unknown as Array<{
    event_id: string;
    assigned_at: string;
  }>;
  const eventIds = typedMemberships.map((m) => m.event_id);

  const { data: events, error: eventError } = await supabase
    .from("events")
    .select("id, name, description, event_date, created_at")
    .in("id", eventIds);

  if (eventError || !events) return [];

  const typedEvents = events as unknown as Array<{
    id: string;
    name: string;
    description: string;
    event_date: string | null;
    created_at: string;
  }>;

  const assignmentMap = new Map(
    typedMemberships.map((m) => [m.event_id, m.assigned_at])
  );

  return typedEvents.map((event) => ({
    ...event,
    assigned_at: assignmentMap.get(event.id) ?? event.created_at,
  }));
}
