"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  COLORS,
  ORIENTATIONS,
  STYLES,
  STYLE_LABELS,
  type Category,
  type ColorName,
  type GalleryFilters,
  type Orientation,
  type Style,
} from "../types";

/** Swatches for the colour filter, so the control looks like what it filters. */
const COLOR_SWATCH: Record<ColorName, string> = {
  pink: "#e9b8c0",
  blue: "#9bc0cc",
  cream: "#efe6d4",
  gold: "#d8b968",
  green: "#a8c0a4",
  black: "#3a3f48",
  neutral: "#cfc7b6",
  purple: "#bfa8dd",
};

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </h3>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

/** Add or remove one value from a filter array without mutating it. */
function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

export function FilterPanel({
  filters,
  onChange,
  onClear,
  onClose,
}: {
  filters: GalleryFilters;
  onChange: (next: GalleryFilters) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-sm font-semibold">All filters</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Group title="Category">
          {CATEGORIES.map((c: Category) => (
            <Chip
              key={c}
              active={filters.categories.includes(c)}
              onClick={() =>
                onChange({ ...filters, categories: toggle(filters.categories, c) })
              }
            >
              {CATEGORY_LABELS[c]}
            </Chip>
          ))}
        </Group>

        <Group title="Style">
          {STYLES.map((s: Style) => (
            <Chip
              key={s}
              active={filters.styles.includes(s)}
              onClick={() =>
                onChange({ ...filters, styles: toggle(filters.styles, s) })
              }
            >
              {STYLE_LABELS[s]}
            </Chip>
          ))}
        </Group>

        <Group title="Colour">
          {COLORS.map((c: ColorName) => (
            <Chip
              key={c}
              active={filters.colors.includes(c)}
              onClick={() =>
                onChange({ ...filters, colors: toggle(filters.colors, c) })
              }
            >
              <span
                className="size-3 rounded-full ring-1 ring-inset ring-black/15"
                style={{ backgroundColor: COLOR_SWATCH[c] }}
                aria-hidden="true"
              />
              <span className="capitalize">{c}</span>
            </Chip>
          ))}
        </Group>

        <Group title="Orientation">
          {ORIENTATIONS.map((o: Orientation) => (
            <Chip
              key={o}
              active={filters.orientations.includes(o)}
              onClick={() =>
                onChange({
                  ...filters,
                  orientations: toggle(filters.orientations, o),
                })
              }
            >
              <span className="capitalize">{o}</span>
            </Chip>
          ))}
        </Group>
      </div>
    </div>
  );
}
