import { AlertCircle, Check, Circle, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DeliveryStep, DeliveryStepState } from "../readiness";

/**
 * The checklist — Ph8 §10, shown rather than merely computed.
 *
 * Each row states what the step is and what to do about it. A tick with no
 * sentence beside it answers "is it done" and leaves the customer with the
 * question they actually came with, which is what happens next.
 */

const ICON: Record<DeliveryStepState, typeof Check> = {
  done: Check,
  waiting: Circle,
  failed: AlertCircle,
  "not-required": Minus,
};

const TONE: Record<DeliveryStepState, string> = {
  done: "text-success border-success/40 bg-success/5",
  waiting: "text-muted-foreground border-border",
  failed: "text-destructive border-destructive/40 bg-destructive/5",
  "not-required": "text-muted-foreground border-dashed border-border",
};

const WORD: Record<DeliveryStepState, string> = {
  done: "Done",
  waiting: "Waiting",
  failed: "Needs attention",
  "not-required": "Not required",
};

export function DeliveryChecklist({ steps }: { steps: DeliveryStep[] }) {
  return (
    <ol className="space-y-2">
      {steps.map((step) => {
        const Icon = ICON[step.state];
        return (
          <li
            key={step.id}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3",
              TONE[step.state],
            )}
          >
            <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-medium text-foreground">
                {step.label}
                <span className="ml-2 text-xs font-normal opacity-70">
                  {WORD[step.state]}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">{step.detail}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
