"use client";

import * as React from "react";

/**
 * Two guest actions that make a shared invitation act like a modern one: save
 * the date to a calendar, and pass the link along. Share uses the native share
 * sheet where it exists (phones), and falls back to copying the link.
 */
export function InvitationActions({
  title,
  calendarUrl,
}: {
  title: string;
  calendarUrl: string;
}) {
  const [copied, setCopied] = React.useState(false);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Cancelled or unsupported — fall through to copy.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Nothing safe to do; leave the button as-is.
    }
  };

  return (
    <div className="inv-actions">
      <a
        className="inv-action"
        href={calendarUrl}
        target="_blank"
        rel="noreferrer noopener"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M3 9h18M8 2v4M16 2v4" strokeLinecap="round" />
        </svg>
        Save the date
      </a>
      <button type="button" className="inv-action" onClick={share}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="M8.6 10.6l6.8-4.2M8.6 13.4l6.8 4.2" strokeLinecap="round" />
        </svg>
        {copied ? "Link copied" : "Share"}
      </button>
    </div>
  );
}
