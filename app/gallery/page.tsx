import type { Metadata } from "next";
import { SiteHeader } from "@/components/nav/site-header";
import { branding } from "@/lib/config";
import { Gallery } from "@/features/template-gallery/components/gallery";

/**
 * Virtual invitation gallery — a scaffold over mock data.
 *
 * Kept apart from /templates, which is the live, Prisma-backed shop. This route
 * exists so the browsing experience can be designed and argued about without
 * migrations, and without putting the catalogue customers already use at risk.
 * When the shape settles, the components move across and the mock module is
 * replaced by the repository.
 *
 * Noindexed for the same reason: it is a working surface, not a second shop
 * competing with the real one in search results.
 */
export const metadata: Metadata = {
  title: "Virtual invitation gallery",
  robots: { index: false, follow: false },
};

export default function GalleryPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 md:px-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
          {branding.company} — Scaffold
        </p>
        <h1 className="mt-4 max-w-2xl text-balance font-serif text-4xl leading-[1.1] tracking-tight md:text-5xl">
          Virtual invitations for every occasion.
        </h1>
        <p className="mt-4 max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
          Pick a design, change the words, send the link. Filter by occasion,
          style, colour or shape — or start from a blank card.
        </p>

        <div className="mt-10">
          <Gallery />
        </div>
      </main>

      <footer className="mx-auto w-full max-w-7xl px-4 py-10 text-xs text-muted-foreground md:px-8">
        {branding.company} — {branding.location}
      </footer>
    </div>
  );
}
