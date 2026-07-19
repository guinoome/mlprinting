import type { AssetUsage } from "./types";

/**
 * Virtual folder computation — design doc Decision 1.
 *
 * Folders are views computed at read time, never a stored `Folder` table:
 * Ph4.md §2 wants assets "automatically organized by Event," but §9 requires
 * that one asset may be referenced by many invitations, which a single-owner
 * folder model cannot express. This module takes a flat asset pool plus the
 * usage join and produces the two views the Asset Browser's view switcher
 * offers — "By Event" and "By Type" — without ever writing anything down.
 */

export interface EventFolder {
  invitationId: string;
  title: string;
  /** MediaSlot value -> ordered asset ids referenced in that slot for this event. */
  bySlot: Record<string, string[]>;
  /** Every asset id referenced anywhere in this event, deduplicated. */
  assetIds: string[];
}

export interface ByEventView {
  events: EventFolder[];
  /** Asset ids referenced by no invitation at all. */
  unsorted: string[];
}

export function computeByEvent(
  assetIds: string[],
  usages: AssetUsage[],
): ByEventView {
  const eventsById = new Map<string, EventFolder>();
  const referenced = new Set<string>();

  for (const usage of usages) {
    referenced.add(usage.assetId);

    let folder = eventsById.get(usage.invitationId);
    if (!folder) {
      folder = {
        invitationId: usage.invitationId,
        title: usage.invitationTitle,
        bySlot: {},
        assetIds: [],
      };
      eventsById.set(usage.invitationId, folder);
    }

    if (!folder.bySlot[usage.slot]) folder.bySlot[usage.slot] = [];
    if (!folder.bySlot[usage.slot].includes(usage.assetId)) {
      folder.bySlot[usage.slot].push(usage.assetId);
    }
    if (!folder.assetIds.includes(usage.assetId)) {
      folder.assetIds.push(usage.assetId);
    }
  }

  return {
    events: [...eventsById.values()],
    unsorted: assetIds.filter((id) => !referenced.has(id)),
  };
}

export interface ByTypeView {
  /** tag -> asset ids carrying it. */
  tags: Record<string, string[]>;
  /** Asset ids carrying no tags at all. */
  untagged: string[];
}

export function computeByType(
  assets: { id: string; tags: string[] }[],
): ByTypeView {
  const tags: Record<string, string[]> = {};
  const untagged: string[] = [];

  for (const asset of assets) {
    if (asset.tags.length === 0) {
      untagged.push(asset.id);
      continue;
    }
    for (const tag of asset.tags) {
      if (!tags[tag]) tags[tag] = [];
      tags[tag].push(asset.id);
    }
  }

  return { tags, untagged };
}
