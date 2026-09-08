import { getGalleryState, getGalleryPhotos } from "@/lib/actions/gallery-access";
import { PinEntry } from "@/components/gallery/pin-entry";
import { CustomerGallery } from "@/components/gallery/customer-gallery";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ galleryId: string }>;
}) {
  const { galleryId } = await params;
  const state = await getGalleryState(galleryId);

  if (state.status === "authorized" && state.gallery) {
    return {
      title: `${state.gallery.name} | Photo Gallery`,
      description: `View photos from ${state.gallery.name}`,
    };
  }

  return {
    title: "Photo Gallery",
    description: "View published event photos.",
  };
}

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ galleryId: string }>;
}) {
  const { galleryId } = await params;
  const state = await getGalleryState(galleryId);

  if (state.status === "not_found") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-muted">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-8 text-muted-foreground"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="m15 9-6 6" />
              <path d="m9 9 6 6" />
            </svg>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Gallery not found
          </h1>
          <p className="mt-3 max-w-md text-muted-foreground">
            Please check the gallery link and try again.
          </p>
        </div>
      </main>
    );
  }

  if (state.status === "unavailable") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-muted">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-8 text-muted-foreground"
              aria-hidden="true"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Gallery unavailable
          </h1>
          <p className="mt-3 max-w-md text-muted-foreground">
            This gallery is not currently available.
          </p>
        </div>
      </main>
    );
  }

  if (state.status === "pin_required" && state.gallery) {
    return <PinEntry slug={galleryId} galleryName={state.gallery.name} />;
  }

  if (state.status === "authorized" && state.gallery) {
    const photos = await getGalleryPhotos(galleryId);
    return (
      <CustomerGallery
        galleryName={state.gallery.name}
        photoCount={state.gallery.photo_count}
        photos={photos}
      />
    );
  }

  return null;
}
