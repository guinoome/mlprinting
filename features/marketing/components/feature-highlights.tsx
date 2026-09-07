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
    <section className="border-b border-border">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-20">
        <h2 className="max-w-lg text-balance font-serif text-3xl leading-tight tracking-tight">
          Everything an invitation has to do.
        </h2>

        <ul className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {HIGHLIGHTS.map((highlight) => {
            const Icon = ICONS[highlight.icon];
            return (
              <li key={highlight.title}>
                <Icon
                  className="size-5 text-muted-foreground"
                  aria-hidden="true"
                />
                <h3 className="mt-4 font-medium">{highlight.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
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
