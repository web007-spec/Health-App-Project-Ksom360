import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, AlertTriangle, Clock } from "lucide-react";
import { PLAN_SUGGESTION_LABELS, type PlanSuggestionType } from "@/lib/recommendationRules";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface PendingApprovalsProps {
  clientId: string;
  trainerId: string;
}

const DISMISSAL_REASONS = [
  "Client context not captured",
  "Too aggressive",
  "Too conservative",
  "Injury / recovery concerns",
  "Travel / schedule conflict",
  "Other",
];

export function PendingApprovals({ clientId, trainerId }: PendingApprovalsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dismissing, setDismissing] = useState(false);
  const [dismissReason, setDismissReason] = useState("");
  const [dismissNote, setDismissNote] = useState("");

  const { data: pendingRec } = useQuery({
    queryKey: ["cc-pending-approvals", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("recommendation_events")
        .select("*")
        .eq("client_id", clientId)
        .not("plan_suggestion_type", "is", null)
        .eq("coach_override_required", true)
        .eq("coach_approved", false)
        .eq("dismissed", false)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!pendingRec) return;

      // Approve the recommendation
      const { error } = await supabase
        .from("recommendation_events")
        .update({
          coach_approved: true,
          coach_approved_at: new Date().toISOString(),
          coach_id: trainerId,
        } as any)
        .eq("id", pendingRec.id);
      if (error) throw error;

      // Apply the change based on suggestion type
      if (pendingRec.plan_suggestion_type === "advance") {
        const { data: settings } = await supabase
          .from("client_feature_settings")
          .select("current_level")
          .eq("client_id", clientId)
          .maybeSingle();
        const newLevel = Math.min((settings?.current_level || 1) + 1, 7);
        await supabase
          .from("client_feature_settings")
          .update({
            current_level: newLevel,
            level_start_date: new Date().toISOString().split("T")[0],
            level_completion_pct: 0,
            level_status: newLevel >= 7 ? "completed" : "active",
          } as any)
          .eq("client_id", clientId);
      }

      // Log the approval
      await supabase.from("coach_override_log").insert({
        client_id: clientId,
        coach_id: trainerId,
        override_type: "approval",
        new_value: pendingRec.plan_suggestion_type,
        reason: `Approved: ${pendingRec.plan_suggestion_text}`,
      } as any);
    },
    onSuccess: () => {
      toast({ title: "Suggestion approved and applied" });
      queryClient.invalidateQueries({ queryKey: ["cc-pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["client-recommendation"] });
      queryClient.invalidateQueries({ queryKey: ["level-progression"] });
      queryClient.invalidateQueries({ queryKey: ["cc-activity-log"] });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async () => {
      if (!pendingRec) return;
      const { error } = await supabase
        .from("recommendation_events")
        .update({
          dismissed: true,
          dismissed_at: new Date().toISOString(),
          dismissal_reason: dismissReason,
          dismissal_note: dismissNote.trim() || null,
          coach_id: trainerId,
        } as any)
        .eq("id", pendingRec.id);
      if (error) throw error;

      await supabase.from("coach_override_log").insert({
        client_id: clientId,
        coach_id: trainerId,
        override_type: "dismissal",
        old_value: pendingRec.plan_suggestion_type,
        reason: `${dismissReason}${dismissNote ? `: ${dismissNote}` : ""}`,
      } as any);
    },
    onSuccess: () => {
      toast({ title: "Suggestion dismissed" });
      setDismissing(false);
      setDismissReason("");
      setDismissNote("");
      queryClient.invalidateQueries({ queryKey: ["cc-pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["cc-activity-log"] });
    },
  });

  if (!pendingRec) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No pending suggestions.</p>
        </CardContent>
      </Card>
    );
  }

  const suggestionConfig = PLAN_SUGGESTION_LABELS[pendingRec.plan_suggestion_type as PlanSuggestionType];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Pending Plan Suggestion
          </CardTitle>
          <Badge variant="outline" className={`text-xs ${suggestionConfig?.color || ""}`}>
            {suggestionConfig?.label || pendingRec.plan_suggestion_type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted/50 p-4 space-y-3">
          <p className="text-sm text-foreground">{pendingRec.plan_suggestion_text}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">Score:</span> {pendingRec.score_total}/100
            </div>
            <div>
              <span className="font-medium text-foreground">Status:</span>{" "}
              <span className="capitalize">{pendingRec.status?.replace("_", " ")}</span>
            </div>
            <div>
              <span className="font-medium text-foreground">Lowest:</span>{" "}
              <span className="capitalize">{pendingRec.lowest_factor?.replace("_", " ")}</span>
            </div>
            <div>
              <span className="font-medium text-foreground">Date:</span>{" "}
              {format(new Date(pendingRec.date), "MMM dd")}
            </div>
          </div>
        </div>

        {!dismissing ? (
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDismissing(true)}>
              <XCircle className="h-4 w-4 mr-1" />
              Dismiss
            </Button>
          </div>
        ) : (
          <div className="space-y-3 border-t border-border pt-3">
            <Label className="text-xs font-medium">Dismissal Reason</Label>
            <Select value={dismissReason} onValueChange={setDismissReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason..." />
              </SelectTrigger>
              <SelectContent>
                {DISMISSAL_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={dismissNote}
              onChange={(e) => setDismissNote(e.target.value)}
              placeholder="Optional note..."
              rows={2}
              maxLength={300}
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => dismissMutation.mutate()}
                disabled={!dismissReason || dismissMutation.isPending}
              >
                Confirm Dismiss
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDismissing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
