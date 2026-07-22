"use client";

import * as React from "react";

/**
 * A background-music toggle — the touch that makes a digital invitation feel
 * produced. Autoplay is blocked until a gesture, so it starts on the
 * `invitation:open` event the envelope dispatches (opening is a tap). A floating
 * button lets a guest pause or resume; nothing plays until they open, and it can
 * always be silenced.
 */
export function MusicPlayer({ src }: { src: string }) {
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = React.useState(false);

  const play = React.useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = 0.5;
    el.play()
      .then(() => setPlaying(true))
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    const onOpen = () => play();
    window.addEventListener("invitation:open", onOpen);
    return () => window.removeEventListener("invitation:open", onOpen);
  }, [play]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) play();
    else {
      el.pause();
      setPlaying(false);
    }
  };

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={src} loop preload="none" />
      <button
        type="button"
        onClick={toggle}
        className={playing ? "inv-music is-playing" : "inv-music"}
        aria-label={playing ? "Pause music" : "Play music"}
        aria-pressed={playing}
      >
        {playing ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M9 18V5l10-2v13" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="16" cy="16" r="3" />
          </svg>
        )}
      </button>
    </>
  );
}
