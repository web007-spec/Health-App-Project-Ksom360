import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, MoreVertical, Plus } from "lucide-react";
import { getIconComponent, type TargetType } from "./cardioActivities";
import { useCardioActivityTypes } from "@/hooks/useCardioActivityTypes";
import { AddCardioActivityDialog } from "./AddCardioActivityDialog";
import { EditCardioActivityDialog } from "./EditCardioActivityDialog";

interface QuickCardioFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (activity: string, targetType: TargetType, targetValue?: number) => void;
  onMarkComplete: (activity: string, targetType: TargetType, targetValue?: number) => void;
}

export function QuickCardioFlow({ open, onOpenChange, onStart, onMarkComplete }: QuickCardioFlowProps) {
  const [step, setStep] = useState<"pick" | "target" | "distance" | "time" | "detail">("pick");
  const [selectedActivity, setSelectedActivity] = useState<{ name: string; icon_name: string } | null>(null);
  const [targetType, setTargetType] = useState<TargetType>("none");
  const [targetValue, setTargetValue] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingActivity, setEditingActivity] = useState<{ id: string; name: string; icon_name: string } | null>(null);

  const { activities, addActivity, updateActivity, deleteActivity } = useCardioActivityTypes();

  const resetAndClose = () => {
    setStep("pick");
    setSelectedActivity(null);
    setTargetType("none");
    setTargetValue("");
    onOpenChange(false);
  };

  const handleSelectActivity = (act: { name: string; icon_name: string }) => {
    setSelectedActivity(act);
    setStep("target");
  };

  const handleSelectTarget = (type: TargetType) => {
    setTargetType(type);
    if (type === "distance") setStep("distance");
    else if (type === "time") setStep("time");
    else setStep("detail");
  };

  const handleConfirmTarget = () => setStep("detail");

  const activityId = selectedActivity?.name.toLowerCase().replace(/\s+/g, "_") || "general";

  const handleStart = () => {
    const val = targetValue ? parseFloat(targetValue) : undefined;
    onStart(activityId, targetType, val);
    resetAndClose();
  };

  const handleMarkComplete = () => {
    const val = targetValue ? parseFloat(targetValue) : undefined;
    onMarkComplete(activityId, targetType, val);
    resetAndClose();
  };

  const goBack = () => {
    if (step === "target") setStep("pick");
    else if (step === "distance" || step === "time") setStep("target");
    else if (step === "detail") {
      if (targetType === "distance") setStep("distance");
      else if (targetType === "time") setStep("time");
      else setStep("target");
    }
  };

  const ActivityIcon = getIconComponent(selectedActivity?.icon_name || "activity");

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => { if (!v) resetAndClose(); }}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto p-0">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-border">
            {step !== "pick" && (
              <button onClick={goBack} className="p-1"><ChevronLeft className="h-5 w-5" /></button>
            )}
            <h2 className="text-lg font-bold flex-1">
              {step === "pick" && "Quick Cardio"}
              {step === "target" && "Set Target"}
              {step === "distance" && "Distance"}
              {step === "time" && "Time"}
              {step === "detail" && selectedActivity?.name}
            </h2>
          </div>

          {/* Step: Pick Activity */}
          {step === "pick" && (
            <div className="p-4 space-y-2 pb-8">
              {activities.map((act) => {
                const Icon = getIconComponent(act.icon_name);
                return (
                  <button
                    key={act.id}
                    onClick={() => handleSelectActivity(act)}
                    className="w-full flex items-center gap-0 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-colors overflow-hidden"
                  >
                    <div className="flex items-center justify-center w-16 h-14 bg-emerald-600/50">
                      {act.icon_url ? (
                        <img src={act.icon_url} alt={act.name} className="h-6 w-6 object-contain" />
                      ) : (
                        <Icon className="h-6 w-6" />
                      )}
                    </div>
                    <div className="h-14 w-px bg-emerald-400/40" />
                    <div
                      className="flex items-center justify-center w-10 h-14 cursor-pointer hover:bg-emerald-700/30 transition-colors"
                      onClick={(e) => { e.stopPropagation(); setEditingActivity(act); }}
                    >
                      <MoreVertical className="h-4 w-4 opacity-70" />
                    </div>
                    <span className="text-sm font-semibold flex-1 text-left pl-2">{act.name}</span>
                  </button>
                );
              })}
              {/* Add button */}
              <button
                onClick={() => setShowAddDialog(true)}
                className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl border-2 border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="h-5 w-5" />
                <span className="text-sm font-semibold">Add Activity</span>
              </button>
            </div>
          )}

          {/* Step: Choose Target Type */}
          {step === "target" && (
            <div className="p-6 space-y-4 pb-8">
              <p className="text-center text-base font-semibold text-foreground">Set a target for this cardio activity?</p>
              <div className="space-y-3">
                {([
                  { type: "distance" as TargetType, label: "Distance" },
                  { type: "time" as TargetType, label: "Time" },
                  { type: "none" as TargetType, label: "None" },
                ]).map((opt) => (
                  <button
                    key={opt.type}
                    onClick={() => handleSelectTarget(opt.type)}
                    className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-border hover:border-primary/50 transition-colors"
                  >
                    <span className="text-base font-medium">{opt.label}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step: Enter Distance */}
          {step === "distance" && (
            <div className="p-6 space-y-6 pb-8">
              <p className="text-center text-2xl font-bold">Distance</p>
              <div className="flex flex-col items-center gap-2">
                <Input type="number" inputMode="decimal" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} className="text-center text-3xl font-bold h-20 w-48 border-2" placeholder="0" autoFocus />
                <span className="text-sm text-muted-foreground font-medium">Miles</span>
              </div>
              <Button className="w-full h-12 text-base font-semibold" onClick={handleConfirmTarget} disabled={!targetValue}>Continue</Button>
            </div>
          )}

          {/* Step: Enter Time */}
          {step === "time" && (
            <div className="p-6 space-y-6 pb-8">
              <p className="text-center text-2xl font-bold">Time</p>
              <div className="flex flex-col items-center gap-2">
                <Input type="number" inputMode="numeric" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} className="text-center text-3xl font-bold h-20 w-48 border-2" placeholder="0" autoFocus />
                <span className="text-sm text-muted-foreground font-medium">Minutes</span>
              </div>
              <Button className="w-full h-12 text-base font-semibold" onClick={handleConfirmTarget} disabled={!targetValue}>Continue</Button>
            </div>
          )}

          {/* Step: Activity Detail */}
          {step === "detail" && (
            <div className="p-6 flex flex-col items-center gap-6 pb-8 min-h-[400px]">
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <div className="w-24 h-24 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                  <ActivityIcon className="h-12 w-12 text-emerald-500" />
                </div>
                <h3 className="text-2xl font-bold">{selectedActivity?.name}</h3>
                <p className="text-sm text-muted-foreground">Scheduled</p>
                {targetType !== "none" && targetValue && (
                  <p className="text-sm text-primary font-semibold">
                    Target: {targetValue} {targetType === "distance" ? "miles" : "min"}
                  </p>
                )}
              </div>
              <div className="w-full space-y-3">
                <button onClick={handleMarkComplete} className="w-full text-center text-primary font-semibold text-sm py-2">Mark as Complete</button>
                <Button className="w-full h-12 text-base font-bold bg-amber-500 hover:bg-amber-600 text-white" onClick={handleStart}>Start Now</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AddCardioActivityDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAdd={(name, iconName, iconUrl) => addActivity.mutate({ name, iconName, iconUrl })}
      />

      <EditCardioActivityDialog
        open={!!editingActivity}
        onOpenChange={(v) => { if (!v) setEditingActivity(null); }}
        activity={editingActivity}
        onSave={(id, name, iconName, iconUrl) => updateActivity.mutate({ id, name, iconName, iconUrl })}
        onDelete={(id) => deleteActivity.mutate(id)}
      />
    </>
  );
}
