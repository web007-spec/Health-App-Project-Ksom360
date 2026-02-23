import { Badge } from "@/components/ui/badge";
import { useEngineScores } from "@/hooks/useEngineScores";
import { RECOMMENDATION_LABELS, Recommendation } from "@/lib/recommendationEngine";

const REC_COLORS: Record<Recommendation, string> = {
  advance: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  maintain: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  reduce: "bg-red-500/15 text-red-400 border-red-500/30",
};

/** Small badge showing the primary engine recommendation for a protocol card */
export function ProtocolRecommendationBadge() {
  const { data: scores } = useEngineScores();

  if (!scores || scores.length === 0) return null;

  const primary = scores[0]; // metabolic stability

  return (
    <Badge variant="outline" className={`text-[10px] ${REC_COLORS[primary.recommendation]}`}>
      {RECOMMENDATION_LABELS[primary.recommendation].label}
    </Badge>
  );
}
