import * as React from "react";
import { cn } from "@/lib/utils";
import { Typewriter } from "./typewriter";
import { HeroVideo } from "./hero-video";
import {
  CornerOrnament,
  InsetFrame,
  DateRow,
  PhotoFrame,
  PhotoStrip,
} from "./primitives";
import type {
  DateStyle,
  HeroPresentation,
  OrnamentMotif,
  PhotoShape,
} from "../layouts/types";

/**
 * The seven hero presentations — Increment 2 of
 * docs/invitation-design-language.md, finally branching on `layout.hero`.
 *
 * Until now every occasion declared a hero and every occasion rendered the same
 * one: a photograph filling the viewport with white type over a dark scrim.
 * That is a good wedding hero and a poor everything else. It puts a corporate
 * briefing behind a romantic gradient, and it asks a memorial notice to open
 * with the same full-screen drama as a 21st birthday.
 *
 * The split that actually matters is not seven ways of arranging type. It is
 * **what the type sits on**, because that decides its colour, its contrast
 * requirements and whether a scrim is needed at all:
 *
 *   over-photo  — full-bleed, card-on-photo. White type, dark scrim, tall.
 *   on-ground   — arch-portrait, photo-band, type-led, flat-bold, photo-grid.
 *                 Theme ink on the invitation's own paper. No scrim.
 *
 * Getting that wrong is how you end up with white text on ivory. So tone is
 * derived from the presentation once, here, rather than left to each branch to
 * remember.
 */

/** Which presentations set their type over a photograph rather than on paper. */
const OVER_PHOTO: ReadonlySet<HeroPresentation> = new Set<HeroPresentation>([
  "full-bleed",
  "card-on-photo",
]);

export function isOverPhoto(presentation: HeroPresentation): boolean {
  return OVER_PHOTO.has(presentation);
}

/**
 * Deterministic petals — a little ambient motion, with no randomness to desync
 * on hydration. Only the tall over-photo heroes carry them: on a photo band or
 * a type-led card they would fall through the layout rather than over it.
 */
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

export interface HeroProps {
  presentation: HeroPresentation;
  photoShape: PhotoShape;
  ornament: OrnamentMotif;
  /** False on memorial, religious and community. Suppresses petals and motion. */
  celebratory: boolean;
  eyebrow: string;
  title: string;
  subtitle: string | null;
  /** Date and time, already joined by the caller. The hero never formats a date. */
  dateLine: string | null;
  /** The resolved event date. Null when the customer has not set one. */
  date: Date | null;
  /** Time only, for the row device to set beneath its numeral. */
  timeLine: string | null;
  dateStyle: DateStyle;
  monogram: string;
  coverImageUrl: string | null;
  /** The hero's moving background, when one has been uploaded. */
  heroVideoUrl: string | null;
  galleryUrls: string[];
  /** Gradient shown when there is no photograph. */
  fallbackBackground: string;
}

/**
 * The words, in the order every hero states them. Extracted because all seven
 * presentations say the same five things and differ only in what surrounds
 * them — duplicating the block per branch is how a subtitle quietly stops
 * rendering on two occasions and nobody notices.
 */
function HeroCopy({
  eyebrow,
  title,
  subtitle,
  dateLine,
  date,
  dateStyle,
  timeLine,
  tone,
  titleClass,
  animate,
}: {
  eyebrow: string;
  title: string;
  subtitle: string | null;
  dateLine: string | null;
  /** The resolved event date, when there is one. Required by the row device. */
  date: Date | null;
  dateStyle: DateStyle;
  timeLine: string | null;
  tone: "light" | "ink";
  titleClass?: string;
  /** Typewriter on the eyebrow. Off where the hero should not perform. */
  animate: boolean;
}) {
  // The row needs a real Date; the line is prose the model already formatted.
  // Falling back keeps an occasion that asked for a row from losing its date
  // entirely on an invitation whose date has not been set.
  const showRow = dateStyle === "row" && date !== null;

  return (
    <>
      {animate ? (
        <Typewriter text={eyebrow} className="inv-eyebrow" />
      ) : (
        <p className="inv-eyebrow">{eyebrow}</p>
      )}
      <h1 className={cn("inv-names", titleClass)}>{title}</h1>
      {subtitle ? <p className="inv-hero-sub">{subtitle}</p> : null}

      {showRow ? (
        <DateRow
          date={date}
          timeLine={timeLine ?? undefined}
          className="inv-hero-daterow"
        />
      ) : dateLine ? (
        <p className="inv-hero-date">{dateLine}</p>
      ) : null}

      <div
        className={cn("inv-hero-rule", tone === "ink" && "inv-hero-rule--ink")}
      />
    </>
  );
}

/** Falling petals and the scroll cue — the two ambient touches of a tall hero. */
function Ambient({ celebratory }: { celebratory: boolean }) {
  return (
    <>
      {celebratory
        ? PETALS.map((p) => (
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
          ))
        : null}
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
    </>
  );
}

/**
 * The photograph a *frame* should hold — never the cover.
 *
 * `coverImageUrl` is a finished, typeset card: it carries the template's own
 * title and category as artwork. Behind a full-bleed scrim that reads as
 * atmosphere, which is why those two heroes still use it. Inside an arch or a
 * circle it reads as a photograph of a card, printed directly above the same
 * words the hero is about to set in type — which is what a memorial rendered
 * before this function existed: "In Loving Memory" inside the frame, and "In
 * Loving Memory" again beneath it.
 *
 * So a frame takes a real photograph or nothing. Nothing is not a failure
 * state: PhotoFrame draws its silhouette in the theme's soft tone, which is a
 * deliberate, quiet shape rather than a broken image.
 */
function framedPhoto(galleryUrls: string[]): string | null {
  return galleryUrls[0] ?? null;
}

/**
 * The letterbox band used by photo-band, and by photo-grid before a gallery
 * exists.
 *
 * Three states, in order of preference:
 *
 * 1. A real photograph — shown sharp, as itself.
 * 2. No photograph, but a cover — shown **blurred and scaled**. The cover is a
 *    typeset card, so a legible crop of one would print the template's own
 *    title across the band; blurring past legibility keeps its palette and
 *    imagery as texture while removing the words. Texture is the intent, not a
 *    frosted-glass effect.
 * 3. Neither — a wash of the theme.
 *
 * State 2 exists because today the platform holds no uploaded media at all, so
 * without it every band on every invitation would be a flat gradient.
 */
function Band({
  photo,
  cover,
  fallbackBackground,
}: {
  photo: string | null;
  cover: string | null;
  fallbackBackground: string;
}) {
  const src = photo ?? cover;
  return (
    <div
      className="inv-band-photo"
      style={src ? undefined : { background: fallbackBackground }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className={photo ? undefined : "inv-band-texture"} />
      ) : null}
    </div>
  );
}

/**
 * What fills a full-bleed hero behind the scrim — increment 5.
 *
 * A video when one has been uploaded, the cover photograph otherwise, and the
 * theme gradient when there is neither. Extracted because both over-photo
 * heroes need the same three-way choice, and a branch written twice is a branch
 * that will be corrected once.
 *
 * The video keeps the photograph's class, so the existing hero parallax in
 * invitation-shell.tsx — which drives `.inv-hero-photo` — moves it too, without
 * that effect learning what a video is.
 */
function Backdrop({
  videoUrl,
  coverImageUrl,
}: {
  videoUrl: string | null;
  coverImageUrl: string | null;
}) {
  if (videoUrl) {
    return (
      <HeroVideo
        src={videoUrl}
        poster={coverImageUrl}
        className="inv-hero-photo"
      />
    );
  }
  if (coverImageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={coverImageUrl} alt="" className="inv-hero-photo" />;
  }
  return null;
}

/** Corner decoration, when the occasion has a motif. "none" draws nothing. */
function Corners({ motif }: { motif: OrnamentMotif }) {
  if (motif === "none") return null;
  return (
    <>
      <CornerOrnament placement="top-left" motif={motif} />
      <CornerOrnament placement="bottom-right" motif={motif} />
    </>
  );
}

/**
 * One component per presentation.
 *
 * A Record rather than a switch so the compiler refuses a new
 * HeroPresentation that nobody rendered — which is precisely the state this
 * increment found the codebase in: seven presentations declared in the layout
 * registry, one actually drawn. hero.test.ts pins the other half of that, that
 * the registry's heroes are all reachable and genuinely distinct.
 */
export const HERO_COMPONENTS: Record<
  HeroPresentation,
  (props: HeroProps) => React.JSX.Element
> = {
  "full-bleed": FullBleedHero,
  "arch-portrait": ArchPortraitHero,
  "photo-band": PhotoBandHero,
  "type-led": TypeLedHero,
  "flat-bold": FlatBoldHero,
  "card-on-photo": CardOnPhotoHero,
  "photo-grid": PhotoGridHero,
};

export function Hero(props: HeroProps) {
  const Presentation = HERO_COMPONENTS[props.presentation] ?? FullBleedHero;
  return <Presentation {...props} />;
}

/**
 * Photograph fills the viewport, type over a scrim.
 *
 * Unchanged from the single hero every occasion used to share, deliberately:
 * weddings and custom invitations already looked right this way, and the point
 * of this increment is to stop the other fourteen borrowing it — not to
 * redesign the two it suited.
 */
function FullBleedHero({
  celebratory,
  eyebrow,
  title,
  subtitle,
  dateLine,
  date,
  dateStyle,
  timeLine,
  monogram,
  coverImageUrl,
  heroVideoUrl,
  fallbackBackground,
}: HeroProps) {
  return (
    <header
      className="inv-hero"
      style={coverImageUrl ? undefined : { background: fallbackBackground }}
    >
      <Backdrop videoUrl={heroVideoUrl} coverImageUrl={coverImageUrl} />
      <div className="inv-hero-scrim" />
      <Ambient celebratory={celebratory} />

      <div className="inv-hero-top">
        <div className="inv-mono">{monogram}</div>
      </div>

      <div className="inv-hero-inner">
        <HeroCopy
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          dateLine={dateLine}
          date={date}
          dateStyle={dateStyle}
          timeLine={timeLine}
          tone="light"
          animate
        />
      </div>
    </header>
  );
}

/**
 * A single portrait inside an arch, wide margin, words beneath it.
 *
 * The quiet one, and the only hero a memorial gets. Nothing here fills the
 * viewport or moves: an arch is a doorway and a headstone depending on what is
 * inside it, and the restraint is what lets the same structure carry an
 * engagement and a funeral without either looking borrowed.
 */
function ArchPortraitHero({
  celebratory,
  eyebrow,
  title,
  subtitle,
  dateLine,
  date,
  dateStyle,
  timeLine,
  ornament,
  galleryUrls,
}: HeroProps) {
  return (
    <header className="inv-hero-ground inv-hero--arch">
      <Corners motif={ornament} />
      <div className="inv-arch-portrait">
        <PhotoFrame
          shape="arch"
          src={framedPhoto(galleryUrls)}
          alt=""
          priority
          ring
        />
      </div>
      <div className="inv-hero-ground-copy">
        <HeroCopy
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          dateLine={dateLine}
          date={date}
          dateStyle={dateStyle}
          timeLine={timeLine}
          tone="ink"
          animate={celebratory}
        />
      </div>
    </header>
  );
}

/**
 * A wide band of photograph with the name set beneath it.
 *
 * Editorial rather than cinematic: the photograph is cropped to a letterbox and
 * the type is given its own quiet ground below, which is how a graduation
 * announcement or an anniversary reads as a printed piece rather than a film
 * poster.
 */
function PhotoBandHero({
  celebratory,
  eyebrow,
  title,
  subtitle,
  dateLine,
  date,
  dateStyle,
  timeLine,
  monogram,
  coverImageUrl,
  heroVideoUrl,
  galleryUrls,
  fallbackBackground,
}: HeroProps) {
  const photo = framedPhoto(galleryUrls);

  return (
    <header className="inv-hero-ground inv-hero--band">
      <Band
        photo={photo}
        cover={coverImageUrl}
        fallbackBackground={fallbackBackground}
      />
      <div className="inv-hero-ground-copy">
        <div className="inv-mono inv-mono--ink">{monogram}</div>
        <HeroCopy
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          dateLine={dateLine}
          date={date}
          dateStyle={dateStyle}
          timeLine={timeLine}
          tone="ink"
          animate={celebratory}
        />
      </div>
    </header>
  );
}

/**
 * No photograph required: type, rules and ornament carry it.
 *
 * The presentation for occasions that frequently have no photograph worth
 * showing — a corporate gala, a mass, a barangay notice — and for the debut,
 * where the reference set puts the name inside a ruled frame rather than over
 * a face. An inset frame does the work a photograph would otherwise do.
 */
function TypeLedHero({
  celebratory,
  eyebrow,
  title,
  subtitle,
  dateLine,
  date,
  dateStyle,
  timeLine,
  monogram,
  ornament,
}: HeroProps) {
  return (
    <header className="inv-hero-ground inv-hero--type">
      <Corners motif={ornament} />
      <div className="inv-type-card">
        <InsetFrame double />
        <div className="inv-hero-ground-copy">
          <div className="inv-mono inv-mono--ink">{monogram}</div>
          <HeroCopy
            eyebrow={eyebrow}
            title={title}
            subtitle={subtitle}
            dateLine={dateLine}
            date={date}
            dateStyle={dateStyle}
            timeLine={timeLine}
            tone="ink"
            animate={celebratory}
          />
        </div>
      </div>
    </header>
  );
}

/**
 * Saturated flat colour behind heavy display type.
 *
 * Birthdays and fiestas, where the reference set is loud on purpose. The
 * accent becomes the ground rather than a detail, and the title is set in the
 * heading face at its largest with a hard offset shadow — the one place in the
 * library where the type is allowed to shout.
 */
function FlatBoldHero({
  celebratory,
  eyebrow,
  title,
  subtitle,
  dateLine,
  date,
  dateStyle,
  timeLine,
  ornament,
  galleryUrls,
}: HeroProps) {
  const photo = framedPhoto(galleryUrls);

  return (
    <header className="inv-hero-ground inv-hero--bold">
      <Corners motif={ornament} />
      <div className="inv-hero-ground-copy">
        <HeroCopy
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          dateLine={dateLine}
          date={date}
          dateStyle={dateStyle}
          timeLine={timeLine}
          tone="ink"
          titleClass="inv-names--bold"
          animate={celebratory}
        />
      </div>
      {/* Only when there is a real photograph. Saturated colour and heavy type
          is a complete design on its own; an empty circle under it would read
          as something that failed to load. */}
      {photo ? (
        <div className="inv-bold-photo">
          <PhotoFrame shape="circle" src={photo} alt="" priority ring />
        </div>
      ) : null}
    </header>
  );
}

/**
 * A paper card floating over a photographic background — two planes.
 *
 * The device the reference set uses for baby showers and family gatherings: a
 * soft photograph behind, and the words on something that looks like an actual
 * card sitting on top of it. The card is the invitation's own paper tone, so
 * the type stays ink even though a photograph is involved — the only
 * presentation where both planes appear at once.
 */
function CardOnPhotoHero({
  celebratory,
  eyebrow,
  title,
  subtitle,
  dateLine,
  date,
  dateStyle,
  timeLine,
  monogram,
  ornament,
  coverImageUrl,
  heroVideoUrl,
  fallbackBackground,
}: HeroProps) {
  return (
    <header
      className="inv-hero inv-hero--card"
      style={coverImageUrl ? undefined : { background: fallbackBackground }}
    >
      <Backdrop videoUrl={heroVideoUrl} coverImageUrl={coverImageUrl} />
      <div className="inv-hero-scrim inv-hero-scrim--soft" />
      <Ambient celebratory={celebratory} />

      <div className="inv-card-plane">
        <Corners motif={ornament} />
        <div className="inv-mono inv-mono--ink">{monogram}</div>
        <HeroCopy
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          dateLine={dateLine}
          date={date}
          dateStyle={dateStyle}
          timeLine={timeLine}
          tone="ink"
          animate={celebratory}
        />
      </div>
    </header>
  );
}

/**
 * A grid of photographs where the crowd is the design.
 *
 * Reunions only. The subject of a reunion invitation is not one couple but
 * everybody who is coming, so the hero shows as many faces as it has and sets
 * the words beneath them. Falls back to the single cover when a gallery has not
 * been uploaded yet, rather than rendering a grid of empty boxes.
 */
function PhotoGridHero({
  celebratory,
  eyebrow,
  title,
  subtitle,
  dateLine,
  date,
  dateStyle,
  timeLine,
  monogram,
  coverImageUrl,
  heroVideoUrl,
  galleryUrls,
  fallbackBackground,
}: HeroProps) {
  const photos = galleryUrls.slice(0, 6);

  return (
    <header className="inv-hero-ground inv-hero--grid">
      {photos.length > 1 ? (
        <div className="inv-grid-photos">
          {photos.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" />
          ))}
        </div>
      ) : (
        <Band
          photo={photos[0] ?? null}
          cover={coverImageUrl}
          fallbackBackground={fallbackBackground}
        />
      )}

      <div className="inv-hero-ground-copy">
        <div className="inv-mono inv-mono--ink">{monogram}</div>
        <HeroCopy
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          dateLine={dateLine}
          date={date}
          dateStyle={dateStyle}
          timeLine={timeLine}
          tone="ink"
          animate={celebratory}
        />
        {photos.length > 6 ? (
          <PhotoStrip photos={galleryUrls.slice(6)} shape="circle" />
        ) : null}
      </div>
    </header>
  );
}
