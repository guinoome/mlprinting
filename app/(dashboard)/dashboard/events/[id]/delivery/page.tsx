import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Download, ExternalLink, FileText, Globe } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getProfile } from "@/lib/auth/session";
import { routes } from "@/lib/config";
import { env } from "@/lib/env";
import { formatBytes } from "@/lib/utils";
import { getDeliverySnapshot } from "@/features/delivery/repository";
import { deliveryReadiness } from "@/features/delivery/readiness";
import { DeliveryChecklist } from "@/features/delivery/components/delivery-checklist";

export const metadata: Metadata = { title: "Delivery" };
export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("en-PH", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/**
 * Delivery Center — Ph8.md §8.
 *
 * The one page that answers "is my thing ready, and where is it". Until now
 * that answer was spread across three: the website page knew whether it was
 * published, the print page knew whether a PDF existed, and the orders page
 * knew about the order. A customer had to visit all three and do the joining
 * themselves, which is work the platform should be doing.
 *
 * Ph8's payment module is paused at the owner's instruction, so the payment
 * step renders as not-required rather than being hidden — see readiness.ts for
 * why a missing step reads worse than an inert one.
 */
export default async function EventDeliveryPage({
  params,
}: {
  params: { id: string };
}) {
  const profile = await getProfile();
  if (!profile) redirect(routes.login);

  const snapshot = await getDeliverySnapshot(profile.id, params.id);
  if (!snapshot) notFound();

  const readiness = deliveryReadiness(snapshot);
  const publicUrl = snapshot.invitation.slug
    ? `${env.app.url}${routes.publicEvent(snapshot.invitation.slug)}`
    : null;
  const readyFiles = snapshot.files.filter((f) => f.status === "READY");

  return (
    <>
      <PageHeader
        title="Delivery"
        description={
          readiness.delivered
            ? "Everything is ready. Here is where to find it."
            : readiness.nextStep
              ? `Next: ${readiness.nextStep.detail}`
              : undefined
        }
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard.root },
          { label: "My Events", href: routes.dashboard.events },
          { label: "Delivery" },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          {/* What a customer actually came for, before the checklist that
              explains it. Someone whose invitation is live wants the link, not
              a report that the link exists. */}
          <Card>
            <CardContent className="space-y-4 p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Globe className="size-4" aria-hidden="true" />
                Invitation website
              </h2>

              {snapshot.invitation.isPublished && publicUrl ? (
                <div className="space-y-2">
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="break-all text-sm underline underline-offset-4"
                  >
                    {publicUrl}
                  </a>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <a href={publicUrl} target="_blank" rel="noreferrer noopener">
                        <ExternalLink aria-hidden="true" />
                        Open
                      </a>
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <Link href={routes.dashboard.eventWebsite(params.id)}>
                        Manage
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Not published yet, so there is nothing to share.
                  </p>
                  <Button asChild size="sm">
                    <Link href={routes.dashboard.eventWebsite(params.id)}>
                      Publish it
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="size-4" aria-hidden="true" />
                Print files
              </h2>

              {readyFiles.length > 0 ? (
                <ul className="space-y-2">
                  {readyFiles.map((file) => (
                    <li
                      key={file.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2.5"
                    >
                      <span className="min-w-0 text-sm">
                        <span className="font-medium">
                          Version {file.version}
                        </span>
                        <span className="text-muted-foreground">
                          {" · "}
                          {file.pageSize}
                          {file.bytes ? ` · ${formatBytes(file.bytes)}` : ""}
                          {" · "}
                          <time dateTime={file.createdAt.toISOString()}>
                            {DATE.format(file.createdAt)}
                          </time>
                        </span>
                      </span>
                      <Button asChild size="sm" variant="outline">
                        {/* Older versions stay downloadable on purpose — a
                            superseded file is history, not rubbish (Ph6 §12). */}
                        <a href={`/api/pdf/${file.id}`}>
                          <Download aria-hidden="true" />
                          Download
                        </a>
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    No print file is ready yet.
                  </p>
                  <Button asChild size="sm">
                    <Link href={routes.dashboard.eventPrint(params.id)}>
                      Generate one
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-3">
          <h2 className="text-sm font-semibold">Delivery status</h2>
          <DeliveryChecklist steps={readiness.steps} />
          {snapshot.order ? (
            <Button asChild size="sm" variant="ghost" className="w-full">
              <Link href={routes.dashboard.orders}>View order</Link>
            </Button>
          ) : null}
        </aside>
      </div>
    </>
  );
}
