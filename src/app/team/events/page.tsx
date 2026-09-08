import { requireTeamMember } from "@/lib/auth";
import { getAssignedEvents } from "@/lib/actions/events";
import { SiteFooter } from "@/components/layout/site-footer";
import { AuthAwareHeader } from "@/components/layout/auth-aware-header";
import { EventCard } from "@/components/events/event-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = {
  title: "My Events",
  description: "View your assigned events.",
};

export default async function TeamEventsPage() {
  await requireTeamMember();
  const events = await getAssignedEvents();

  return (
    <>
      <AuthAwareHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <PageHeader
            title="My Events"
            description="Events you have been assigned to."
          />

          {events.length === 0 ? (
            <div className="mt-12">
              <EmptyState
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-6 text-muted-foreground"
                    aria-hidden="true"
                  >
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                    <path d="M16 2v4" />
                    <path d="M8 2v4" />
                    <path d="M3 10h18" />
                  </svg>
                }
                title="No events assigned"
                description="You currently don't have any events assigned to you. Contact your administrator to get assigned to an event."
              />
            </div>
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  id={event.id}
                  name={event.name}
                  description={event.description}
                  event_date={event.event_date}
                  member_count={0}
                  created_at={event.created_at}
                  href={`/team/events/${event.id}`}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
