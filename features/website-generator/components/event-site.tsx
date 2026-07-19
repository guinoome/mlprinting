import type { PreviewModel } from "@/lib/invitation/preview-model";
import { shows } from "@/lib/invitation/preview-model";
import { Countdown } from "./countdown";

/**
 * The public website's render — Ph5.md. Mirrors
 * features/invitation-builder/preview/invitation-preview.tsx's section
 * structure and shows() calls so section visibility matches the in-app
 * preview exactly, but as a full standalone page: bigger type, a maps link
 * per venue, and an uncapped gallery. RSVP submission is added in Task 10.
 */

function Section({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto mt-10 max-w-xl px-4 first:mt-0">
      {title ? (
        <h2 className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.2em] opacity-70">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}

export function EventSite({
  model,
  countdownTarget,
}: {
  invitationId: string;
  model: PreviewModel;
  countdownTarget: Date | null;
}) {
  const { style } = model;

  const background =
    style.backgroundStyle === "soft-gradient"
      ? `linear-gradient(160deg, ${style.background} 0%, ${style.accent}22 100%)`
      : style.background;

  return (
    <div
      className="min-h-screen pb-16"
      style={{ background, color: style.foreground, fontFamily: style.bodyFont }}
    >
      {model.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={model.coverImageUrl}
          alt=""
          className="h-64 w-full object-cover sm:h-96"
        />
      ) : null}

      <header className="mx-auto mt-10 max-w-xl px-4 text-center">
        {shows(model, "welcome", Boolean(model.welcomeMessage)) ? (
          <p className="mb-4 text-sm italic opacity-80">
            {model.welcomeMessage}
          </p>
        ) : null}

        <h1
          className="text-4xl leading-tight sm:text-5xl"
          style={{ fontFamily: style.headingFont }}
        >
          {model.title}
        </h1>
        {model.subtitle ? (
          <p className="mt-2 opacity-75">{model.subtitle}</p>
        ) : null}

        {model.dateLine ? (
          <p
            className="mt-6 text-sm font-medium"
            style={{ color: style.accent }}
          >
            {model.dateLine}
            {model.timeLine ? ` · ${model.timeLine}` : ""}
          </p>
        ) : null}
      </header>

      {countdownTarget ? (
        <Section>
          <Countdown targetDate={countdownTarget} />
        </Section>
      ) : null}

      {shows(model, "hosts", model.hosts.length > 0) ? (
        <Section>
          <p
            className="text-center text-xl"
            style={{ fontFamily: style.headingFont }}
          >
            {model.hosts.map((host) => host.name).join("  ·  ")}
          </p>
        </Section>
      ) : null}

      {model.invitationMessage ? (
        <Section>
          <p className="whitespace-pre-line text-center leading-relaxed opacity-90">
            {model.invitationMessage}
          </p>
        </Section>
      ) : null}

      {shows(model, "parents", model.parents.length > 0) ? (
        <Section title="Parents">
          <ul className="space-y-1 text-center">
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
        <Section title="Principal Sponsors">
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-center">
            {model.sponsors.map((person) => (
              <li key={person.id}>{person.name}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      {shows(model, "venues", model.venues.length > 0) ? (
        <Section title="Where">
          <div className="space-y-6">
            {model.venues.map((venue) => (
              <div key={venue.id} className="text-center">
                <p className="text-[10px] uppercase tracking-widest opacity-60">
                  {venue.label}
                  {venue.timeLine ? ` · ${venue.timeLine}` : ""}
                </p>
                <p className="font-medium">{venue.name}</p>
                {venue.address ? (
                  <p className="text-sm opacity-70">{venue.address}</p>
                ) : null}
                {venue.mapsUrl ? (
                  <a
                    href={venue.mapsUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-1 inline-block text-sm underline"
                    style={{ color: style.accent }}
                  >
                    View on Google Maps
                  </a>
                ) : null}
                {venue.parkingNotes ? (
                  <p className="mt-1 text-xs opacity-60">
                    {venue.parkingNotes}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {shows(model, "program", model.program.length > 0) ? (
        <Section title="Programme">
          <ul className="mx-auto max-w-sm space-y-2">
            {model.program.map((item) => (
              <li key={item.id} className="flex gap-4">
                <span className="w-16 shrink-0 text-right text-sm opacity-60">
                  {item.time ?? ""}
                </span>
                <span>
                  {item.title}
                  {item.description ? (
                    <span className="block text-sm opacity-60">
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
        <Section>
          <div className="mx-auto grid max-w-2xl grid-cols-2 gap-2 px-4 sm:grid-cols-3">
            {model.galleryUrls.map((url) => (
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
        <Section title="Dress code">
          <p className="text-center">{model.dressCode}</p>
        </Section>
      ) : null}

      {shows(model, "gifts", Boolean(model.giftsPreference)) ? (
        <Section title="Gifts">
          <p className="whitespace-pre-line text-center opacity-90">
            {model.giftsPreference}
          </p>
        </Section>
      ) : null}

      {shows(model, "notes", Boolean(model.specialNotes)) ? (
        <Section title="Notes">
          <p className="whitespace-pre-line text-center opacity-90">
            {model.specialNotes}
          </p>
        </Section>
      ) : null}

      {shows(model, "rsvp", Boolean(model.rsvpLine)) ? (
        <Section>
          <p
            className="text-center text-sm font-medium"
            style={{ color: style.accent }}
          >
            {model.rsvpLine}
          </p>
        </Section>
      ) : null}

      {model.closingMessage ? (
        <Section>
          <p className="text-center italic opacity-80">
            {model.closingMessage}
          </p>
        </Section>
      ) : null}
    </div>
  );
}
