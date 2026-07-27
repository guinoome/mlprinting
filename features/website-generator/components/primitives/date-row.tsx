import { cn } from "@/lib/utils";

/**
 * The date broken by vertical rules — SATURDAY │ 22 │ AUGUST.
 *
 * Five of the sixteen references set the date this way, and
 * docs/invitation-design-language.md calls it the cheapest upgrade available:
 * it turns a date from a sentence into a piece of design without needing any
 * artwork.
 */

/** The Philippines is the platform's home market, so it is the default. */
const DEFAULT_LOCALE = "en-PH";

export interface DateParts {
  weekday: string;
  day: string;
  month: string;
  year: string;
}

/**
 * Read in UTC on purpose, which is the opposite of what it looks like.
 *
 * The platform stores wall-clock time deliberately — see the formatTime note in
 * lib/invitation/preview-model.ts, where a time is formatted off a fixed UTC
 * carrier so it can never be pushed through a conversion, and the event date is
 * stored at midnight UTC to carry the digits a customer typed. Asking Intl for
 * the viewer's zone would move 22 August to the 21st for every guest west of
 * us, which is exactly the bug that note guards against. Reading the stored
 * value back in UTC returns the same numerals in Manila, London and Sydney.
 */
function formatter(locale: string): Intl.DateTimeFormat {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    // Numeric, not 2-digit: an invitation prints 5 August, never 05 August.
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  };
  try {
    return new Intl.DateTimeFormat(locale || DEFAULT_LOCALE, options);
  } catch {
    // A malformed locale tag must not blank the date on an invitation.
    return new Intl.DateTimeFormat("en", options);
  }
}

/**
 * The date's four pieces, already in the customer's language. Separated from
 * the component so the formatting can be tested without a renderer.
 */
export function splitDate(
  date: Date,
  locale: string = DEFAULT_LOCALE,
): DateParts {
  const parts = formatter(locale).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    weekday: value("weekday"),
    day: value("day"),
    month: value("month"),
    year: value("year"),
  };
}

/** The machine-readable date, taken in UTC for the same reason as the rest. */
function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface DateRowProps {
  date: Date;
  /** Already formatted by the view model — this component never parses a time. */
  timeLine?: string;
  locale?: string;
  className?: string;
}

export function DateRow({ date, timeLine, locale, className }: DateRowProps) {
  const { weekday, day, month } = splitDate(date, locale);
  const caps = "self-center text-[11px] uppercase tracking-[0.3em] opacity-70";

  return (
    <time
      dateTime={isoDay(date)}
      className={cn("flex flex-col items-center", className)}
    >
      <span className="flex items-stretch justify-center gap-4 sm:gap-6">
        <span className={caps}>{weekday}</span>
        <Rule />
        {/* The numeral carries the row; the words are there to frame it. */}
        <span
          className="text-[clamp(40px,8.5vw,68px)] tabular-nums leading-none"
          style={{ fontFamily: "var(--inv-heading)" }}
        >
          {day}
        </span>
        <Rule />
        <span className={caps}>{month}</span>
      </span>

      {timeLine ? (
        <span className="mt-4 text-[10px] uppercase tracking-[0.28em] opacity-60">
          {timeLine}
        </span>
      ) : null}
    </time>
  );
}

/** The thin vertical stroke between the words and the numeral. */
function Rule() {
  return (
    <span
      aria-hidden="true"
      className="w-px self-stretch"
      style={{ background: "var(--inv-line)" }}
    />
  );
}
