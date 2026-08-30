import { activeStrategy } from "@/services/recommendations";
import type {
  RecommendationCandidate,
  RecommendationSignals,
} from "@/services/recommendations";

export interface CuratedTemplate<T extends RecommendationCandidate> {
  template: T;
  reasons: string[];
}

/**
 * Turn the replaceable recommendation service into the builder's small,
 * explainable choice set.
 *
 * The current selection is never hidden. A customer returning to a draft must
 * be able to see what they already chose even when new catalogue activity has
 * moved it outside the top recommendations.
 */
export function curateTemplateChoices<T extends RecommendationCandidate>(
  candidates: T[],
  signals: RecommendationSignals,
  selectedTemplateId: string | null,
  limit = 6,
): CuratedTemplate<T>[] {
  if (limit <= 0 || candidates.length === 0) return [];

  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const ranked = activeStrategy()
    .recommend(candidates, signals, limit)
    .flatMap((recommendation) => {
      const template = byId.get(recommendation.templateId);
      if (!template) return [];
      return [
        {
          template,
          reasons:
            recommendation.reasons.length > 0
              ? recommendation.reasons
              : ["A strong all-round choice"],
        },
      ];
    });

  if (!selectedTemplateId) return ranked;

  const selected = byId.get(selectedTemplateId);
  if (!selected) return ranked;

  const existing = ranked.find(
    (choice) => choice.template.id === selectedTemplateId,
  );
  if (existing) {
    return ranked.map((choice) =>
      choice === existing
        ? { ...choice, reasons: ["Your current selection", ...choice.reasons] }
        : choice,
    );
  }

  return [
    { template: selected, reasons: ["Your current selection"] },
    ...ranked.slice(0, limit - 1),
  ];
}
