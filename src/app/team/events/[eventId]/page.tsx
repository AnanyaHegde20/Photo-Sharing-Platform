import { notFound } from "next/navigation";
import { getEventById } from "@/lib/actions/events";
import { getMyUploadedPhotos } from "@/lib/actions/photos";
import { requireTeamMember } from "@/lib/auth";
import { SiteFooter } from "@/components/layout/site-footer";
import { AuthAwareHeader } from "@/components/layout/auth-aware-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/ui/page-header";
import { PhotoUpload } from "@/components/photos/photo-upload";
import { PhotoGrid } from "@/components/photos/photo-grid";

export const metadata = {
  title: "Event Details",
  description: "View event details.",
};

export default async function TeamEventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  await requireTeamMember();

  const [event, myPhotos] = await Promise.all([
    getEventById(eventId),
    getMyUploadedPhotos(eventId),
  ]);

  if (!event) notFound();

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
            backLink={{ href: "/team", label: "Back to My Events" }}
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

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Upload Photos</CardTitle>
            </CardHeader>
            <CardContent>
              <PhotoUpload eventId={eventId} />
            </CardContent>
          </Card>

          {myPhotos.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-sm">
                  Your Photos ({myPhotos.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PhotoGrid photos={myPhotos} />
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
