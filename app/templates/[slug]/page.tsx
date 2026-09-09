import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Check,
  X,
  CalendarDays,
  User,
  Tag,
  CheckCircle2,
  PlayCircle,
  ArrowUpRight,
} from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
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
import { isNewTemplate } from "@/features/template-marketplace/query";
import { facetLabel } from "@/features/template-marketplace/labels";
import { PreviewGallery } from "@/features/template-marketplace/components/preview-gallery";
import { UseTemplateButton } from "@/features/template-marketplace/components/use-template-button";
import { FavoriteButton } from "@/features/template-marketplace/components/favorite-button";

/**
 * Template preview — Ph2.md §6, §7.
 *
 * Everything a customer needs to commit to a template, and nothing that would
 * let them change it: Ph2.md §6 says "No editing permitted", and the Out of
 * Scope list puts the builder in Ph3.
 */

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const template = await getTemplateBySlug(params.slug);
  if (!template) return { title: "Template not found" };

  return {
    title: template.name,
    description: template.shortDescription,
    openGraph: {
      title: `${template.name} — ${branding.shortName}`,
      description: template.shortDescription,
      images: [{ url: template.coverImageUrl }],
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
      <dt className="text-black/52 flex shrink-0 items-center gap-2 text-sm">
        <Icon className="size-3.5" aria-hidden="true" />
        {label}
      </dt>
      <dd className="min-w-0 text-right text-sm font-medium">{children}</dd>
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
        "inline-flex items-center gap-1.5 text-sm",
        supported ? "text-[#181714]" : "text-black/45",
      )}
    >
      {supported ? (
        <Check className="size-4 text-success" aria-hidden="true" />
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

  // Ph2.md §9 — Recently Viewed. Awaited rather than fired and forgotten: a
  // floating promise in a Server Component can be cut off when the response
  // ends. It is a cheap upsert, and it never throws (see the action).
  await recordView(template.slug);

  const favorited = await getFavoritedSlugs(profile?.id, [template.id]);

  const publishedAt = template.publishedAt;
  const collections = template.collections.map((c) => c.collection);

  return (
    <article className="-mx-4 -my-8 overflow-hidden bg-[#f5f0e7] text-[#181714] md:-mx-8">
      <header className="mx-auto max-w-7xl px-5 pb-8 pt-8 md:px-8 md:pb-12 md:pt-12">
        <Breadcrumbs
          className="[&_a:hover]:text-black [&_a]:text-black/50 [&_li]:text-black/50 [&_span]:text-black/70"
          items={[
            { label: "Templates", href: routes.templates },
            {
              label: template.category.name,
              href: `${routes.templates}?category=${template.category.slug}`,
            },
            { label: template.name },
          ]}
        />
        <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#916b36]">
          {template.category.name} · Interactive invitation
        </p>
        <h1 className="mt-3 max-w-4xl text-balance font-serif text-5xl leading-[0.92] tracking-[-0.045em] sm:text-6xl md:text-7xl">
          {template.name}
        </h1>
        <p className="text-black/62 mt-5 max-w-2xl text-pretty text-base leading-7 md:text-lg">
          {template.shortDescription}
        </p>
      </header>

      {/* Shown after "Use this template" while the builder does not exist yet.
          Saying nothing would make the button look broken. */}
      {searchParams.selected === "1" ? (
        <div
          role="status"
          className="mx-auto mb-8 flex max-w-7xl items-start gap-2 border-y border-[#3e7d56]/30 bg-[#dcebdd] px-5 py-4 text-sm md:px-8"
        >
          <CheckCircle2
            className="mt-0.5 size-4 shrink-0 text-success"
            aria-hidden="true"
          />
          <div>
            <p className="font-medium">Template selected</p>
            <p className="mt-0.5 text-black/60">
              We have saved your choice. The Guided Invitation Builder arrives
              in Phase 3 — your selection will be waiting for you there.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mx-auto grid max-w-7xl gap-12 px-5 pb-16 md:px-8 md:pb-24 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <PreviewGallery
          shots={template.screenshots}
          heroImageUrl={template.coverImageUrl}
          templateName={template.name}
          livePreviewHref={routes.templateLivePreview(template.slug)}
        />

        <aside className="space-y-8 lg:sticky lg:top-24">
          <section className="border-y border-black/15 py-6">
            <div className="flex flex-wrap items-center gap-2">
              {template.tier === "PREMIUM" ? (
                <span className="rounded-full bg-[#181714] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                  Premium
                </span>
              ) : (
                <span className="rounded-full border border-black/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-black/60">
                  Free
                </span>
              )}
              {isNewTemplate(publishedAt) ? (
                <span className="rounded-full bg-[#9a6e32] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                  New
                </span>
              ) : null}
              {template.isFeatured ? (
                <span className="rounded-full border border-black/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-black/60">
                  Featured
                </span>
              ) : null}
            </div>

            <div className="mt-5 flex items-center gap-2">
              <UseTemplateButton
                slug={template.slug}
                className="flex-1"
                buttonClassName="min-h-12 rounded-none bg-[#181714] px-5 text-white hover:bg-[#9a6e32]"
              />
              {profile ? (
                <FavoriteButton
                  slug={template.slug}
                  initialFavorited={favorited.has(template.id)}
                  className="size-12 rounded-none border border-black/20 bg-transparent text-black hover:bg-black/5"
                />
              ) : null}
            </div>

            {/* The screenshots above show the design; this shows the thing
                  itself — the animated invitation, opening envelope and all.
                  It is the strongest argument the page can make, so it sits
                  directly under the primary action. */}
            {template.websiteCompatible ? (
              <Link
                href={routes.templateLivePreview(template.slug)}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex min-h-12 w-full items-center justify-between border border-black/20 px-5 text-sm font-semibold transition-colors hover:border-black hover:bg-white/45"
              >
                <PlayCircle className="size-4" aria-hidden="true" />
                See the live guest journey
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            ) : null}

            {/* Ph2.md §7 — Print / Website Compatibility. */}
            <div className="border-black/12 mt-5 flex flex-col gap-2 border-t pt-5">
              <Compatibility
                supported={template.websiteCompatible}
                label="Event website"
              />
              <Compatibility
                supported={template.printCompatible}
                label="Printed invitation"
              />
            </div>
          </section>

          <section>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#916b36]">
              Studio notes
            </p>
            <h2 className="mb-3 mt-2 font-serif text-3xl">
              Made to become yours.
            </h2>
            <dl>
              <MetaRow icon={User} label="Designer">
                {template.designer}
              </MetaRow>
              <MetaRow icon={Tag} label="Category">
                {template.category.name}
              </MetaRow>
              <MetaRow icon={Tag} label="Version">
                <span className="font-mono text-xs">{template.version}</span>
              </MetaRow>
              <MetaRow icon={CalendarDays} label="Last updated">
                <time dateTime={template.updatedAt.toISOString()}>
                  {template.updatedAt.toLocaleDateString("en-PH", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </time>
              </MetaRow>
              <MetaRow icon={Tag} label="Orientation">
                <span className="capitalize">
                  {template.orientation.toLowerCase()}
                </span>
              </MetaRow>
            </dl>
          </section>

          {template.features.length > 0 ? (
            <section className="border-t border-black/15 pt-6">
              <h2 className="mb-3 text-sm font-semibold">Guest journey</h2>
              <ul className="flex flex-wrap gap-1.5">
                {template.features.map((feature) => (
                  <li
                    key={feature}
                    className="text-black/58 rounded-full border border-black/15 bg-white/35 px-3 py-1.5 text-xs"
                  >
                    {facetLabel(feature)}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>

      <section className="bg-[#11120f] text-[#f5f0e7]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 md:px-8 md:py-24 lg:grid-cols-[0.7fr_1fr]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#d2aa6c]">
              Beyond the first impression
            </p>
            <h2 className="mt-3 max-w-md font-serif text-4xl leading-[0.98] md:text-5xl">
              A complete invitation, not a static card.
            </h2>
          </div>
          <div>
            <p className="text-white/68 max-w-2xl text-base leading-8">
              {template.description}
            </p>

            {template.tags.length > 0 ? (
              <ul className="mt-6 flex flex-wrap gap-2">
                {template.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/60"
                  >
                    {facetLabel(tag)}
                  </li>
                ))}
              </ul>
            ) : null}

            {collections.length > 0 ? (
              <p className="mt-6 text-xs text-white/45">
                Part of the {collections.map((c) => c.name).join(", ")}{" "}
                collection
                {collections.length > 1 ? "s" : ""}.
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </article>
  );
}
