"use client";

import { useState, useCallback, useEffect } from "react";
import type { GalleryPhoto } from "@/lib/actions/gallery-access";

interface CustomerGalleryProps {
  galleryName: string;
  photoCount: number;
  photos: GalleryPhoto[];
}

export function CustomerGallery({
  galleryName,
  photoCount,
  photos,
}: CustomerGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const openLightbox = useCallback(
    (photo: GalleryPhoto) => {
      setSelectedPhoto(photo);
      setSelectedIndex(photos.findIndex((p) => p.id === photo.id));
      document.body.style.overflow = "hidden";
    },
    [photos]
  );

  const closeLightbox = useCallback(() => {
    setSelectedPhoto(null);
    setSelectedIndex(-1);
    document.body.style.overflow = "";
  }, []);

  const goToNext = useCallback(() => {
    if (selectedIndex < photos.length - 1) {
      const nextIndex = selectedIndex + 1;
      setSelectedIndex(nextIndex);
      setSelectedPhoto(photos[nextIndex]);
    }
  }, [selectedIndex, photos]);

  const goToPrev = useCallback(() => {
    if (selectedIndex > 0) {
      const prevIndex = selectedIndex - 1;
      setSelectedIndex(prevIndex);
      setSelectedPhoto(photos[prevIndex]);
    }
  }, [selectedIndex, photos]);

  useEffect(() => {
    if (!selectedPhoto) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") goToNext();
      if (e.key === "ArrowLeft") goToPrev();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedPhoto, closeLightbox, goToNext, goToPrev]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">
              {galleryName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {photoCount} photo{photoCount !== 1 ? "s" : ""}
            </p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            Private Gallery
          </span>
        </div>
      </header>

      {/* Photo Grid */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
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
            <h2 className="mt-4 text-lg font-medium">No photos available</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This gallery currently has no photos to display.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {photos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => openLightbox(photo)}
                className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-muted transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={`View ${photo.filename}`}
              >
                <img
                  src={photo.url}
                  alt={photo.filename}
                  className="size-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label={`Photo: ${selectedPhoto.filename}`}
        >
          <div
            className="relative flex max-h-[100dvh] w-full max-w-[100dvw] flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button - top right */}
            <button
              type="button"
              onClick={closeLightbox}
              className="absolute right-3 top-3 z-20 size-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors backdrop-blur-sm sm:right-4 sm:top-4"
              aria-label="Close lightbox"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-5"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>

            {/* Previous button */}
            {selectedIndex > 0 && (
              <button
                type="button"
                onClick={goToPrev}
                className="absolute left-2 top-1/2 z-20 -translate-y-1/2 size-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors backdrop-blur-sm sm:left-4 sm:size-12"
                aria-label="Previous photo"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-5 sm:size-6"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
            )}

            {/* Next button */}
            {selectedIndex < photos.length - 1 && (
              <button
                type="button"
                onClick={goToNext}
                className="absolute right-2 top-1/2 z-20 -translate-y-1/2 size-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors backdrop-blur-sm sm:right-4 sm:size-12"
                aria-label="Next photo"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-5 sm:size-6"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            )}

            {/* Image */}
            <div className="flex flex-1 items-center justify-center px-12 py-16 sm:px-16 sm:py-20">
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.filename}
                className="max-h-[80dvh] max-w-full rounded-lg object-contain sm:max-h-[85dvh]"
              />
            </div>

            {/* Info bar */}
            <div className="w-full px-4 pb-4 text-center sm:pb-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white/80 backdrop-blur-sm">
                {selectedIndex + 1} / {photos.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
