"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { savePersonalizeStep } from "../../actions";
import { useAutosave } from "../use-autosave";
import { SaveIndicator } from "../save-indicator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  COLOR_THEMES,
  TYPOGRAPHY_SETS,
  BACKGROUND_STYLES,
  DECORATIVE_STYLES,
  TOGGLEABLE_SECTIONS,
} from "@/lib/config/design-vocabulary";

/**
 * Theme & style — Ph3.md §6.
 *
 * Every control here is a choice from a closed set. There is no colour picker
 * and no font input, and that is the feature: §6 requires customization to stay
 * "within the approved design system", and the only way to guarantee that is to
 * never offer a way out of it.
 *
 * Options are shown as previews rather than named in a dropdown, because
 * "Blush Rose" means nothing until you see it — and a customer who cannot
 * predict the result is not being guided.
 */

export interface PersonalizeValues {
  colorTheme: string;
  typography: string;
  backgroundStyle: string;
  decorativeStyle: string;
  hiddenSections: string[];
}

function OptionCard({
  selected,
  onSelect,
  name,
  description,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  name: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "relative flex flex-col gap-2 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-foreground bg-muted/50"
          : "border-border hover:bg-muted/40",
      )}
    >
      {children}
      <div>
        <p className="flex items-center gap-1.5 text-sm font-medium">
          {name}
          {selected ? <Check className="size-3.5" aria-hidden="true" /> : null}
        </p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}

export function PersonalizeStep({
  invitationId,
  initial,
}: {
  invitationId: string;
  initial: PersonalizeValues;
}) {
  const [values, setValues] = React.useState(initial);

  const save = React.useCallback(async () => {
    const formData = new FormData();
    formData.set("invitationId", invitationId);
    formData.set("colorTheme", values.colorTheme);
    formData.set("typography", values.typography);
    formData.set("backgroundStyle", values.backgroundStyle);
    formData.set("decorativeStyle", values.decorativeStyle);
    for (const section of values.hiddenSections)
      formData.append("hiddenSections", section);

    return savePersonalizeStep({}, formData);
  }, [invitationId, values]);

  const autosave = useAutosave({ save });

  function set<K extends keyof PersonalizeValues>(
    key: K,
    value: PersonalizeValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    autosave.markDirty();
  }

  function toggleSection(slug: string, visible: boolean) {
    // Stored as the hidden set — see the schema for why the exceptions are
    // recorded rather than the full list.
    set(
      "hiddenSections",
      visible
        ? values.hiddenSections.filter((s) => s !== slug)
        : [...values.hiddenSections, slug],
    );
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <SaveIndicator autosave={autosave} />
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Colour</CardTitle>
            <CardDescription>
              Chosen to print well as much as to look well on screen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {COLOR_THEMES.map((theme) => (
                <OptionCard
                  key={theme.slug}
                  selected={values.colorTheme === theme.slug}
                  onSelect={() => set("colorTheme", theme.slug)}
                  name={theme.name}
                  description={theme.description}
                >
                  <div
                    className="flex h-12 items-center justify-center rounded border border-border"
                    style={{ background: theme.swatch.background }}
                    aria-hidden="true"
                  >
                    <span
                      className="text-sm"
                      style={{
                        color: theme.swatch.foreground,
                        fontFamily: "Georgia, serif",
                      }}
                    >
                      Aa
                    </span>
                    <span
                      className="ml-2 size-3 rounded-full"
                      style={{ background: theme.swatch.accent }}
                    />
                  </div>
                </OptionCard>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Typography</CardTitle>
            <CardDescription>
              Paired for you — a heading and a body that work together.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {TYPOGRAPHY_SETS.map((set_) => (
                <OptionCard
                  key={set_.slug}
                  selected={values.typography === set_.slug}
                  onSelect={() => set("typography", set_.slug)}
                  name={set_.name}
                  description={set_.description}
                >
                  <div
                    className="flex h-12 flex-col justify-center rounded border border-border bg-background px-2"
                    aria-hidden="true"
                  >
                    <span
                      className="text-sm leading-tight"
                      style={{ fontFamily: set_.preview.heading }}
                    >
                      Maria & Jose
                    </span>
                    <span
                      className="text-[10px] leading-tight text-muted-foreground"
                      style={{ fontFamily: set_.preview.body }}
                    >
                      14 March 2027
                    </span>
                  </div>
                </OptionCard>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Background</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {BACKGROUND_STYLES.map((style) => (
                  <OptionCard
                    key={style.slug}
                    selected={values.backgroundStyle === style.slug}
                    onSelect={() => set("backgroundStyle", style.slug)}
                    name={style.name}
                    description={style.description}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Decoration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {DECORATIVE_STYLES.map((style) => (
                  <OptionCard
                    key={style.slug}
                    selected={values.decorativeStyle === style.slug}
                    onSelect={() => set("decorativeStyle", style.slug)}
                    name={style.name}
                    description={style.description}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">What to show</CardTitle>
            <CardDescription>
              Switch off anything your event does not need. Sections with
              nothing in them are hidden anyway.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {TOGGLEABLE_SECTIONS.map((section) => {
              const visible = !values.hiddenSections.includes(section.slug);

              return (
                <div
                  key={section.slug}
                  className="flex items-start justify-between gap-4"
                >
                  <div className="space-y-0.5">
                    <Label htmlFor={`section-${section.slug}`}>
                      {section.name}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {section.description}
                    </p>
                  </div>
                  <Switch
                    id={`section-${section.slug}`}
                    checked={visible}
                    onCheckedChange={(checked) =>
                      toggleSection(section.slug, checked)
                    }
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
