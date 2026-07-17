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
  className,
}: {
  invitationId: string;
  currentStep: string;
  /** Required steps with something still missing — shown, not blocked. */
  incompleteSteps: string[];
  className?: string;
}) {
  const blocked = new Set(incompleteSteps);

  return (
    <nav
      aria-label="Builder steps"
      className={cn("flex flex-col gap-0.5", className)}
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
              "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
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

            <span className="min-w-0 flex-1 truncate">{step.label}</span>

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
