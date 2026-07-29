import type { Metadata } from "next";
import { LayoutTemplate } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { requireStaff } from "@/lib/auth/require-staff";
import { routes } from "@/lib/config";
import {
  getAssignableTemplates,
  getTemplateAssets,
} from "@/services/template-assets";
import { AssetGrid } from "@/features/admin-templates/components/asset-grid";
import { TemplateUploadForm } from "@/features/admin-templates/components/upload-form";
import { CatalogueRow } from "@/features/admin-templates/components/catalogue-row";
import { NewTemplateForm } from "@/features/admin-templates/components/new-template-form";
import {
  listCatalogue,
  listCategories,
} from "@/features/admin-templates/catalogue-repository";

export const metadata: Metadata = {
  title: "Templates",
};

/**
 * Admin template management — Instructions 4.
 *
 * requireStaff() first, before any query. It 404s rather than redirecting, so
 * this URL is indistinguishable from one that was never routed — see
 * lib/auth/require-staff.ts. The Server Actions guard themselves too; a page
 * check alone would protect the render and not the POST.
 */
export default async function AdminTemplatesPage() {
  await requireStaff();

  const [assets, templates, catalogue, categories] = await Promise.all([
    getTemplateAssets(),
    getAssignableTemplates(),
    listCatalogue(),
    listCategories(),
  ]);

  const drafts = catalogue.filter((t) => t.publishedAt === null).length;

  return (
    <div>
      <PageHeader
        title="Templates"
        description="Upload professionally designed covers and apply them to catalogue templates."
        breadcrumbs={[
          { label: "Admin", href: routes.admin.root },
          { label: "Templates" },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-[20rem_1fr]">
        <section aria-labelledby="upload-heading" className="space-y-3">
          <h2 id="upload-heading" className="text-sm font-semibold">
            Upload a design
          </h2>
          <TemplateUploadForm />
        </section>

        <section aria-labelledby="library-heading" className="space-y-3">
          <h2 id="library-heading" className="text-sm font-semibold">
            Uploaded designs{" "}
            <span className="font-normal text-muted-foreground">
              ({assets.length})
            </span>
          </h2>

          {assets.length === 0 ? (
            <EmptyState
              icon={<LayoutTemplate aria-hidden="true" />}
              title="No designs uploaded yet"
              description="Upload a cover to replace the generated artwork on a catalogue template."
            />
          ) : (
            <AssetGrid assets={assets} templates={templates} />
          )}
        </section>
      </div>

      {/* The catalogue itself, below the artwork it wears. Ordering matters:
          uploading a design is the frequent visit, and curating the catalogue
          is the occasional one. */}
      <section aria-labelledby="catalogue-heading" className="mt-12 space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="catalogue-heading" className="text-sm font-semibold">
            Catalogue{" "}
            <span className="font-normal text-muted-foreground">
              ({catalogue.length} template{catalogue.length === 1 ? "" : "s"}
              {drafts > 0 ? `, ${drafts} draft` : ""}
              {drafts > 1 ? "s" : ""})
            </span>
          </h2>
        </div>

        <NewTemplateForm categories={categories} />

        <p className="text-xs text-muted-foreground">
          Unpublishing removes a template from the catalogue and leaves every
          invitation already built on it untouched. Deleting is only offered when
          no invitation uses the design.
        </p>

        <ul className="space-y-2">
          {catalogue.map((row) => (
            <CatalogueRow key={row.id} row={row} />
          ))}
        </ul>
      </section>
    </div>
  );
}
