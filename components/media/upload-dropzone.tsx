"use client";

import * as React from "react";
import {
  Upload,
  X,
  RotateCcw,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import {
  UPLOAD_CONSTRAINTS,
  acceptAttribute,
  validateUpload,
} from "@/services/upload";
import { useUploadQueue, type UploadItem } from "@/lib/hooks/use-upload-queue";

/**
 * Multi-file drag-and-drop upload with a per-file queue — Ph4.md §3. Also
 * doubles as the Replace control (design doc's UI section): pass `assetId` to
 * restrict to one file and route through replaceAsset instead of createAsset.
 */
export function UploadDropzone({
  onUploaded,
  assetId,
  className,
}: {
  onUploaded?: (assetId: string) => void;
  assetId?: string;
  className?: string;
}) {
  const { items, enqueue, retry, cancel, remove } = useUploadQueue(onUploaded);
  const [dragging, setDragging] = React.useState(false);
  const { maxBytes, extensions } = UPLOAD_CONSTRAINTS.image;
  const multiple = !assetId;

  function acceptFiles(fileList: FileList | null) {
    if (!fileList) return;

    const valid: File[] = [];
    for (const file of Array.from(fileList)) {
      // Client-side courtesy only, same gate/courtesy split documented in
      // services/upload/validation.ts — the upload route validates again.
      const failure = validateUpload(
        { name: file.name, size: file.size, type: file.type },
        "image",
      );
      if (!failure) valid.push(file);
    }

    const selected = multiple ? valid : valid.slice(0, 1);
    if (selected.length > 0) enqueue(selected, { assetId });
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragging(false);
    acceptFiles(event.dataTransfer.files);
  }

  return (
    <div className={className}>
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-8 text-center transition-colors",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
          dragging
            ? "border-primary bg-muted"
            : "border-border hover:bg-muted/50",
        )}
      >
        <input
          type="file"
          multiple={multiple}
          accept={acceptAttribute("image")}
          onChange={(event) => {
            acceptFiles(event.target.files);
            event.target.value = "";
          }}
          className="sr-only"
        />
        <Upload className="size-5 text-muted-foreground" aria-hidden="true" />
        <span className="text-sm font-medium">
          {assetId
            ? "Drop a replacement photo, or click to choose"
            : "Drop photos here, or click to choose"}
        </span>
        <span className="text-xs text-muted-foreground">
          {extensions.join(", ")} — up to {formatBytes(maxBytes)} each
        </span>
      </label>

      {items.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <UploadQueueRow
              key={item.id}
              item={item}
              onRetry={() => retry(item.id)}
              onCancel={() => cancel(item.id)}
              onDismiss={() => remove(item.id)}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function UploadQueueRow({
  item,
  onRetry,
  onCancel,
  onDismiss,
}: {
  item: UploadItem;
  onRetry: () => void;
  onCancel: () => void;
  onDismiss: () => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm">
      <span className="flex-1 truncate">{item.file.name}</span>

      {item.status === "queued" ? (
        <Loader2
          className="size-4 animate-spin text-muted-foreground"
          aria-hidden="true"
        />
      ) : null}

      {item.status === "uploading" ? (
        <>
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${item.progress}%` }}
            />
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label={`Cancel ${item.file.name}`}
          >
            <X className="size-4 text-muted-foreground" />
          </button>
        </>
      ) : null}

      {item.status === "done" ? (
        <Check className="size-4 text-emerald-600" aria-hidden="true" />
      ) : null}

      {item.status === "error" ? (
        <span className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="size-3.5" aria-hidden="true" />
          {item.error}
        </span>
      ) : null}

      {item.status === "error" ? (
        <button
          type="button"
          onClick={onRetry}
          aria-label={`Retry ${item.file.name}`}
        >
          <RotateCcw className="size-4 text-muted-foreground" />
        </button>
      ) : null}

      {item.status === "done" || item.status === "error" ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={`Remove ${item.file.name} from the queue`}
        >
          <X className="size-4 text-muted-foreground" />
        </button>
      ) : null}
    </li>
  );
}
