import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventById, getEventMembers, getAvailableTeamMembers } from "@/lib/actions/events";
import { getEventPhotos } from "@/lib/actions/photos";
import { getGalleryForEvent } from "@/lib/actions/galleries";
import { requireAdmin } from "@/lib/auth";
import { SiteFooter } from "@/components/layout/site-footer";
import { AuthAwareHeader } from "@/components/layout/auth-aware-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/ui/page-header";
import { DeleteEventButton } from "./delete-button";
import { TeamMemberActions } from "@/components/events/team-member-actions";
import { AdminPhotoActions } from "./photo-actions";

export const metadata = {
  title: "Event Details",
  description: "View and manage event details.",
};

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  await requireAdmin();

  const event = await getEventById(eventId);
  if (!event) notFound();

  const [members, availableMembers, photos, gallery] = await Promise.all([
    getEventMembers(eventId),
    getAvailableTeamMembers(eventId),
    getEventPhotos(eventId),
    getGalleryForEvent(eventId),
  ]);

  const selectedCount = photos.filter((p) => p.is_selected).length;

  return (
    <>
      <AuthAwareHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <PageHeader
            title={event.name}
            description={
              event.event_date
                ? new Date(event.event_date).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                : undefined
            }
            backLink={{ href: "/admin", label: "Back to Events" }}
            action={
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  render={<Link href={`/admin/events/${eventId}/edit`} />}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-4"
                    aria-hidden="true"
                  >
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    <path d="m15 5 4 4" />
                  </svg>
                  Edit
                </Button>
                <DeleteEventButton eventId={eventId} />
              </div>
            }
          />

          {event.description && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-sm">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {event.description}
                </p>
              </CardContent>
            </Card>
          )}

          <Separator className="my-6" />

          <div>
            <h2 className="text-lg font-semibold tracking-tight">Team Members</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {members.length} {members.length === 1 ? "member" : "members"}{" "}
              assigned to this event.
            </p>
            <div className="mt-4">
              <TeamMemberActions
                eventId={eventId}
                availableMembers={availableMembers}
                currentMembers={members}
              />
            </div>
          </div>

          <Separator className="my-6" />

          <div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Photo Curation
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {photos.length === 0
                    ? "No photos uploaded yet."
                    : `${photos.length} photo${photos.length !== 1 ? "s" : ""} uploaded \u2022 ${selectedCount} selected for sharing.`}
                </p>
              </div>
              {photos.length > 0 && (
                <Badge variant="secondary" className="w-fit text-xs">
                  {selectedCount} / {photos.length} selected
                </Badge>
              )}
            </div>
            <div className="mt-4">
              <AdminPhotoActions eventId={eventId} photos={photos} />
            </div>
          </div>

          <Separator className="my-6" />

          <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Gallery</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {gallery ? (
                    <>
                      {gallery.status === "PUBLISHED" ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                            Published
                          </Badge>
                          {gallery.photo_count} photo
                          {gallery.photo_count !== 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <Badge variant="secondary">Draft</Badge>
                          {gallery.photo_count} photo
                          {gallery.photo_count !== 1 ? "s" : ""} selected
                        </span>
                      )}
                    </>
                  ) : selectedCount > 0 ? (
                    "Ready to create a gallery."
                  ) : (
                    "Select photos to create a gallery."
                  )}
                </p>
              </div>
              <Button
                variant="outline"
                render={
                  <Link href={`/admin/events/${eventId}/gallery`} />
                }
              >
                {gallery ? "Manage Gallery" : "Create Gallery"}
              </Button>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
