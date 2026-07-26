import { afterEach, describe, expect, it } from "vitest";
import { features } from "./features";

/**
 * Flags are read at call time (never destructured at module load), which is what
 * lets these tests set an environment variable and read the result back without
 * re-importing the module.
 */

const KEY = "NEXT_PUBLIC_FEATURE_TEMPLATE_MARKETPLACE";
const PAYMENTS = "NEXT_PUBLIC_FEATURE_PAYMENTS";

afterEach(() => {
  delete process.env[KEY];
  delete process.env[PAYMENTS];
});

describe("feature flags", () => {
  it("uses the default when the variable is absent", () => {
    expect(features.templateMarketplace).toBe(true);
    expect(features.payments).toBe(false);
  });

  it("treats a declared-but-empty variable as unset, not as off", () => {
    // The real failure this guards: scaffolding .env.local from .env.example
    // leaves every key present with a blank value. Reading that as an explicit
    // `false` switched off the marketplace, builder, media, PDF and booking on
    // a fresh checkout, and the pages 404'd with nothing to explain why.
    process.env[KEY] = "";
    expect(features.templateMarketplace).toBe(true);

    process.env[PAYMENTS] = "";
    expect(features.payments).toBe(false);
  });

  it("ignores surrounding whitespace", () => {
    process.env[KEY] = "  ";
    expect(features.templateMarketplace).toBe(true);

    process.env[PAYMENTS] = " true ";
    expect(features.payments).toBe(true);
  });

  it("accepts 'true' and '1' as on", () => {
    process.env[PAYMENTS] = "true";
    expect(features.payments).toBe(true);

    process.env[PAYMENTS] = "1";
    expect(features.payments).toBe(true);
  });

  it("treats any other value as off — turning a feature on must be explicit", () => {
    for (const value of ["false", "0", "no", "off", "yes"]) {
      process.env[KEY] = value;
      expect(features.templateMarketplace).toBe(false);
    }
  });

  it("keeps payments off by default — the one capability still dark", () => {
    expect(features.payments).toBe(false);
  });
});
