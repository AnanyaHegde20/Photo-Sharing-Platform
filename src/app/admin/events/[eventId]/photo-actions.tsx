"use client";

import { useState, useCallback, useMemo, useTransition } from "react";
import {
  deletePhoto,
  togglePhotoSelection,
  setPhotosSelected,
} from "@/lib/actions/photos";
import { PhotoGrid } from "@/components/photos/photo-grid";
import type { PhotoWithUrl } from "@/lib/actions/photos";

type FilterTab = "all" | "selected" | "unselected";

interface AdminPhotoActionsProps {
  eventId: string;
  photos: PhotoWithUrl[];
}

export function AdminPhotoActions({ eventId, photos }: AdminPhotoActionsProps) {
  const [currentPhotos, setCurrentPhotos] = useState(photos);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingPhotoId, setLoadingPhotoId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Compute stats
  const stats = useMemo(() => {
    const total = currentPhotos.length;
    const selected = currentPhotos.filter((p) => p.is_selected).length;
    return { total, selected, unselected: total - selected };
  }, [currentPhotos]);

  // Filter and search photos
  const filteredPhotos = useMemo(() => {
    let result = currentPhotos;

    if (activeFilter === "selected") {
      result = result.filter((p) => p.is_selected);
    } else if (activeFilter === "unselected") {
      result = result.filter((p) => !p.is_selected);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.filename.toLowerCase().includes(query) ||
          (p.uploader_name && p.uploader_name.toLowerCase().includes(query))
      );
    }

    return result;
  }, [currentPhotos, activeFilter, searchQuery]);

  const showFeedback = useCallback((message: string) => {
    setFeedback(message);
    setTimeout(() => setFeedback(null), 2500);
  }, []);

  const handleToggleSelect = useCallback(
    (photoId: string) => {
      setLoadingPhotoId(photoId);

      // Optimistic update
      setCurrentPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId ? { ...p, is_selected: !p.is_selected } : p
        )
      );

      startTransition(async () => {
        const result = await togglePhotoSelection(photoId, eventId);

        if (!result.success) {
          // Rollback on failure
          setCurrentPhotos((prev) =>
            prev.map((p) =>
              p.id === photoId ? { ...p, is_selected: !p.is_selected } : p
            )
          );
          showFeedback(result.error || "Failed to update selection");
        } else {
          // Confirm the new state
          setCurrentPhotos((prev) => {
            const photo = prev.find((p) => p.id === photoId);
            if (photo) {
              showFeedback(
                photo.is_selected ? "Photo selected" : "Photo removed from selection"
              );
            }
            return prev;
          });
        }

        setLoadingPhotoId(null);
      });
    },
    [eventId, showFeedback]
  );

  const handleDelete = useCallback(
    (photoId: string) => {
      setLoadingPhotoId(photoId);

      // Optimistic removal
      let deletedPhoto: PhotoWithUrl | undefined;
      setCurrentPhotos((prev) => {
        deletedPhoto = prev.find((p) => p.id === photoId);
        return prev.filter((p) => p.id !== photoId);
      });

      startTransition(async () => {
        const result = await deletePhoto(photoId, eventId);

        if (!result.success) {
          // Rollback on failure
          if (deletedPhoto) {
            setCurrentPhotos((prev) => [...prev, deletedPhoto!]);
          }
          showFeedback(result.error || "Failed to delete photo");
        } else {
          showFeedback("Photo deleted");
        }

        setLoadingPhotoId(null);
      });
    },
    [eventId, showFeedback]
  );

  const handleBulkSelect = useCallback(
    (select: boolean) => {
      // Get IDs of currently visible (filtered) photos that aren't already in the desired state
      const targetIds = filteredPhotos
        .filter((p) => p.is_selected !== select)
        .map((p) => p.id);

      if (targetIds.length === 0) return;

      setBulkLoading(true);

      // Optimistic update
      setCurrentPhotos((prev) =>
        prev.map((p) =>
          targetIds.includes(p.id) ? { ...p, is_selected: select } : p
        )
      );

      startTransition(async () => {
        const result = await setPhotosSelected(targetIds, eventId, select);

        if (!result.success) {
          // Rollback on failure
          setCurrentPhotos((prev) =>
            prev.map((p) =>
              targetIds.includes(p.id) ? { ...p, is_selected: !select } : p
            )
          );
          showFeedback(result.error || "Bulk operation failed");
        } else {
          showFeedback(
            select
              ? `${targetIds.length} photo${targetIds.length > 1 ? "s" : ""} selected`
              : `${targetIds.length} photo${targetIds.length > 1 ? "s" : ""} deselected`
          );
        }

        setBulkLoading(false);
      });
    },
    [eventId, filteredPhotos, showFeedback]
  );

  const visibleSelectedCount = filteredPhotos.filter(
    (p) => p.is_selected
  ).length;
  const visibleUnselectedCount = filteredPhotos.filter(
    (p) => !p.is_selected
  ).length;

  return (
    <div className="space-y-4">
      {/* Curation summary */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{stats.total}</span> total
            {" \u2022 "}
            <span className="font-medium text-foreground">{stats.selected}</span> selected
            {" \u2022 "}
            <span className="font-medium text-foreground">{stats.unselected}</span> remaining
          </div>
          {stats.total > 0 && (
            <div className="hidden h-4 w-px bg-border sm:block" />
          )}
          {stats.total > 0 && (
            <div className="hidden items-center gap-2 sm:flex">
              <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{
                    width: `${stats.total > 0 ? (stats.selected / stats.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {stats.total > 0
                  ? Math.round((stats.selected / stats.total) * 100)
                  : 0}
                %
              </span>
            </div>
          )}
        </div>

        {/* Feedback toast */}
        {feedback && (
          <div className="rounded-md bg-foreground px-3 py-1.5 text-sm text-background shadow-lg animate-in fade-in">
            {feedback}
          </div>
        )}
      </div>

      {/* Filters, search, and bulk actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Filter tabs */}
          <div className="flex rounded-lg border bg-muted p-0.5">
            {(
              [
                { key: "all", label: "All", count: stats.total },
                { key: "selected", label: "Selected", count: stats.selected },
                { key: "unselected", label: "Remaining", count: stats.unselected },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveFilter(tab.key)}
                className={`relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeFilter === tab.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="Search photos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:w-56"
            />
          </div>
        </div>

        {/* Bulk actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleBulkSelect(true)}
            disabled={bulkLoading || visibleUnselectedCount === 0}
            className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
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
              <path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z" />
              <path d="M15 3v4a2 2 0 0 0 2 2h4" />
            </svg>
            Select visible
          </button>
          <button
            type="button"
            onClick={() => handleBulkSelect(false)}
            disabled={bulkLoading || visibleSelectedCount === 0}
            className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
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
            </svg>
            Deselect visible
          </button>
          {bulkLoading && (
            <span className="text-xs text-muted-foreground animate-pulse">
              Saving...
            </span>
          )}
        </div>
      </div>

      {/* Photo grid with contextual empty states */}
      {currentPhotos.length === 0 ? (
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
      ) : filteredPhotos.length === 0 ? (
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
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <p className="mt-4 text-sm font-medium text-foreground">
            {activeFilter === "selected"
              ? "No selected photos"
              : activeFilter === "unselected"
                ? "All photos are selected"
                : "No matching photos"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeFilter === "selected"
              ? "Select photos from the gallery to prepare them for sharing."
              : activeFilter === "unselected"
                ? "Every photo in this event has been selected."
                : "Try adjusting your search terms."}
          </p>
        </div>
      ) : (
        <PhotoGrid
          photos={filteredPhotos}
          canDelete
          canSelect
          onToggleSelect={handleToggleSelect}
          onDelete={handleDelete}
          loadingPhotoId={loadingPhotoId}
        />
      )}
    </div>
  );
}
