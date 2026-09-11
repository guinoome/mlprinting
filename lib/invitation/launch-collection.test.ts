import { describe, expect, it } from "vitest";
import { LAUNCH_COLLECTION_SLUGS } from "./launch-collection";

describe("public launch collection", () => {
  it("includes the release-gated Starlight birthday experience", () => {
    expect(LAUNCH_COLLECTION_SLUGS).toContain("starlight-pony-dreamscape");
  });
});
