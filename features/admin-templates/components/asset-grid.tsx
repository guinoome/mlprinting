import Image from "next/image";
import { ImageOff } from "lucide-react";
import { formatBytes } from "@/lib/utils";
import { templateAssetUrl } from "@/services/template-assets";
import type {
  AssignableTemplate,
  TemplateAssetRow,
} from "@/services/template-assets/types";
import { AssignControl } from "./assign-control";
import { DeleteAssetButton } from "./delete-asset-button";

/**
 * The uploaded library — Instructions 4, "Template List".
 *
 * Shows what the brief asks for (thumbnail, name, date uploaded, delete) plus
 * the one thing it does not: which catalogue templates are wearing each design.
 * Without that, "delete" is a question an admin cannot answer, since the
 * consequence of deleting a design in use is invisible.
 *
 * A Server Component. Nothing here is interactive except the two controls it
 * embeds, and keeping the grid on the server means the asset list never reaches
 * the browser as JSON.
 */

const DATE_FORMAT = new Intl.DateTimeFormat("en-PH", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function AssetGrid({
  assets,
  templates,
}: {
  assets: TemplateAssetRow[];
  templates: AssignableTemplate[];
}) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {assets.map((asset) => {
        // Fall back to the original when thumbnail generation failed, rather
        // than rendering a broken box — see TemplateAsset.thumbnailPath.
        const src =
          templateAssetUrl(asset.thumbnailPath) ??
          templateAssetUrl(asset.storagePath);

        return (
          <li
            key={asset.id}
            className="flex flex-col overflow-hidden rounded-lg border bg-card"
          >
            <div className="relative aspect-[3/4] bg-muted">
              {src ? (
                <Image
                  src={src}
                  alt={asset.name}
                  fill
                  sizes="(min-width: 1280px) 20rem, (min-width: 640px) 40vw, 90vw"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <ImageOff aria-hidden="true" />
                </div>
              )}
            </div>

            <div className="flex flex-1 flex-col gap-3 p-3">
              <div className="space-y-0.5">
                <h3 className="truncate font-medium" title={asset.name}>
                  {asset.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  <time dateTime={asset.createdAt.toISOString()}>
                    {DATE_FORMAT.format(asset.createdAt)}
                  </time>
                  {" · "}
                  {formatBytes(asset.bytes)}
                  {asset.width && asset.height
                    ? ` · ${asset.width}×${asset.height}`
                    : null}
                </p>
                {asset.uploadedBy ? (
                  <p className="truncate text-xs text-muted-foreground">
                    by {asset.uploadedBy.displayName ?? asset.uploadedBy.email}
                  </p>
                ) : null}
              </div>

              <div className="mt-auto space-y-3">
                <AssignControl
                  assetId={asset.id}
                  templates={templates}
                  usedBy={asset.templates}
                />
                <DeleteAssetButton
                  assetId={asset.id}
                  assetName={asset.name}
                  usedBy={asset.templates}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
