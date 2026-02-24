import { useState, useRef } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Plus, MoreVertical } from "lucide-react";
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

type Step = "pick" | "target" | "distance" | "time" | "detail";

export function QuickCardioFlow({ open, onOpenChange, onStart, onMarkComplete }: QuickCardioFlowProps) {
  const [step, setStep] = useState<Step>("pick");
  const [selectedActivity, setSelectedActivity] = useState<{ name: string; icon_name: string } | null>(null);
  const [targetType, setTargetType] = useState<TargetType>("none");
  const [targetValue, setTargetValue] = useState("");
  const [timeHours, setTimeHours] = useState("");
  const [timeMinutes, setTimeMinutes] = useState("");
  const [timeSeconds, setTimeSeconds] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingActivity, setEditingActivity] = useState<{ id: string; name: string; icon_name: string } | null>(null);

  const { activities, addActivity, updateActivity, deleteActivity } = useCardioActivityTypes();

  const resetAndClose = () => {
    setStep("pick");
    setSelectedActivity(null);
    setTargetType("none");
    setTargetValue("");
    setTimeHours("");
    setTimeMinutes("");
    setTimeSeconds("");
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

  const handleConfirmDistance = () => {
    setStep("detail");
  };

  const handleConfirmTime = () => {
    const totalMinutes = (parseInt(timeHours || "0") * 60) + parseInt(timeMinutes || "0") + (parseInt(timeSeconds || "0") / 60);
    setTargetValue(totalMinutes.toString());
    setStep("detail");
  };

  const activityId = selectedActivity?.name.toLowerCase().replace(/\s+/g, "_") || "general";

  const handleStart = () => {
    const val = targetType === "distance" ? (targetValue ? parseFloat(targetValue) : undefined) : (targetValue ? parseFloat(targetValue) : undefined);
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
              {step === "target" && selectedActivity?.name}
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
                    className="w-full flex items-center gap-3"
                  >
                    <div className="flex items-center rounded-xl bg-destructive overflow-hidden shrink-0">
                      <div className="flex items-center justify-center w-14 h-12">
                        {act.icon_url ? (
                          <img src={act.icon_url} alt={act.name} className="h-6 w-6 object-contain invert" />
                        ) : (
                          <Icon className="h-6 w-6 text-white" />
                        )}
                      </div>
                      <div className="h-8 w-px bg-white/30" />
                      <div
                        className="flex items-center justify-center w-10 h-12 cursor-pointer hover:bg-black/10 transition-colors"
                        onClick={(e) => { e.stopPropagation(); setEditingActivity(act); }}
                      >
                        <MoreVertical className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <span className="text-base font-semibold text-foreground">{act.name}</span>
                  </button>
                );
              })}
              <button
                onClick={() => setShowAddDialog(true)}
                className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl border-2 border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="h-5 w-5" />
                <span className="text-sm font-semibold">Add Activity</span>
              </button>
            </div>
          )}

          {/* Step: Target selection — overlay style */}
          {step === "target" && (
            <div className="p-6 space-y-5 pb-8">
              <p className="text-center text-lg font-semibold text-foreground">
                Set a target for this cardio activity?
              </p>
              <div className="space-y-3">
                {([
                  { type: "distance" as TargetType, label: "Distance" },
                  { type: "time" as TargetType, label: "Time" },
                  { type: "none" as TargetType, label: "None" },
                ]).map((opt) => (
                  <button
                    key={opt.type}
                    onClick={() => handleSelectTarget(opt.type)}
                    className="w-full p-4 rounded-2xl border border-white/30 bg-transparent text-center text-base font-medium text-foreground hover:bg-accent/30 transition-colors"
                  >
                    {opt.label}
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
                <Input
                  type="number"
                  inputMode="decimal"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  className="text-center text-3xl font-bold h-20 w-48 border-2"
                  placeholder="0"
                  autoFocus
                />
                <span className="text-sm text-muted-foreground font-medium">Miles</span>
              </div>
              <Button className="w-full h-12 text-base font-semibold" onClick={handleConfirmDistance} disabled={!targetValue}>
                Continue
              </Button>
            </div>
          )}

          {/* Step: Enter Time — H:M:S */}
          {step === "time" && (
            <div className="p-6 space-y-6 pb-8">
              <p className="text-center text-2xl font-bold">Time</p>
              <div className="flex items-center justify-center gap-2">
                <div className="flex flex-col items-center">
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={timeHours}
                    onChange={(e) => setTimeHours(e.target.value)}
                    className="text-center text-2xl font-bold h-16 w-20 border-2"
                    placeholder="0"
                    autoFocus
                  />
                  <span className="text-xs text-muted-foreground mt-1">Hours</span>
                </div>
                <span className="text-2xl font-bold pb-5">:</span>
                <div className="flex flex-col items-center">
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={timeMinutes}
                    onChange={(e) => setTimeMinutes(e.target.value)}
                    className="text-center text-2xl font-bold h-16 w-20 border-2"
                    placeholder="0"
                  />
                  <span className="text-xs text-muted-foreground mt-1">Minutes</span>
                </div>
                <span className="text-2xl font-bold pb-5">:</span>
                <div className="flex flex-col items-center">
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={timeSeconds}
                    onChange={(e) => setTimeSeconds(e.target.value)}
                    className="text-center text-2xl font-bold h-16 w-20 border-2"
                    placeholder="0"
                  />
                  <span className="text-xs text-muted-foreground mt-1">Seconds</span>
                </div>
              </div>
              <Button
                className="w-full h-12 text-base font-semibold"
                onClick={handleConfirmTime}
                disabled={!timeHours && !timeMinutes && !timeSeconds}
              >
                Save
              </Button>
            </div>
          )}

          {/* Step: Activity Detail */}
          {step === "detail" && (
            <div className="p-6 flex flex-col items-center gap-6 pb-8 min-h-[400px]">
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <div className="w-24 h-24 rounded-2xl bg-emerald-500/20 flex items-center justify-center" style={{ clipPath: "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)" , backgroundColor: "hsl(var(--chart-4) / 0.2)" }}>
                  <div className="w-20 h-20 bg-emerald-500 flex items-center justify-center" style={{ clipPath: "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)" }}>
                    <ActivityIcon className="h-10 w-10 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold">{selectedActivity?.name}</h3>
                <p className="text-sm text-muted-foreground">Scheduled</p>
                {targetType !== "none" && (
                  <p className="text-sm text-primary font-semibold">
                    Target: {targetType === "time"
                      ? `${timeHours || "0"}h ${timeMinutes || "0"}m ${timeSeconds || "0"}s`
                      : `${targetValue} miles`
                    }
                  </p>
                )}
                {targetType === "none" && (
                  <button
                    onClick={() => setStep("target")}
                    className="text-sm text-primary font-semibold"
                  >
                    Set Target
                  </button>
                )}
              </div>
              <div className="w-full space-y-3">
                <button onClick={handleMarkComplete} className="w-full text-center text-primary font-semibold text-sm py-2">
                  Mark as Complete
                </button>
                <Button className="w-full h-12 text-base font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-full" onClick={handleStart}>
                  Start Now
                </Button>
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
