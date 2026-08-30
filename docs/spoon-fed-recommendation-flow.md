# Spoon-Fed Recommendation Flow (WP-03)

## Result

The builder now follows the dependency of the decision instead of the old
catalogue order:

`Event context → Recommended experiences → Relevant questions → Preview`

A new draft asks what the customer is celebrating before asking them to choose
a design. The experience step then shows at most six recommendations and keeps
the full catalogue one explicit action away.

## Ranking inputs

The builder calls the existing replaceable recommendation service. It does not
implement a second scoring model. The current strategy combines:

- event-type match;
- ML Printing featured status;
- popularity and freshness;
- the customer's favorites;
- recently used and recently viewed designs;
- shared color, style, and tag affinity.

Every displayed choice carries human-readable reasons. The selected template
is always retained in the set even if later catalogue activity moves it below
the recommendation limit, so returning customers never lose sight of their
current decision.

## Boundaries

- Invitation data still stores only the event type and selected template id.
- Recommendation signals are read at request time and are not copied into the
  invitation record.
- `curateTemplateChoices` is a pure adapter around
  `services/recommendations`; a future strategy can replace the scorer without
  changing the builder UI.
- The builder route owns the query and the builder feature owns presentation.
  No feature imports another feature.
- Existing event-aware host presets and layout-driven visible sections continue
  the relevant-question behavior after selection.

## Fallbacks

- With no event type, the service returns a general curated set.
- With no preference history, event relevance and catalogue signals still work.
- With no published templates, the existing empty state remains.
- Customers can always use **Browse all experiences**.

## Validation

Tests prove that event relevance outranks raw popularity, current selections
remain visible, catalogue input is not mutated, and empty/invalid limits degrade
cleanly. The existing recommendation strategy tests remain the authority for
weighting, stability, affinity caps, and audit reasons.
