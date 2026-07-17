/**
 * Branding — Ph1.md §10.
 *
 * Copy and identity live here, not inline in components. When ML Printing
 * finalises the brand, this file and the tokens in app/globals.css are the
 * only places that change.
 *
 * Colours are deliberately absent: they belong to the design tokens, so a
 * component reads `bg-primary` and never a value from this file.
 */

export const branding = {
  company: "ML Printing",
  product: "ML Digital Event Platform",
  shortName: "ML-DEP",
  tagline: "Premium event websites and matching printed invitations.",
  location: "Libo, Tayud, Consolacion, Cebu",
  supportEmail: "hello@mlprinting.example",
} as const;
