import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A semantic chapter in the invitation journey.
 *
 * The component owns the stable hooks used by the shared reveal engine. Event
 * renderers provide content and a stage name; they never choose animation
 * timings or transforms. This keeps choreography in the experience profile
 * instead of leaking it into invitation data.
 */
export function MotionStage({
  name,
  label,
  className,
  children,
}: {
  name: string;
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn("inv-section inv-motion-stage", className)}
      data-experience-stage={name}
      data-reveal
    >
      {label ? <p className="inv-label">{label}</p> : null}
      <div className="inv-stage-content">{children}</div>
    </section>
  );
}
