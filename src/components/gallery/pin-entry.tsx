"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { verifyGalleryPin } from "@/lib/actions/gallery-access";
import { Button } from "@/components/ui/button";

interface PinEntryProps {
  slug: string;
  galleryName: string;
}

export function PinEntry({ slug, galleryName }: PinEntryProps) {
  const router = useRouter();
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = useCallback(
    (index: number, value: string) => {
      if (!/^\d*$/.test(value)) return;

      const newPin = [...pin];
      newPin[index] = value.slice(-1);
      setPin(newPin);
      setError(null);

      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [pin]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      if (e.key === "Backspace" && !pin[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [pin]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData
        .getData("text")
        .replace(/\D/g, "")
        .slice(0, 6);
      if (!pasted) return;

      const newPin = [...pin];
      for (let i = 0; i < pasted.length && i < 6; i++) {
        newPin[i] = pasted[i];
      }
      setPin(newPin);
      setError(null);

      const nextEmpty = newPin.findIndex((d) => !d);
      const focusIndex = nextEmpty === -1 ? 5 : nextEmpty;
      inputRefs.current[focusIndex]?.focus();
    },
    [pin]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const pinString = pin.join("");

      if (pinString.length !== 6) {
        setError("Please enter all 6 digits.");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await verifyGalleryPin(slug, pinString);
        if (result.success) {
          router.refresh();
        } else {
          setError(result.error || "Incorrect PIN. Please try again.");
          setPin(["", "", "", "", "", ""]);
          inputRefs.current[0]?.focus();
        }
      } catch {
        setError("An error occurred. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [pin, slug, router]
  );

  const pinString = pin.join("");
  const isComplete = pinString.length === 6;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
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
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {galleryName}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This gallery is protected by a PIN.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the 6-digit PIN provided by your photographer.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center gap-2" onPaste={handlePaste}>
            {pin.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="size-12 rounded-lg border bg-background text-center text-lg font-medium transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/50 sm:size-14"
                aria-label={`PIN digit ${index + 1}`}
                autoComplete="one-time-code"
              />
            ))}
          </div>

          {error && (
            <p className="text-center text-sm text-destructive">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={!isComplete || loading}
          >
            {loading ? "Verifying..." : "View Gallery"}
          </Button>
        </form>
      </div>
    </div>
  );
}
