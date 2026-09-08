import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthProfile {
  id: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email ?? "" };
}

export async function getCurrentProfile(): Promise<AuthProfile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireProfile(): Promise<AuthProfile> {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }
  return profile;
}

export async function requireAdmin(): Promise<AuthProfile> {
  const profile = await requireProfile();
  if (profile.role !== "ADMIN") {
    redirect("/team");
  }
  return profile;
}

export async function requireTeamMember(): Promise<AuthProfile> {
  const profile = await requireProfile();
  if (profile.role !== "TEAM_MEMBER") {
    redirect("/admin");
  }
  return profile;
}
