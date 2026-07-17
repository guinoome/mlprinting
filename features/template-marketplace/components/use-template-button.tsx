"use client";

import { useFormState, useFormStatus } from "react-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useTemplate, type UseTemplateState } from "../actions";

const initialState: UseTemplateState = {};

function Submit({ children, ...props }: ButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} aria-busy={pending} {...props}>
      {pending ? (
        <>
          <Loader2 className="animate-spin" aria-hidden="true" />
          Selecting…
        </>
      ) : (
        <>
          {children}
          <ArrowRight aria-hidden="true" />
        </>
      )}
    </Button>
  );
}

/**
 * "Use Template" — Ph2.md §2, and the last step of the §Success Criteria.
 *
 * A form posting to a Server Action, so the selection is recorded server-side
 * and the redirect decision (builder, or back here while Ph3 is unbuilt) lives
 * with the code that knows whether the builder exists.
 *
 * useFormState rather than a bare action, because the action can fail and the
 * customer needs to hear about it. Every success path redirects, so the only
 * state that ever renders here is an error.
 */
export function UseTemplateButton({
  slug,
  size,
  className,
}: {
  slug: string;
  size?: ButtonProps["size"];
  className?: string;
}) {
  const [state, formAction] = useFormState(useTemplate, initialState);

  return (
    <form action={formAction} className={className}>
      <input type="hidden" name="slug" value={slug} />
      <Submit size={size} className="w-full">
        Use this template
      </Submit>

      {state.error ? (
        <p role="alert" className="mt-2 text-xs font-medium text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
