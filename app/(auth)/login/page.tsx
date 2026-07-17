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
      <div className="mb-8 space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to manage your events and orders.
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
