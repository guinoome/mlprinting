import Link from "next/link";
import Image from "next/image";
import { CalendarDays, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { routes } from "@/lib/config";
import { completionPercent, type CompletenessSnapshot } from "@/lib/invitation/completeness";
import { DraftMenu } from "./draft-menu";

/**
 * A draft in the list — Ph3.md §11.
 *
 * Shows progress rather than a status word: "60%" answers "how much is left",
 * which is the question someone returning to five drafts is actually asking.
 */
export function DraftCard({
  draft,
  snapshot,
}: {
  draft: {
    id: string;
    title: string;
    status: string;
    eventTitle: string | null;
    eventDate: Date | null;
    updatedAt: Date;
    template: { name: string; coverImageUrl: string } | null;
  };
  snapshot: CompletenessSnapshot;
}) {
  const percent = completionPercent(snapshot);
  const completed = draft.status === "COMPLETED";

  return (
    <Card className="group relative overflow-hidden transition-colors hover:border-foreground/20">
      <CardContent className="flex gap-4 p-4">
        <Link
          href={`${routes.builder}/${draft.id}`}
          className="relative size-20 shrink-0 overflow-hidden rounded-md border border-border bg-muted"
          aria-hidden="true"
          tabIndex={-1}
        >
          {draft.template ? (
            <Image
              src={draft.template.coverImageUrl}
              alt=""
              fill
              sizes="80px"
              className="object-cover"
            />
          ) : null}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold">
                {/* The whole card is reachable through this one link — a card
                    wrapped in an anchor cannot also hold the menu button. */}
                <Link
                  href={`${routes.builder}/${draft.id}`}
                  className="after:absolute after:inset-0 hover:underline focus-visible:outline-none"
                >
                  {draft.title}
                </Link>
              </h3>
              <p className="truncate text-xs text-muted-foreground">
                {draft.template?.name ?? "No template yet"}
              </p>
            </div>

            {/* Above the card link's overlay, or it would be unclickable. */}
            <div className="relative z-10">
              <DraftMenu
                invitationId={draft.id}
                title={draft.title}
                status={draft.status}
              />
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {draft.eventDate ? (
              <span className="flex items-center gap-1">
                <CalendarDays className="size-3" aria-hidden="true" />
                {draft.eventDate.toLocaleDateString("en-PH", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  timeZone: "UTC",
                })}
              </span>
            ) : null}

            {completed ? (
              <span className="flex items-center gap-1 text-success">
                <CheckCircle2 className="size-3" aria-hidden="true" />
                Finished
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-14 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-foreground"
                    style={{ width: `${percent}%` }}
                  />
                </span>
                {percent}%
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
