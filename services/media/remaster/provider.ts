import { localRemasterProvider } from "./local-provider";
import type { RemasterProvider } from "./types";

/** Central provider seam: selection is explicit and auditable. */
export function getRemasterProvider(): RemasterProvider {
  return localRemasterProvider;
}
