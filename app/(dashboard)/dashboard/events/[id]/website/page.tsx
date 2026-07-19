import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getProfile } from "@/lib/auth/session";
import { routes, features } from "@/lib/config";
import { getInvitationForManage } from "@/features/website-generator/repository";
import { PublishForm } from "@/features/website-generator/components/publish-form";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Manage Website" };

export const dynamic = "force-dynamic";

/**
 * Publish control — Ph5.md. A new dashboard surface, not an addition to
 * Phase 3's builder step registry: the builder still ends at "preview," and
 * this is what happens after a customer is done and ready to go live.
 */
export default async function EventWebsitePage({
  params,
}: {
  params: { id: string };
}) {
  if (!features.websiteGenerator) notFound();

  const profile = await getProfile();
  if (!profile) redirect(routes.login);

  const invitation = await getInvitationForManage(profile.id, params.id);
  if (!invitation) notFound();

  if (invitation.status !== "COMPLETED") {
    return (
      <>
        <PageHeader
          title="Manage website"
          breadcrumbs={[
            { label: "Dashboard", href: routes.dashboard.root },
            { label: "My Events", href: routes.dashboard.events },
            { label: "Website" },
          ]}
        />
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Finish this invitation in the builder before publishing it.
          </CardContent>
        </Card>
      </>
    );
  }

  const publicUrl = invitation.slug
    ? `${env.app.url}${routes.publicEvent(invitation.slug)}`
    : null;

  return (
    <>
      <PageHeader
        title="Manage website"
        description={`Publish "${invitation.title}" as a live website.`}
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard.root },
          { label: "My Events", href: routes.dashboard.events },
          { label: "Website" },
        ]}
      />

      <PublishForm
        invitationId={invitation.id}
        currentSlug={invitation.slug}
        isPublished={invitation.isPublished}
        publicUrl={publicUrl}
      />
    </>
  );
}
