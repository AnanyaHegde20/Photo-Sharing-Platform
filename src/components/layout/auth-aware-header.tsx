"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import type { UserRole } from "@/types/database";

interface UserProfile {
  full_name: string;
  role: UserRole;
}

export function AuthAwareHeader() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();

      setProfile(data);
      setLoading(false);
    }

    getProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!session) {
          setProfile(null);
          setLoading(false);
          return;
        }

        const { data } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", session.user.id)
          .single();

        setProfile(data);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const isAuthPage = pathname === "/login" || pathname === "/register";
  if (isAuthPage) return null;

  const isAdmin = profile?.role === "ADMIN";
  const isTeam = profile?.role === "TEAM_MEMBER";
  const workspaceHref = isAdmin ? "/admin/events" : "/team/events";

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-5 sm:size-6"
            aria-hidden="true"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
          <span>PhotoShare</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 sm:flex" aria-label="Main navigation">
          {loading ? (
            <div className="h-8 w-16 animate-pulse rounded-md bg-muted" />
          ) : profile ? (
            <>
              <div className="mr-1 flex items-center gap-2">
                <span className="max-w-[120px] truncate text-sm text-muted-foreground">
                  {profile.full_name || (isAdmin ? "Admin" : "Team Member")}
                </span>
                <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {isAdmin ? "Admin" : "Team"}
                </span>
              </div>
              <Link
                href={workspaceHref}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  (isAdmin && pathname.startsWith("/admin")) ||
                  (isTeam && pathname.startsWith("/team"))
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isAdmin ? "Events" : "My Events"}
              </Link>
              <Link
                href="/customer"
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Gallery
              </Link>
              <LogoutButton variant="ghost" size="sm" />
            </>
          ) : (
            <>
              <Link
                href="/customer"
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Gallery
              </Link>
              <Link
                href="/login"
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
              >
                Get Started
              </Link>
            </>
          )}
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground sm:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-5"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-5"
            >
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border/40 bg-background px-4 py-3 sm:hidden">
          {loading ? (
            <div className="space-y-2">
              <div className="h-8 animate-pulse rounded-md bg-muted" />
              <div className="h-8 animate-pulse rounded-md bg-muted" />
            </div>
          ) : profile ? (
            <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
              <div className="mb-2 flex items-center gap-2 px-2 py-1">
                <span className="text-sm font-medium">
                  {profile.full_name || (isAdmin ? "Admin" : "Team Member")}
                </span>
                <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {isAdmin ? "Admin" : "Team"}
                </span>
              </div>
              <Link
                href={workspaceHref}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  (isAdmin && pathname.startsWith("/admin")) ||
                  (isTeam && pathname.startsWith("/team"))
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {isAdmin ? "Events" : "My Events"}
              </Link>
              <Link
                href="/customer"
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Gallery
              </Link>
              <div className="my-1 h-px bg-border" />
              <LogoutButton variant="ghost" size="sm" className="justify-start" />
            </nav>
          ) : (
            <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
              <Link
                href="/customer"
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Gallery
              </Link>
              <Link
                href="/login"
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
              >
                Get Started
              </Link>
            </nav>
          )}
        </div>
      )}
    </header>
  );
}
