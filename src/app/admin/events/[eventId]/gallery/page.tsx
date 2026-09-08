import { notFound } from "next/navigation";
import { getEventById } from "@/lib/actions/events";
import { getEventPhotos } from "@/lib/actions/photos";
import { getGalleryForEvent } from "@/lib/actions/galleries";
import { requireAdmin } from "@/lib/auth";
import { SiteFooter } from "@/components/layout/site-footer";
import { AuthAwareHeader } from "@/components/layout/auth-aware-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { GalleryManager } from "./gallery-manager";

export const metadata = {
  title: "Gallery Management",
  description: "Manage gallery settings, PIN, and publishing.",
};

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  await requireAdmin();

  const event = await getEventById(eventId);
  if (!event) notFound();

  const [photos, gallery] = await Promise.all([
    getEventPhotos(eventId),
    getGalleryForEvent(eventId),
  ]);

  const selectedCount = photos.filter((p) => p.is_selected).length;

  return (
    <>
      <AuthAwareHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <PageHeader
            title="Gallery Management"
            description={event.name}
            backLink={{
              href: `/admin/events/${eventId}`,
              label: "Back to Event",
            }}
          />

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Event Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total Photos
                  </span>
                  <span className="text-sm font-medium">{photos.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Selected Photos
                  </span>
                  <span className="text-sm font-medium">{selectedCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Gallery Status
                  </span>
                  <Badge
                    variant={
                      gallery?.status === "PUBLISHED" ? "default" : "secondary"
                    }
                    className={
                      gallery?.status === "PUBLISHED"
                        ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                        : ""
                    }
                  >
                    {gallery?.status === "PUBLISHED" ? "Published" : "Draft"}
                  </Badge>
                </div>
                {gallery?.published_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Published
                    </span>
                    <span className="text-sm">
                      {new Date(gallery.published_at).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }
                      )}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Gallery Photos
                  </span>
                  <span className="text-sm font-medium">
                    {gallery?.photo_count ?? 0}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Gallery Details</CardTitle>
              </CardHeader>
              <CardContent>
                <GalleryManager
                  eventId={eventId}
                  gallery={gallery}
                  selectedCount={selectedCount}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
