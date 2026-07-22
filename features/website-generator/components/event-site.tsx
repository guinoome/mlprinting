import type {
  EventKind,
  PreviewModel,
  PreviewStyle,
} from "@/lib/invitation/preview-model";
import { shows } from "@/lib/invitation/preview-model";
import { Countdown } from "./countdown";
import { RsvpForm } from "./rsvp-form";
import { InvitationShell, type ConfettiConfig } from "./invitation-shell";
import { Typewriter } from "./typewriter";
import { InvitationActions } from "./invitation-actions";
import { MusicPlayer } from "./music-player";

/** The hero's opening line, tuned to the celebration. */
const EYEBROW: Record<EventKind, string> = {
  wedding: "Together with our families",
  debut: "A debut celebration",
  birthday: "Let's celebrate",
  christening: "With joyful hearts",
  anniversary: "Celebrating years together",
  graduation: "With pride and joy",
  corporate: "You are cordially invited",
  general: "You're invited",
};

/** Confetti shape per celebration — petals for weddings, stars for debuts, and so on. */
const CONFETTI_SHAPE: Record<EventKind, ConfettiConfig["shape"]> = {
  wedding: "petal",
  christening: "petal",
  debut: "star",
  anniversary: "star",
  birthday: "rect",
  graduation: "rect",
  corporate: "rect",
  general: "circle",
};

/**
 * The public invitation — Ph5. A guest opens a shared link (usually on a phone,
 * in a group chat), so this is built as a real digital invitation, not a
 * document: a sealed envelope that opens, a full-bleed hero, and sections that
 * reveal as you scroll. It wears the customer's own theme — every colour and
 * font comes from `model.style`, which the envelope and hero pick up through
 * the --inv-* variables set on the shell.
 *
 * Section visibility still mirrors the in-app preview's shows() calls exactly,
 * so what the customer approves is what a guest sees.
 */

/** Deterministic petals for the hero — a little ambient motion, no randomness to desync on hydration. */
const PETALS = [
  { left: 6, dur: 9, delay: 0, size: 9 },
  { left: 18, dur: 11, delay: 1.5, size: 12 },
  { left: 30, dur: 8, delay: 3, size: 7 },
  { left: 42, dur: 12.5, delay: 0.8, size: 11 },
  { left: 55, dur: 10, delay: 2.2, size: 8 },
  { left: 67, dur: 13, delay: 4, size: 13 },
  { left: 79, dur: 9.5, delay: 1, size: 9 },
  { left: 89, dur: 11.5, delay: 3.4, size: 10 },
  { left: 96, dur: 8.5, delay: 2.8, size: 7 },
];

function hexToRgb(hex: string): [number, number, number] | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  let h = match[1]!;
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** hex + alpha → rgba(), passing the input through unchanged if it isn't a hex colour. */
function rgba(hex: string, alpha: number): string {
  const c = hexToRgb(hex);
  return c ? `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})` : hex;
}

/** Blend two hex colours; t=0 is `a`, t=1 is `b`. Used to derive envelope and hero tones from the theme. */
function mix(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  if (!ca || !cb) return a;
  const r = ca.map((v, i) => Math.round(v + (cb[i]! - v) * t));
  return `rgb(${r[0]}, ${r[1]}, ${r[2]})`;
}

/** First alphabetic letter of up to two names — the monogram on the seal and the hero. */
function initials(source: string[]): string {
  const letters: string[] = [];
  for (const s of source) {
    const m = /[a-z]/i.exec(s);
    if (m) letters.push(m[0].toUpperCase());
    if (letters.length === 2) break;
  }
  return letters.join("");
}

function invVars(style: PreviewStyle): React.CSSProperties {
  return {
    "--inv-heading": style.headingFont,
    "--inv-bg": style.background,
    "--inv-bg2": mix(style.background, style.accent, 0.16),
    "--inv-fg": style.foreground,
    "--inv-accent": style.accent,
    "--inv-soft": mix(style.background, style.accent, 0.28),
    "--inv-paper": mix(style.background, "#ffffff", 0.55),
    "--inv-line": rgba(style.accent, 0.28),
    "--inv-surface": rgba(style.foreground, 0.045),
  } as React.CSSProperties;
}

/** Festive confetti colours drawn from the theme, with gold and white for sparkle. */
function confettiColors(style: PreviewStyle): string[] {
  return [
    style.accent,
    mix(style.accent, "#ffffff", 0.4),
    "#d4af37",
    mix(style.accent, style.background, 0.35),
    "#ffffff",
  ];
}

/** A Google Calendar "add event" link, so a guest can save the date in one tap. */
function calendarUrl(
  title: string,
  start: Date,
  location: string | undefined,
): string {
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${fmt(start)}/${fmt(end)}`,
  });
  if (location) params.set("location", location);
  return `https://www.google.com/calendar/render?${params.toString()}`;
}

function Section({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="inv-section" data-reveal>
      {label ? <p className="inv-label">{label}</p> : null}
      {children}
    </section>
  );
}

export function EventSite({
  invitationId,
  model,
  countdownTarget,
}: {
  invitationId: string;
  model: PreviewModel;
  countdownTarget: Date | null;
}) {
  const { style } = model;

  const coupleLine =
    model.hosts.length > 0
      ? model.hosts.map((h) => h.name).join(" & ")
      : model.title;
  const monogram =
    initials(
      model.hosts.length > 0
        ? model.hosts.map((h) => h.name)
        : model.title.split(/\s+/),
    ) || "✦";

  const bodyBackground =
    style.backgroundStyle === "soft-gradient"
      ? `linear-gradient(160deg, ${style.background} 0%, ${rgba(style.accent, 0.13)} 100%)`
      : style.background;
  const heroFallback = `linear-gradient(160deg, ${mix(style.background, style.accent, 0.55)}, ${style.accent})`;

  const dateHero = model.dateLine
    ? `${model.dateLine}${model.timeLine ? ` · ${model.timeLine}` : ""}`
    : null;

  const eyebrow = EYEBROW[model.eventKind];
  const confetti: ConfettiConfig = {
    colors: confettiColors(style),
    shape: CONFETTI_SHAPE[model.eventKind],
  };
  const calendar = countdownTarget
    ? calendarUrl(
        model.title,
        countdownTarget,
        model.venues[0]?.address ?? model.venues[0]?.name ?? undefined,
      )
    : null;

  return (
    <InvitationShell
      monogram={monogram}
      coupleLine={coupleLine}
      confetti={confetti}
      style={invVars(style)}
    >
      <div
        className="pb-4"
        style={{
          background: bodyBackground,
          color: style.foreground,
          fontFamily: style.bodyFont,
        }}
      >
        {/* Hero */}
        <header
          className="inv-hero"
          style={model.coverImageUrl ? undefined : { background: heroFallback }}
        >
          {model.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={model.coverImageUrl} alt="" className="inv-hero-photo" />
          ) : null}
          <div className="inv-hero-scrim" />
          {PETALS.map((p) => (
            <span
              key={p.left}
              className="inv-petal"
              style={{
                left: `${p.left}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                animationDuration: `${p.dur}s`,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}

          <div className="inv-hero-top">
            <div className="inv-mono">{monogram}</div>
          </div>

          <div className="inv-hero-inner">
            <Typewriter text={eyebrow} className="inv-eyebrow" />
            <h1 className="inv-names">{model.title}</h1>
            {model.subtitle ? (
              <p className="inv-hero-sub">{model.subtitle}</p>
            ) : null}
            {dateHero ? <p className="inv-hero-date">{dateHero}</p> : null}
            <div className="inv-hero-rule" />
          </div>

          <div className="inv-scroll-cue" aria-hidden="true">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </header>

        <main className="inv-main">
          {shows(model, "welcome", Boolean(model.welcomeMessage)) ? (
            <Section>
              <p className="inv-lead">{model.welcomeMessage}</p>
            </Section>
          ) : null}

          {countdownTarget ? (
            <Section>
              <div className="inv-ornament" aria-hidden="true" />
              <Countdown targetDate={countdownTarget} />
            </Section>
          ) : null}

          {calendar ? (
            <Section>
              <InvitationActions title={model.title} calendarUrl={calendar} />
            </Section>
          ) : null}

          {model.invitationMessage ? (
            <Section>
              <p className="inv-lead" style={{ whiteSpace: "pre-line" }}>
                {model.invitationMessage}
              </p>
            </Section>
          ) : null}

          {shows(model, "hosts", model.hosts.length > 0) ? (
            <Section>
              <p className="inv-couplet">
                {model.hosts.map((h) => h.name).join("  &  ")}
              </p>
            </Section>
          ) : null}

          {shows(model, "parents", model.parents.length > 0) ? (
            <Section label="Parents">
              <ul className="inv-list">
                {model.parents.map((person) => (
                  <li key={person.id}>
                    {person.name}
                    {person.role ? (
                      <span style={{ opacity: 0.6 }}> — {person.role}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {shows(model, "sponsors", model.sponsors.length > 0) ? (
            <Section label="Principal Sponsors">
              <ul className="inv-list">
                {model.sponsors.map((person) => (
                  <li key={person.id}>{person.name}</li>
                ))}
              </ul>
            </Section>
          ) : null}

          {shows(model, "venues", model.venues.length > 0) ? (
            <Section label="Where">
              <div>
                {model.venues.map((venue) => (
                  <div key={venue.id} className="inv-venue">
                    <p className="inv-venue-k">
                      {venue.label}
                      {venue.timeLine ? ` · ${venue.timeLine}` : ""}
                    </p>
                    <p className="inv-venue-n">{venue.name}</p>
                    {venue.address ? (
                      <p className="inv-venue-a">{venue.address}</p>
                    ) : null}
                    {venue.mapsUrl ? (
                      <a
                        href={venue.mapsUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inv-maplink"
                      >
                        View on Google Maps
                      </a>
                    ) : null}
                    {venue.parkingNotes ? (
                      <p className="inv-venue-a" style={{ marginTop: 8 }}>
                        {venue.parkingNotes}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {shows(model, "program", model.program.length > 0) ? (
            <Section label="Programme">
              <div className="inv-timeline">
                {model.program.map((item) => (
                  <div key={item.id} className="inv-timeline-item">
                    <span className="inv-timeline-time">{item.time ?? ""}</span>
                    <span>
                      {item.title}
                      {item.description ? (
                        <span
                          style={{
                            display: "block",
                            fontSize: 13,
                            opacity: 0.6,
                          }}
                        >
                          {item.description}
                        </span>
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {shows(model, "gallery", model.galleryUrls.length > 0) ? (
            <Section>
              <div className="inv-gallery">
                {model.galleryUrls.map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={url} src={url} alt="" />
                ))}
              </div>
            </Section>
          ) : null}

          {shows(model, "dress-code", Boolean(model.dressCode)) ? (
            <Section label="Dress code">
              <p style={{ textAlign: "center" }}>{model.dressCode}</p>
            </Section>
          ) : null}

          {shows(model, "gifts", Boolean(model.giftsPreference)) ? (
            <Section label="Gifts">
              <p style={{ textAlign: "center", whiteSpace: "pre-line", opacity: 0.9 }}>
                {model.giftsPreference}
              </p>
            </Section>
          ) : null}

          {shows(model, "notes", Boolean(model.specialNotes)) ? (
            <Section label="Notes">
              <p style={{ textAlign: "center", whiteSpace: "pre-line", opacity: 0.9 }}>
                {model.specialNotes}
              </p>
            </Section>
          ) : null}

          {shows(model, "rsvp", true) ? (
            <Section label="RSVP">
              <div className="inv-rsvp">
                {model.rsvpLine ? (
                  <p
                    className="mb-3"
                    style={{
                      fontFamily: style.headingFont,
                      fontStyle: "italic",
                      opacity: 0.85,
                    }}
                  >
                    {model.rsvpLine}
                  </p>
                ) : null}
                <RsvpForm invitationId={invitationId} accentColor={style.accent} />
              </div>
            </Section>
          ) : null}

          {model.closingMessage ? (
            <Section>
              <p className="inv-lead">{model.closingMessage}</p>
            </Section>
          ) : null}

          <p className="inv-footer">{coupleLine} · Made with ML Printing</p>
        </main>

        {model.musicUrl ? <MusicPlayer src={model.musicUrl} /> : null}
      </div>
    </InvitationShell>
  );
}
