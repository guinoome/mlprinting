import { z } from "zod";

/**
 * Account input schemas — Ph1.md §5.
 *
 * Note what is not here: email. Changing an email is an identity change that
 * Supabase gates behind a confirmation round trip to both addresses, and
 * treating it as an ordinary profile field is how an account gets taken over by
 * a typo. It belongs with its own flow, not this form.
 */

export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(80, "Name must be 80 characters or fewer."),
});

export const preferencesSchema = z.object({
  theme: z.enum(["LIGHT", "DARK", "SYSTEM"]),
  // Checkboxes are absent from FormData when unchecked, so the action coerces
  // presence to boolean before parsing rather than making these optional.
  emailNotifications: z.boolean(),
  marketingEmails: z.boolean(),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type PreferencesInput = z.infer<typeof preferencesSchema>;
