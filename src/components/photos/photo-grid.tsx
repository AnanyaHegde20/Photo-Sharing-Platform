"use client";

import { useState, useEffect, useCallback } from "react";
import type { PhotoWithUrl } from "@/lib/actions/photos";

interface PhotoGridProps {
  photos: PhotoWithUrl[];
  canDelete?: boolean;
  canSelect?: boolean;
  onToggleSelect?: (photoId: string) => void;
  onDelete?: (photoId: string) => void;
  loadingPhotoId?: string | null;
}

export function PhotoGrid({
  photos,
  canDelete = false,
  canSelect = false,
  onToggleSelect,
  onDelete,
  loadingPhotoId,
}: PhotoGridProps) {
  const [lightboxPhoto, setLightboxPhoto] = useState<PhotoWithUrl | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  const openLightbox = useCallback(
    (photo: PhotoWithUrl) => {
      setLightboxPhoto(photo);
      setLightboxIndex(photos.findIndex((p) => p.id === photo.id));
      document.body.style.overflow = "hidden";
    },
    [photos]
  );

  const closeLightbox = useCallback(() => {
    setLightboxPhoto(null);
    setLightboxIndex(-1);
    document.body.style.overflow = "";
  }, []);

  const goToNext = useCallback(() => {
    if (lightboxIndex < photos.length - 1) {
      const nextIndex = lightboxIndex + 1;
      setLightboxIndex(nextIndex);
      setLightboxPhoto(photos[nextIndex]);
    }
  }, [lightboxIndex, photos]);

  const goToPrev = useCallback(() => {
    if (lightboxIndex > 0) {
      const prevIndex = lightboxIndex - 1;
      setLightboxIndex(prevIndex);
      setLightboxPhoto(photos[prevIndex]);
    }
  }, [lightboxIndex, photos]);

  useEffect(() => {
    if (!lightboxPhoto) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") goToNext();
      if (e.key === "ArrowLeft") goToPrev();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [lightboxPhoto, closeLightbox, goToNext, goToPrev]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (photos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-6 text-muted-foreground"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        </div>
        <p className="mt-4 text-sm font-medium text-foreground">
          No photos uploaded yet
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Once your team uploads event photos, they will appear here for review.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {photos.map((photo) => {
          const isLoading = loadingPhotoId === photo.id;
          return (
            <div
              key={photo.id}
              className={`group relative aspect-square cursor-pointer overflow-hidden rounded-lg border-2 bg-muted transition-all ${
                photo.is_selected
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-transparent hover:border-muted-foreground/30"
              } ${isLoading ? "opacity-60" : ""}`}
              onClick={() => openLightbox(photo)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openLightbox(photo);
                }
              }}
              aria-label={`${photo.filename}${photo.is_selected ? " (selected)" : ""}`}
            >
              <img
                src={photo.url}
                alt={photo.filename}
                className="size-full object-cover"
                loading="lazy"
              />

              {/* Hover overlay with filename */}
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-full p-2.5">
                  <p className="truncate text-xs font-medium text-white">
                    {photo.filename}
                  </p>
                  {photo.uploader_name && (
                    <p className="truncate text-xs text-white/70">
                      by {photo.uploader_name}
                    </p>
                  )}
                </div>
              </div>

              {/* Selection indicator - always visible for selected photos */}
              {canSelect && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelect?.(photo.id);
                  }}
                  disabled={isLoading}
                  className={`absolute top-2 right-2 size-7 rounded-full border-2 flex items-center justify-center text-xs font-medium transition-all ${
                    photo.is_selected
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-white/60 bg-black/40 text-white hover:border-white hover:bg-black/60"
                  } ${isLoading ? "animate-pulse" : ""}`}
                  aria-label={photo.is_selected ? "Deselect photo" : "Select photo"}
                >
                  {photo.is_selected && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-3.5"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              )}

              {/* Selected badge */}
              {canSelect && photo.is_selected && (
                <div className="absolute top-2 left-2">
                  <span className="inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground shadow-sm">
                    Selected
                  </span>
                </div>
              )}

              {/* Delete button */}
              {canDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(photo.id);
                  }}
                  className="absolute bottom-2 left-2 size-7 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  aria-label="Delete photo"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-3.5"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label={`Photo: ${lightboxPhoto.filename}`}
        >
          <div
            className="relative flex max-h-[100dvh] w-full max-w-[100dvw] flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
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
            {lightboxIndex > 0 && (
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
            {lightboxIndex < photos.length - 1 && (
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
                src={lightboxPhoto.url}
                alt={lightboxPhoto.filename}
                className="max-h-[80dvh] max-w-full rounded-lg object-contain sm:max-h-[85dvh]"
              />
            </div>

            {/* Info bar */}
            <div className="w-full px-4 pb-4 sm:pb-6">
              <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 rounded-lg bg-white/10 px-4 py-3 backdrop-blur-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {lightboxPhoto.filename}
                  </p>
                  <p className="mt-0.5 text-xs text-white/60">
                    {(lightboxPhoto.file_size / 1024 / 1024).toFixed(2)} MB
                    {" \u2022 "}
                    {new Date(lightboxPhoto.created_at).toLocaleDateString()}
                    {lightboxPhoto.uploader_name && (
                      <>
                        {" \u2022 "}
                        by {lightboxPhoto.uploader_name}
                      </>
                    )}
                  </p>
                </div>

                {/* Selection controls in lightbox */}
                {canSelect && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleSelect?.(lightboxPhoto.id)}
                      disabled={loadingPhotoId === lightboxPhoto.id}
                      className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                        lightboxPhoto.is_selected
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "bg-white/15 text-white hover:bg-white/25"
                      }`}
                    >
                      {lightboxPhoto.is_selected ? (
                        <>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="size-4"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Selected
                        </>
                      ) : (
                        <>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="size-4"
                          >
                            <circle cx="12" cy="12" r="10" />
                          </svg>
                          Select
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Counter */}
                <span className="shrink-0 text-xs text-white/60">
                  {lightboxIndex + 1} / {photos.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
