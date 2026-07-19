import { describe, expect, it } from "vitest";
import { computeByEvent, computeByType } from "./folders";

describe("computeByEvent", () => {
  it("groups an asset under every invitation that references it", () => {
    const view = computeByEvent(
      ["asset-1", "asset-2"],
      [
        {
          assetId: "asset-1",
          invitationId: "inv-1",
          invitationTitle: "Ana & Ben",
          slot: "COVER",
        },
      ],
    );

    expect(view.events).toHaveLength(1);
    expect(view.events[0]).toMatchObject({
      invitationId: "inv-1",
      title: "Ana & Ben",
    });
    expect(view.events[0].bySlot.COVER).toEqual(["asset-1"]);
    expect(view.unsorted).toEqual(["asset-2"]);
  });

  it("puts one asset in two events when two invitations reference it — Ph4.md §9", () => {
    const view = computeByEvent(
      ["asset-1"],
      [
        {
          assetId: "asset-1",
          invitationId: "inv-1",
          invitationTitle: "Ana & Ben",
          slot: "COVER",
        },
        {
          assetId: "asset-1",
          invitationId: "inv-2",
          invitationTitle: "Debut — Carla",
          slot: "LOGO",
        },
      ],
    );

    expect(view.events).toHaveLength(2);
    expect(view.unsorted).toEqual([]);
  });

  it("sub-groups by slot within one event", () => {
    const view = computeByEvent(
      ["asset-1", "asset-2"],
      [
        {
          assetId: "asset-1",
          invitationId: "inv-1",
          invitationTitle: "Ana & Ben",
          slot: "COUPLE",
        },
        {
          assetId: "asset-2",
          invitationId: "inv-1",
          invitationTitle: "Ana & Ben",
          slot: "COUPLE",
        },
      ],
    );

    expect(view.events[0].bySlot.COUPLE).toEqual(["asset-1", "asset-2"]);
  });

  it("returns every asset unsorted when nothing references any of them", () => {
    const view = computeByEvent(["asset-1", "asset-2"], []);
    expect(view.events).toEqual([]);
    expect(view.unsorted).toEqual(["asset-1", "asset-2"]);
  });
});

describe("computeByType", () => {
  it("groups by tag, an asset appearing under each of its tags", () => {
    const view = computeByType([
      { id: "asset-1", tags: ["logo", "corporate"] },
      { id: "asset-2", tags: ["logo"] },
    ]);

    expect(view.tags.logo).toEqual(["asset-1", "asset-2"]);
    expect(view.tags.corporate).toEqual(["asset-1"]);
    expect(view.untagged).toEqual([]);
  });

  it("puts an asset with no tags in untagged", () => {
    const view = computeByType([{ id: "asset-1", tags: [] }]);
    expect(view.untagged).toEqual(["asset-1"]);
    expect(view.tags).toEqual({});
  });
});
