"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { routes, features } from "@/lib/config";
import { loginSchema, registerSchema, changePasswordSchema } from "./schema";
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
      emailRedirectTo: `${env.app.url}${routes.dashboard.root}`,
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
