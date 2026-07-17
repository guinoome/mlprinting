"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Check } from "lucide-react";
import { saveTemplateStep } from "../../actions";
import { useAutosave } from "../use-autosave";
import { SaveIndicator } from "../save-indicator";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LayoutTemplate } from "lucide-react";
import { routes } from "@/lib/config";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/hooks/use-toast";

/**
 * Select Template — Ph3.md §1 step 1.
 *
 * Shows a short list rather than the full marketplace: choosing here is a
 * confirmation, and browsing is what Ph2's marketplace is for. The link out
 * covers the customer who wants to shop properly.
 */

export interface TemplateChoice {
  slug: string;
  name: string;
  categoryName: string;
  coverImageUrl: string;
  orientation: "PORTRAIT" | "LANDSCAPE" | "SQUARE";
}

const ASPECT = {
  PORTRAIT: "aspect-[4/5]",
  LANDSCAPE: "aspect-[4/3]",
  SQUARE: "aspect-square",
} as const;

export function TemplateStep({
  invitationId,
  templates,
  selectedSlug,
}: {
  invitationId: string;
  templates: TemplateChoice[];
  selectedSlug: string | null;
}) {
  const [selected, setSelected] = React.useState(selectedSlug);

  const save = React.useCallback(async () => {
    if (!selected) return;

    const formData = new FormData();
    formData.set("invitationId", invitationId);
    formData.set("templateSlug", selected);

    const result = await saveTemplateStep({}, formData);
    if (result.error)
      notify.error({
        title: "Could not select that template",
        description: result.error,
      });
    return result;
  }, [invitationId, selected]);

  const autosave = useAutosave({ save, enabled: Boolean(selected) });

  function choose(slug: string) {
    setSelected(slug);
    autosave.markDirty();
  }

  if (templates.length === 0) {
    return (
      <EmptyState
        icon={<LayoutTemplate />}
        title="No templates available"
        description="The catalogue is being prepared. Check back shortly."
      />
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href={routes.templates}>Browse all templates</Link>
        </Button>
        <SaveIndicator autosave={autosave} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {templates.map((template) => {
          const active = selected === template.slug;

          return (
            <button
              key={template.slug}
              type="button"
              onClick={() => choose(template.slug)}
              aria-pressed={active}
              className="group text-left focus-visible:outline-none"
            >
              <div
                className={cn(
                  "relative overflow-hidden rounded-lg border-2 transition-colors",
                  ASPECT[template.orientation],
                  active
                    ? "border-foreground"
                    : "border-transparent group-hover:border-border group-focus-visible:border-ring",
                )}
              >
                <Image
                  src={template.coverImageUrl}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 20vw, 45vw"
                  className="bg-muted object-cover"
                />
                {active ? (
                  <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-foreground text-background">
                    <Check className="size-3.5" aria-hidden="true" />
                  </span>
                ) : null}
              </div>

              <p className="mt-2 truncate text-sm font-medium">
                {template.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {template.categoryName}
              </p>
            </button>
          );
        })}
      </div>
    </>
  );
}
