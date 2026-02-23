import { StatusOverviewPanel } from "./StatusOverviewPanel";
import { PendingApprovals } from "./PendingApprovals";
import { ManualOverrides } from "./ManualOverrides";
import { InsightCoachControls } from "./InsightCoachControls";
import { SafetyControls } from "./SafetyControls";
import { ActivityLog } from "./ActivityLog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CoachCommandCenterTabProps {
  clientId: string;
  trainerId: string;
}

export function CoachCommandCenterTab({ clientId, trainerId }: CoachCommandCenterTabProps) {
  const queryClient = useQueryClient();

  // Fetch settings for InsightCoachControls
  const { data: settings } = useQuery({
    queryKey: ["cc-insight-settings", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_feature_settings")
        .select("insights_enabled, pinned_insight_text, pinned_insight_until")
        .eq("client_id", clientId)
        .maybeSingle();
      return data;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await supabase
        .from("client_feature_settings")
        .update({ [key]: value } as any)
        .eq("client_id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cc-insight-settings"] });
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings"] });
    },
  });

  return (
    <div className="space-y-6">
      {/* A) Status Overview */}
      <StatusOverviewPanel clientId={clientId} />

      {/* B) Pending Approvals */}
      <PendingApprovals clientId={clientId} trainerId={trainerId} />

      {/* C) Manual Overrides */}
      <ManualOverrides clientId={clientId} trainerId={trainerId} />

      {/* D) Insight Controls */}
      <InsightCoachControls
        clientId={clientId}
        trainerId={trainerId}
        settings={settings}
        toggleMutation={toggleMutation}
      />

      {/* E) Safety Controls */}
      <SafetyControls clientId={clientId} trainerId={trainerId} />

      {/* F) Activity Log */}
      <ActivityLog clientId={clientId} />
    </div>
  );
}
