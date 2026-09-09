"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, PlayCircle, Printer } from "lucide-react";
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

type GallerySurface = "EXPERIENCE" | "PRINT";

export function PreviewGallery({
  shots,
  heroImageUrl,
  templateName,
  livePreviewHref,
}: {
  shots: Shot[];
  heroImageUrl: string;
  templateName: string;
  livePreviewHref: string;
}) {
  const printShot = shots.find((shot) => shot.kind === "PRINT");
  const [active, setActive] = React.useState<GallerySurface>("EXPERIENCE");
  const showingPrint = active === "PRINT" && printShot;

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Preview surface"
        className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <button
          role="tab"
          type="button"
          aria-selected={active === "EXPERIENCE"}
          aria-controls="preview-EXPERIENCE"
          onClick={() => setActive("EXPERIENCE")}
          className={cn(
            "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-xs font-semibold uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9a6e32]",
            active === "EXPERIENCE"
              ? "border-[#181714] bg-[#181714] text-white"
              : "border-black/20 text-black/55 hover:border-black/50 hover:text-black",
          )}
        >
          <PlayCircle className="size-4" aria-hidden="true" />
          Interactive
        </button>

        {printShot ? (
          <button
            role="tab"
            type="button"
            aria-selected={active === "PRINT"}
            aria-controls="preview-PRINT"
            onClick={() => setActive("PRINT")}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-xs font-semibold uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9a6e32]",
              active === "PRINT"
                ? "border-[#181714] bg-[#181714] text-white"
                : "border-black/20 text-black/55 hover:border-black/50 hover:text-black",
            )}
          >
            <Printer className="size-4" aria-hidden="true" />
            Print companion
          </button>
        ) : null}
      </div>

      <div
        role="tabpanel"
        id={`preview-${active}`}
        className="relative mx-auto aspect-[9/16] max-h-[76svh] min-h-[32rem] w-full max-w-[32rem] overflow-hidden rounded-t-[12rem] bg-[#12120f] shadow-[0_34px_80px_rgba(28,20,9,0.24)]"
      >
        <Image
          src={showingPrint ? printShot.url : heroImageUrl}
          alt={
            showingPrint
              ? printShot.alt
              : `${templateName} interactive invitation artwork`
          }
          fill
          priority
          sizes="(min-width: 1024px) 42vw, 100vw"
          className={showingPrint ? "object-contain" : "object-cover"}
        />

        {!showingPrint ? (
          <>
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/15"
              aria-hidden="true"
            />
            <div className="absolute inset-x-0 top-0 flex items-center justify-between p-6 text-[9px] font-semibold uppercase tracking-[0.24em] text-white/75">
              <span>Phone first</span>
              <span>Desktop ready</span>
            </div>
            <Link
              href={livePreviewHref}
              target="_blank"
              rel="noreferrer"
              className="bg-black/42 absolute inset-x-5 bottom-5 flex min-h-12 items-center justify-between border border-white/60 px-5 text-xs font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-md transition-colors hover:bg-white hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Open the invitation
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </>
        ) : null}
      </div>

      <p className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-black/45">
        {showingPrint
          ? "Designed to continue into print"
          : "Tap to enter the real guest journey"}
      </p>
    </div>
  );
}
