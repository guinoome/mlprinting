# Invitation design language

Analysis of the sixteen reference invitations supplied with FDG-ML-DEP-STD-015
(Instructions 3), written to extract principles rather than to copy designs. The
references are not reproduced anywhere in this repository and none of their
artwork, photography, or type is used.

This is step 1–3 of that document's suggested workflow: analyse, extract, then
define a direction per category.

---

## What the references actually do

Reading across all sixteen, the same small set of devices does most of the work.
None of them is a layout we should reproduce; all of them are techniques worth
having.

**1. Photographs sit in shaped frames, not rectangles.**
An oval, an arch, a circle, a soft blob, a diagonal strip. This is the most
common device in the set and the one the platform completely lacks — every photo
we render is a full-bleed rectangle. A shaped frame is what makes a photo read
as *placed* rather than *pasted*.

**2. Full-bleed photograph with type laid over it.**
Used for save-the-dates especially: the photograph is the whole card, a script
line sits over it, and legibility comes from a scrim. We do this already in the
hero, and it is the one device we had right.

**3. A date row broken by vertical rules.**
`SATURDAY │ 22 │ AUGUST` — the day and month flanking a large numeral. Appears in
five of the sixteen. It turns a date from a sentence into a piece of design, and
it is the single cheapest upgrade available to us.

**4. Script paired with letter-spaced caps.**
The names in a script or high-contrast serif; everything around them in small,
widely-tracked capitals. The contrast between the two is what reads as
"invitation" rather than "poster".

**5. Decoration clusters in the corners, not the centre.**
Florals, gold filigree, and washes gather at the corners and edges and leave the
middle clear for words. Our covers centre their ornament, which is why they read
as stationery motifs rather than as designed frames.

**6. An inset rule frame.**
A thin gold or white rectangle set in from the trim, sometimes doubled. Cheap,
and does a great deal of the "premium" work.

**7. A card floating on a photographic background.**
The grand-opening and holiday examples put a paper card over a photograph of a
place. Two planes instead of one, which reads as depth.

**8. A strip of small photographs.**
Three or four thumbnails in a row, usually near the foot. Uses the photographs a
customer already has without competing with the hero.

**9. Bold outlined display type for children's parties.**
Heavy sans with a contrasting outline and a hard shadow, over saturated flat
colour. Loud on purpose; the opposite of everything above, and correct for its
occasion.

**10. Rich dark ground with metallic accent for luxury.**
Deep navy, near-black, dark brown, with gold. Restraint in the type, generosity
in the ornament.

---

## The architectural gap

The platform renders **one layout for all sixteen categories**
(`features/website-generator/components/event-site.tsx`). Colour and wording vary
by occasion; structure does not. Instructions 3 asks the opposite — "avoid
sharing the same layout across categories", with each having its own hero
presentation and section ordering.

So the work is not to restyle the existing page sixteen times. It is to make the
page's structure a value that a template chooses, and then to author distinct
structures. Everything else in that document — animation, video, music, QR —
hangs off having that seam.

---

## Direction per category

One sentence each, so the categories cannot drift into each other.

| Category | Direction |
|---|---|
| Wedding | Full-bleed hero, script names over photograph, date row, photo strip at the foot |
| Engagement | Single portrait in an arch, generous margin, one line of script |
| Save the date | Photograph is the entire card; date as the only other element |
| Debut | Dark ground, metallic rule frame, portrait in an oval, numeral eighteen as a device |
| Birthday | Flat saturated colour, bold outlined display type, photo in a circle |
| Kids birthday | As birthday, plus illustrated characters and confetti bleeding off the edges |
| Christening | Pale, high margin, soft blob photo frame, olive or dove motif |
| Baptism | As christening, with a font and palette of its own so the two are not one design |
| Baby shower | Watercolour wash corners, arch photo frame, pastel |
| Graduation | Editorial: wide photo band, script name beneath, dark or cream |
| Anniversary | Two photographs — then and now — with a metallic numeral between them |
| Corporate | Type-led, no photograph required, deco rule frame, single accent |
| Reunion | Photo grid as the hero; the crowd *is* the design |
| Fiesta | Banderitas, warm saturated ground, procession schedule as a timeline |
| Holiday party | Card floating over a photographic background, playful stickers |
| Memorial | The quietest: one portrait, wide margin, no ornament beyond a rule |
| Custom | Neutral editorial frame that takes any content without looking generic |

---

## Increments

Deliberately small and reviewable, per that document's harness section. Each one
ships and is verified on its own.

1. **Primitives** — shaped photo frames, the date row, corner decoration
   clusters, inset rule frame, photo strip. Reusable, no category knowledge.
2. **Layout seam** — a template declares its hero presentation and section order;
   the renderer reads it. Two categories authored end to end to prove the seam.
3. **Category layouts** — the remaining fourteen, in batches, each reviewed
   against the table above.
4. **Motion** — per-layout reveal choreography on top of the existing
   scroll-reveal and parallax.
5. **Video** — optional hero background video with a poster fallback.
6. **Music** — already shipped; extend to per-template choice.
7. **QR** — already shipped; verify placement survives every new layout.

Music and QR are done, which is why they sit late and small here.

---

## Constraint worth stating

The references are photograph-led, and the platform has no photographs. Customer
uploads flow through the `COVER` and gallery slots and render today; the
catalogue's own artwork is generated vector. Until ML Printing supplies licensed
photography, catalogue thumbnails stay illustrative — the shaped frames below are
built so that dropping a real photograph in is a one-line change, not a redesign.
