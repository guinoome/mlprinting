import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, X, CalendarDays, User, Tag, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 last:border-0">
      <dt className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
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
        supported ? "text-foreground" : "text-muted-foreground",
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
    <>
      <PageHeader
        title={template.name}
        description={template.shortDescription}
        breadcrumbs={[
          { label: "Templates", href: routes.templates },
          {
            label: template.category.name,
            href: `${routes.templates}?category=${template.category.slug}`,
          },
          { label: template.name },
        ]}
      />

      {/* Shown after "Use this template" while the builder does not exist yet.
          Saying nothing would make the button look broken. */}
      {searchParams.selected === "1" ? (
        <div
          role="status"
          className="mb-6 flex items-start gap-2 rounded-md border border-success/40 bg-success/5 p-3 text-sm"
        >
          <CheckCircle2
            className="mt-0.5 size-4 shrink-0 text-success"
            aria-hidden="true"
          />
          <div>
            <p className="font-medium">Template selected</p>
            <p className="mt-0.5 text-muted-foreground">
              We have saved your choice. The Guided Invitation Builder arrives
              in Phase 3 — your selection will be waiting for you there.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Ph2.md §6 */}
        <PreviewGallery shots={template.screenshots} />

        <aside className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap items-center gap-2">
                {template.tier === "PREMIUM" ? (
                  <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-background">
                    Premium
                  </span>
                ) : (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Free
                  </span>
                )}
                {isNewTemplate(publishedAt) ? (
                  <span className="rounded-full bg-info px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-info-foreground">
                    New
                  </span>
                ) : null}
                {template.isFeatured ? (
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Featured
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <UseTemplateButton slug={template.slug} className="flex-1" />
                {profile ? (
                  <FavoriteButton
                    slug={template.slug}
                    initialFavorited={favorited.has(template.id)}
                    className="size-10 border border-border"
                  />
                ) : null}
              </div>

              {/* Ph2.md §7 — Print / Website Compatibility. */}
              <div className="flex flex-col gap-1.5 border-t border-border pt-4">
                <Compatibility
                  supported={template.websiteCompatible}
                  label="Event website"
                />
                <Compatibility
                  supported={template.printCompatible}
                  label="Printed invitation"
                />
              </div>
            </CardContent>
          </Card>

          {/* Ph2.md §7 — Template Metadata. */}
          <Card>
            <CardContent className="p-5">
              <h2 className="mb-2 text-sm font-semibold">Details</h2>
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
            </CardContent>
          </Card>

          {/* Ph2.md §7 — Supported Features. */}
          {template.features.length > 0 ? (
            <Card>
              <CardContent className="p-5">
                <h2 className="mb-3 text-sm font-semibold">
                  Supported features
                </h2>
                <ul className="flex flex-wrap gap-1.5">
                  {template.features.map((feature) => (
                    <li
                      key={feature}
                      className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
                    >
                      {facetLabel(feature)}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </aside>
      </div>

      {/* Ph2.md §6 — Read template description. */}
      <section className="mt-10 max-w-2xl">
        <h2 className="text-sm font-semibold">About this template</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {template.description}
        </p>

        {template.tags.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {template.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground"
              >
                {facetLabel(tag)}
              </li>
            ))}
          </ul>
        ) : null}

        {collections.length > 0 ? (
          <p className="mt-4 text-xs text-muted-foreground">
            Part of the {collections.map((c) => c.name).join(", ")} collection
            {collections.length > 1 ? "s" : ""}.
          </p>
        ) : null}
      </section>
    </>
  );
}
