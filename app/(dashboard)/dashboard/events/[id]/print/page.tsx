import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/session";
import { features, routes } from "@/lib/config";
import { findInvitationForPrint, listGenerations } from "@/services/pdf";
import { PrintPanel } from "@/features/pdf-generation/components/print-panel";
import { formatBytes } from "@/lib/utils";

export const metadata: Metadata = { title: "Print file — ML-DEP" };

export default async function PrintPage({
  params,
}: {
  params: { id: string };
}) {
  if (!features.pdfGeneration) notFound();

  const profile = await getProfile();
  if (!profile) redirect(routes.login);

  const invitation = await findInvitationForPrint(profile.id, params.id);
  if (!invitation) notFound();

  const generations = await listGenerations(profile.id, params.id);

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Print file</h1>
        <p className="text-sm text-muted-foreground">
          A press-ready PDF of “{invitation.title}” — CMYK, 3 mm bleed, fonts
          embedded.
        </p>
      </header>

      <PrintPanel invitationId={invitation.id} />

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Previous versions</h2>
        {generations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing generated yet. Every file you build is kept here.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {generations.map((generation) => (
              <li
                key={generation.id}
                className="flex items-center justify-between gap-4 p-3 text-sm"
              >
                <span>
                  Version {generation.version} ·{" "}
                  {generation.pageSize.replace(/_/g, " ")} ·{" "}
                  {generation.createdAt.toLocaleDateString()}
                  {generation.bytes ? ` · ${formatBytes(generation.bytes)}` : ""}
                </span>
                {generation.status === "READY" ? (
                  <Link
                    href={`/api/pdf/${generation.id}`}
                    className="font-medium underline"
                  >
                    Download
                  </Link>
                ) : (
                  <span className="text-muted-foreground">
                    {generation.status === "FAILED" ? "Failed" : "Building…"}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
