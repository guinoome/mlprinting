import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { SetupNotice } from "@/components/setup-notice";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Request a link to choose a new password.",
  // Nothing to index, and a recovery form is not a landing page.
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <div>
      <div className="mb-8 space-y-2 text-center">
        <h1 className="font-serif text-3xl tracking-tight">
          Forgotten password
        </h1>
        <p className="text-sm text-muted-foreground">
          Tell us the address you signed up with and we&apos;ll send a link.
        </p>
      </div>

      <SetupNotice />
      <ForgotPasswordForm />
    </div>
  );
}
