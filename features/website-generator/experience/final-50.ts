import type { EventKind } from "@/lib/invitation/preview-model";
import type {
  MotionLevel,
  MotionProfileId,
  PerformanceClass,
  VisualThemeId,
} from "./types";

export type ExperienceTier = "CORE" | "SIGNATURE" | "IMMERSIVE";

export interface Final50Experience {
  slug: string;
  name: string;
  eventKind: EventKind;
  family: string;
  tier: ExperienceTier;
  performanceClass: PerformanceClass;
  motionLevel: Exclude<MotionLevel, "M0">;
  motionProfile: MotionProfileId;
  visualThemeId: Exclude<VisualThemeId, "inherit">;
  signature: string;
}

const performanceFor = (tier: ExperienceTier): PerformanceClass =>
  tier === "IMMERSIVE" ? "cinematic" : tier === "SIGNATURE" ? "standard" : "light";

const row = (
  slug: string,
  name: string,
  eventKind: EventKind,
  family: string,
  tier: ExperienceTier,
  motionLevel: Exclude<MotionLevel, "M0">,
  motionProfile: MotionProfileId,
  visualThemeId: Exclude<VisualThemeId, "inherit">,
  signature: string,
): Final50Experience => ({
  slug,
  name,
  eventKind,
  family,
  tier,
  performanceClass: performanceFor(tier),
  motionLevel,
  motionProfile,
  visualThemeId,
  signature,
});

/**
 * The blueprint's exact commercial portfolio. This is deliberately hand-curated:
 * it is the contract that prevents a seed category fallback from turning fifty
 * named experiences into the same invitation with different colours.
 */
export const FINAL_50: Final50Experience[] = [
  row("ivory-lace", "Ivory Lace", "wedding", "Luxury / Romantic", "SIGNATURE", "M3", "mp-01-editorial", "atelier-ivory", "Lace shadows and generous editorial spacing frame a formal ceremony."),
  row("blush-botanical", "Blush Botanical", "wedding", "Botanical / Romantic", "SIGNATURE", "M3", "mp-06-botanical", "botanical-romance", "Pressed botanicals unfurl around the couple as a garden story."),
  row("midnight-gold", "Midnight Gold", "wedding", "Luxury / Editorial", "SIGNATURE", "M3", "mp-02-luxe-reveal", "midnight-metallic", "Midnight panels part to expose gold type and an evening programme."),
  row("coastal-linen", "Coastal Linen", "wedding", "Destination / Romantic", "CORE", "M2", "mp-02-luxe-reveal", "coastal-air", "A wide horizon and linen texture give destination details room to breathe."),
  row("gilded-vow", "Gilded Vow", "wedding", "Luxury / Romantic", "SIGNATURE", "M3", "mp-03-cinematic", "atelier-ivory", "A foil-like vow line leads from church ceremony to candlelit reception."),
  row("sampaguita", "Sampaguita", "wedding", "Filipino / Cultural", "SIGNATURE", "M3", "mp-14-cultural-ceremony", "filipino-craft", "Sampaguita garlands trace a calm Filipino wedding procession."),
  row("capiz-window", "Capiz Window", "wedding", "Filipino / Cultural Luxury", "SIGNATURE", "M3", "mp-14-cultural-ceremony", "capiz-luminous", "Light travels through layered capiz panes before revealing the ceremony."),
  row("confetti-pop", "Confetti Pop", "birthday", "Celebration", "CORE", "M2", "mp-08-celebration", "celebration-pop", "Bold type and controlled confetti start the party without hiding the details."),
  row("first-year", "First Year", "birthday", "Family / Memory", "CORE", "M2", "mp-07-memory", "memory-film", "A first-year filmstrip turns twelve small moments into one warm invitation."),
  row("cake-smash", "Cake Smash", "birthday", "Kids / Celebration", "SIGNATURE", "M3", "mp-08-celebration", "storybook-play", "Playful cut-paper layers bounce into a bright first-birthday scene."),
  row("golden-sixty", "Golden Sixty", "birthday", "Milestone / Luxury", "CORE", "M2", "mp-01-editorial", "midnight-metallic", "A monumental numeral and one portrait make the milestone unmistakable."),
  row("seventh-heaven", "Seventh Heaven", "birthday", "Fantasy / Kids", "SIGNATURE", "M3", "mp-08-celebration", "storybook-play", "A storybook gate opens into a gentle fantasy celebration."),
  row("neon-eighteen", "Neon Eighteen", "debut", "Youth / Nightlife", "IMMERSIVE", "M4", "mp-09-neon-pulse", "neon-nightlife", "The debut feels like entering a live nightlife event."),
  row("eighteen-roses", "Eighteen Roses", "debut", "Filipino / Debut", "SIGNATURE", "M3", "mp-14-cultural-ceremony", "filipino-craft", "The eighteen roses unfold as a ceremonial sequence around the celebrant."),
  row("cotillion-waltz", "Cotillion Waltz", "debut", "Debut / Formal", "SIGNATURE", "M3", "mp-03-cinematic", "atelier-ivory", "Formal pacing and a sweeping programme echo a cotillion entrance."),
  row("sagala", "Sagala", "debut", "Filipino / Cultural", "SIGNATURE", "M3", "mp-14-cultural-ceremony", "filipino-craft", "Floral procession cues frame a distinctly Filipino coming-of-age moment."),
  row("blue-hour", "Blue Hour", "debut", "Cinematic / Portrait", "SIGNATURE", "M3", "mp-03-cinematic", "cinematic-frame", "A blue-hour portrait expands into a composed evening timeline."),
  row("little-dove", "Little Dove", "christening", "Religious / Family", "CORE", "M2", "mp-12-quiet", "quiet-ceremony", "Soft light and a single dove keep baptism details tender and clear."),
  row("sweet-dreams", "Sweet Dreams", "baby-shower", "Family / Fantasy", "SIGNATURE", "M3", "mp-06-botanical", "storybook-play", "Cloudlike layers reveal the family story with a gentle bedtime rhythm."),
  row("golden-jubilee", "Golden Jubilee", "anniversary", "Memory / Anniversary", "SIGNATURE", "M3", "mp-07-memory", "memory-film", "Then-and-now portraits travel through fifty shared years."),
  row("still-us", "Still Us", "anniversary", "Story / Anniversary", "SIGNATURE", "M3", "mp-07-memory", "memory-film", "A restrained scroll pairs the couple's earliest and latest chapters."),
  row("sablay", "Sablay", "graduation", "Filipino / Achievement", "CORE", "M2", "mp-01-editorial", "filipino-craft", "A proud portrait and sablay-inspired linework centre the achievement."),
  row("quarterly-gala", "Quarterly Gala", "corporate", "Corporate / Luxury", "CORE", "M2", "mp-01-editorial", "corporate-precision", "An editorial programme gives speakers, sponsors and venue equal clarity."),
  row("product-launch", "Product Launch", "corporate", "Corporate / Product", "IMMERSIVE", "M4", "mp-11-product", "digital-light", "A product-led reveal moves from proposition to countdown and registration."),
  row("boardroom-black", "Boardroom Black", "corporate", "Corporate / Formal", "SIGNATURE", "M3", "mp-02-luxe-reveal", "midnight-metallic", "Black-tie panels and disciplined gold rules stage an executive evening."),
  row("noche-buena", "Noche Buena", "family", "Filipino / Family", "CORE", "M2", "mp-08-celebration", "filipino-craft", "Parol geometry leads relatives from welcome to the family table."),
  row("bahay-kubo", "Bahay Kubo", "family", "Filipino / Family", "SIGNATURE", "M3", "mp-14-cultural-ceremony", "filipino-craft", "Woven garden motifs make a homecoming feel rooted and generous."),
  row("fiesta-banderitas", "Fiesta Banderitas", "fiesta", "Filipino / Festival", "SIGNATURE", "M3", "mp-10-live-event", "festival-pulse", "Banderitas sweep across a readable route and programme."),
  row("santo-patron", "Santo Patrón", "fiesta", "Religious / Community", "CORE", "M2", "mp-14-cultural-ceremony", "quiet-ceremony", "Procession, novena and programme are presented with ceremonial restraint."),
  row("reunion-table", "Reunion Table", "reunion", "Family / Reunion", "CORE", "M2", "mp-07-memory", "memory-film", "A long-table composition reconnects names, branches and shared photographs."),
  row("class-of-then", "Class of Then", "reunion", "Memory / Reunion", "SIGNATURE", "M3", "mp-07-memory", "memory-film", "Then-and-now frames advance like a familiar class album."),
  row("sealed-with-yes", "Sealed with Yes", "engagement", "Engagement / Romantic", "SIGNATURE", "M3", "mp-04-sealed-reveal", "romantic-seal", "A tactile seal breaks into a confident engagement announcement."),
  row("flores-de-mayo", "Flores de Mayo", "religious", "Filipino / Cultural", "SIGNATURE", "M3", "mp-14-cultural-ceremony", "botanical-romance", "May flowers form a procession around parish schedule and route."),
  row("sinulog-street", "Sinulog Street", "community", "Filipino / Festival", "IMMERSIVE", "M4", "mp-10-live-event", "festival-pulse", "Festival rhythm, route and stage times move like a living street poster."),
  row("in-loving-memory", "In Loving Memory", "funeral", "Memorial / Keepsake", "CORE", "M2", "mp-12-quiet", "memorial-quiet", "A quiet portrait preserves dignity while service information stays effortless to find."),
  row("the-atelier", "The Atelier", "wedding", "Luxury / Editorial", "SIGNATURE", "M3", "mp-01-editorial", "atelier-ivory", "A couture-like editorial sequence treats type, portrait and paper as one composition."),
  row("ivory-editorial", "Ivory Editorial", "wedding", "Modern / Minimal", "CORE", "M2", "mp-01-editorial", "atelier-ivory", "Quiet typography and architectural spacing make modern vows feel assured."),
  row("the-opening-scene", "The Opening Scene", "engagement", "Cinematic", "IMMERSIVE", "M4", "mp-03-cinematic", "cinematic-frame", "A title sequence introduces the couple before the invitation opens into chapters."),
  row("love-in-motion", "Love in Motion", "wedding", "Cinematic / Romantic", "IMMERSIVE", "M4", "mp-03-cinematic", "cinematic-frame", "Portraits crossfade through a romantic film-like ceremony journey."),
  row("35mm", "35mm", "anniversary", "Film / Memory", "SIGNATURE", "M3", "mp-07-memory", "memory-film", "Film frames, timestamps and grain turn shared memories into an intimate reel."),
  row("liquid-light", "Liquid Light", "general", "Digital Luxury", "IMMERSIVE", "M4", "mp-13-digital-light", "digital-light", "Refracted colour responds to movement without compromising event clarity."),
  row("opaline", "Opaline", "wedding", "Digital Luxury", "SIGNATURE", "M3", "mp-13-digital-light", "digital-light", "Pearlescent layers shift subtly around an elegant invitation core."),
  row("aurora", "Aurora", "debut", "Modern / Digital", "IMMERSIVE", "M3", "mp-13-digital-light", "digital-light", "Aurora gradients sweep behind portrait, programme and celebration details."),
  row("the-story", "The Story", "general", "Interactive Story", "CORE", "M3", "mp-15-guided-story", "guided-story", "Guests progress through concise chapters before reaching the event invitation."),
  row("memory-lane", "Memory Lane", "reunion", "Interactive Memory", "CORE", "M2", "mp-07-memory", "memory-film", "A guided timeline makes old photographs and reunion details easy to explore."),
  row("disco", "Disco", "debut", "Youth / Celebration", "CORE", "M3", "mp-09-neon-pulse", "neon-nightlife", "Mirrorball geometry and bold type cue a joyful dance-floor celebration."),
  row("festival-pulse", "Festival Pulse", "fiesta", "Live / Ticketed", "IMMERSIVE", "M4", "mp-10-live-event", "festival-pulse", "A high-energy event poster becomes schedule, route and admission experience."),
  row("main-stage", "Main Stage", "community", "Live / Event", "CORE", "M3", "mp-10-live-event", "festival-pulse", "Stage times, acts and venue access lead a bold but legible live-event page."),
  row("summit", "Summit", "corporate", "Corporate / Conference", "CORE", "M2", "mp-01-editorial", "corporate-precision", "A structured conference system prioritizes agenda, speakers and registration."),
  row("innovation", "Innovation", "corporate", "Corporate / Technology", "CORE", "M2", "mp-11-product", "digital-light", "A precise technology narrative connects theme, speakers and event access."),
];

export const FINAL_50_BY_SLUG = Object.freeze(
  Object.fromEntries(FINAL_50.map((experience) => [experience.slug, experience])),
) as Readonly<Record<string, Final50Experience>>;

export const FINAL_50_SLUGS = Object.freeze(FINAL_50.map(({ slug }) => slug));
