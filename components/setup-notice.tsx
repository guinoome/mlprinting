import { AlertTriangle } from "lucide-react";
import { isAuthConfigured } from "@/lib/auth/session";

/**
 * Renders when the deployment has no Supabase/database configuration.
 *
 * Phase 1 builds and runs with no secrets by design, which means the auth forms
 * render but cannot possibly work. Without this notice the failure looks like a
 * bug in the form rather than an unfinished deployment step.
 *
 * Says nothing about which variable is missing: this is a public page, and the
 * shape of a deployment's configuration is not a stranger's business.
 */
export function SetupNotice() {
  if (isAuthConfigured()) return null;

  return (
    <div
      role="status"
      className="mb-6 flex items-start gap-2 rounded-md border border-warning/40 bg-warning/5 p-3 text-sm"
    >
      <AlertTriangle
        className="mt-0.5 size-4 shrink-0 text-warning"
        aria-hidden="true"
      />
      <div>
        <p className="font-medium">Setup incomplete</p>
        <p className="mt-0.5 text-muted-foreground">
          This deployment has no authentication backend configured yet, so
          signing in will not work.
        </p>
      </div>
    </div>
  );
}
