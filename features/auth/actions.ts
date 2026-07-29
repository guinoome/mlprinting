"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { routes, features } from "@/lib/config";
import {
  loginSchema,
  registerSchema,
  changePasswordSchema,
  emailSchema,
} from "./schema";
import {
  type ActionState as SharedActionState,
  fieldErrorsFrom,
} from "@/lib/forms/action-state";
import { safeRedirect } from "./redirect";

/**
 * Auth Server Actions — Ph1.md §4.
 *
 * Every action re-validates its input. These are public HTTP endpoints that
 * happen to look like functions: the client-side form validation next to them
 * is a convenience, and a request can arrive without ever passing through it.
 */

/**
 * Re-exported for the auth forms that already import it from here. The type
 * itself moved to lib/forms once a third feature needed it — see
 * docs/folder-structure.md.
 */
export type { ActionState } from "@/lib/forms/action-state";

const NOT_CONFIGURED: SharedActionState = {
  error:
    "Authentication is not configured on this deployment yet. See docs/deployment-workflow.md.",
};

export async function login(
  _prevState: SharedActionState,
  formData: FormData,
): Promise<SharedActionState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Log the real reason, show a generic one. Distinguishing "no such account"
    // from "wrong password" tells an attacker which emails are registered.
    logger.warn("Login failed", { reason: error.message });
    return { error: "Invalid email or password." };
  }

  // The session cookie was just set; anything cached under the signed-out
  // session is now wrong.
  revalidatePath("/", "layout");
  redirect(safeRedirect(formData.get("redirectTo")?.toString()));
}

export async function register(
  _prevState: SharedActionState,
  formData: FormData,
): Promise<SharedActionState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  if (!features.registration) {
    return { error: "Registration is currently closed." };
  }

  const parsed = registerSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const { displayName, email, password } = parsed.data;
  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      // The callback, not the dashboard. Supabase puts a one-time code in this
      // link and something has to exchange it for a session; sending customers
      // straight to the dashboard meant arriving with a code, no session, and a
      // bounce back to login — after doing exactly what the email asked.
      emailRedirectTo: `${env.app.url}${routes.authCallback}?next=${encodeURIComponent(routes.dashboard.root)}`,
    },
  });

  if (error) {
    logger.warn("Registration failed", { reason: error.message });
    return { error: error.message };
  }

  // No session means the project requires email confirmation. Say so plainly
  // rather than redirecting to a dashboard that will bounce them to login.
  if (!data.session) {
    return {
      message: "Check your inbox to confirm your email address, then sign in.",
    };
  }

  revalidatePath("/", "layout");
  redirect(routes.dashboard.root);
}

export async function logout(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) logger.report(error, { at: "logout" });
  }

  revalidatePath("/", "layout");
  redirect(routes.home);
}

/**
 * Ask for a recovery email.
 *
 * Always reports success, even for an address with no account. The alternative
 * turns this form into a way to ask "does this person bank with you" — and a
 * customer who mistypes their own email learns nothing useful from "no such
 * account" either, because the honest answer is that they mistyped it.
 */
export async function requestPasswordReset(
  _prevState: SharedActionState,
  formData: FormData,
): Promise<SharedActionState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { fieldErrors: { email: "Enter a valid email address." } };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    // Through the callback, so the code becomes a session before the customer
    // reaches a form that needs one to change their password.
    redirectTo: `${env.app.url}${routes.authCallback}?next=${encodeURIComponent(routes.resetPassword)}`,
  });

  if (error) {
    // Logged, not shown. Supabase rate-limits this endpoint, and "too many
    // requests" is still not something to confirm an address with.
    logger.warn("Password reset request failed", { reason: error.message });
  }

  return {
    message:
      "If that address has an account, a reset link is on its way. Check your inbox.",
  };
}

/**
 * Set a new password after following a recovery link.
 *
 * The callback has already exchanged the emailed code for a session, so this is
 * changePassword with different wording — updateUser acts on the session's own
 * user, and there is no id to pass and no way to target somebody else. A caller
 * without a session gets Supabase's own refusal.
 */
export async function resetPassword(
  _prevState: SharedActionState,
  formData: FormData,
): Promise<SharedActionState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const parsed = changePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    logger.warn("Password reset failed", { reason: error.message });
    return {
      error:
        "That reset link has expired or was already used. Request a new one.",
    };
  }

  revalidatePath("/", "layout");
  redirect(routes.dashboard.root);
}

export async function changePassword(
  _prevState: SharedActionState,
  formData: FormData,
): Promise<SharedActionState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const parsed = changePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const supabase = createClient();

  // updateUser acts on the session's own user, so there is no id to pass and no
  // way for this to target somebody else's account.
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    logger.warn("Password change failed", { reason: error.message });
    return { error: error.message };
  }

  return { message: "Password updated." };
}
