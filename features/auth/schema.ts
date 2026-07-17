import { z } from "zod";

/**
 * Auth input schemas — Ph1.md §4.
 *
 * Shared by the client form and the Server Action. The client copy is a
 * courtesy that saves a round trip; the server copy is the one that matters,
 * because a request can arrive without ever touching our form.
 */

/**
 * Supabase enforces a minimum of 6 by default. 8 is the floor here — the extra
 * two characters cost the user nothing and remove the worst passwords.
 * No composition rules (upper/digit/symbol): they push users toward
 * "Password1!" and away from length, which is what actually helps.
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be 72 characters or fewer.");

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required.")
  .email("Enter a valid email address.")
  .toLowerCase();

export const loginSchema = z.object({
  email: emailSchema,
  // Not `passwordSchema`: an existing account may predate the current rules,
  // and telling someone their correct password is "too short" at the login
  // screen is a dead end. Length is a registration concern.
  password: z.string().min(1, "Password is required."),
});

export const registerSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(80, "Name must be 80 characters or fewer."),
  email: emailSchema,
  password: passwordSchema,
});

export const changePasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
