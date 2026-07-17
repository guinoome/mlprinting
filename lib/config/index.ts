/**
 * Centralised configuration — Ph1.md §10.
 *
 * Branding, URLs, feature flags. Environment and deployment values stay in
 * lib/env.ts, which is the only module that touches process.env for secrets.
 */

export { branding } from "./branding";
export { routes } from "./routes";
export { features } from "./features";
