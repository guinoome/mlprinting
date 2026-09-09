import { ClipboardCheck, MailOpen, Printer, QrCode } from "lucide-react";
import { HIGHLIGHTS, type Highlight } from "../content";

/** Icon names in content.ts resolve here, so the copy file stays free of imports. */
const ICONS = {
  "mail-open": MailOpen,
  "clipboard-check": ClipboardCheck,
  printer: Printer,
  "qr-code": QrCode,
} as const satisfies Record<Highlight["icon"], unknown>;

export function FeatureHighlights() {
  return (
    <section id="what-it-does" className="bg-[#10120f] text-white">
      <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
        <header className="grid gap-6 md:grid-cols-[1fr_.75fr] md:items-end">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#dfbd7e]">
              From first tap to final head count
            </p>
            <h2 className="mt-5 max-w-3xl text-balance font-serif text-5xl leading-[0.96] tracking-[-0.04em] md:text-7xl">
              Beauty that keeps working.
            </h2>
          </div>
          <p className="text-white/58 max-w-md border-l border-white/15 pl-6 text-sm leading-7">
            One guest journey carries the story, practical details, replies and
            matching print—without asking anyone to install an app.
          </p>
        </header>

        <ul className="mt-14 grid border-t border-white/15 sm:grid-cols-2 lg:grid-cols-4">
          {HIGHLIGHTS.map((highlight, index) => {
            const Icon = ICONS[highlight.icon];
            return (
              <li
                key={highlight.title}
                className="border-b border-white/15 py-8 sm:px-6 lg:border-r lg:px-7 lg:last:border-r-0 sm:[&:nth-child(odd)]:border-r"
              >
                <div className="flex items-center justify-between text-[#dfbd7e]">
                  <span className="font-serif text-3xl">0{index + 1}</span>
                  <Icon className="size-5" aria-hidden="true" />
                </div>
                <h3 className="mt-10 font-serif text-2xl leading-tight">
                  {highlight.title}
                </h3>
                <p className="text-white/58 mt-4 text-sm leading-7">
                  {highlight.body}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
