import type { Metadata } from "next";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { SetupNotice } from "@/components/setup-notice";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

/**
 * Reached from a recovery email, by way of /auth/callback — which exchanges the
 * emailed code for a session before sending the customer here.
 *
 * Deliberately not guarded by a session check of its own. A customer whose link
 * expired should meet the form and a clear "request a new one", not a redirect
 * to sign in — which is the one thing they already cannot do.
 */
export default function ResetPasswordPage() {
  return (
    <div>
      <div className="mb-8 space-y-2 text-center">
        <h1 className="font-serif text-3xl tracking-tight">New password</h1>
        <p className="text-sm text-muted-foreground">
          Choose something you can remember. You&apos;ll be signed in
          afterwards.
        </p>
      </div>

      <SetupNotice />
      <ResetPasswordForm />
    </div>
  );
}
