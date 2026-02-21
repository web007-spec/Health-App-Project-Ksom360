import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity, Plus, MoreVertical } from "lucide-react";
import { useCardioActivityTypes } from "@/hooks/useCardioActivityTypes";
import { AddCardioActivityDialog } from "@/components/cardio/AddCardioActivityDialog";
import { EditCardioActivityDialog } from "@/components/cardio/EditCardioActivityDialog";
import { getIconComponent, ICON_OPTIONS } from "@/components/cardio/cardioActivities";
import { useState } from "react";
import { cn } from "@/lib/utils";

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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activities.map((act) => {
                  const Icon = getIconComponent(act.icon_name);
                  return (
                    <div
                      key={act.id}
                      className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors group"
                    >
                      <div className="flex items-center justify-center h-9 w-9 rounded-md bg-primary/10 text-primary shrink-0">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="font-medium text-sm flex-1 truncate">{act.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setEditingActivity(act)}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
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
      </div>

      <AddCardioActivityDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdd={(name, iconName) => addActivity.mutate({ name, iconName })}
      />

      <EditCardioActivityDialog
        open={!!editingActivity}
        onOpenChange={(open) => { if (!open) setEditingActivity(null); }}
        activity={editingActivity}
        onSave={(id, name, iconName) => updateActivity.mutate({ id, name, iconName })}
        onDelete={(id) => deleteActivity.mutate(id)}
      />
    </DashboardLayout>
  );
}