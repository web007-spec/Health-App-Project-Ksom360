import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const CARDIO_ACTIVITIES = [
  { id: "running", label: "Running", emoji: "🏃" },
  { id: "walking", label: "Walking", emoji: "🚶" },
  { id: "cycling", label: "Cycling", emoji: "🚴" },
  { id: "rowing", label: "Rowing", emoji: "🚣" },
  { id: "elliptical", label: "Elliptical", emoji: "🏋️" },
  { id: "stair_climbing", label: "Stair climbing", emoji: "🪜" },
  { id: "swimming", label: "Swimming", emoji: "🏊" },
  { id: "hiking", label: "Hiking", emoji: "🥾" },
  { id: "jump_rope", label: "Jump rope", emoji: "🤸" },
  { id: "dancing", label: "Dancing", emoji: "💃" },
  { id: "yoga", label: "Yoga", emoji: "🧘" },
  { id: "pilates", label: "Pilates", emoji: "🤸‍♀️" },
  { id: "hiit", label: "HIIT", emoji: "⚡" },
  { id: "crossfit", label: "CrossFit", emoji: "🏋️‍♂️" },
  { id: "flexibility", label: "Flexibility", emoji: "🧘‍♂️" },
  { id: "kickboxing", label: "Kickboxing", emoji: "🥊" },
  { id: "tennis", label: "Tennis", emoji: "🎾" },
  { id: "basketball", label: "Basketball", emoji: "🏀" },
  { id: "soccer", label: "Soccer", emoji: "⚽" },
  { id: "golf", label: "Golf", emoji: "⛳" },
  { id: "general", label: "General", emoji: "🏃‍♂️" },
];

type TargetType = "distance" | "time" | "none";

interface QuickCardioFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (activity: string, targetType: TargetType, targetValue?: number) => void;
  onMarkComplete: (activity: string, targetType: TargetType, targetValue?: number) => void;
}

export function QuickCardioFlow({ open, onOpenChange, onStart, onMarkComplete }: QuickCardioFlowProps) {
  const [step, setStep] = useState<"pick" | "target" | "distance" | "time" | "detail">("pick");
  const [selectedActivity, setSelectedActivity] = useState("");
  const [targetType, setTargetType] = useState<TargetType>("none");
  const [targetValue, setTargetValue] = useState("");

  const resetAndClose = () => {
    setStep("pick");
    setSelectedActivity("");
    setTargetType("none");
    setTargetValue("");
    onOpenChange(false);
  };

  const handleSelectActivity = (id: string) => {
    setSelectedActivity(id);
    setStep("target");
  };

  const handleSelectTarget = (type: TargetType) => {
    setTargetType(type);
    if (type === "distance") {
      setStep("distance");
    } else if (type === "time") {
      setStep("time");
    } else {
      setStep("detail");
    }
  };

  const handleConfirmTarget = () => {
    setStep("detail");
  };

  const handleStart = () => {
    const val = targetValue ? parseFloat(targetValue) : undefined;
    onStart(selectedActivity, targetType, val);
    resetAndClose();
  };

  const handleMarkComplete = () => {
    const val = targetValue ? parseFloat(targetValue) : undefined;
    onMarkComplete(selectedActivity, targetType, val);
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

  const activityLabel = CARDIO_ACTIVITIES.find(a => a.id === selectedActivity)?.label || selectedActivity;
  const activityEmoji = CARDIO_ACTIVITIES.find(a => a.id === selectedActivity)?.emoji || "🏃";

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) resetAndClose(); }}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          {step !== "pick" && (
            <button onClick={goBack} className="p-1">
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <h2 className="text-lg font-bold flex-1">
            {step === "pick" && "Quick Cardio"}
            {step === "target" && "Set Target"}
            {step === "distance" && "Distance"}
            {step === "time" && "Time"}
            {step === "detail" && activityLabel}
          </h2>
        </div>

        {/* Step: Pick Activity */}
        {step === "pick" && (
          <div className="p-4 space-y-2 pb-8">
            {CARDIO_ACTIVITIES.map((activity) => (
              <button
                key={activity.id}
                onClick={() => handleSelectActivity(activity.id)}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/90 hover:bg-emerald-500 text-white transition-colors"
              >
                <span className="text-2xl w-10 text-center">{activity.emoji}</span>
                <span className="text-sm font-semibold flex-1 text-left">{activity.label}</span>
                <ChevronRight className="h-4 w-4 opacity-60" />
              </button>
            ))}
          </div>
        )}

        {/* Step: Choose Target Type */}
        {step === "target" && (
          <div className="p-6 space-y-4 pb-8">
            <p className="text-center text-base font-semibold text-foreground">
              Set a target for this cardio activity?
            </p>
            <div className="space-y-3">
              {[
                { type: "distance" as TargetType, label: "Distance" },
                { type: "time" as TargetType, label: "Time" },
                { type: "none" as TargetType, label: "None" },
              ].map((opt) => (
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
            <Button className="w-full h-12 text-base font-semibold" onClick={handleConfirmTarget} disabled={!targetValue}>
              Continue
            </Button>
          </div>
        )}

        {/* Step: Enter Time */}
        {step === "time" && (
          <div className="p-6 space-y-6 pb-8">
            <p className="text-center text-2xl font-bold">Time</p>
            <div className="flex flex-col items-center gap-2">
              <Input
                type="number"
                inputMode="numeric"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                className="text-center text-3xl font-bold h-20 w-48 border-2"
                placeholder="0"
                autoFocus
              />
              <span className="text-sm text-muted-foreground font-medium">Minutes</span>
            </div>
            <Button className="w-full h-12 text-base font-semibold" onClick={handleConfirmTarget} disabled={!targetValue}>
              Continue
            </Button>
          </div>
        )}

        {/* Step: Activity Detail */}
        {step === "detail" && (
          <div className="p-6 flex flex-col items-center gap-6 pb-8 min-h-[400px]">
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="w-24 h-24 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                <span className="text-5xl">{activityEmoji}</span>
              </div>
              <h3 className="text-2xl font-bold">{activityLabel}</h3>
              <p className="text-sm text-muted-foreground">Scheduled</p>
              {targetType !== "none" && targetValue && (
                <p className="text-sm text-primary font-semibold">
                  Target: {targetValue} {targetType === "distance" ? "miles" : "min"}
                </p>
              )}
            </div>
            <div className="w-full space-y-3">
              <button
                onClick={handleMarkComplete}
                className="w-full text-center text-primary font-semibold text-sm py-2"
              >
                Mark as Complete
              </button>
              <Button
                className="w-full h-12 text-base font-bold bg-amber-500 hover:bg-amber-600 text-white"
                onClick={handleStart}
              >
                Start Now
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
