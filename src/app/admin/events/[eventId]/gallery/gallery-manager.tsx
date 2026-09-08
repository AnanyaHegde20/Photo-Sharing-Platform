"use client";

import { useState, useCallback, useTransition } from "react";
import {
  createGallery,
  updateGalleryPin,
  publishGallery,
  unpublishGallery,
  syncGalleryPhotos,
  generatePin,
} from "@/lib/actions/galleries";
import type { SafeGallery } from "@/lib/actions/galleries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface GalleryManagerProps {
  eventId: string;
  gallery: SafeGallery | null;
  selectedCount: number;
}

export function GalleryManager({
  eventId,
  gallery,
  selectedCount,
}: GalleryManagerProps) {
  const [currentGallery, setCurrentGallery] = useState(gallery);
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error">(
    "success"
  );
  const [isPending, startTransition] = useTransition();
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showUnpublishDialog, setShowUnpublishDialog] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const showFeedback = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      setFeedback(message);
      setFeedbackType(type);
      setTimeout(() => setFeedback(null), 3000);
    },
    []
  );

  const handleCreateGallery = useCallback(() => {
    startTransition(async () => {
      const result = await createGallery(eventId);
      if (result.success && result.slug) {
        setCurrentGallery({
          id: result.galleryId!,
          event_id: eventId,
          name: "",
          slug: result.slug,
          status: "DRAFT",
          published_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          has_pin: false,
          photo_count: selectedCount,
        });
        showFeedback("Gallery created successfully");
      } else {
        showFeedback(result.error || "Failed to create gallery", "error");
      }
    });
  }, [eventId, selectedCount, showFeedback]);

  const handleSavePin = useCallback(() => {
    if (pin !== pinConfirm) {
      showFeedback("PINs do not match", "error");
      return;
    }
    if (!/^\d{6}$/.test(pin)) {
      showFeedback("PIN must be exactly 6 digits", "error");
      return;
    }

    startTransition(async () => {
      if (!currentGallery) return;
      const result = await updateGalleryPin(currentGallery.id, pin);
      if (result.success) {
        setCurrentGallery((prev) =>
          prev ? { ...prev, has_pin: true } : prev
        );
        setPin("");
        setPinConfirm("");
        setShowPinDialog(false);
        showFeedback("PIN saved successfully");
      } else {
        showFeedback(result.error || "Failed to save PIN", "error");
      }
    });
  }, [pin, pinConfirm, currentGallery, showFeedback]);

  const handleGeneratePin = useCallback(async () => {
    const newPin = await generatePin();
    setPin(newPin);
    setPinConfirm(newPin);
  }, []);

  const handlePublish = useCallback(() => {
    startTransition(async () => {
      if (!currentGallery) return;
      const result = await publishGallery(currentGallery.id);
      if (result.success) {
        setCurrentGallery((prev) =>
          prev
            ? {
                ...prev,
                status: "PUBLISHED",
                published_at: new Date().toISOString(),
              }
            : prev
        );
        setShowPublishDialog(false);
        showFeedback("Gallery published");
      } else {
        showFeedback(result.error || "Failed to publish", "error");
      }
    });
  }, [currentGallery, showFeedback]);

  const handleUnpublish = useCallback(() => {
    startTransition(async () => {
      if (!currentGallery) return;
      const result = await unpublishGallery(currentGallery.id);
      if (result.success) {
        setCurrentGallery((prev) =>
          prev
            ? { ...prev, status: "DRAFT", published_at: null }
            : prev
        );
        setShowUnpublishDialog(false);
        showFeedback("Gallery unpublished");
      } else {
        showFeedback(result.error || "Failed to unpublish", "error");
      }
    });
  }, [currentGallery, showFeedback]);

  const handleSync = useCallback(() => {
    startTransition(async () => {
      if (!currentGallery) return;
      const result = await syncGalleryPhotos(currentGallery.id);
      if (result.success) {
        const changes = [];
        if (result.added && result.added > 0)
          changes.push(`${result.added} added`);
        if (result.removed && result.removed > 0)
          changes.push(`${result.removed} removed`);
        const msg =
          changes.length > 0
            ? `Synced: ${changes.join(", ")}`
            : "Gallery is already in sync";
        showFeedback(msg);
        setCurrentGallery((prev) =>
          prev
            ? {
                ...prev,
                photo_count:
                  (prev.photo_count ?? 0) +
                  (result.added ?? 0) -
                  (result.removed ?? 0),
              }
            : prev
        );
      } else {
        showFeedback(result.error || "Failed to sync", "error");
      }
    });
  }, [currentGallery, showFeedback]);

  const handleCopyLink = useCallback(async () => {
    if (!currentGallery) return;
    const url = `${window.location.origin}/gallery/${currentGallery.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      showFeedback("Gallery link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showFeedback("Failed to copy link", "error");
    }
  }, [currentGallery, showFeedback]);

  const galleryUrl = currentGallery
    ? `/gallery/${currentGallery.slug}`
    : null;

  if (!currentGallery) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {selectedCount === 0
            ? "Select at least one photo before creating a gallery."
            : "No gallery exists for this event yet."}
        </p>
        <Button
          onClick={handleCreateGallery}
          disabled={isPending || selectedCount === 0}
        >
          {isPending ? "Creating..." : "Create Gallery"}
        </Button>
        {feedback && (
          <p
            className={`text-sm ${
              feedbackType === "error" ? "text-destructive" : "text-green-600"
            }`}
          >
            {feedback}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Feedback */}
      {feedback && (
        <div
          className={`rounded-md px-3 py-2 text-sm ${
            feedbackType === "error"
              ? "bg-destructive/10 text-destructive"
              : "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
          }`}
        >
          {feedback}
        </div>
      )}

      {/* Gallery Link */}
      {galleryUrl && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Gallery Link</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-md border bg-muted px-3 py-1.5 text-sm">
              {galleryUrl}
            </code>
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              {copied ? (
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
              ) : (
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
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      )}

      {/* PIN */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Customer PIN</label>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            {currentGallery.has_pin ? (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Configured</Badge>
                <span className="text-sm text-muted-foreground">
                  {"\u2022\u2022\u2022\u2022\u2022\u2022"}
                </span>
              </div>
            ) : (
              <Badge variant="outline">Not set</Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPinDialog(true)}
          >
            {currentGallery.has_pin ? "Change PIN" : "Set PIN"}
          </Button>
        </div>
      </div>

      {/* Sync */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Photo Sync</label>
        <p className="text-xs text-muted-foreground">
          Synchronize gallery photos with your current selection.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={isPending}
        >
          {isPending ? "Syncing..." : "Sync Selected Photos"}
        </Button>
      </div>

      {/* Publish / Unpublish */}
      <div className="border-t pt-4">
        {currentGallery.status === "PUBLISHED" ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Published
              </Badge>
              {currentGallery.published_at && (
                <span className="text-xs text-muted-foreground">
                  {new Date(currentGallery.published_at).toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric", year: "numeric" }
                  )}
                </span>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => setShowUnpublishDialog(true)}
              disabled={isPending}
            >
              Unpublish Gallery
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => setShowPublishDialog(true)}
            disabled={isPending || !currentGallery.has_pin}
          >
            Publish Gallery
          </Button>
        )}
        {!currentGallery.has_pin &&
          currentGallery.status === "DRAFT" && (
            <p className="mt-2 text-xs text-muted-foreground">
              Configure a PIN before publishing.
            </p>
          )}
      </div>

      {/* PIN Dialog */}
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentGallery.has_pin ? "Change PIN" : "Set Gallery PIN"}
            </DialogTitle>
            <DialogDescription>
              Customers will enter this 6-digit PIN to access the gallery.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="pin" className="text-sm font-medium">
                PIN
              </label>
              <div className="flex gap-2">
                <Input
                  id="pin"
                  type="password"
                  maxLength={6}
                  placeholder="Enter 6-digit PIN"
                  value={pin}
                  onChange={(e) =>
                    setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                />
                <Button variant="outline" onClick={handleGeneratePin}>
                  Generate
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="pin-confirm" className="text-sm font-medium">
                Confirm PIN
              </label>
              <Input
                id="pin-confirm"
                type="password"
                maxLength={6}
                placeholder="Re-enter PIN"
                value={pinConfirm}
                onChange={(e) =>
                  setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPinDialog(false);
                setPin("");
                setPinConfirm("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePin}
              disabled={isPending || pin.length !== 6 || pinConfirm.length !== 6}
            >
              {isPending ? "Saving..." : "Save PIN"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Gallery</DialogTitle>
            <DialogDescription>
              {currentGallery.photo_count} selected photo
              {currentGallery.photo_count !== 1 ? "s" : ""} will become
              available through the customer gallery after successful PIN
              verification.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPublishDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handlePublish} disabled={isPending}>
              {isPending ? "Publishing..." : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unpublish Dialog */}
      <Dialog
        open={showUnpublishDialog}
        onOpenChange={setShowUnpublishDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unpublish Gallery</DialogTitle>
            <DialogDescription>
              Customers will no longer be able to access this gallery until it
              is published again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUnpublishDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleUnpublish}
              disabled={isPending}
            >
              {isPending ? "Unpublishing..." : "Unpublish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
