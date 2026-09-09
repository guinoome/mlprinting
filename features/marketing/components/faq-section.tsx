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
    <section className="border-t border-black/[0.12] bg-[#f5f0e7] text-[#181714]">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 md:px-8 md:py-28 lg:grid-cols-[.7fr_1fr]">
        <header>
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#8b6735]">
            Before you choose
          </p>
          <h2 className="mt-4 max-w-lg text-balance font-serif text-5xl leading-[0.96] tracking-[-0.04em] md:text-6xl">
            The practical details, beautifully simple.
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-7 text-black/[0.58]">
            Guests open a link. You keep the replies. The printed suite can
            carry the same visual story.
          </p>
        </header>

        <div className="divide-y divide-black/[0.15] border-y border-black/[0.15]">
          {FAQS.map((faq) => (
            <details key={faq.question} className="group py-6">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-serif text-xl [&::-webkit-details-marker]:hidden">
                {faq.question}
                <Plus
                  className="size-5 shrink-0 text-[#8b6735] transition-transform duration-200 group-open:rotate-45"
                  aria-hidden="true"
                />
              </summary>
              <p className="mt-4 max-w-2xl pr-10 text-sm leading-7 text-black/[0.58]">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
