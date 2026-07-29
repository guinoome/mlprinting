import { social } from "@/lib/config";

/**
 * Floating Messenger link.
 *
 * A plain anchor, not Facebook's chat plugin. The plugin loads Facebook's SDK
 * on every page, which means a third-party script that can see the URL of the
 * invitation somebody is viewing and sets cookies before anyone has agreed to
 * anything. This is one link, no script, no tracking — and it opens the same
 * conversation.
 *
 * `m.me` on a phone hands off to the Messenger app; on a desktop it lands in
 * Messenger on the web. Either way the customer is talking to ML Printing
 * rather than filling in a form and waiting.
 *
 * Deliberately not rendered on a customer's published invitation (/e/[slug]).
 * That page belongs to the customer and their guests; ML Printing soliciting
 * enquiries over somebody's wedding invitation would be advertising on a page
 * they paid for.
 */
export function MessengerButton() {
  return (
    <a
      href={social.messenger}
      target="_blank"
      rel="noreferrer noopener"
      // Chat with us, not the brand name: the label says what pressing it does.
      aria-label="Chat with ML Printing on Messenger"
      className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-border bg-background/95 px-4 py-3 text-sm font-medium shadow-lg backdrop-blur transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring md:bottom-6 md:right-6"
    >
      {/* Messenger's mark, inline. A remote image would be one more request and
          one more host to trust for a decorative glyph. */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="shrink-0"
      >
        <path
          fill="#0866FF"
          d="M12 2C6.3 2 2 6.2 2 11.7c0 2.9 1.2 5.4 3.1 7.2.2.1.3.4.3.6l-.1 2c0 .6.6 1 1.1.8l2.2-1c.2-.1.4-.1.6 0 1 .3 2 .4 3 .4 5.7 0 10-4.2 10-9.7S17.7 2 12 2Z"
        />
        <path
          fill="#fff"
          d="m6 14.6 2.9-4.6c.5-.7 1.5-.9 2.2-.4l2.3 1.8c.2.2.5.2.7 0l3.1-2.4c.4-.3.9.2.7.6l-2.9 4.6c-.5.7-1.5.9-2.2.4l-2.3-1.8a.5.5 0 0 0-.7 0l-3.1 2.4c-.4.3-.9-.2-.7-.6Z"
        />
      </svg>
      <span className="hidden sm:inline">Chat with us</span>
    </a>
  );
}
