"use client";

import * as React from "react";
import { Monitor, Smartphone, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { shows, type PreviewModel, type PreviewSurface } from "@/lib/invitation/preview-model";

/**
 * The live preview — Ph3.md §10.
 *
 * Renders the resolved view model. It reads `model.style` and never the design
 * vocabulary: the resolution happened in model.ts, and a renderer that looked up
 * a colour theme itself would be a second place for the preview and the real
 * output to disagree.
 *
 * Styles are inline rather than Tailwind classes, which is the one place in this
 * codebase that is correct. The whole point is that these values come from the
 * customer's choices at runtime; a Tailwind class cannot express a colour that
 * is not known at build time, and the design tokens in globals.css are the
 * *application's* palette, not the invitation's.
 *
 * Not the website generator. Ph5 owns that (see model.ts).
 */

const SURFACES: { id: PreviewSurface; label: string; icon: typeof Monitor }[] =
  [
    { id: "desktop", label: "Desktop", icon: Monitor },
    { id: "mobile", label: "Mobile", icon: Smartphone },
    { id: "print", label: "Print", icon: Printer },
  ];

/** Frame per surface — Ph3.md §10 requires all three. */
const FRAME: Record<PreviewSurface, string> = {
  desktop: "w-full",
  mobile: "w-[320px] mx-auto",
  // A4-ish. "Print Preview (basic)" per §10 — Ph6 owns real press output.
  print: "w-[420px] mx-auto aspect-[1/1.414]",
};

function Section({
  title,
  children,
  style,
}: {
  title?: string;
  children: React.ReactNode;
  style: PreviewModel["style"];
}) {
  return (
    <section className="mt-6 first:mt-0">
      {title ? (
        <h3
          className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.2em]"
          style={{ color: style.accent, fontFamily: style.bodyFont }}
        >
          {title}
        </h3>
      ) : null}
      {children}
    </section>
  );
}

export function InvitationPreview({
  model,
  surface,
  className,
}: {
  model: PreviewModel;
  surface: PreviewSurface;
  className?: string;
}) {
  const { style } = model;

  const background =
    style.backgroundStyle === "soft-gradient"
      ? `linear-gradient(160deg, ${style.background} 0%, ${style.accent}22 100%)`
      : style.background;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border shadow-sm",
        FRAME[surface],
        className,
      )}
      style={{
        background,
        color: style.foreground,
        fontFamily: style.bodyFont,
      }}
    >
      <div
        className={cn(
          "p-6 sm:p-8",
          style.backgroundStyle === "bordered" && "m-3 border sm:m-4",
          surface === "print" && "h-full overflow-hidden",
        )}
        style={
          style.backgroundStyle === "bordered"
            ? { borderColor: `${style.accent}80` }
            : undefined
        }
      >
        {model.coverImageUrl ? (
          // A plain <img>: the src is a short-lived signed URL, which next/image
          // would try to optimise and cache past its expiry.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={model.coverImageUrl}
            alt=""
            className="mb-6 h-40 w-full rounded object-cover"
          />
        ) : null}

        {shows(model, "welcome", Boolean(model.welcomeMessage)) ? (
          <p
            className="mb-4 text-center text-xs italic opacity-80"
            style={{ fontFamily: style.bodyFont }}
          >
            {model.welcomeMessage}
          </p>
        ) : null}

        <header className="text-center">
          <h2
            className="text-2xl leading-tight"
            style={{ fontFamily: style.headingFont, color: style.foreground }}
          >
            {model.title}
          </h2>
          {model.subtitle ? (
            <p className="mt-1 text-sm opacity-75">{model.subtitle}</p>
          ) : null}

          {model.dateLine ? (
            <p
              className="mt-4 text-sm font-medium"
              style={{ color: style.accent, fontFamily: style.bodyFont }}
            >
              {model.dateLine}
              {model.timeLine ? ` · ${model.timeLine}` : ""}
            </p>
          ) : null}
        </header>

        {shows(model, "hosts", model.hosts.length > 0) ? (
          <Section style={style}>
            <p
              className="text-center text-lg"
              style={{ fontFamily: style.headingFont }}
            >
              {model.hosts.map((host) => host.name).join("  ·  ")}
            </p>
          </Section>
        ) : null}

        {model.invitationMessage ? (
          <Section style={style}>
            <p className="whitespace-pre-line text-center text-sm leading-relaxed opacity-90">
              {model.invitationMessage}
            </p>
          </Section>
        ) : null}

        {shows(model, "parents", model.parents.length > 0) ? (
          <Section title="Parents" style={style}>
            <ul className="space-y-0.5 text-center text-sm">
              {model.parents.map((person) => (
                <li key={person.id}>
                  {person.name}
                  {person.role ? (
                    <span className="opacity-60"> — {person.role}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {shows(model, "sponsors", model.sponsors.length > 0) ? (
          <Section title="Principal Sponsors" style={style}>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-center text-sm">
              {model.sponsors.map((person) => (
                <li key={person.id}>{person.name}</li>
              ))}
            </ul>
          </Section>
        ) : null}

        {shows(model, "venues", model.venues.length > 0) ? (
          <Section title="Where" style={style}>
            <div className="space-y-3">
              {model.venues.map((venue) => (
                <div key={venue.id} className="text-center text-sm">
                  <p className="text-[10px] uppercase tracking-widest opacity-60">
                    {venue.label}
                    {venue.timeLine ? ` · ${venue.timeLine}` : ""}
                  </p>
                  <p className="font-medium">{venue.name}</p>
                  {venue.address ? (
                    <p className="text-xs opacity-70">{venue.address}</p>
                  ) : null}
                  {venue.parkingNotes ? (
                    <p className="mt-0.5 text-[11px] opacity-60">
                      {venue.parkingNotes}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        {shows(model, "program", model.program.length > 0) ? (
          <Section title="Programme" style={style}>
            <ul className="mx-auto max-w-xs space-y-1 text-sm">
              {model.program.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <span className="w-16 shrink-0 text-right text-xs opacity-60">
                    {item.time ?? ""}
                  </span>
                  <span>
                    {item.title}
                    {item.description ? (
                      <span className="block text-xs opacity-60">
                        {item.description}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {shows(model, "gallery", model.galleryUrls.length > 0) ? (
          <Section style={style}>
            <div className="grid grid-cols-3 gap-1.5">
              {model.galleryUrls.slice(0, 6).map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={url}
                  src={url}
                  alt=""
                  className="aspect-square w-full rounded object-cover"
                />
              ))}
            </div>
          </Section>
        ) : null}

        {shows(model, "dress-code", Boolean(model.dressCode)) ? (
          <Section title="Dress code" style={style}>
            <p className="text-center text-sm">{model.dressCode}</p>
          </Section>
        ) : null}

        {shows(model, "gifts", Boolean(model.giftsPreference)) ? (
          <Section title="Gifts" style={style}>
            <p className="whitespace-pre-line text-center text-sm opacity-90">
              {model.giftsPreference}
            </p>
          </Section>
        ) : null}

        {shows(model, "notes", Boolean(model.specialNotes)) ? (
          <Section title="Notes" style={style}>
            <p className="whitespace-pre-line text-center text-sm opacity-90">
              {model.specialNotes}
            </p>
          </Section>
        ) : null}

        {shows(model, "rsvp", Boolean(model.rsvpLine)) ? (
          <Section style={style}>
            <p
              className="text-center text-sm font-medium"
              style={{ color: style.accent }}
            >
              {model.rsvpLine}
            </p>
          </Section>
        ) : null}

        {model.closingMessage ? (
          <Section style={style}>
            <p className="text-center text-sm italic opacity-80">
              {model.closingMessage}
            </p>
          </Section>
        ) : null}
      </div>
    </div>
  );
}

/** Preview with the surface switcher — Ph3.md §10. */
export function PreviewPane({ model }: { model: PreviewModel }) {
  const [surface, setSurface] = React.useState<PreviewSurface>("desktop");

  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="Preview surface" className="flex gap-1">
        {SURFACES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={surface === id}
            onClick={() => setSurface(id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              surface === id
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-lg bg-muted/40 p-3 sm:p-4">
        <InvitationPreview model={model} surface={surface} />
      </div>

      {surface === "print" ? (
        <p className="text-center text-[11px] text-muted-foreground">
          An approximation of the printed piece. The press-ready file is
          produced later, at full resolution with bleed and crop marks.
        </p>
      ) : null}
    </div>
  );
}
