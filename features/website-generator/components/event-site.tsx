import * as React from "react";
import type {
  EventKind,
  PreviewModel,
  PreviewStyle,
} from "@/lib/invitation/preview-model";
import { Countdown } from "./countdown";
import { RsvpForm } from "./rsvp-form";
import { InvitationShell, type ConfettiConfig } from "./invitation-shell";
import { Hero } from "./hero";
import { CornerOrnament, PhotoFrame } from "./primitives";
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
    /**
     * The accent, deepened toward the ink, for use as a *ground* rather than a
     * detail — the flat-bold hero fills the screen with it and sets white type
     * on top.
     *
     * Measured, not assumed: a birthday's raw accent (#e2725b) gives white text
     * 3.11:1. That passes for a large title and fails the 4.5:1 small-text
     * threshold the eyebrow and date sit under. Deepening the ground fixes the
     * whole block at once, where lightening the type cannot.
     */
    "--inv-accent-deep": mix(style.accent, style.foreground, 0.55),
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

    /**
     * The one section that carries the occasion's motif into the body.
     *
     * `layout.ornament` was read only by the hero, so a fiesta's confetti and a
     * christening's wash stopped at the fold and every occasion's body was
     * decorated with the same anonymous rule. One motif-bearing section is
     * enough — the brief puts decoration in the corners so the centre stays
     * clear, and repeating it down the page would be wallpaper.
     */
    countdown: countdownTarget ? (
      <Section>
        {layout.ornament === "none" ? (
          <div className="inv-ornament" aria-hidden="true" />
        ) : (
          <div className="inv-section-motif" aria-hidden="true">
            <CornerOrnament placement="top-left" motif={layout.ornament} />
            <CornerOrnament placement="top-right" motif={layout.ornament} />
          </div>
        )}
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

    /**
     * Cut to the occasion's own shape, not to rectangles.
     *
     * docs/invitation-design-language.md calls this the largest single gap in
     * the platform: a rectangle reads as pasted where a shape reads as placed.
     * The hero has framed its portrait since increment 2; leaving the gallery
     * square undid that a screen later, so a christening's soft blob was
     * followed by a grid of hard corners.
     */
    gallery: (
      <Section>
        <div className="inv-gallery">
          {model.galleryUrls.map((url) => (
            <PhotoFrame
              key={url}
              shape={layout.photoShape}
              src={url}
              alt=""
              ring
            />
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
      motion={layout.motion}
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
        {/* The occasion's own hero. `layout.hero` is finally read rather than
            merely declared — see hero.tsx for what each of the seven does and
            why the tone split matters more than the arrangement. */}
        <Hero
          presentation={layout.hero}
          photoShape={layout.photoShape}
          ornament={layout.ornament}
          celebratory={layout.celebratory}
          eyebrow={eyebrow}
          title={model.title}
          subtitle={model.subtitle}
          dateLine={dateHero}
          date={countdownTarget}
          timeLine={model.timeLine}
          dateStyle={layout.dateStyle}
          monogram={monogram}
          coverImageUrl={model.coverImageUrl}
          heroVideoUrl={model.heroVideoUrl}
          galleryUrls={model.galleryUrls}
          fallbackBackground={heroFallback}
        />

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
