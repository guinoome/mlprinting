"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { login, type ActionState } from "../actions";
import { FormField } from "@/components/form/form-field";
import { SubmitButton } from "@/components/form/submit-button";
import { FormStatus } from "@/components/form/form-status";
import { routes } from "@/lib/config";

const initialState: ActionState = {};

export function LoginForm() {
  const [state, formAction] = useFormState(login, initialState);
  const searchParams = useSearchParams();

  // Carried through the form so it survives the POST. The action sanitises it
  // before redirecting — see features/auth/redirect.ts.
  const redirectTo = searchParams.get("redirectTo") ?? "";

  /**
   * Set by /auth/callback when an emailed link could not be exchanged for a
   * session — expired, or already clicked. Without this the customer lands on a
   * blank sign-in form having just followed a link, with nothing to explain why
   * it did not work, and the natural conclusion is that the site is broken.
   */
  const linkFailed = searchParams.get("authError") === "link";

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="redirectTo" value={redirectTo} />

      {linkFailed && !state.error && !state.message ? (
        <FormStatus
          state={{
            error:
              "That link has expired or was already used. Sign in below, or request a new one.",
          }}
        />
      ) : null}

      <FormStatus state={state} />

      <FormField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        required
        error={state.fieldErrors?.email}
      />

      <FormField
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={state.fieldErrors?.password}
      />

      {/* Beside the password field, where somebody realises they have
          forgotten it — not buried under the sign-up prompt. */}
      <p className="-mt-2 text-right text-sm">
        <Link
          href={routes.forgotPassword}
          className="text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
        >
          Forgotten your password?
        </Link>
      </p>

      <SubmitButton className="w-full" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>

      <p className="text-center text-sm text-muted-foreground">
        No account?{" "}
        <Link
          href={routes.register}
          className="font-medium text-foreground hover:underline"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}
