import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Plus, MoreVertical } from "lucide-react";
import { useCardioActivityTypes } from "@/hooks/useCardioActivityTypes";
import { AddCardioActivityDialog } from "@/components/cardio/AddCardioActivityDialog";
import { EditCardioActivityDialog } from "@/components/cardio/EditCardioActivityDialog";
import { getIconComponent } from "@/components/cardio/cardioActivities";
import { OnboardingPreviewSection } from "@/components/settings/OnboardingPreviewSection";
import { useState } from "react";

export default function TrainerSettings() {
  const { activities, isLoading, addActivity, updateActivity, deleteActivity } = useCardioActivityTypes();
  const [addOpen, setAddOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<{ id: string; name: string; icon_name: string } | null>(null);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm">Manage global settings that apply to all your clients.</p>
        </div>

        {/* Cardio Activities Manager */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Cardio Activities
            </CardTitle>
            <CardDescription>
              Manage the activity types available in Quick Cardio for all clients. Changes here apply universally.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="py-8 text-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
              </div>
            ) : (
              <div className="space-y-2">
                {activities.map((act) => {
                  const Icon = getIconComponent(act.icon_name);
                  const hasCustomIcon = !!act.icon_url;
                  return (
                    <button
                      key={act.id}
                      onClick={() => setEditingActivity(act)}
                      className="w-full flex items-center gap-3"
                    >
                      <div className="flex items-center rounded-full bg-destructive overflow-hidden shrink-0">
                        <div className="flex items-center justify-center w-14 h-12">
                          {hasCustomIcon ? (
                            <img src={act.icon_url!} alt={act.name} className="h-6 w-6 object-contain" />
                          ) : (
                            <Icon className="h-6 w-6 text-destructive-foreground" />
                          )}
                        </div>
                        <div className="h-8 w-px bg-white/30" />
                        <div className="flex items-center justify-center w-10 h-12">
                          <MoreVertical className="h-4 w-4 text-destructive-foreground" />
                        </div>
                      </div>
                      <span className="font-semibold text-sm flex-1 text-left truncate">{act.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Activity
            </Button>
          </CardContent>
        </Card>

        {/* Onboarding Flows Preview */}
        <OnboardingPreviewSection />
      </div>

      <AddCardioActivityDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdd={(name, iconName, iconUrl) => addActivity.mutate({ name, iconName, iconUrl })}
      />

      <EditCardioActivityDialog
        open={!!editingActivity}
        onOpenChange={(open) => { if (!open) setEditingActivity(null); }}
        activity={editingActivity}
        onSave={(id, name, iconName, iconUrl) => updateActivity.mutate({ id, name, iconName, iconUrl })}
        onDelete={(id) => deleteActivity.mutate(id)}
      />
    </DashboardLayout>
  );
}
