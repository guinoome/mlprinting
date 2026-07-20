"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { generatePrintFileAction, initialPrintState } from "../actions";

/**
 * The print form and its result — Ph6.md §1, §9.
 *
 * Blocking issues and warnings are styled differently on purpose. A warning the
 * customer can proceed past, dressed as an error, teaches them to ignore the
 * real errors too.
 */

const SIZES = [
  { value: "FIVE_BY_SEVEN", label: '5" × 7" (127 × 178 mm)' },
  { value: "A5", label: "A5 (148 × 210 mm)" },
  { value: "A6", label: "A6 (105 × 148 mm)" },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Building the file…" : "Generate print file"}
    </Button>
  );
}

export function PrintPanel({ invitationId }: { invitationId: string }) {
  const [state, formAction] = useFormState(
    generatePrintFileAction,
    initialPrintState,
  );

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="invitationId" value={invitationId} />

        <div className="space-y-2">
          <Label htmlFor="pageSize">Card size</Label>
          <select
            id="pageSize"
            name="pageSize"
            defaultValue="FIVE_BY_SEVEN"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {SIZES.map((size) => (
              <option key={size.value} value={size.value}>
                {size.label}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="cropMarks"
            defaultChecked
            className="size-4"
          />
          Include crop marks and bleed
        </label>

        <SubmitButton />
      </form>

      {state.message ? (
        <p
          className={
            state.status === "success"
              ? "text-sm text-muted-foreground"
              : "text-sm text-destructive"
          }
        >
          {state.message}
        </p>
      ) : null}

      {state.report && state.report.blocking.length > 0 ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">
            Fix these before printing
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-destructive">
            {state.report.blocking.map((issue, index) => (
              <li key={`${issue.code}-${index}`}>{issue.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {state.report && state.report.warnings.length > 0 ? (
        <div className="rounded-md border bg-muted p-4">
          <p className="text-sm font-medium">Worth a look</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {state.report.warnings.map((issue, index) => (
              <li key={`${issue.code}-${index}`}>{issue.message}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
