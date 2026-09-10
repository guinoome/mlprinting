import type { PreviewModel } from "@/lib/invitation/preview-model";

function nameSizeClass(name: string): string {
  if (name.length > 24) return "starlight-name--long";
  if (name.length > 15) return "starlight-name--medium";
  return "";
}

export function StarlightDreamscapeHero({ model }: { model: PreviewModel }) {
  const name = model.celebrantName ?? model.hosts[0]?.name ?? model.title;
  const venue = model.venues[0];

  return (
    <section className="starlight-hero" aria-labelledby="starlight-title">
      <div className="starlight-sky" aria-hidden="true" />
      {model.coverImageUrl ? (
        <div
          className="starlight-portrait"
          aria-label={`${name}'s approved portrait`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={model.coverImageUrl}
            alt={`${name}, the birthday celebrant`}
          />
        </div>
      ) : (
        <div className="starlight-portrait-placeholder" aria-hidden="true">
          <span>✦</span>
          <small>Your approved photo appears here</small>
        </div>
      )}

      <div className="starlight-copy">
        <p className="starlight-kicker">You&apos;re invited to</p>
        <h1
          id="starlight-title"
          className={`starlight-name ${nameSizeClass(name)}`}
        >
          {name}
        </h1>
        {model.celebrantAge ? (
          <p className="starlight-age">
            Turns <strong>{model.celebrantAge}</strong>
          </p>
        ) : null}
        <p className="starlight-subtitle">
          {model.subtitle ?? "A starlight pony dreamscape"}
        </p>
        {model.welcomeMessage ? (
          <p className="starlight-welcome">{model.welcomeMessage}</p>
        ) : null}
        <a className="starlight-rsvp" href="#rsvp">
          <span aria-hidden="true">♥</span> RSVP now{" "}
          <span aria-hidden="true">›</span>
        </a>
        <div className="starlight-facts">
          {model.dateLine ? (
            <span>
              {model.dateLine}
              {model.timeLine ? ` · ${model.timeLine}` : ""}
            </span>
          ) : null}
          {venue ? (
            <span>
              {venue.name}
              {venue.address ? ` · ${venue.address}` : ""}
            </span>
          ) : null}
        </div>
      </div>
      <a className="starlight-scroll" href="#invitation-story">
        Scroll to explore more magic <span aria-hidden="true">⌄</span>
      </a>
    </section>
  );
}
