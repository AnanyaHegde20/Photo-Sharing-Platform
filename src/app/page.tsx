import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AuthAwareHeader } from "@/components/layout/auth-aware-header";
import { SiteFooter } from "@/components/layout/site-footer";

export default function HomePage() {
  return (
    <>
      <AuthAwareHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pt-16 pb-12 sm:px-6 sm:pt-24 sm:pb-16 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Built for photography teams
            </p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Collaborate.
              <br />
              Curate.
              <br />
              Share.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              A smarter way for photography teams to manage and deliver event
              galleries. Upload, curate, and publish &mdash; all in one place.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" className="px-6" render={<Link href="/admin" />}>
                Get Started
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="px-6"
                render={<Link href="#how-it-works" />}
              >
                See How It Works
              </Button>
            </div>
          </div>
        </section>

        {/* Access Cards */}
        <section className="border-y border-border/40 bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
            <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
              Choose Your Access
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-center text-sm text-muted-foreground sm:text-base">
              PhotoShare serves three distinct roles. Select the path that
              matches your needs.
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="transition-all hover:shadow-md hover:border-muted-foreground/20">
                <CardHeader>
                  <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-5 text-primary"
                      aria-hidden="true"
                    >
                      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </div>
                  <CardTitle>Admin / Lead</CardTitle>
                  <CardDescription>
                    Manage events, add team members, curate uploaded photos, and
                    publish galleries for customers.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" render={<Link href="/admin" />}>
                    Continue as Admin / Lead
                  </Button>
                </CardContent>
              </Card>

              <Card className="transition-all hover:shadow-md hover:border-muted-foreground/20">
                <CardHeader>
                  <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-5 text-primary"
                      aria-hidden="true"
                    >
                      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                      <circle cx="12" cy="13" r="3" />
                    </svg>
                  </div>
                  <CardTitle>Team Member</CardTitle>
                  <CardDescription>
                    View your assigned events and upload photos. Your uploads
                    are organized by event and available for Admin review.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" render={<Link href="/team" />}>
                    Continue as Team Member
                  </Button>
                </CardContent>
              </Card>

              <Card className="transition-all hover:shadow-md hover:border-muted-foreground/20 sm:col-span-2 lg:col-span-1">
                <CardHeader>
                  <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-5 text-primary"
                      aria-hidden="true"
                    >
                      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                    </svg>
                  </div>
                  <CardTitle>Customer</CardTitle>
                  <CardDescription>
                    Access a published event gallery using the shared link and
                    PIN provided by the organizer. No account required.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="w-full"
                    render={<Link href="/customer" />}
                  >
                    Access Gallery
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
              How It Works
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-center text-sm text-muted-foreground sm:text-base">
              Five simple steps from event to shared gallery.
            </p>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
              {[
                {
                  step: "1",
                  title: "Create Event",
                  description:
                    "Admin creates a new event and sets the details.",
                },
                {
                  step: "2",
                  title: "Upload Photos",
                  description:
                    "Team members upload event photos from their devices.",
                },
                {
                  step: "3",
                  title: "Curate & Select",
                  description:
                    "Admin reviews uploads and selects the best photos.",
                },
                {
                  step: "4",
                  title: "Publish Gallery",
                  description:
                    "Admin publishes the curated selection as a gallery.",
                },
                {
                  step: "5",
                  title: "Share Link + PIN",
                  description:
                    "A secure gallery link with PIN is generated for access.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="flex flex-col items-center text-center"
                >
                  <div className="flex size-10 items-center justify-center rounded-full border border-border bg-background text-sm font-semibold">
                    {item.step}
                  </div>
                  <h3 className="mt-4 text-sm font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-y border-border/40 bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
              Platform Features
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-center text-sm text-muted-foreground sm:text-base">
              Everything teams and customers need for seamless event photo
              management.
            </p>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Collaborative Uploads",
                  description:
                    "Multiple team members can upload photos simultaneously to the same event.",
                  icon: (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-5"
                      aria-hidden="true"
                    >
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  ),
                },
                {
                  title: "Event Organization",
                  description:
                    "Photos are organized by event, making it easy to manage multiple occasions.",
                  icon: (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-5"
                      aria-hidden="true"
                    >
                      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                      <path d="M16 2v4" />
                      <path d="M8 2v4" />
                      <path d="M3 10h18" />
                    </svg>
                  ),
                },
                {
                  title: "Admin Photo Curation",
                  description:
                    "Review all uploaded photos and select the best ones for the final gallery.",
                  icon: (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-5"
                      aria-hidden="true"
                    >
                      <path d="m22 8-4 4 2 2-4 4 2 2-4 4" />
                      <path d="M2 8l4-4-2-2 4-4-2-2 4-4" />
                    </svg>
                  ),
                },
                {
                  title: "Secure Gallery Publishing",
                  description:
                    "Publish curated galleries with a unique shareable link for each event.",
                  icon: (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-5"
                      aria-hidden="true"
                    >
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  ),
                },
                {
                  title: "PIN-Protected Access",
                  description:
                    "Each gallery is protected with a PIN, ensuring only authorized viewers can access photos.",
                  icon: (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-5"
                      aria-hidden="true"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  ),
                },
                {
                  title: "Shareable Gallery Links",
                  description:
                    "Generate unique URLs that customers can open directly to view published photos.",
                  icon: (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-5"
                      aria-hidden="true"
                    >
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                  ),
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-xl border border-border/60 bg-background p-6 transition-shadow hover:shadow-sm"
                >
                  <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-muted text-foreground">
                    {feature.icon}
                  </div>
                  <h3 className="text-sm font-semibold">{feature.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
