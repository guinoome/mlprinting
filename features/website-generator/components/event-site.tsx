import * as React from "react";
import type {
  EventKind,
  PreviewModel,
  PreviewStyle,
} from "@/lib/invitation/preview-model";
import { Countdown } from "./countdown";
import { RsvpForm } from "./rsvp-form";
import { InvitationShell, type ConfettiConfig } from "./invitation-shell";
import { Typewriter } from "./typewriter";
import { InvitationActions } from "./invitation-actions";
import { MusicPlayer } from "./music-player";
import { QrFooter } from "./qr-footer";
import { MUSIC_TRACKS, moodForEventKind } from "@/lib/invitation/music";
import { layoutFor } from "../layouts/registry";
import type { SectionId } from "../layouts/types";
import { visibleSections } from "../layouts/visible-sections";

/** The hero's opening line, tuned to the celebration. */
const EYEBROW: Record<EventKind, string> = {
  wedding: "Together with our families",
  engagement: "We said yes",
  debut: "A debut celebration",
  birthday: "Let's celebrate",
  christening: "With joyful hearts",
  "baby-shower": "A little one is on the way",
  anniversary: "Celebrating years together",
  graduation: "With pride and joy",
  corporate: "You are cordially invited",
  reunion: "Let us gather again",
  family: "Come and join us",
  fiesta: "Mabuhay — join the fiesta",
  religious: "With thanksgiving",
  community: "Everyone is welcome",
  funeral: "In loving memory",
  general: "You're invited",
};

/**
 * Which confetti shape a celebration fires — petals for weddings, stars for
 * debuts, and so on.
 *
 * Whether it fires at all is not decided here. That is `layout.celebratory`,
 * which is false for memorial, religious and community: a funeral notice is not
 * a celebration, and firing confetti over one would be worse than shipping no
 * animation. Their entries below are inert, and kept only so the table stays
 * total over EventKind.
 */
const CONFETTI_SHAPE: Record<EventKind, ConfettiConfig["shape"]> = {
  wedding: "petal",
  engagement: "petal",
  christening: "petal",
  "baby-shower": "petal",
  debut: "star",
  anniversary: "star",
  reunion: "star",
  birthday: "rect",
  graduation: "rect",
  corporate: "rect",
  fiesta: "rect",
  family: "circle",
  general: "circle",
  religious: "circle",
  community: "circle",
  funeral: "circle",
};

/**
 * The public invitation — Ph5. A guest opens a shared link (usually on a phone,
 * in a group chat), so this is built as a real digital invitation, not a
 * document: a sealed envelope that opens, a full-bleed hero, and sections that
 * reveal as you scroll. It wears the customer's own theme — every colour and
 * font comes from `model.style`, which the envelope and hero pick up through
 * the --inv-* variables set on the shell.
 *
 * Structure comes from the occasion's layout rather than from the order the
 * sections happen to be written in — see ../layouts. Visibility still mirrors
 * the in-app preview's shows() calls exactly, so what the customer approves is
 * what a guest sees.
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
  qrSrc,
}: {
  invitationId: string;
  model: PreviewModel;
  countdownTarget: Date | null;
  /**
   * QR image for this invitation. Every invitation closes with one; it is a
   * prop rather than something this component builds, because a published site
   * serves it from a cached route while a sample generates its own.
   */
  qrSrc?: string | null;
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

  const layout = layoutFor(model.eventKind);

  const eyebrow = EYEBROW[model.eventKind];
  const confetti: ConfettiConfig | undefined = layout.celebratory
    ? { colors: confettiColors(style), shape: CONFETTI_SHAPE[model.eventKind] }
    : undefined;
  const calendar = countdownTarget
    ? calendarUrl(
        model.title,
        countdownTarget,
        model.venues[0]?.address ?? model.venues[0]?.name ?? undefined,
      )
    : null;

  const order = visibleSections(model, layout, {
    hasCountdown: Boolean(countdownTarget),
    hasQr: Boolean(qrSrc),
  });

  /**
   * Every section the invitation can render, built once and then placed by the
   * layout's ordering. `order` has already decided which of these appear, so
   * the entries carry no emptiness checks of their own; the three that guard
   * below do it to narrow a nullable value, not to re-decide visibility.
   */
  const nodes: Record<SectionId, React.ReactNode> = {
    welcome: (
      <Section>
        <p className="inv-lead">{model.welcomeMessage}</p>
      </Section>
    ),

    countdown: countdownTarget ? (
      <Section>
        <div className="inv-ornament" aria-hidden="true" />
        <Countdown targetDate={countdownTarget} />
      </Section>
    ) : null,

    actions: calendar ? (
      <Section>
        <InvitationActions title={model.title} calendarUrl={calendar} />
      </Section>
    ) : null,

    invitation: (
      <Section>
        <p className="inv-lead" style={{ whiteSpace: "pre-line" }}>
          {model.invitationMessage}
        </p>
      </Section>
    ),

    hosts: (
      <Section>
        <p className="inv-couplet">
          {model.hosts.map((h) => h.name).join("  &  ")}
        </p>
      </Section>
    ),

    parents: (
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
    ),

    sponsors: (
      <Section label="Principal Sponsors">
        <ul className="inv-list">
          {model.sponsors.map((person) => (
            <li key={person.id}>{person.name}</li>
          ))}
        </ul>
      </Section>
    ),

    venues: (
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
    ),

    program: (
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
    ),

    gallery: (
      <Section>
        <div className="inv-gallery">
          {model.galleryUrls.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt="" />
          ))}
        </div>
      </Section>
    ),

    "dress-code": (
      <Section label="Dress code">
        <p style={{ textAlign: "center" }}>{model.dressCode}</p>
      </Section>
    ),

    gifts: (
      <Section label="Gifts">
        <p style={{ textAlign: "center", whiteSpace: "pre-line", opacity: 0.9 }}>
          {model.giftsPreference}
        </p>
      </Section>
    ),

    notes: (
      <Section label="Notes">
        <p style={{ textAlign: "center", whiteSpace: "pre-line", opacity: 0.9 }}>
          {model.specialNotes}
        </p>
      </Section>
    ),

    rsvp: (
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
    ),

    closing: (
      <Section>
        <p className="inv-lead">{model.closingMessage}</p>
      </Section>
    ),

    qr: qrSrc ? (
      <QrFooter src={qrSrc} caption="Scan to open this invitation" />
    ) : null,
  };

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
        {/* Hero. Still the one full-bleed presentation for all sixteen
            occasions: `layout.hero` names the seven the design language asks
            for, but nothing branches on it yet. This header is where that
            branch goes. */}
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
          {order.map((id) => (
            <React.Fragment key={id}>{nodes[id]}</React.Fragment>
          ))}

          <p className="inv-footer">{coupleLine} · Made with ML Printing</p>
        </main>

        {/* The customer's own upload wins; otherwise the invitation still gets
            a track, chosen to suit the occasion (FDG-ML-DEP-STD-015 §6). A
            memorial resolves to the cinematic track, never a celebratory one. */}
        <MusicPlayer src={model.musicUrl ?? MUSIC_TRACKS[moodForEventKind(model.eventKind)]} />
      </div>
    </InvitationShell>
  );
}
