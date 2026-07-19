"use client";

import * as React from "react";
import Link from "next/link";
import { useFormState } from "react-dom";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { PreviewPane } from "../../preview/invitation-preview";
import type { PreviewModel } from "@/lib/invitation/preview-model";
import { completeDraft, type SaveState } from "../../actions";
import type { StepIssue } from "../../completeness";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { routes } from "@/lib/config";
import { notify } from "@/lib/hooks/use-toast";

const initialState: SaveState = {};

/**
 * Preview and finish — Ph3.md §1 steps 8 and 10, §10.
 *
 * The end of Phase 3. "Continue to Order" marks the dataset complete and stops:
 * the order flow is Ph7, and Ph3.md's Out of Scope forbids building it. Saying
 * so plainly beats a button that goes nowhere.
 */
export function PreviewStep({
  invitationId,
  model,
  issues,
  isCompleted,
}: {
  invitationId: string;
  model: PreviewModel;
  issues: StepIssue[];
  isCompleted: boolean;
}) {
  const [state, formAction] = useFormState(completeDraft, initialState);

  React.useEffect(() => {
    if (state.error)
      notify.error({ title: "Not finished yet", description: state.error });
  }, [state.error]);

  const blocked = issues.length > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <PreviewPane model={model} />

      <aside className="space-y-4">
        {isCompleted ? (
          <Card>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="size-5" aria-hidden="true" />
                <p className="text-sm font-medium">Invitation finished</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Your invitation details are complete and saved. Ordering and
                printing arrive in a later phase — we will pick this up from
                here.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href={routes.dashboard.events}>Back to my events</Link>
              </Button>
            </CardContent>
          </Card>
        ) : blocked ? (
          <Card>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center gap-2">
                <AlertCircle
                  className="size-4 text-warning"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium">Before you finish</p>
              </div>

              {/* Each issue links to the step that fixes it. "Cannot finish"
                  with no route forward is a dead end. */}
              <ul className="space-y-1.5">
                {issues.map((issue) => (
                  <li
                    key={`${issue.step}-${issue.message}`}
                    className="text-sm"
                  >
                    <Link
                      href={`${routes.builder}/${invitationId}/${issue.step}`}
                      className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {issue.message}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="space-y-3 p-5">
              <p className="text-sm font-medium">Ready to finish</p>
              <p className="text-sm text-muted-foreground">
                Everything required is filled in. You can still come back and
                change any of it.
              </p>
              <form action={formAction}>
                <input type="hidden" name="invitationId" value={invitationId} />
                <Button type="submit" className="w-full">
                  Finish invitation
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <p className="px-1 text-xs text-muted-foreground">
          The preview approximates the finished piece. The event website and the
          press-ready file are produced in later phases.
        </p>
      </aside>
    </div>
  );
}
