"use client";

import * as React from "react";
import Link from "next/link";
import { useFormState } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  publishAction,
  unpublishAction,
  type PublishFormState,
} from "../actions";
import { normalizeSlug } from "../slug";

const initialState: PublishFormState = {};

/**
 * Publish control — Ph5.md's "Manage website" surface. After a successful
 * publish/unpublish, the parent Server Component page re-fetches (each
 * action calls revalidatePath) and passes fresh props down — the same
 * pattern Phase 4's AssetDetailSheet already relies on, so this component
 * derives its displayed state from props, not from the form action's
 * returned state (which only ever carries an error message here).
 */
export function PublishForm({
  invitationId,
  currentSlug,
  isPublished,
  publicUrl,
}: {
  invitationId: string;
  currentSlug: string | null;
  isPublished: boolean;
  publicUrl: string | null;
}) {
  const [publishState, runPublish] = useFormState(publishAction, initialState);
  const [unpublishState, runUnpublish] = useFormState(
    unpublishAction,
    initialState,
  );
  const [slug, setSlug] = React.useState(currentSlug ?? "");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {isPublished ? "Your website is live" : "Publish your website"}
        </CardTitle>
        <CardDescription>
          {isPublished
            ? "Share the link or QR code below with your guests."
            : "Choose a web address for your guests to visit."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPublished && publicUrl ? (
          <div className="space-y-3">
            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
              <Link
                href={publicUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="underline"
              >
                {publicUrl}
              </Link>
            </div>

            {currentSlug ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/qr/${currentSlug}`}
                alt="QR code linking to your website"
                className="size-40 rounded border border-border"
              />
            ) : null}

            {/* Confirm first, same as deleting a draft (see
                features/invitation-builder/components/draft-menu.tsx). Taking a
                live site down is reversible — the slug is kept, so republishing
                restores the same URL and any QR code already printed — but a
                misclick that darkens a site mid-event is still worth a beat. */}
            <form
              action={runUnpublish}
              onSubmit={(event) => {
                const confirmed = window.confirm(
                  "Take your website offline? Guests will no longer be able to view it. You can republish anytime — the web address stays yours.",
                );
                if (!confirmed) event.preventDefault();
              }}
            >
              <input type="hidden" name="invitationId" value={invitationId} />
              <Button type="submit" variant="outline">
                Unpublish
              </Button>
            </form>
            {unpublishState.error ? (
              <p role="alert" className="text-sm text-destructive">
                {unpublishState.error}
              </p>
            ) : null}
          </div>
        ) : (
          <form action={runPublish} className="space-y-3">
            <input type="hidden" name="invitationId" value={invitationId} />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/e/</span>
              <Input
                name="slug"
                value={slug}
                onChange={(event) => setSlug(normalizeSlug(event.target.value))}
                placeholder="ana-and-ben-2026"
                required
              />
            </div>
            {publishState.error ? (
              <p role="alert" className="text-sm text-destructive">
                {publishState.error}
              </p>
            ) : null}
            <Button type="submit">Publish</Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
