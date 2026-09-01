import Image from "next/image";
import { ClipboardCheck, MailOpen, Printer, QrCode } from "lucide-react";
import { HIGHLIGHTS, type Highlight } from "../content";

const ITEMS = [
  {
    icon: MailOpen,
    image: "/experiences/capiz-window-hero.png",
    imageAlt: "Capiz wedding experience opening in warm ceremonial light",
  },
  {
    icon: ClipboardCheck,
    image: "/experiences/neon-eighteen-hero.png",
    imageAlt: "Neon debut experience with a cinematic event-stage atmosphere",
  },
  {
    icon: Printer,
    image: "/experiences/capiz-window-catalogue.png",
    imageAlt: "Filipino wedding couple framed by a luminous capiz installation",
  },
  {
    icon: QrCode,
    image: "/experiences/product-launch-catalogue.png",
    imageAlt: "Corporate product reveal staged in liquid blue light",
  },
] as const satisfies readonly {
  icon: typeof MailOpen;
  image: string;
  imageAlt: string;
}[];

export function FeatureHighlights() {
  return (
    <section className="bg-[#11100e] text-white">
      <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
        <header className="grid gap-6 border-b border-white/15 pb-12 md:grid-cols-[1fr_.75fr] md:items-end">
          <h2 className="max-w-3xl text-balance font-serif text-5xl leading-[.96] tracking-[-.04em] md:text-7xl">
            More than an invitation.
          </h2>
          <p className="max-w-lg text-sm leading-7 text-white/60">
            From the first reveal to the final reply, every part is designed as
            one connected guest experience—and every client can replace the
            sample imagery with their own photographs.
          </p>
        </header>

        <div className="mt-12 grid gap-px overflow-hidden bg-white/15 md:grid-cols-2 lg:grid-cols-4">
          {HIGHLIGHTS.map((highlight: Highlight, index) => {
            const item = ITEMS[index];
            const Icon = item.icon;
            return (
              <article
                key={highlight.title}
                className="group flex min-h-[32rem] flex-col bg-[#11100e]"
              >
                <div className="relative min-h-64 flex-1 overflow-hidden">
                  <Image
                    src={item.image}
                    alt={item.imageAlt}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw"
                    className="group-hover:saturate-110 object-cover transition duration-700 group-hover:scale-[1.035] motion-reduce:transition-none"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#11100e] via-transparent to-transparent" />
                </div>
                <div className="min-h-56 p-6">
                  <div className="flex items-center justify-between text-[#dfbd7e]">
                    <Icon className="size-5" aria-hidden="true" />
                    <span className="text-[9px] uppercase tracking-[.26em]">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-6 font-serif text-3xl leading-none">
                    {highlight.title}
                  </h3>
                  <p className="mt-4 text-sm leading-6 text-white/60">
                    {highlight.body}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
