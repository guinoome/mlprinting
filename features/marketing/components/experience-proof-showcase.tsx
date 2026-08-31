import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { routes } from "@/lib/config";
import { PROOF_EXPERIENCES } from "@/features/website-generator/experience/proofs";

function ProofArtwork({ slug }: { slug: string }) {
  if (slug === "capiz-window") {
    return (
      <div className="relative h-64 overflow-hidden rounded-[1.5rem] border border-[#b88a38]/35 bg-[#f7f0dc] text-[#27372f] shadow-[inset_0_0_80px_rgba(184,138,56,0.13)]">
        <div className="absolute inset-0 grid grid-cols-4 grid-rows-3 opacity-60">
          {Array.from({ length: 12 }, (_, index) => (
            <span
              key={index}
              className="border-b border-r border-[#b88a38]/25 bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,.95),transparent_60%)]"
            />
          ))}
        </div>
        <div className="absolute inset-x-10 top-10 rounded-t-full border border-[#b88a38]/40 bg-white/45 px-6 py-10 text-center backdrop-blur-[2px]">
          <p className="text-[9px] font-semibold uppercase tracking-[0.34em] text-[#7c642e]">
            Together with our families
          </p>
          <p className="mt-5 font-serif text-3xl leading-none">Maria</p>
          <p className="my-1 font-serif text-base text-[#b88a38]">&amp;</p>
          <p className="font-serif text-3xl leading-none">Jose</p>
        </div>
        <div className="absolute -right-20 -top-10 h-52 w-28 rotate-[24deg] bg-white/40 blur-xl" />
      </div>
    );
  }

  if (slug === "neon-eighteen") {
    return (
      <div className="relative h-64 overflow-hidden rounded-[1.5rem] border border-fuchsia-400/30 bg-[#070611] text-white shadow-[0_0_45px_rgba(255,63,191,0.18)]">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(68,242,255,.13)_1px,transparent_1px),linear-gradient(90deg,rgba(255,63,191,.13)_1px,transparent_1px)] bg-[size:28px_28px] [transform:perspective(320px)_rotateX(28deg)_scale(1.25)]" />
        <div className="absolute left-5 top-5 rounded-full border border-cyan-300/50 px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.3em] text-cyan-200">
          Enter the night
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-[8rem] font-black leading-none tracking-[-0.1em] text-transparent [-webkit-text-stroke:2px_#ff3fbf] [text-shadow:0_0_24px_rgba(255,63,191,.75)]">
            18
          </p>
        </div>
        <p className="absolute bottom-5 left-5 text-xl font-black uppercase tracking-tight [text-shadow:0_0_12px_#44f2ff]">
          Isabella
        </p>
        <span className="absolute bottom-6 right-5 size-3 rounded-full bg-cyan-300 shadow-[0_0_18px_#44f2ff]" />
      </div>
    );
  }

  return (
    <div className="relative h-64 overflow-hidden rounded-[1.5rem] border border-stone-300 bg-[#f3f1ec] text-[#30322f]">
      <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(#6f756b_0.55px,transparent_0.55px)] [background-size:5px_5px]" />
      <div className="absolute inset-x-0 top-8 text-center">
        <p className="text-[9px] uppercase tracking-[0.36em] text-[#6f756b]">
          In loving memory
        </p>
        <div className="mx-auto mt-5 flex h-28 w-24 items-center justify-center rounded-t-full border border-[#8d9189]/55 bg-[linear-gradient(145deg,#d6d5d0,#a7aaa4)] font-serif text-3xl text-white shadow-sm">
          RS
        </div>
        <p className="mt-4 font-serif text-2xl">Rosario Santos</p>
        <p className="mt-1 text-[10px] uppercase tracking-[0.28em] text-[#6f756b]">
          1948 — 2026
        </p>
      </div>
    </div>
  );
}

/** The WP20 validation set — always visible, even when the DB is unavailable. */
export function ExperienceProofShowcase() {
  return (
    <section
      id="experience-proofs"
      className="border-b border-border bg-[#f7f6f2]"
    >
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Three live experience proofs
          </p>
          <h2 className="mt-4 text-balance font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
            One platform. Three completely different feelings.
          </h2>
          <p className="mt-5 max-w-xl text-pretty leading-relaxed text-muted-foreground">
            These are not static cover designs. Open each one to experience its
            own reveal, pacing, layout, and interaction language.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {PROOF_EXPERIENCES.map((proof, index) => (
            <article
              key={proof.slug}
              className="group rounded-[2rem] border border-black/10 bg-white p-3 shadow-[0_20px_60px_rgba(34,31,24,0.08)] transition-transform duration-300 hover:-translate-y-1"
            >
              <ProofArtwork slug={proof.slug} />
              <div className="px-3 pb-4 pt-6">
                <div className="flex flex-wrap items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <span aria-hidden="true">·</span>
                  <span>{proof.tier}</span>
                  <span aria-hidden="true">·</span>
                  <span>{proof.motionLevel}</span>
                  <span aria-hidden="true">·</span>
                  <span>{proof.motionProfile}</span>
                </div>
                <h3 className="mt-3 font-serif text-2xl">{proof.name}</h3>
                <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {proof.occasion}
                </p>
                <p className="mt-4 min-h-12 text-sm leading-relaxed text-muted-foreground">
                  {proof.promise}
                </p>
                <Link
                  href={routes.templateLivePreview(proof.slug)}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold underline decoration-black/25 underline-offset-4 transition-colors hover:decoration-black"
                  aria-label={`Open the live ${proof.name} experience`}
                >
                  Open live experience
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
