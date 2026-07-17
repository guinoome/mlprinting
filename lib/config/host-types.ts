/**
 * Host type presets — Ph3.md §3 ("Support configurable host types").
 *
 * Config, not a database table — unlike template categories (Ph2.md §1), which
 * had to be rows because the marketplace filters and joins on them. Nothing
 * filters on a host role: it is a label on a name, and the presets exist to
 * save the customer typing. `InvitationHost.role` accepts any slug, so a host
 * type that is not listed here still stores and renders.
 *
 * Presets are grouped by event type because the useful list differs: a wedding
 * offers Bride and Groom, a debut offers Debutant. Offering all of them at once
 * is the "complex design software" feel Ph3.md's UI Requirements warn against.
 */

export interface HostTypePreset {
  slug: string;
  label: string;
  /** Suggested when the event type matches and the customer adds their first host. */
  suggested?: boolean;
}

/**
 * Keyed by event type slug, mirroring TemplateCategory.slug.
 * `default` is the fallback for an event type with no specific list.
 */
export const HOST_TYPE_PRESETS: Record<string, HostTypePreset[]> = {
  wedding: [
    { slug: "bride", label: "Bride", suggested: true },
    { slug: "groom", label: "Groom", suggested: true },
    { slug: "partner", label: "Partner" },
  ],
  debut: [{ slug: "debutant", label: "Debutant", suggested: true }],
  birthday: [{ slug: "celebrant", label: "Celebrant", suggested: true }],
  christening: [
    { slug: "child", label: "Child", suggested: true },
    { slug: "godparent", label: "Godparent" },
  ],
  anniversary: [{ slug: "couple", label: "Couple", suggested: true }],
  graduation: [{ slug: "graduate", label: "Graduate", suggested: true }],
  corporate: [
    { slug: "company", label: "Company", suggested: true },
    { slug: "organization", label: "Organisation" },
  ],
  default: [
    { slug: "celebrant", label: "Celebrant", suggested: true },
    { slug: "family", label: "Family" },
    { slug: "organization", label: "Organisation" },
  ],
};

/** Always offered, whatever the event. Ph3.md §3 lists Family and Organization. */
const UNIVERSAL: HostTypePreset[] = [
  { slug: "family", label: "Family" },
  { slug: "organization", label: "Organisation" },
];

/**
 * The host types to offer for an event type.
 * De-duplicated, because several presets already include Family.
 */
export function hostTypesFor(
  eventType: string | null | undefined,
): HostTypePreset[] {
  const specific =
    HOST_TYPE_PRESETS[eventType ?? ""] ?? HOST_TYPE_PRESETS.default!;
  const merged = [...specific];

  for (const universal of UNIVERSAL) {
    if (!merged.some((preset) => preset.slug === universal.slug))
      merged.push(universal);
  }
  return merged;
}

/** Display label for a stored role slug. Falls back to the slug so an unlisted role still renders. */
export function hostTypeLabel(slug: string): string {
  for (const presets of Object.values(HOST_TYPE_PRESETS)) {
    const found = presets.find((preset) => preset.slug === slug);
    if (found) return found.label;
  }
  const universal = UNIVERSAL.find((preset) => preset.slug === slug);
  if (universal) return universal.label;

  return slug.charAt(0).toUpperCase() + slug.slice(1);
}
