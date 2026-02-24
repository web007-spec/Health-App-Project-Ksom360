import { StatusOverviewPanel } from "./StatusOverviewPanel";
import { PendingApprovals } from "./PendingApprovals";
import { ManualOverrides } from "./ManualOverrides";
import { InsightCoachControls } from "./InsightCoachControls";
import { SafetyControls } from "./SafetyControls";
import { AuthorityControls } from "./AuthorityControls";
import { ActivityLog } from "./ActivityLog";
import { ParentLinkSection } from "./ParentLinkSection";
import { CopilotAssistPanel } from "./CopilotAssistPanel";
import { AIWriteFeedbackPanel } from "./AIWriteFeedbackPanel";
import { AIProgressReportPanel } from "./AIProgressReportPanel";
import { AIWorkoutBuilderPanel } from "./AIWorkoutBuilderPanel";
import { AIMealPlanPanel } from "./AIMealPlanPanel";
import { AIOnboardingSummaryPanel } from "./AIOnboardingSummaryPanel";
import { AICoachChatPanel } from "./AICoachChatPanel";
import { AIPhotoAnalysisPanel } from "./AIPhotoAnalysisPanel";
import { RecurringCheckinScheduler } from "./RecurringCheckinScheduler";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CoachCommandCenterTabProps {
  clientId: string;
  trainerId: string;
}

export function CoachCommandCenterTab({ clientId, trainerId }: CoachCommandCenterTabProps) {
  const queryClient = useQueryClient();

  // Fetch settings for InsightCoachControls + parent link visibility
  const { data: settings } = useQuery({
    queryKey: ["cc-insight-settings", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("client_feature_settings")
        .select("insights_enabled, pinned_insight_text, pinned_insight_until, is_minor, engine_mode, parent_link_enabled")
        .eq("client_id", clientId)
        .maybeSingle();
      return data;
    },
  });

  // Fetch athlete name for the parent link section
  const { data: clientProfile } = useQuery({
    queryKey: ["cc-client-profile", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", clientId)
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

  const showParentLink = settings?.is_minor && settings?.engine_mode === "athletic" && settings?.parent_link_enabled;

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

      {/* E2) Authority Controls */}
      <AuthorityControls clientId={clientId} trainerId={trainerId} />

      {/* F) Parent / Guardian Link (Athletic minors only) */}
      {showParentLink && (
        <ParentLinkSection
          clientId={clientId}
          trainerId={trainerId}
          athleteName={clientProfile?.full_name || "Athlete"}
        />
      )}

      {/* Recurring Check-in Scheduler */}
      <RecurringCheckinScheduler clientId={clientId} trainerId={trainerId} />
      <AIWriteFeedbackPanel clientId={clientId} trainerId={trainerId} />

      {/* G2) AI Progress Report */}
      <AIProgressReportPanel clientId={clientId} trainerId={trainerId} />

      {/* G3) AI Workout Builder */}
      <AIWorkoutBuilderPanel clientId={clientId} trainerId={trainerId} />

      {/* G4) AI Meal Plan Generator */}
      <AIMealPlanPanel clientId={clientId} trainerId={trainerId} />

      {/* G5) AI Onboarding Brief */}
      <AIOnboardingSummaryPanel clientId={clientId} trainerId={trainerId} />

      {/* G6) AI Photo Analysis */}
      <AIPhotoAnalysisPanel clientId={clientId} trainerId={trainerId} />

      {/* G7) Coach AI Chat */}
      <AICoachChatPanel clientId={clientId} trainerId={trainerId} />

      {/* H) Copilot Assist */}
      <CopilotAssistPanel clientId={clientId} trainerId={trainerId} />

      {/* I) Activity Log */}
      <ActivityLog clientId={clientId} />
    </div>
  );
}
