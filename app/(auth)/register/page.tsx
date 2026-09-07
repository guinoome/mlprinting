import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RegisterForm } from "@/features/auth/components/register-form";
import { SetupNotice } from "@/components/setup-notice";
import { features } from "@/lib/config";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create an ML Digital Event Platform account.",
};

export default function RegisterPage() {
  // The flag gates the route, not just the form. Leaving the page reachable
  // while the action refuses invites the obvious "why is this here?".
  if (!features.registration) notFound();

  return (
    <div>
      <div className="mb-8 space-y-3">
        <p className="auth-form-kicker">Begin your invitation</p>
        <h1 className="font-serif text-4xl leading-none tracking-tight sm:text-5xl">
          Create your account
        </h1>
        <p className="max-w-md text-base leading-relaxed text-muted-foreground">
          Keep your event details, approvals, orders, and shared invitation in
          one place.
        </p>
      </div>

      <SetupNotice />

      <RegisterForm />
    </div>
  );
}
