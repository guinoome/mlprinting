import { TESTIMONIALS } from "../content";

/**
 * Sample quotes, labelled as samples.
 *
 * ML Printing has not supplied customer quotes yet. Inventing three and
 * printing them as real reviews would mislead every visitor who reads them, and
 * a testimonial is worthless the moment a reader suspects that anyway — so the
 * section says what these are. It comes out the day there are real ones.
 */
export function Testimonials() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-20">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <h2 className="text-balance font-serif text-3xl leading-tight tracking-tight">
            What a customer might say.
          </h2>
          <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Sample copy
          </span>
        </div>

        <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
          Illustrative examples, not real reviews — we will put genuine customer
          words here once we have them.
        </p>

        <ul className="mt-10 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((testimonial) => (
            <li
              key={testimonial.attribution}
              className="rounded-xl border border-border bg-muted/30 p-6"
            >
              <blockquote className="font-serif text-lg leading-snug">
                “{testimonial.quote}”
              </blockquote>
              <p className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">
                {testimonial.attribution}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
