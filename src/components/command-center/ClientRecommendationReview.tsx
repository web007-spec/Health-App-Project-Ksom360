import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertTriangle, TrendingUp, TrendingDown, Minus, Eye, ArrowRight } from "lucide-react";
import { useClientRecommendation, useApproveRecommendation } from "@/hooks/useAdaptiveRecommendation";
import { PLAN_SUGGESTION_LABELS, type PlanSuggestionType } from "@/lib/recommendationRules";
import { STATUS_DISPLAY, type StatusLabel } from "@/lib/recommendationEngine";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ClientRecommendationReviewProps {
  clientId: string;
}

const STATUS_BADGE_COLORS: Record<string, string> = {
  strong: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  moderate: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  needs_support: "bg-red-500/15 text-red-400 border-red-500/30",
};

export function ClientRecommendationReview({ clientId }: ClientRecommendationReviewProps) {
  const { data: rec, isLoading } = useClientRecommendation(clientId);
  const approveMutation = useApproveRecommendation();
  const { toast } = useToast();

  if (isLoading || !rec) return null;

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync({ recommendationId: rec.id });
      toast({ title: "Recommendation approved" });
    } catch {
      toast({ title: "Error approving", variant: "destructive" });
    }
  };

  const statusLabel = STATUS_DISPLAY[rec.status as StatusLabel]?.label || rec.status;
  const hasPlanSuggestion = !!rec.plan_suggestion_type;
  const needsApproval = hasPlanSuggestion && rec.coach_override_required && !rec.coach_approved;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Adaptive Recommendations
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-xs ${STATUS_BADGE_COLORS[rec.status] || ""}`}>
              {statusLabel}
            </Badge>
            <span className="text-sm font-bold text-foreground">{rec.score_total}/100</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date + Engine */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{format(new Date(rec.date), "MMM dd, yyyy")}</span>
          <span className="capitalize">{rec.engine_mode} Engine</span>
        </div>

        {/* Today Recommendation */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <ArrowRight className="h-3.5 w-3.5 text-primary" />
            <p className="text-sm font-semibold text-foreground">Today</p>
          </div>
          <p className="text-sm text-muted-foreground pl-5">{rec.today_recommendation_text}</p>
        </div>

        {/* Week Recommendation */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <p className="text-sm font-semibold text-foreground">This Week</p>
          </div>
          <p className="text-sm text-muted-foreground pl-5">{rec.week_recommendation_text}</p>
        </div>

        {/* Data context */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground border-t border-border pt-3">
          <span>Lowest: <span className="font-medium text-foreground capitalize">{rec.lowest_factor?.replace("_", " ")}</span></span>
        </div>

        {/* Plan Suggestion */}
        {hasPlanSuggestion && (
          <div className="border-t border-border pt-3 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <p className="text-sm font-semibold">Plan Suggestion</p>
            </div>

            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    PLAN_SUGGESTION_LABELS[rec.plan_suggestion_type as PlanSuggestionType]?.color || ""
                  }`}
                >
                  {PLAN_SUGGESTION_LABELS[rec.plan_suggestion_type as PlanSuggestionType]?.label || rec.plan_suggestion_type}
                </Badge>
                {rec.coach_approved && (
                  <Badge variant="outline" className="text-xs bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Approved
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{rec.plan_suggestion_text}</p>

              {needsApproval && (
                <Button
                  size="sm"
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                  className="mt-2"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Approve Suggestion
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
