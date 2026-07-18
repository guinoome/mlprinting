"use client";

import * as React from "react";

/**
 * Shared multi-file upload queue — design doc Decision 3's implementation
 * note. Server Actions expose no upload-progress event, so this hook posts to
 * app/api/media/upload/route.ts via `XMLHttpRequest` (not `fetch`, which has no
 * upload-progress event) to get real byte-level progress, with per-file
 * retry and cancel (Ph4.md §3).
 */

export type UploadItemStatus = "queued" | "uploading" | "done" | "error";

export interface UploadItem {
  id: string;
  file: File;
  status: UploadItemStatus;
  progress: number;
  error?: string;
  assetId?: string;
}

export interface EnqueueOptions {
  altText?: string;
  tags?: string[];
  /** Present for a Replace upload (Task 14) — switches the route from create to replace. */
  assetId?: string;
}

interface QueuedFile {
  file: File;
  altText?: string;
  tags?: string[];
  assetId?: string;
}

export function useUploadQueue(onUploaded?: (assetId: string) => void) {
  const [items, setItems] = React.useState<UploadItem[]>([]);
  const xhrs = React.useRef(new Map<string, XMLHttpRequest>());
  const files = React.useRef(new Map<string, QueuedFile>());

  const update = React.useCallback((id: string, patch: Partial<UploadItem>) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }, []);

  const upload = React.useCallback(
    (id: string) => {
      const queued = files.current.get(id);
      if (!queued) return;

      const xhr = new XMLHttpRequest();
      xhrs.current.set(id, xhr);
      xhr.open("POST", "/api/media/upload");

      xhr.upload.addEventListener("progress", (event) => {
        if (!event.lengthComputable) return;
        update(id, { progress: Math.round((event.loaded / event.total) * 100) });
      });

      xhr.addEventListener("load", () => {
        xhrs.current.delete(id);
        let payload: { ok: boolean; assetId?: string; error?: string } | null =
          null;
        try {
          payload = JSON.parse(xhr.responseText);
        } catch {
          payload = null;
        }

        if (xhr.status >= 200 && xhr.status < 300 && payload?.ok && payload.assetId) {
          update(id, { status: "done", progress: 100, assetId: payload.assetId });
          onUploaded?.(payload.assetId);
        } else {
          update(id, {
            status: "error",
            error: payload?.error ?? "Upload failed.",
          });
        }
      });

      xhr.addEventListener("error", () => {
        xhrs.current.delete(id);
        update(id, { status: "error", error: "Upload failed. Check your connection." });
      });

      xhr.addEventListener("abort", () => {
        xhrs.current.delete(id);
        update(id, { status: "error", error: "Cancelled." });
      });

      const formData = new FormData();
      formData.set("file", queued.file);
      if (queued.assetId) formData.set("assetId", queued.assetId);
      if (queued.altText) formData.set("altText", queued.altText);
      if (queued.tags?.length) formData.set("tags", queued.tags.join(","));

      update(id, { status: "uploading", progress: 0, error: undefined });
      xhr.send(formData);
    },
    [update, onUploaded],
  );

  const enqueue = React.useCallback(
    (fileList: File[], options: EnqueueOptions = {}) => {
      const newItems: UploadItem[] = fileList.map((file) => {
        const id = crypto.randomUUID();
        files.current.set(id, {
          file,
          altText: options.altText,
          tags: options.tags,
          assetId: options.assetId,
        });
        return { id, file, status: "queued", progress: 0 };
      });

      setItems((current) => [...current, ...newItems]);
      for (const item of newItems) upload(item.id);
    },
    [upload],
  );

  const retry = React.useCallback(
    (id: string) => {
      update(id, { error: undefined });
      upload(id);
    },
    [update, upload],
  );

  const cancel = React.useCallback((id: string) => {
    xhrs.current.get(id)?.abort();
  }, []);

  const remove = React.useCallback((id: string) => {
    xhrs.current.get(id)?.abort();
    xhrs.current.delete(id);
    files.current.delete(id);
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  return { items, enqueue, retry, cancel, remove };
}
