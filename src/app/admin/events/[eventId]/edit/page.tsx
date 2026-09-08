import { notFound } from "next/navigation";
import { getEventById } from "@/lib/actions/events";
import { requireAdmin } from "@/lib/auth";
import { SiteFooter } from "@/components/layout/site-footer";
import { AuthAwareHeader } from "@/components/layout/auth-aware-header";
import { EventForm } from "@/components/events/event-form";
import { updateEvent } from "@/lib/actions/events";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = {
  title: "Edit Event",
  description: "Edit event details.",
};

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  await requireAdmin();

  const event = await getEventById(eventId);
  if (!event) notFound();

  return (
    <>
      <AuthAwareHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <PageHeader
            title="Edit Event"
            backLink={{
              href: `/admin/events/${eventId}`,
              label: "Back to Event",
            }}
          />
          <div className="mt-6">
            <EventForm
              initialData={{
                name: event.name,
                description: event.description,
                event_date: event.event_date,
              }}
              action={updateEvent.bind(null, eventId)}
              submitLabel="Save Changes"
              loadingLabel="Saving..."
            />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
