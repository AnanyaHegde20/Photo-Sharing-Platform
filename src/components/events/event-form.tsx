"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActionResult } from "@/lib/actions/events";

interface EventFormProps {
  initialData?: {
    name: string;
    description: string;
    event_date: string | null;
  };
  action: (prevState: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  submitLabel: string;
  loadingLabel: string;
}

export function EventForm({
  initialData,
  action,
  submitLabel,
  loadingLabel,
}: EventFormProps) {
  const [state, formAction, isPending] = useActionState(action, null);

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>{submitLabel}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          {state?.error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {state.error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Event Name *</Label>
            <Input
              id="name"
              name="name"
              required
              maxLength={200}
              placeholder="e.g. Arjun & Priya Wedding"
              defaultValue={initialData?.name ?? ""}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={4}
              maxLength={2000}
              placeholder="Describe the event..."
              defaultValue={initialData?.description ?? ""}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event_date">Event Date</Label>
            <Input
              id="event_date"
              name="event_date"
              type="date"
              defaultValue={initialData?.event_date ?? ""}
              disabled={isPending}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? loadingLabel : submitLabel}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              render={
                <a href={initialData ? undefined : "/admin"} />
              }
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
