/**
 * Generates the background music library that invitation templates play.
 *
 * ML Printing has no licensed audio, and a stock-music subscription is not in
 * the MVP budget. Synthesising the tracks here means the repository owns them
 * outright: no licence to renew, no attribution to display, no third-party
 * request from a customer's invitation page. Run it with `node
 * scripts/generate-invitation-music.mjs`; the output is committed, so this is
 * a one-off tool rather than part of the build.
 *
 * The five moods are deliberately written as five separate renderers. They
 * differ in chord set, register and rhythmic feel, because a single engine with
 * five parameter sets produces five tracks that are recognisably the same
 * track, which defeats the point of offering a choice.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SAMPLE_RATE = 16000;
const DURATION_SECONDS = 12;
const TOTAL_SAMPLES = SAMPLE_RATE * DURATION_SECONDS;

/**
 * Long enough that the return to silence reads as a musical ending rather than
 * a gate closing, which is what lets the file loop without an audible seam.
 */
const FADE_SECONDS = 1.5;

/**
 * Background music that competes with the invitation has failed at its job.
 * 0.13 sits under normal reading attention on a phone at half volume.
 */
const TARGET_PEAK = 0.13;

/**
 * Nyquist is 8 kHz at this sample rate. Partials above the ceiling fold back
 * down as inharmonic grit, which is especially obvious on the bell and pluck
 * voices, so they are dropped instead.
 */
const PARTIAL_CEILING_HZ = 6800;

const OUTPUT_DIR = fileURLToPath(new URL("../public/music", import.meta.url));

function semitones(root, offset) {
  return root * Math.pow(2, offset / 12);
}

function cents(freq, offset) {
  return freq * Math.pow(2, offset / 1200);
}

/**
 * A raised cosine window for one chord in a sequence, overlapping its
 * neighbours by `crossfade`. Adjacent windows sum to 1 across the overlap, so
 * chords hand over to each other without a step in level — a hard chord change
 * on a sustained pad clicks.
 */
function segmentGain(t, index, segment, crossfade) {
  const start = index * segment - crossfade / 2;
  const end = start + segment + crossfade;
  if (t <= start || t >= end) return 0;
  if (t < start + crossfade) {
    return 0.5 - 0.5 * Math.cos((Math.PI * (t - start)) / crossfade);
  }
  if (t > end - crossfade) {
    return 0.5 - 0.5 * Math.cos((Math.PI * (end - t)) / crossfade);
  }
  return 1;
}

/**
 * Struck notes are sparse, so they are mixed over their own lifetime only
 * rather than evaluated at every sample of the track.
 */
function mixEvent(out, startSeconds, lengthSeconds, voice) {
  const first = Math.max(0, Math.round(startSeconds * SAMPLE_RATE));
  const last = Math.min(
    TOTAL_SAMPLES,
    Math.round((startSeconds + lengthSeconds) * SAMPLE_RATE),
  );
  for (let i = first; i < last; i++) {
    out[i] += voice((i - first) / SAMPLE_RATE);
  }
}

/** Deterministic PRNG so a re-run produces byte-identical files. */
function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let x = Math.imul(state ^ (state >>> 15), 1 | state);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

// Romantic — a warm sustained pad in the lower middle, four slow chords.
// Weddings and engagements want stillness, so nothing here is struck.

const ROMANTIC_ROOT = semitones(440, -7); // F3.

/** Ninth chords throughout: the added colour tone is what keeps it from sounding churchy. */
const ROMANTIC_CHORDS = [
  [0, 4, 7, 11, 14], // Fmaj9
  [-3, 0, 4, 7, 11], // Dm9
  [-7, -3, 0, 4, 7], // Bbmaj9
  [-5, -1, 2, 5, 9], // C9
];

function renderRomantic() {
  const out = new Float64Array(TOTAL_SAMPLES);
  const segment = DURATION_SECONDS / ROMANTIC_CHORDS.length;

  for (let i = 0; i < TOTAL_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const breath = 0.9 + 0.1 * Math.sin(2 * Math.PI * 0.22 * t);
    let sample = 0;

    for (let c = 0; c < ROMANTIC_CHORDS.length; c++) {
      const gain = segmentGain(t, c, segment, 1.4);
      if (gain === 0) continue;

      const chord = ROMANTIC_CHORDS[c];
      for (let v = 0; v < chord.length; v++) {
        const freq = semitones(ROMANTIC_ROOT, chord[v]);
        // Two copies a few cents apart beat slowly against one another. That
        // beating is the difference between a string section and an organ.
        for (const offset of [-4, 4]) {
          const detuned = cents(freq, offset);
          for (let n = 1; n <= 5; n++) {
            const partial = detuned * n;
            if (partial > PARTIAL_CEILING_HZ) break;
            // Phases are staggered by voice so the partials do not all peak
            // together at t=0 and waste headroom on a transient.
            sample +=
              (gain * breath * Math.sin(2 * Math.PI * partial * t + v)) /
              (2 * Math.pow(n, 1.7) * (v + 2));
          }
        }
      }

      const sub = semitones(ROMANTIC_ROOT, chord[0] - 12);
      sample += gain * 0.5 * Math.sin(2 * Math.PI * sub * t);
    }

    out[i] = sample;
  }

  return out;
}

// Cinematic — three chords over four seconds each, voiced across four octaves.
// The width comes from the spread and the heavy detuning, not from volume.

const CINEMATIC_ROOT = semitones(440, -33); // C2.

const CINEMATIC_CHORDS = [
  [0, 12, 19, 27, 38, 43], // Cm(add9)
  [8, 20, 27, 36, 39, 43], // Abmaj7
  [3, 15, 22, 31, 38, 41], // Ebmaj9
];

function renderCinematic() {
  const out = new Float64Array(TOTAL_SAMPLES);
  const segment = DURATION_SECONDS / CINEMATIC_CHORDS.length;

  for (let i = 0; i < TOTAL_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    // Air on the upper partials only. Modulating the whole chord would read as
    // a wobble; modulating the top reads as a room.
    const shimmer = 0.72 + 0.28 * Math.sin(2 * Math.PI * 0.55 * t);
    let sample = 0;

    for (let c = 0; c < CINEMATIC_CHORDS.length; c++) {
      const window = segmentGain(t, c, segment, 2.2);
      if (window === 0) continue;

      // Each chord swells into its own segment rather than simply appearing,
      // which is most of what makes this one feel grand instead of merely wide.
      const position = (t - c * segment) / segment;
      const swell =
        0.6 + 0.4 * Math.sin(Math.PI * Math.min(1, Math.max(0, position)));
      const gain = window * swell;

      const chord = CINEMATIC_CHORDS[c];
      for (let v = 0; v < chord.length; v++) {
        const freq = semitones(CINEMATIC_ROOT, chord[v]);
        for (const offset of [-11, 0, 11]) {
          const detuned = cents(freq, offset);
          for (let n = 1; n <= 4; n++) {
            const partial = detuned * n;
            if (partial > PARTIAL_CEILING_HZ) break;
            const colour = n >= 3 ? shimmer : 1;
            sample +=
              (gain * colour * Math.sin(2 * Math.PI * partial * t + v * 0.7)) /
              (3 * Math.pow(n, 1.4) * (v + 2));
          }
        }
      }
    }

    out[i] = sample;
  }

  return out;
}

// Playful — sixteenth-note arpeggios at 160 bpm, plucked, an octave above the
// pad tracks. Kids' birthdays; the movement is the point.

const PLAYFUL_ROOT = semitones(440, 3); // C5.
const PLAYFUL_STEP_SECONDS = 0.1875;
const PLAYFUL_STEPS_PER_BAR = 16;

const PLAYFUL_CHORDS = [
  [0, 4, 7, 12], // C
  [-3, 0, 4, 9], // Am
  [-7, -3, 0, 5], // F
  [-5, -1, 2, 7], // G
];

/** Gaps on steps 1, 4, 7, 9, 12 and 15 are what give it the skip. */
const PLAYFUL_HITS = [0, 2, 3, 5, 6, 8, 10, 11, 13, 14];
const PLAYFUL_BASS_HITS = [0, 6, 8, 14];
const PLAYFUL_ORDER = [0, 1, 2, 3, 2, 1, 0, 2, 3, 2, 1, 3];

/** Triangle-ish: odd partials fall away fast, so it stays bright without turning shrill. */
function pluck(u, freq, decay) {
  const attack = Math.min(1, u / 0.006);
  const body = attack * Math.exp(-u / decay);
  let value = 0;
  for (let n = 1; n <= 7; n += 2) {
    const partial = freq * n;
    if (partial > PARTIAL_CEILING_HZ) break;
    value +=
      (Math.sin(2 * Math.PI * partial * u) * (n % 4 === 1 ? 1 : -1)) / (n * n);
  }
  if (freq * 2 <= PARTIAL_CEILING_HZ) {
    value += 0.22 * Math.sin(2 * Math.PI * freq * 2 * u);
  }
  return body * value;
}

function renderPlayful() {
  const out = new Float64Array(TOTAL_SAMPLES);
  const barSeconds = PLAYFUL_STEP_SECONDS * PLAYFUL_STEPS_PER_BAR;
  let note = 0;

  for (let bar = 0; bar < PLAYFUL_CHORDS.length; bar++) {
    const chord = PLAYFUL_CHORDS[bar];

    for (const step of PLAYFUL_HITS) {
      const start = bar * barSeconds + step * PLAYFUL_STEP_SECONDS;
      const degree = PLAYFUL_ORDER[note % PLAYFUL_ORDER.length];
      // Every fifth note jumps an octave, so the line has a shape rather than
      // circling the same four pitches for twelve seconds.
      const octave = note % 5 === 4 ? 12 : 0;
      const freq = semitones(PLAYFUL_ROOT, chord[degree] + octave);
      note++;
      mixEvent(out, start, 0.55, (u) => 0.55 * pluck(u, freq, 0.13));
    }

    for (const step of PLAYFUL_BASS_HITS) {
      const start = bar * barSeconds + step * PLAYFUL_STEP_SECONDS;
      const freq = semitones(PLAYFUL_ROOT, chord[0] - 24);
      mixEvent(out, start, 0.4, (u) => {
        const body = Math.min(1, u / 0.008) * Math.exp(-u / 0.11);
        return (
          body *
          (Math.sin(2 * Math.PI * freq * u) +
            0.3 * Math.sin(4 * Math.PI * freq * u))
        );
      });
    }
  }

  return out;
}

// Magical — inharmonic bells over a soft sustained bed. Fairy and christening
// themes; sparse and high, so it never argues with the page.

const MAGICAL_ROOT = semitones(440, 5); // D5.

/** D major pentatonic, so two bells ringing at once are always consonant. */
const MAGICAL_SCALE = [0, 2, 4, 7, 9, 12, 14, -12, -5];

/** Struck-metal ratios. Harmonic partials would sound like a flute, not a bell. */
const BELL_PARTIALS = [
  { ratio: 1, amp: 1 },
  { ratio: 2.01, amp: 0.55 },
  { ratio: 2.78, amp: 0.38 },
  { ratio: 4.16, amp: 0.24 },
  { ratio: 5.43, amp: 0.15 },
  { ratio: 6.79, amp: 0.09 },
];

function renderMagical() {
  const out = new Float64Array(TOTAL_SAMPLES);
  const random = mulberry32(0x5eed);

  // Roughly one strike every 0.5s, jittered, because a bell on a strict grid
  // stops sounding like a chime and starts sounding like a metronome.
  for (let strike = 0; strike < 26; strike++) {
    const start = strike * 0.46 + random() * 0.22;
    if (start >= DURATION_SECONDS) break;

    const degree = MAGICAL_SCALE[Math.floor(random() * MAGICAL_SCALE.length)];
    const freq = semitones(MAGICAL_ROOT, degree);
    const level = 0.5 + random() * 0.5;
    const decay = 1.3 + random() * 0.7;

    mixEvent(out, start, 3.2, (u) => {
      const body = Math.min(1, u / 0.004) * Math.exp(-u / decay);
      let value = 0;
      for (const { ratio, amp } of BELL_PARTIALS) {
        const partial = freq * ratio;
        if (partial > PARTIAL_CEILING_HZ) continue;
        // Upper partials of a real bell die away first; without this the tail
        // turns metallic instead of fading to a pure hum.
        value +=
          amp *
          Math.exp(-u * ratio * 0.35) *
          Math.sin(2 * Math.PI * partial * u);
      }
      return level * body * value;
    });
  }

  const bed = [-24, -17, -12, -5];
  for (let i = 0; i < TOTAL_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const glow = 0.75 + 0.25 * Math.sin(2 * Math.PI * 0.31 * t);
    let sample = 0;
    for (let v = 0; v < bed.length; v++) {
      const freq = semitones(MAGICAL_ROOT, bed[v]);
      sample +=
        (glow * Math.sin(2 * Math.PI * freq * t + v * 1.3) +
          0.4 * glow * Math.sin(2 * Math.PI * cents(freq, 6) * t)) /
        (v + 3);
    }
    out[i] += 0.85 * sample;
  }

  return out;
}

// Celebratory — syncopated comping over a root-and-fifth bass at 120 bpm.
// Milestone birthdays and debuts: upbeat, but the off-beat placement keeps it
// closer to a hotel lounge than to a party horn.

const CELEBRATORY_ROOT = semitones(440, -14); // G3.
const CELEBRATORY_STEP_SECONDS = 0.125;
const CELEBRATORY_STEPS_PER_BAR = 16;

const CELEBRATORY_CHORDS = [
  [0, 4, 11, 14], // Gmaj9
  [-3, 2, 7, 12], // Em9
  [2, 7, 12, 16], // Am7
  [-5, 0, 4, 9], // D7
  [-1, 2, 9, 13], // Bm7
  [-7, -3, 4, 7], // Cmaj9
];

/** Nothing lands on beats two or four; the holes are what make it swing. */
const CELEBRATORY_COMP = [0, 3, 6, 10, 11, 14];
const CELEBRATORY_BASS = [
  { step: 0, degree: 0 },
  { step: 6, degree: 7 },
  { step: 8, degree: 0 },
  { step: 14, degree: 7 },
];

function renderCelebratory() {
  const out = new Float64Array(TOTAL_SAMPLES);
  const barSeconds = CELEBRATORY_STEP_SECONDS * CELEBRATORY_STEPS_PER_BAR;

  for (let bar = 0; bar < CELEBRATORY_CHORDS.length; bar++) {
    const chord = CELEBRATORY_CHORDS[bar];

    for (const step of CELEBRATORY_COMP) {
      const start = bar * barSeconds + step * CELEBRATORY_STEP_SECONDS;
      // Off-beat stabs sit back; downbeats carry the bar.
      const accent = step % 4 === 0 ? 1 : 0.66;

      mixEvent(out, start, 0.9, (u) => {
        const body = Math.min(1, u / 0.014) * Math.exp(-u / 0.34);
        let value = 0;
        for (let v = 0; v < chord.length; v++) {
          const freq = semitones(CELEBRATORY_ROOT, chord[v]);
          for (const offset of [-3, 3]) {
            const detuned = cents(freq, offset);
            for (let n = 1; n <= 6; n++) {
              const partial = detuned * n;
              if (partial > PARTIAL_CEILING_HZ) break;
              value +=
                Math.sin(2 * Math.PI * partial * u + v) /
                (2 * Math.pow(n, 1.35) * (v + 2));
            }
          }
        }
        return accent * body * value;
      });
    }

    for (const { step, degree } of CELEBRATORY_BASS) {
      const start = bar * barSeconds + step * CELEBRATORY_STEP_SECONDS;
      const freq = semitones(CELEBRATORY_ROOT, chord[0] + degree - 12);
      mixEvent(out, start, 0.7, (u) => {
        const body = Math.min(1, u / 0.01) * Math.exp(-u / 0.26);
        return (
          1.4 *
          body *
          (Math.sin(2 * Math.PI * freq * u) +
            0.25 * Math.sin(4 * Math.PI * freq * u) +
            0.1 * Math.sin(6 * Math.PI * freq * u))
        );
      });
    }
  }

  return out;
}

/**
 * Normalise to the target peak, apply the loop fades, and quantise. Normalising
 * per track rather than trusting each renderer's arithmetic is what keeps the
 * five at a matched level, so switching mood does not change how loud the page
 * is.
 */
function toPcm(signal) {
  let peak = 0;
  for (const value of signal) peak = Math.max(peak, Math.abs(value));
  const gain = peak > 0 ? TARGET_PEAK / peak : 0;

  const fadeSamples = Math.round(FADE_SECONDS * SAMPLE_RATE);
  const pcm = Buffer.alloc(TOTAL_SAMPLES * 2);

  for (let i = 0; i < TOTAL_SAMPLES; i++) {
    let value = signal[i] * gain;

    if (i < fadeSamples) {
      value *= 0.5 - 0.5 * Math.cos((Math.PI * i) / fadeSamples);
    }
    const fromEnd = TOTAL_SAMPLES - 1 - i;
    if (fromEnd < fadeSamples) {
      value *= 0.5 - 0.5 * Math.cos((Math.PI * fromEnd) / fadeSamples);
    }

    const quantised = Math.round(value * 32767);
    pcm.writeInt16LE(Math.min(32767, Math.max(-32768, quantised)), i * 2);
  }

  return pcm;
}

function toWav(pcm) {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // Uncompressed PCM.
  header.writeUInt16LE(1, 22); // Mono.
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28); // Byte rate.
  header.writeUInt16LE(2, 32); // Block align.
  header.writeUInt16LE(16, 34); // Bits per sample.
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

const TRACKS = [
  { file: "romantic.wav", render: renderRomantic },
  { file: "cinematic.wav", render: renderCinematic },
  { file: "playful.wav", render: renderPlayful },
  { file: "magical.wav", render: renderMagical },
  { file: "celebratory.wav", render: renderCelebratory },
];

mkdirSync(OUTPUT_DIR, { recursive: true });

for (const { file, render } of TRACKS) {
  const wav = toWav(toPcm(render()));
  const path = join(OUTPUT_DIR, file);
  writeFileSync(path, wav);
  console.log(`${file} ${wav.length} bytes`);
}
