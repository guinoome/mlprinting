import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Images,
  MapPin,
  Music2,
  Play,
  Share2,
  Tag,
  User,
  Users,
  X,
} from "lucide-react";
import { ConfigurationRequired } from "@/components/configuration-required";
import { isDatabaseConfigured } from "@/lib/db";
import { getProfile } from "@/lib/auth/session";
import { routes, branding } from "@/lib/config";
import { cn } from "@/lib/utils";
import {
  getTemplateBySlug,
  getFavoritedSlugs,
} from "@/features/template-marketplace/repository";
import { recordView } from "@/features/template-marketplace/actions";
import { facetLabel } from "@/features/template-marketplace/labels";
import { PreviewGallery } from "@/features/template-marketplace/components/preview-gallery";
import { UseTemplateButton } from "@/features/template-marketplace/components/use-template-button";
import { FavoriteButton } from "@/features/template-marketplace/components/favorite-button";
import { proofExperienceForSlug } from "@/features/website-generator/experience/proofs";

const JOURNEY = [
  { label: "Opening", icon: Play },
  { label: "Gallery", icon: Images },
  { label: "Countdown", icon: Clock3 },
  { label: "Venue", icon: MapPin },
  { label: "RSVP", icon: Users },
  { label: "Music", icon: Music2 },
  { label: "Share", icon: Share2 },
] as const;

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const template = await getTemplateBySlug(params.slug);
  if (!template) return { title: "Template not found" };
  const proof = proofExperienceForSlug(template.slug);

  return {
    title: template.name,
    description: template.shortDescription,
    openGraph: {
      title: `${template.name} — ${branding.shortName}`,
      description: template.shortDescription,
      images: [{ url: proof?.catalogueCover ?? template.coverImageUrl }],
    },
  };
}

function MetaRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof User;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-black/12 flex items-baseline justify-between gap-4 border-b py-3 last:border-0">
      <dt className="text-black/48 flex shrink-0 items-center gap-2 text-xs">
        <Icon className="size-3.5" aria-hidden="true" />
        {label}
      </dt>
      <dd className="min-w-0 text-right text-xs font-semibold">{children}</dd>
    </div>
  );
}

function Compatibility({
  supported,
  label,
}: {
  supported: boolean;
  label: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-xs",
        !supported && "text-black/42",
      )}
    >
      {supported ? (
        <Check className="size-4 text-[#8b6735]" aria-hidden="true" />
      ) : (
        <X className="size-4" aria-hidden="true" />
      )}
      {label}
      <span className="sr-only">
        {supported ? "supported" : "not supported"}
      </span>
    </span>
  );
}

export default async function TemplatePreviewPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { selected?: string };
}) {
  if (!isDatabaseConfigured()) return <ConfigurationRequired />;

  const template = await getTemplateBySlug(params.slug);
  if (!template) notFound();

  const profile = await getProfile();
  await recordView(template.slug);
  const favorited = await getFavoritedSlugs(profile?.id, [template.id]);
  const proof = proofExperienceForSlug(template.slug);
  const artwork = proof?.catalogueCover ?? template.coverImageUrl;
  const collections = template.collections.map((item) => item.collection);

  return (
    <>
      <section className="relative -mx-4 -mt-8 min-h-[72svh] overflow-hidden bg-black text-white md:-mx-8">
        <Image
          src={artwork}
          alt={`${template.name} interactive invitation experience`}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,.9),rgba(0,0,0,.44)_48%,rgba(0,0,0,.08)),linear-gradient(0deg,rgba(0,0,0,.75),transparent_48%)]" />

        <div className="relative z-10 mx-auto flex min-h-[72svh] max-w-7xl flex-col justify-between px-6 py-8 md:px-10 md:py-12">
          <Link
            href={routes.templates}
            className="text-white/62 inline-flex w-fit items-center gap-2 text-[9px] font-semibold uppercase tracking-[.24em] transition hover:text-white"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to experiences
          </Link>

          <div className="max-w-3xl pb-8">
            <p className="text-[9px] font-semibold uppercase tracking-[.28em] text-[#dfbd7e]">
              {proof?.occasion ?? template.category.name} ·{" "}
              {proof?.tier ?? template.tier}
            </p>
            <h1 className="mt-5 text-balance font-serif text-6xl leading-[.88] tracking-[-.045em] sm:text-7xl md:text-8xl">
              {template.name}
            </h1>
            <p className="text-white/66 mt-6 max-w-xl text-sm leading-7 md:text-base">
              {proof?.promise ?? template.shortDescription}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {template.websiteCompatible ? (
                <Link
                  href={routes.templateLivePreview(template.slug)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-12 items-center gap-3 bg-[#b3874b] px-6 text-[10px] font-semibold uppercase tracking-[.2em] text-white transition hover:bg-[#c99b5d] focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <Play className="size-4 fill-current" aria-hidden="true" />
                  Open live experience
                </Link>
              ) : null}
              <UseTemplateButton slug={template.slug} className="min-w-48" />
              {profile ? (
                <FavoriteButton
                  slug={template.slug}
                  initialFavorited={favorited.has(template.id)}
                  className="size-12 border border-white/35 bg-black/30 text-white hover:bg-black/55"
                />
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {searchParams.selected === "1" ? (
        <div
          role="status"
          className="mt-8 flex items-start gap-3 border border-[#8b6735]/30 bg-[#8b6735]/5 p-4 text-sm"
        >
          <CheckCircle2
            className="mt-0.5 size-4 shrink-0 text-[#8b6735]"
            aria-hidden="true"
          />
          <div>
            <p className="font-semibold">Experience selected</p>
            <p className="mt-1 text-black/55">
              Your choice is saved and ready for the guided invitation builder.
            </p>
          </div>
        </div>
      ) : null}

      {proof ? (
        <section className="py-20 md:py-28">
          <div className="text-center">
            <p className="text-[9px] font-semibold uppercase tracking-[.28em] text-[#8b6735]">
              The guest journey
            </p>
            <h2 className="mx-auto mt-5 max-w-3xl font-serif text-5xl leading-[.96] tracking-[-.04em] md:text-6xl">
              From first tap to final reply.
            </h2>
          </div>
          <ol className="bg-black/12 mt-14 grid gap-px overflow-hidden sm:grid-cols-2 lg:grid-cols-7">
            {JOURNEY.map(({ label, icon: Icon }, index) => (
              <li key={label} className="bg-[#f4f0e8] px-5 py-8 text-center">
                <Icon
                  className="mx-auto size-5 text-[#8b6735]"
                  aria-hidden="true"
                />
                <p className="mt-5 text-[9px] font-semibold uppercase tracking-[.22em]">
                  0{index + 1} · {label}
                </p>
              </li>
            ))}
          </ol>
          <div className="mt-10 text-center">
            <Link
              href={routes.templateLivePreview(template.slug)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-3 border-b border-[#8b6735] pb-2 text-[10px] font-semibold uppercase tracking-[.22em]"
            >
              Experience the complete journey
              <Play className="size-3 fill-current" aria-hidden="true" />
            </Link>
          </div>
        </section>
      ) : (
        <section className="py-16">
          <PreviewGallery shots={template.screenshots} />
        </section>
      )}

      <section className="grid gap-12 border-t border-black/15 py-20 md:grid-cols-[1.25fr_.75fr] md:py-28">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[.28em] text-[#8b6735]">
            About this experience
          </p>
          <h2 className="mt-5 max-w-2xl font-serif text-5xl leading-[.96] tracking-[-.04em]">
            Made to become your story.
          </h2>
          <p className="text-black/58 mt-7 max-w-2xl text-sm leading-7">
            {template.description}
          </p>
          {template.tags.length > 0 ? (
            <ul className="text-black/48 mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[9px] font-semibold uppercase tracking-[.2em]">
              {template.tags.map((tag) => (
                <li key={tag}>{facetLabel(tag)}</li>
              ))}
            </ul>
          ) : null}
          <p className="text-black/58 mt-8 max-w-xl text-sm leading-7">
            Your cover and gallery photographs replace the sample media. The
            experience choreography, responsive layout, accessibility, and
            interaction design stay carefully composed.
          </p>
        </div>

        <aside className="border-t border-black/15 pt-6 md:border-l md:border-t-0 md:pl-10 md:pt-0">
          <h2 className="font-serif text-2xl">Experience details</h2>
          <dl className="mt-5">
            <MetaRow icon={User} label="Designer">
              {template.designer}
            </MetaRow>
            <MetaRow icon={Tag} label="Category">
              {template.category.name}
            </MetaRow>
            <MetaRow icon={Tag} label="Version">
              <span className="font-mono">{template.version}</span>
            </MetaRow>
            <MetaRow icon={CalendarDays} label="Updated">
              <time dateTime={template.updatedAt.toISOString()}>
                {template.updatedAt.toLocaleDateString("en-PH", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </time>
            </MetaRow>
          </dl>
          <div className="mt-7 flex flex-col gap-3 border-t border-black/15 pt-6">
            <Compatibility
              supported={template.websiteCompatible}
              label="Interactive event website"
            />
            <Compatibility
              supported={template.printCompatible}
              label="Matching printed invitation"
            />
          </div>
          {template.features.length > 0 ? (
            <ul className="mt-7 flex flex-wrap gap-2">
              {template.features.map((feature) => (
                <li
                  key={feature}
                  className="text-black/52 border border-black/15 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[.16em]"
                >
                  {facetLabel(feature)}
                </li>
              ))}
            </ul>
          ) : null}
          {collections.length > 0 ? (
            <p className="text-black/48 mt-7 text-xs">
              Part of the{" "}
              {collections.map((collection) => collection.name).join(", ")}{" "}
              collection{collections.length > 1 ? "s" : ""}.
            </p>
          ) : null}
        </aside>
      </section>
    </>
  );
}
