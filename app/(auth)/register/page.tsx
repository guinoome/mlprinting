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
      <div className="mb-8 space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="text-sm text-muted-foreground">
          Start designing your event invitations.
        </p>
      </div>

      <SetupNotice />

      <RegisterForm />
    </div>
  );
}
