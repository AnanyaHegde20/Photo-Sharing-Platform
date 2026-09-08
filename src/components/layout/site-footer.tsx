import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/40 bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="flex flex-col items-center gap-1 sm:items-start">
            <span className="text-sm font-semibold">PhotoShare</span>
            <span className="text-xs text-muted-foreground">
              Collaborative event photo management for teams.
            </span>
          </div>
          <nav
            className="flex gap-4 text-sm text-muted-foreground"
            aria-label="Footer navigation"
          >
            <Link
              href="/admin"
              className="transition-colors hover:text-foreground"
            >
              Admin
            </Link>
            <Link
              href="/team"
              className="transition-colors hover:text-foreground"
            >
              Team
            </Link>
            <Link
              href="/customer"
              className="transition-colors hover:text-foreground"
            >
              Gallery
            </Link>
          </nav>
        </div>
        <div className="mt-6 border-t border-border/40 pt-4 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} PhotoShare. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
