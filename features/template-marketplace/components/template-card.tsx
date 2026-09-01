import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Play } from "lucide-react";
import { routes } from "@/lib/config";
import { cn } from "@/lib/utils";
import { proofExperienceForSlug } from "@/features/website-generator/experience/proofs";
import { isNewTemplate } from "../query";
import { FavoriteButton } from "./favorite-button";
import type { TemplateCard as TemplateCardData } from "../repository";

/**
 * Public catalogue experience card. Released proofs receive their cinematic,
 * text-free artwork; other templates keep their database-owned cover so the
 * component remains safe as the curated catalogue grows.
 */
export function TemplateCard({
  template,
  favorited,
  showFavorite,
  priority,
  layout = "standard",
}: {
  template: NonNullable<TemplateCardData>;
  favorited: boolean;
  showFavorite: boolean;
  priority?: boolean;
  layout?: "standard" | "wide";
}) {
  const proof = proofExperienceForSlug(template.slug);
  const artwork = proof?.catalogueCover ?? template.coverImageUrl;
  const isVectorCover = artwork.startsWith("/api/placeholder/");
  const isNew = isNewTemplate(template.publishedAt);

  return (
    <article
      className={cn(
        "group relative overflow-hidden bg-[#0b0b0d] text-white",
        layout === "wide" && "md:col-span-2",
      )}
    >
      <div
        className={cn(
          "relative min-h-[30rem] overflow-hidden",
          layout === "wide" ? "md:min-h-[34rem]" : "md:min-h-[38rem]",
        )}
      >
        <Image
          src={artwork}
          alt={`${template.name} — ${template.category.name} interactive invitation`}
          fill
          sizes={
            layout === "wide"
              ? "(min-width: 1024px) 70vw, 100vw"
              : "(min-width: 1024px) 36vw, 100vw"
          }
          loading={priority ? "eager" : "lazy"}
          priority={priority}
          unoptimized={isVectorCover}
          className="object-cover transition duration-1000 group-hover:scale-[1.035] motion-reduce:transition-none"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/5 to-black/25" />

        <Link
          href={routes.template(template.slug)}
          className="absolute inset-0 z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
        >
          <span className="sr-only">Explore {template.name}</span>
        </Link>

        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <p className="text-white/72 text-[9px] font-semibold uppercase tracking-[.28em]">
              {proof?.occasion ?? template.category.name}
            </p>
            <ArrowUpRight className="size-5" aria-hidden="true" />
          </div>

          <div
            className={cn(
              "max-w-lg pb-20",
              layout === "standard" && "max-w-sm",
            )}
          >
            <p className="text-[9px] font-semibold uppercase tracking-[.24em] text-[#dfbd7e]">
              {proof
                ? `${proof.tier} · ${proof.motionLevel} motion`
                : `${template.tier.toLowerCase()} experience${isNew ? " · new" : ""}`}
            </p>
            <h2 className="mt-4 font-serif text-5xl leading-[.9] tracking-[-.035em] sm:text-6xl">
              {template.name}
            </h2>
            <p className="text-white/66 mt-5 max-w-md text-sm leading-6">
              {proof?.promise ?? template.shortDescription}
            </p>
          </div>
        </div>

        <Link
          href={routes.templateLivePreview(template.slug)}
          target="_blank"
          rel="noreferrer"
          className="absolute bottom-7 right-6 z-30 inline-flex min-h-11 items-center gap-3 border-b border-[#dfbd7e] pb-2 text-[9px] font-semibold uppercase tracking-[.22em] text-white transition hover:text-[#dfbd7e] focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-8"
        >
          <span className="grid size-7 place-items-center rounded-full border border-white/45">
            <Play className="size-3 fill-current" aria-hidden="true" />
          </span>
          Open live experience
        </Link>
      </div>

      {showFavorite ? (
        <FavoriteButton
          slug={template.slug}
          initialFavorited={favorited}
          className="absolute right-6 top-14 z-30 border border-white/30 bg-black/35 text-white backdrop-blur hover:bg-black/60"
        />
      ) : null}
    </article>
  );
}
