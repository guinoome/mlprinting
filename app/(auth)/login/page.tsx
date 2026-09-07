import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/login-form";
import { SetupNotice } from "@/components/setup-notice";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the ML Digital Event Platform.",
};

export default function LoginPage() {
  return (
    <div>
      <div className="mb-8 space-y-3">
        <p className="auth-form-kicker">Your event studio</p>
        <h1 className="font-serif text-4xl leading-none tracking-tight sm:text-5xl">
          Welcome back
        </h1>
        <p className="max-w-md text-base leading-relaxed text-muted-foreground">
          Continue designing, approving, and sharing your invitations.
        </p>
      </div>

      <SetupNotice />

      {/* LoginForm reads searchParams via useSearchParams, which opts the route
          into client-side rendering unless it sits behind a Suspense boundary. */}
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
