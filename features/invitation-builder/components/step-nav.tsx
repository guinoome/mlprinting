"use client";

import Link from "next/link";
import { Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/config";
import { BUILDER_STEPS } from "../steps";

/**
 * Step navigation — Ph3.md §1.
 *
 * Every step is reachable at any time. A wizard that locks step 4 until step 3
 * is perfect is the opposite of Ph3.md's "guided interview" — an interview lets
 * you say "I will come back to that". Completeness is shown, not enforced;
 * enforcement happens once, at Finish.
 *
 * Renders from BUILDER_STEPS, so a new step appears here with no edit.
 */
export function StepNav({
  invitationId,
  currentStep,
  incompleteSteps,
  layout = "sidebar",
  className,
}: {
  invitationId: string;
  currentStep: string;
  /** Required steps with something still missing — shown, not blocked. */
  incompleteSteps: string[];
  /**
   * `sidebar` is the vertical list beside the form. `strip` is the horizontal,
   * scrollable version for narrow screens — without it a phone user gets no
   * step navigation at all and has to page through eight steps with Back and
   * Next, unable to see where they are or jump back to fix something.
   */
  layout?: "sidebar" | "strip";
  className?: string;
}) {
  const blocked = new Set(incompleteSteps);
  const strip = layout === "strip";

  return (
    <nav
      aria-label="Builder steps"
      className={cn(
        strip
          ? // Scrolls within itself; the page never scrolls sideways.
            "-mx-4 flex snap-x gap-1 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          : "flex flex-col gap-0.5",
        className,
      )}
    >
      {BUILDER_STEPS.map((step, index) => {
        const active = step.slug === currentStep;
        const needsWork = blocked.has(step.slug);
        // "Done" only means something for a step that could be undone.
        const done = step.required && !needsWork;

        return (
          <Link
            key={step.slug}
            href={`${routes.builder}/${invitationId}/${step.slug}`}
            aria-current={active ? "step" : undefined}
            className={cn(
              "group flex items-center gap-2.5 rounded-md text-sm transition-colors",
              strip
                ? "shrink-0 snap-start border border-border px-3 py-2"
                : "gap-3 px-3 py-2",
              active
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold",
                done
                  ? "border-success bg-success text-success-foreground"
                  : needsWork
                    ? "border-warning text-warning"
                    : "border-border",
              )}
              aria-hidden="true"
            >
              {done ? (
                <Check className="size-3" />
              ) : needsWork ? (
                <AlertCircle className="size-3" />
              ) : (
                index + 1
              )}
            </span>

            <span
              className={cn(
                "min-w-0 truncate",
                strip ? "whitespace-nowrap" : "flex-1",
              )}
            >
              {step.label}
            </span>

            {needsWork ? (
              <span className="sr-only">(needs attention)</span>
            ) : null}
            {done ? <span className="sr-only">(complete)</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
