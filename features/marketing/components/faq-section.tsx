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
    <section id="questions" className="bg-[#f4f0e8] text-[#171713]">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:grid-cols-[.75fr_1.25fr] md:px-8 md:py-28">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[.28em] text-[#8b6735]">
            Before you begin
          </p>
          <h2 className="mt-5 text-balance font-serif text-5xl leading-[.96] tracking-[-.04em] md:text-6xl">
            Questions, answered beautifully.
          </h2>
          <p className="mt-6 max-w-sm text-sm leading-7 text-black/55">
            Guests need no account. Your photographs remain yours. Every live
            experience is designed to work across phone, tablet, and desktop.
          </p>
        </div>

        <div className="divide-y divide-black/15 border-y border-black/15">
          {FAQS.map((faq) => (
            <details key={faq.question} className="group py-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-serif text-xl [&::-webkit-details-marker]:hidden">
                {faq.question}
                <Plus
                  className="size-4 shrink-0 text-black/45 transition-transform duration-200 group-open:rotate-45"
                  aria-hidden="true"
                />
              </summary>
              <p className="text-black/58 mt-4 max-w-2xl text-sm leading-7">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
