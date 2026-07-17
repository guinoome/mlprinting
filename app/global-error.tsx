"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";

/**
 * Last-resort boundary — catches errors thrown by the root layout itself,
 * which app/error.tsx cannot, because it renders *inside* that layout.
 *
 * Ships its own <html> and <body>: when this renders, the root layout is the
 * thing that failed, so nothing it would have provided exists. That includes
 * globals.css, which is why the styling here is inline and plain. Keep this
 * file dependency-free — an import that throws would take the fallback down
 * with the page it is meant to rescue.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.report(error, { at: "global-error-boundary", digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "28rem" }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>
            The application failed to load. The error has been logged.
          </p>
          {error.digest ? (
            <p
              style={{
                color: "#64748b",
                fontSize: "0.75rem",
                marginBottom: "1.5rem",
              }}
            >
              Reference: {error.digest}
            </p>
          ) : null}
          <button
            onClick={reset}
            style={{
              background: "#0f172a",
              color: "#fff",
              border: 0,
              borderRadius: "0.375rem",
              padding: "0.625rem 1rem",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
