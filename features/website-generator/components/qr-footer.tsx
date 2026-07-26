/**
 * The QR block that closes every invitation.
 *
 * A guest holding the printed card scans this to open the website; a guest
 * already on the website scans it to pass the invitation to someone standing
 * next to them. It sits at the very bottom, on its own panel and behind a
 * rule, so it reads as part of the stationery rather than something dropped on
 * top of the design.
 *
 * The image is a plain `<img>` on purpose: it is a small, already-cached PNG
 * from our own route, and routing it through next/image would add a serverless
 * optimisation hop to a file that is a few hundred bytes.
 */
export function QrFooter({
  src,
  caption,
}: {
  /** The QR PNG — our own route for a published site, or a data URI. */
  src: string;
  caption: string;
}) {
  return (
    <section className="inv-qr" data-reveal>
      <div className="inv-qr-panel">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="QR code linking to this invitation"
          width={128}
          height={128}
          className="inv-qr-img"
        />
        <p className="inv-qr-caption">{caption}</p>
      </div>
    </section>
  );
}
