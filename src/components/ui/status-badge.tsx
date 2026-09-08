import { Badge } from "@/components/ui/badge";

type StatusVariant = "default" | "secondary" | "destructive" | "outline";

const STATUS_STYLES: Record<string, string> = {
  published:
    "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  draft: "bg-muted text-muted-foreground",
  selected: "bg-primary text-primary-foreground",
  uploading: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  success: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  error: "bg-destructive/10 text-destructive border-destructive/20",
};

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className = "" }: StatusBadgeProps) {
  const variant: StatusVariant =
    status === "published" || status === "selected" ? "default" : "secondary";

  return (
    <Badge
      variant={variant}
      className={`${STATUS_STYLES[status] || ""} ${className}`}
    >
      {label || status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
    </Badge>
  );
}
