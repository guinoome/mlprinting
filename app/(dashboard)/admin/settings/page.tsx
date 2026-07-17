import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { branding, features, routes } from "@/lib/config";
import { isAuthConfigured } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Settings",
};

/**
 * Platform settings — Ph1.md §3 (Settings Menu), §10 (Configuration).
 *
 * Read-only, deliberately. Phase 1 delivers *centralised* configuration, not
 * editable configuration: these values come from code and environment, and an
 * admin form that appears to change them while a redeploy silently reverts it
 * is worse than no form. Editing arrives with the phase that owns each setting.
 *
 * Renders no secret values — only whether configuration is present. A page that
 * echoes a key back is a page that leaks it into a screenshot.
 */

const FLAGS: { label: string; enabled: boolean; phase: string }[] = [
  {
    label: "Template Marketplace",
    enabled: features.templateMarketplace,
    phase: "Phase 2",
  },
  {
    label: "Invitation Builder",
    enabled: features.invitationBuilder,
    phase: "Phase 3",
  },
  { label: "Media Library", enabled: features.mediaLibrary, phase: "Phase 4" },
  {
    label: "PDF Generation",
    enabled: features.pdfGeneration,
    phase: "Phase 6",
  },
  { label: "Booking", enabled: features.booking, phase: "Phase 7" },
  { label: "Payments", enabled: features.payments, phase: "Phase 8" },
  {
    label: "Self-service registration",
    enabled: features.registration,
    phase: "Phase 1",
  },
];

function StatusRow({
  label,
  value,
  detail,
}: {
  label: string;
  value: boolean;
  detail: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      <span
        className={`flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ${
          value
            ? "bg-success/10 text-success"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {value ? (
          <Check className="size-3" aria-hidden="true" />
        ) : (
          <Minus className="size-3" aria-hidden="true" />
        )}
        {value ? "On" : "Off"}
      </span>
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Platform configuration. Read-only in Phase 1 — these values come from code and environment."
        breadcrumbs={[
          { label: "Admin", href: routes.admin.root },
          { label: "Settings" },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Branding</CardTitle>
            <CardDescription>
              Defined in lib/config/branding.ts.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <dl className="space-y-3">
              {[
                ["Company", branding.company],
                ["Product", branding.product],
                ["Short name", branding.shortName],
                ["Location", branding.location],
              ].map(([term, value]) => (
                <div key={term} className="flex justify-between gap-4">
                  <dt className="shrink-0 text-muted-foreground">{term}</dt>
                  <dd className="truncate text-right font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Environment</CardTitle>
            <CardDescription>
              Whether a backend is configured — never the values themselves.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StatusRow
              label="Authentication and database"
              detail="Supabase and Postgres connection"
              value={isAuthConfigured()}
            />
            <StatusRow
              label="Environment"
              detail={process.env.NODE_ENV ?? "unknown"}
              value={process.env.NODE_ENV === "production"}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Feature flags</CardTitle>
            <CardDescription>
              Business capabilities stay dark until their phase ships. Defined
              in lib/config/features.ts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {FLAGS.map(({ label, enabled, phase }) => (
              <StatusRow
                key={label}
                label={label}
                detail={phase}
                value={enabled}
              />
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
