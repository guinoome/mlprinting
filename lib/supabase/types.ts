import type { CookieOptions } from "@supabase/ssr";

/**
 * Argument type for @supabase/ssr's `setAll` cookie callback.
 *
 * @supabase/ssr types the `cookies` option as a union of its current and
 * deprecated method shapes, so TypeScript cannot contextually infer the
 * callback's parameters — they arrive as implicit `any` and fail strict mode.
 * Annotating with this type restores inference at the call sites.
 */
export type CookiesToSet = {
  name: string;
  value: string;
  options: CookieOptions;
}[];
