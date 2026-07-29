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
  /** Drives both links below, so a page rename cannot leave them disagreeing. */
  facebookHandle: "mlprintingcebu",
} as const;

/**
 * Where customers actually reach ML Printing.
 *
 * Messenger matters more than email here. In Cebu a business enquiry arrives on
 * Messenger far more often than in an inbox, and someone who wants to ask about
 * a debut package before committing should not have to create an account to ask.
 * `m.me` is Messenger's own short link — on a phone it opens the app rather than
 * the mobile web page.
 */
export const social = {
  facebook: `https://facebook.com/${branding.facebookHandle}`,
  messenger: `https://m.me/${branding.facebookHandle}`,
} as const;
