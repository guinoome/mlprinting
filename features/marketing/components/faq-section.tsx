import { Plus } from "lucide-react";
import { FAQS } from "../content";

/**
 * Native `<details>` rather than a JavaScript accordion: it opens before
 * hydration, works with the keyboard for free, is found by in-page search, and
 * ships no client bundle. The only script-adjacent piece is a CSS rotation on
 * the marker.
 */
export function FaqSection() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-3xl px-4 py-16 md:px-8 md:py-20">
        <h2 className="text-balance font-serif text-3xl leading-tight tracking-tight">
          Questions people ask.
        </h2>

        <div className="mt-8 divide-y divide-border border-y border-border">
          {FAQS.map((faq) => (
            <details key={faq.question} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                {faq.question}
                <Plus
                  className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-45"
                  aria-hidden="true"
                />
              </summary>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
