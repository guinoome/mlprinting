"use client";

import * as React from "react";

/**
 * Autosave — Ph3.md §8 ("Users should never lose work due to accidental refresh
 * or browser closure").
 *
 * That sentence sets the bar, and a debounce alone does not clear it: a debounce
 * has a window, and closing the tab inside that window loses the last edit. So
 * three mechanisms, each covering the others' gap:
 *
 *   1. Debounced save while typing — the common case.
 *   2. Save on blur/visibility change — the customer switched away.
 *   3. A beforeunload warning if anything is still unsaved — the last resort,
 *      because a save fired during unload is not guaranteed to complete.
 *
 * `dirty` is tracked rather than compared: a deep-equal check against the loaded
 * draft sounds tidier and gets expensive on every keystroke, and gets the answer
 * wrong the moment a Date or an array order is involved.
 */

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

const DEBOUNCE_MS = 1200;

export interface AutosaveOptions {
  /** Performs the save. Should resolve when the server has it. */
  save: () => Promise<{ error?: string } | void>;
  /** Skip autosave entirely — e.g. a step with nothing to save. */
  enabled?: boolean;
}

export interface Autosave {
  status: SaveStatus;
  /** When the last successful save landed. */
  savedAt: Date | null;
  error: string | null;
  /** Call after any change. Schedules a debounced save. */
  markDirty: () => void;
  /** Save immediately — the manual Save control (Ph3.md §8). */
  saveNow: () => Promise<void>;
}

export function useAutosave({
  save,
  enabled = true,
}: AutosaveOptions): Autosave {
  const [status, setStatus] = React.useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = React.useState<Date | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = React.useRef(false);
  const inFlight = React.useRef(false);

  // The latest save closure, without making every callback below depend on it.
  // Otherwise each render would reschedule the debounce and it would never fire.
  const saveRef = React.useRef(save);
  React.useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const run = React.useCallback(async () => {
    if (!dirty.current || inFlight.current) return;

    inFlight.current = true;
    dirty.current = false;
    setStatus("saving");
    setError(null);

    try {
      const result = await saveRef.current();

      if (result && "error" in result && result.error) {
        // Still dirty: the work is not on the server, so the unload warning and
        // the next debounce must both still fire.
        dirty.current = true;
        setStatus("error");
        setError(result.error);
        return;
      }

      setSavedAt(new Date());
      // A change during the save leaves us dirty again — reflect that rather
      // than claim "saved".
      setStatus(dirty.current ? "dirty" : "saved");
    } catch {
      dirty.current = true;
      setStatus("error");
      setError("Could not save. Check your connection.");
    } finally {
      inFlight.current = false;
    }
  }, []);

  const markDirty = React.useCallback(() => {
    if (!enabled) return;

    dirty.current = true;
    setStatus("dirty");

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(run, DEBOUNCE_MS);
  }, [enabled, run]);

  const saveNow = React.useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    await run();
  }, [run]);

  // Save when the tab is hidden or the window loses focus. This is the one that
  // catches "switched apps and never came back".
  React.useEffect(() => {
    if (!enabled) return;

    const flush = () => {
      if (dirty.current) void run();
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", flush);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", flush);
    };
  }, [enabled, run]);

  // Last resort. A save started here is not guaranteed to finish, so warn rather
  // than pretend. Browsers ignore custom text and show their own wording.
  React.useEffect(() => {
    if (!enabled) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty.current && !inFlight.current) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [enabled]);

  // Flush on unmount — navigating between steps must not drop the last edit.
  React.useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (dirty.current) void saveRef.current();
    };
  }, []);

  return { status, savedAt, error, markDirty, saveNow };
}
