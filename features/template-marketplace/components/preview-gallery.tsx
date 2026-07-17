"use client";

import * as React from "react";
import Image from "next/image";
import { Monitor, Smartphone, Printer } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Preview gallery — Ph2.md §6 (view screenshots; desktop, mobile, and print
 * previews; no editing).
 *
 * Tabs over three surfaces rather than one long scroll of images: the question
 * a customer is answering here is "does this work for what I need", and for
 * most of them that is one surface, not all three.
 *
 * Read-only by construction. There is no editing affordance because Ph2.md's
 * Out of Scope forbids one — the builder is Ph3.
 */

export type Surface = "DESKTOP" | "MOBILE" | "PRINT";

export interface Shot {
  id: string;
  kind: Surface;
  url: string;
  alt: string;
}

const TABS: { kind: Surface; label: string; icon: typeof Monitor }[] = [
  { kind: "DESKTOP", label: "Desktop", icon: Monitor },
  { kind: "MOBILE", label: "Mobile", icon: Smartphone },
  { kind: "PRINT", label: "Print", icon: Printer },
];

/** Frame aspect per surface, so a phone screenshot is not stretched to a laptop shape. */
const FRAME = {
  DESKTOP: "aspect-[16/10]",
  MOBILE: "aspect-[9/16] max-w-[280px] mx-auto",
  PRINT: "aspect-[3/4] max-w-[420px] mx-auto",
} as const;

export function PreviewGallery({ shots }: { shots: Shot[] }) {
  // Only offer a tab that has something behind it — a template may be
  // print-only or website-only (Ph2.md §7).
  const available = TABS.filter((tab) =>
    shots.some((s) => s.kind === tab.kind),
  );
  const [active, setActive] = React.useState<Surface>(
    available[0]?.kind ?? "DESKTOP",
  );

  const visible = shots.filter((s) => s.kind === active);

  if (available.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        No previews available for this template.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Preview surface" className="flex gap-1">
        {available.map(({ kind, label, icon: Icon }) => (
          <button
            key={kind}
            role="tab"
            type="button"
            aria-selected={active === kind}
            aria-controls={`preview-${kind}`}
            onClick={() => setActive(kind)}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active === kind
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`preview-${active}`}
        className="space-y-4 rounded-lg border border-border bg-muted/40 p-4 sm:p-6"
      >
        {visible.map((shot) => (
          <div
            key={shot.id}
            className={cn(
              "relative overflow-hidden rounded-md border border-border bg-background",
              FRAME[shot.kind],
            )}
          >
            <Image
              src={shot.url}
              alt={shot.alt}
              fill
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="object-contain"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
