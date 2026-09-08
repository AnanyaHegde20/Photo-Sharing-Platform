import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database, UserRole } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function isSupabaseConfigured(): boolean {
  return (
    !!supabaseUrl &&
    !!supabaseAnonKey &&
    supabaseUrl !== "your-project-url" &&
    supabaseUrl.startsWith("http")
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  if (!isSupabaseConfigured()) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(
    supabaseUrl!,
    supabaseAnonKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const publicPaths = ["/", "/login", "/register", "/customer"];
  const isPublicPath = publicPaths.includes(pathname);
  const isGalleryPath = pathname.startsWith("/gallery/");

  // Redirect unauthenticated users from protected routes to login
  if (!user && !isPublicPath && !isGalleryPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // If user is authenticated and trying to access login/register, redirect to their workspace
  if (user && (pathname === "/login" || pathname === "/register")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const url = request.nextUrl.clone();
    if (profile && (profile as { role: UserRole }).role === "ADMIN") {
      url.pathname = "/admin";
    } else {
      url.pathname = "/team";
    }
    return NextResponse.redirect(url);
  }

  // Role-based route protection for authenticated users
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      const role = (profile as { role: UserRole }).role;

      // Admin trying to access team workspace
      if (pathname === "/team" && role === "ADMIN") {
        const url = request.nextUrl.clone();
        url.pathname = "/admin";
        return NextResponse.redirect(url);
      }

      // Team member trying to access admin workspace
      if (pathname === "/admin" && role === "TEAM_MEMBER") {
        const url = request.nextUrl.clone();
        url.pathname = "/team";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
