import { describe, expect, it } from "vitest";
import { MUSIC_TRACKS, moodForEventKind, type MusicMood } from "./music";

const MOODS: MusicMood[] = [
  "romantic",
  "cinematic",
  "playful",
  "magical",
  "celebratory",
];

/** Every kind the platform ships, paired with the mood it is meant to get. */
const EXPECTED: Array<[string, MusicMood]> = [
  ["wedding", "romantic"],
  ["engagement", "romantic"],
  ["anniversary", "romantic"],
  ["corporate", "cinematic"],
  ["funeral", "cinematic"],
  ["religious", "cinematic"],
  ["birthday", "playful"],
  ["family", "playful"],
  ["fiesta", "playful"],
  ["christening", "magical"],
  ["baby-shower", "magical"],
  ["debut", "celebratory"],
  ["graduation", "celebratory"],
  ["reunion", "celebratory"],
  ["community", "celebratory"],
  ["general", "celebratory"],
];

describe("MUSIC_TRACKS", () => {
  it("has a track for every mood", () => {
    for (const mood of MOODS) {
      expect(MUSIC_TRACKS[mood]).toBeTruthy();
    }
    expect(Object.keys(MUSIC_TRACKS)).toHaveLength(MOODS.length);
  });

  it("resolves each mood to a .wav under /music/", () => {
    for (const mood of MOODS) {
      expect(MUSIC_TRACKS[mood]).toMatch(/^\/music\/[a-z-]+\.wav$/);
    }
  });

  it("gives each mood its own file", () => {
    // A shared path would silently make two moods the same choice.
    const paths = new Set(Object.values(MUSIC_TRACKS));
    expect(paths.size).toBe(MOODS.length);
  });
});

describe("moodForEventKind", () => {
  it.each(EXPECTED)("maps %s to %s", (kind, mood) => {
    expect(moodForEventKind(kind)).toBe(mood);
  });

  it("returns a mood that has a track", () => {
    for (const [kind] of EXPECTED) {
      expect(MUSIC_TRACKS[moodForEventKind(kind)]).toBeTruthy();
    }
  });

  it("falls back to celebratory for a kind it has never seen", () => {
    // eventType is free text on the invitation, so this is a real input, not a
    // hypothetical one.
    expect(moodForEventKind("pet-adoption")).toBe("celebratory");
    expect(moodForEventKind("")).toBe("celebratory");
  });

  it("ignores casing and stray whitespace", () => {
    expect(moodForEventKind("  Wedding ")).toBe("romantic");
    expect(moodForEventKind("BABY-SHOWER")).toBe("magical");
  });

  it("never gives a funeral playful or celebratory music", () => {
    // The reason the mapping is grouped by tone instead of sorted. A memorial
    // page opening with party music is not a bug anyone gets to apologise for.
    const mood = moodForEventKind("funeral");
    expect(mood).not.toBe("playful");
    expect(mood).not.toBe("celebratory");
    expect(mood).toBe("cinematic");
  });

  it("keeps every solemn kind away from the upbeat tracks", () => {
    for (const kind of ["funeral", "religious"]) {
      expect(["playful", "celebratory"]).not.toContain(moodForEventKind(kind));
    }
  });
});
