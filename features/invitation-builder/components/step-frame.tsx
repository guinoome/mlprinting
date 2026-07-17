import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { routes } from "@/lib/config";
import { cn } from "@/lib/utils";
import {
  getStep,
  nextStep,
  previousStep,
  stepNumber,
  BUILDER_STEPS,
} from "../steps";

/**
 * The frame every step renders inside — heading, description, and the
 * back/next pair.
 *
 * One component so the rhythm is identical across steps, which is most of what
 * makes a multi-step form feel like a guided interview rather than eight
 * different forms (Ph3.md UI Requirements).
 *
 * Next is a link, not a submit. Autosave has already saved the work (§8), so
 * navigation is navigation — and a Next that saves would make the customer
 * wonder what the Save button was for.
 */
export function StepFrame({
  invitationId,
  step,
  actions,
  children,
}: {
  invitationId: string;
  step: string;
  /** Rendered beside the heading — usually the save indicator. */
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const definition = getStep(step);
  if (!definition) return null;

  const previous = previousStep(step);
  const next = nextStep(step);
  const href = (slug: string) => `${routes.builder}/${invitationId}/${slug}`;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Step {stepNumber(step)} of {BUILDER_STEPS.length}
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">
            {definition.label}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {definition.description}
          </p>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>

      {children}

      <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
        {previous ? (
          <Link
            href={href(previous)}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <ArrowLeft aria-hidden="true" />
            {getStep(previous)!.label}
          </Link>
        ) : (
          <span />
        )}

        {next ? (
          <Link href={href(next)} className={cn(buttonVariants())}>
            {getStep(next)!.label}
            <ArrowRight aria-hidden="true" />
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
