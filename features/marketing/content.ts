/**
 * Landing page copy, as data.
 *
 * Kept out of the components for the same reason lib/config/branding.ts exists:
 * when ML Printing rewrites the pitch, they edit prose in one file rather than
 * hunting through JSX. Nothing here is rendered as HTML, so it is plain text.
 */

export interface Highlight {
  /** Lucide icon name, resolved by the component that renders it. */
  icon: "mail-open" | "clipboard-check" | "printer" | "qr-code";
  title: string;
  body: string;
}

/**
 * What the product actually does, in the order a customer cares about it: the
 * thing they send, the answers they get back, the paper, and getting people
 * there. Each one is a capability that exists today — nothing aspirational.
 */
export const HIGHLIGHTS: Highlight[] = [
  {
    icon: "mail-open",
    title: "An invitation that opens",
    body: "Guests tap a link and enter an opening scene designed for the occasion — not a recycled envelope. Photos, countdown and details work in any browser, with no app to install.",
  },
  {
    icon: "clipboard-check",
    title: "RSVPs that come to you",
    body: "Replies land in your dashboard as guests send them, with head counts and messages. No more chasing a group chat for numbers.",
  },
  {
    icon: "printer",
    title: "Printed to match",
    body: "The same design comes off our presses in Consolacion as a physical suite, so the card in someone's hand matches the link on their phone.",
  },
  {
    icon: "qr-code",
    title: "Details guests can find",
    body: "Venue maps, dress code, and a programme, plus a QR code for the printed cards that opens the website.",
  },
];

export interface Faq {
  question: string;
  answer: string;
}

export const FAQS: Faq[] = [
  {
    question: "Do my guests need an account?",
    answer:
      "No. You send a link, they open it. Replying to an invitation takes a name and a number of guests, nothing more.",
  },
  {
    question: "Can I use my own photos?",
    answer:
      "Yes. Every template takes your cover photo and a gallery. If you would rather not use photographs at all, the designs stand on their own artwork.",
  },
  {
    question: "Can I get printed invitations too?",
    answer:
      "Yes — that is where ML Printing started. Templates marked for print produce a press-ready file in the same design as your website.",
  },
  {
    question: "How do I know who is coming?",
    answer:
      "Your dashboard lists every reply with its head count, so you always have a current total for the caterer.",
  },
  {
    question: "What does it cost?",
    answer:
      "Pricing depends on the experience and whether you are printing. Browse the catalogue, then message ML Printing for a confirmed quote. Verified cash and bank-transfer settlements are supported; an online payment provider has not been selected yet.",
  },
];
