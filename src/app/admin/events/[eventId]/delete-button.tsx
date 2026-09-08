"use client";

import { deleteEvent } from "@/lib/actions/events";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/events/confirm-dialog";

export function DeleteEventButton({ eventId }: { eventId: string }) {
  async function handleDelete() {
    const result = await deleteEvent(eventId);
    if (result.error) {
      alert(result.error);
    }
  }

  return (
    <ConfirmDialog
      title="Delete this event?"
      description="This action will permanently remove the event and its team member assignments. This cannot be undone."
      confirmLabel="Delete Event"
      onConfirm={handleDelete}
    >
      <Button variant="destructive">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4"
          aria-hidden="true"
        >
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
        Delete
      </Button>
    </ConfirmDialog>
  );
}
