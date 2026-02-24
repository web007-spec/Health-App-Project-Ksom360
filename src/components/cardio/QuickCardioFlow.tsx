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
  const [activeTimeField, setActiveTimeField] = useState<"hours" | "minutes" | "seconds">("hours");

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
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto p-0 bg-transparent border-none shadow-none [&>button]:hidden">
          <div className="rounded-t-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-white/10">
            {step !== "pick" && (
              <button onClick={goBack} className="p-1"><ChevronLeft className="h-5 w-5 text-white" /></button>
            )}
            <h2 className="text-lg font-bold flex-1 text-white">
              {step === "pick" && "Quick Cardio"}
              {step === "target" && selectedActivity?.name}
              {step === "distance" && "Distance"}
              {step === "time" && "Time"}
              {step === "detail" && selectedActivity?.name}
            </h2>
            {(step === "distance" || step === "time") && (
              <button
                onClick={step === "distance" ? handleConfirmDistance : handleConfirmTime}
                disabled={step === "distance" ? !targetValue : (!timeHours && !timeMinutes && !timeSeconds)}
                className="text-white font-bold text-base disabled:opacity-40"
              >
                Save
              </button>
            )}
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
                    <div className="flex items-center rounded-full bg-destructive overflow-hidden shrink-0">
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
                        onClick={(e) => { e.stopPropagation(); handleSelectActivity(act); }}
                      >
                        <MoreVertical className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <span className="text-base font-semibold text-white">{act.name}</span>
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
              <p className="text-center text-lg font-semibold text-white">
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
                    className="w-full p-4 rounded-2xl border border-white/30 bg-transparent text-center text-base font-medium text-white hover:bg-white/10 transition-colors"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step: Enter Distance */}
          {step === "distance" && (
            <div className="flex flex-col flex-1">
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
                <p className="text-center text-2xl font-bold text-white">Distance</p>
                <div className="text-center text-4xl font-bold h-20 w-48 border border-white/40 bg-white/10 text-white rounded-lg flex items-center justify-center">
                  {targetValue || <span className="text-white/30">0</span>}
                </div>
                <span className="text-sm text-white/70 font-medium">Miles</span>
              </div>
              {/* Custom Numpad */}
              <div className="bg-muted/90 backdrop-blur-sm rounded-t-2xl p-3 pb-6 grid grid-cols-3 gap-2">
                {["1","2","3","4","5","6","7","8","9",".","0","⌫"].map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      if (key === "⌫") setTargetValue((v) => v.slice(0, -1));
                      else if (key === "." && targetValue.includes(".")) return;
                      else setTargetValue((v) => v + key);
                    }}
                    className="h-14 rounded-xl bg-background text-foreground text-xl font-bold active:bg-accent transition-colors"
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step: Enter Time — H:M:S */}
          {step === "time" && (
            <div className="flex flex-col flex-1">
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
                <p className="text-center text-2xl font-bold text-white">Time</p>
                <div className="flex items-center justify-center gap-2">
                  {([
                    { key: "hours" as const, value: timeHours, label: "Hours" },
                    { key: "minutes" as const, value: timeMinutes, label: "Minutes" },
                    { key: "seconds" as const, value: timeSeconds, label: "Seconds" },
                  ]).map((field, i) => (
                    <div key={field.key} className="flex items-center gap-2">
                      {i > 0 && <span className="text-2xl font-bold text-white pb-5">:</span>}
                      <div className="flex flex-col items-center">
                        <button
                          onClick={() => setActiveTimeField(field.key)}
                          className={`text-center text-3xl font-bold h-16 w-20 border rounded-lg flex items-center justify-center text-white ${activeTimeField === field.key ? "border-white bg-white/15" : "border-white/30 bg-white/5"}`}
                        >
                          {field.value || <span className="text-white/30">0</span>}
                        </button>
                        <span className="text-xs text-white/70 mt-1">{field.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Custom Numpad */}
              <div className="bg-muted/90 backdrop-blur-sm rounded-t-2xl p-3 pb-6 grid grid-cols-3 gap-2">
                {["1","2","3","4","5","6","7","8","9",".","0","⌫"].map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      const setter = activeTimeField === "hours" ? setTimeHours : activeTimeField === "minutes" ? setTimeMinutes : setTimeSeconds;
                      if (key === "⌫") setter((v) => v.slice(0, -1));
                      else if (key === ".") return;
                      else setter((v) => v + key);
                    }}
                    className="h-14 rounded-xl bg-background text-foreground text-xl font-bold active:bg-accent transition-colors"
                  >
                    {key}
                  </button>
                ))}
              </div>
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
          </div>
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
