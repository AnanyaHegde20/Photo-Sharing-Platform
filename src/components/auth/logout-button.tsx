"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function LogoutButton({
  variant = "ghost",
  size = "sm",
  className,
}: {
  variant?: "ghost" | "outline" | "secondary" | "link";
  size?: "xs" | "sm" | "default" | "lg" | "icon";
  className?: string;
}) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleLogout}
    >
      Sign Out
    </Button>
  );
}
