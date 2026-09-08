import { createEvent } from "@/lib/actions/events";
import { SiteFooter } from "@/components/layout/site-footer";
import { AuthAwareHeader } from "@/components/layout/auth-aware-header";
import { EventForm } from "@/components/events/event-form";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = {
  title: "Create Event",
  description: "Create a new photography event.",
};

export default function NewEventPage() {
  return (
    <>
      <AuthAwareHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <PageHeader
            title="Create Event"
            backLink={{ href: "/admin", label: "Back to Events" }}
          />
          <div className="mt-6">
            <EventForm
              action={createEvent}
              submitLabel="Create Event"
              loadingLabel="Creating..."
            />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
