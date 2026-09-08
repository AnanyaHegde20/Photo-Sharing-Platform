"use client";

import { useState, useCallback, useRef } from "react";
import { uploadPhotos } from "@/lib/actions/photos";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];
const MAX_FILES = 20;

interface FileItem {
  file: File;
  preview: string;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

interface PhotoUploadProps {
  eventId: string;
}

export function PhotoUpload({ eventId }: PhotoUploadProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;

    const items: FileItem[] = [];
    for (let i = 0; i < newFiles.length && items.length + files.length < MAX_FILES; i++) {
      const file = newFiles[i];
      if (!ALLOWED_TYPES.includes(file.type)) continue;
      if (file.size > MAX_FILE_SIZE) continue;
      items.push({
        file,
        preview: URL.createObjectURL(file),
        status: "pending",
      });
    }

    setFiles((prev) => [...prev, ...items]);
  }, [files.length]);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => {
      const item = prev[index];
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleUpload = async () => {
    const pending = files.filter((f) => f.status === "pending");
    if (pending.length === 0) return;

    setUploading(true);

    // Mark all pending as uploading
    setFiles((prev) =>
      prev.map((f) =>
        f.status === "pending" ? { ...f, status: "uploading" as const } : f
      )
    );

    const uploadData = await Promise.all(
      pending.map(async (item) => {
        const buffer = await item.file.arrayBuffer();
        return {
          name: item.file.name,
          size: item.file.size,
          type: item.file.type,
          buffer,
        };
      })
    );

    const result = await uploadPhotos(eventId, uploadData);

    setFiles((prev) => {
      let uploadIdx = 0;
      return prev.map((item) => {
        if (item.status !== "uploading") return item;
        const error = result.errors[uploadIdx];
        uploadIdx++;
        if (error) {
          return { ...item, status: "error" as const, error };
        }
        return { ...item, status: "success" as const };
      });
    });

    setUploading(false);
  };

  const clearCompleted = () => {
    setFiles((prev) => {
      prev.filter((f) => f.status === "success").forEach((f) => URL.revokeObjectURL(f.preview));
      return prev.filter((f) => f.status !== "success");
    });
  };

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const successCount = files.filter((f) => f.status === "success").length;
  const errorCount = files.filter((f) => f.status === "error").length;
  const uploadingCount = files.filter((f) => f.status === "uploading").length;

  return (
    <div className="space-y-4">
      <div
        className="relative rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center transition-colors hover:border-muted-foreground/50"
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          addFiles(e.dataTransfer.files);
        }}
      >
        <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-5 text-muted-foreground"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" x2="12" y1="3" y2="15" />
          </svg>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Drag photos here or{" "}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
          >
            browse files
          </button>
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          JPEG, PNG, WebP, HEIC up to 10MB. Max {MAX_FILES} files.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2">
            {files.map((item, idx) => (
              <div
                key={`${item.file.name}-${idx}`}
                className="relative group"
              >
                <img
                  src={item.preview}
                  alt={item.file.name}
                  className="size-20 rounded-md border object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="size-6 rounded-full bg-destructive text-white flex items-center justify-center text-xs"
                    aria-label={`Remove ${item.file.name}`}
                  >
                    &times;
                  </button>
                </div>
                {item.status === "success" && (
                  <div className="absolute -top-1 -right-1 size-5 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">
                    &check;
                  </div>
                )}
                {item.status === "error" && (
                  <div className="absolute -top-1 -right-1 size-5 rounded-full bg-destructive text-white flex items-center justify-center text-xs">
                    !
                  </div>
                )}
                {item.status === "uploading" && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/40">
                    <div className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {pendingCount > 0 && <span>{pendingCount} pending</span>}
            {uploadingCount > 0 && (
              <span className="text-blue-600">Uploading {uploadingCount}...</span>
            )}
            {successCount > 0 && (
              <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                {successCount} uploaded
              </Badge>
            )}
            {errorCount > 0 && (
              <Badge variant="destructive">{errorCount} failed</Badge>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleUpload}
              disabled={uploading || pendingCount === 0}
            >
              {uploading
                ? "Uploading..."
                : `Upload ${pendingCount} ${pendingCount === 1 ? "photo" : "photos"}`}
            </Button>
            {successCount > 0 && (
              <Button variant="outline" onClick={clearCompleted}>
                Clear completed
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
