import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { GripVertical, RotateCcw, Eye, Pencil, Ban } from "lucide-react";
import { DashboardCardConfig, DEFAULT_CARD_ORDER } from "@/lib/dashboardCards";
import { useToast } from "@/hooks/use-toast";

interface DashboardCardLayoutEditorProps {
  cards: DashboardCardConfig[];
  onSave: (cards: DashboardCardConfig[]) => Promise<void>;
  isSaving: boolean;
  title?: string;
  description?: string;
  clientName?: string;
  clientId?: string;
  showPreview?: boolean;
  /** Card keys that don't apply to this client (engine mode / feature flags) */
  disabledCards?: Record<string, string>;
}

export function DashboardCardLayoutEditor({
  cards: initialCards,
  onSave,
  isSaving,
  title = "Dashboard Card Layout",
  description = "Drag to reorder, toggle to show/hide cards on the client dashboard.",
  clientName,
  clientId,
  disabledCards = {},
}: DashboardCardLayoutEditorProps) {
  const { toast } = useToast();
  const [cards, setCards] = useState<DashboardCardConfig[]>(initialCards);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [mode, setMode] = useState<"live" | "edit">("live");

  useEffect(() => {
    setCards(initialCards);
    setHasChanges(false);
  }, [initialCards]);

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const updated = [...cards];
    const [dragged] = updated.splice(dragIndex, 1);
    updated.splice(index, 0, dragged);
    setCards(updated);
    setDragIndex(index);
    setHasChanges(true);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  const toggleVisibility = (index: number) => {
    const updated = [...cards];
    updated[index] = { ...updated[index], visible: !updated[index].visible };
    setCards(updated);
    setHasChanges(true);
  };

  const handleSave = async () => {
    await onSave(cards);
    setHasChanges(false);
    toast({ title: "Layout saved", description: "Dashboard card layout has been updated." });
  };

  const handleReset = () => {
    setCards([...DEFAULT_CARD_ORDER]);
    setHasChanges(true);
  };

  // Touch drag support
  const [touchDragIndex, setTouchDragIndex] = useState<number | null>(null);

  const handleTouchStart = (index: number) => {
    setTouchDragIndex(index);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchDragIndex === null) return;
    const touch = e.touches[0];
    const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
    const targetEl = elements.find(el => el.getAttribute("data-card-index") !== null);
    if (targetEl) {
      const targetIndex = parseInt(targetEl.getAttribute("data-card-index")!, 10);
      if (targetIndex !== touchDragIndex) {
        const updated = [...cards];
        const [dragged] = updated.splice(touchDragIndex, 1);
        updated.splice(targetIndex, 0, dragged);
        setCards(updated);
        setTouchDragIndex(targetIndex);
        setHasChanges(true);
      }
    }
  };

  const handleTouchEnd = () => {
    setTouchDragIndex(null);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Phone frame */}
      <div className="w-[320px]">
        <div className="rounded-[2.5rem] border-[6px] border-foreground/80 bg-background shadow-2xl overflow-hidden">
          {/* Status bar */}
          <div className="flex items-center justify-between px-5 py-1.5 bg-foreground/5">
            <span className="text-[10px] font-semibold text-muted-foreground">9:41</span>
            <div className="flex items-center gap-1">
              <div className="w-3.5 h-2 rounded-sm border border-muted-foreground/50">
                <div className="w-2 h-full bg-muted-foreground/50 rounded-sm" />
              </div>
            </div>
          </div>

          {/* Mode toggle bar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
            <div className="flex items-center gap-1.5">
              {clientName && (
                <span className="text-[9px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {clientName}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 bg-muted rounded-full p-0.5">
              <button
                onClick={() => setMode("live")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${
                  mode === "live" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                <Eye className="h-3 w-3" />
                Live
              </button>
              <button
                onClick={() => setMode("edit")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${
                  mode === "edit" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                <Pencil className="h-3 w-3" />
                Edit
              </button>
            </div>
          </div>

          {mode === "live" ? (
            /* Live iframe preview */
            <div className="relative w-[308px] h-[480px] overflow-hidden">
              <iframe
                src={`/client/dashboard?preview=1${clientId ? `&previewClientId=${clientId}` : ""}`}
                className="absolute top-0 left-0 border-0"
                style={{
                  width: "390px",
                  height: "844px",
                  transform: "scale(0.79)",
                  transformOrigin: "top left",
                }}
                title="Client Dashboard Preview"
              />
            </div>
          ) : (
            /* Edit mode - drag to reorder */
            <>
              <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                <p className="text-[10px] text-muted-foreground">Drag to reorder, toggle visibility</p>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </button>
              </div>
              <div className="h-[440px] overflow-y-auto px-3 py-2 space-y-1">
                {cards.map((card, index) => {
                  const disabledReason = disabledCards[card.key];
                  const isDisabled = !!disabledReason;

                  return (
                    <div
                      key={card.key}
                      data-card-index={index}
                      draggable={!isDisabled}
                      onDragStart={() => !isDisabled && handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      onTouchStart={() => !isDisabled && handleTouchStart(index)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all select-none ${
                        isDisabled
                          ? "bg-muted/50 border-border opacity-40 cursor-not-allowed"
                          : dragIndex === index || touchDragIndex === index
                          ? "bg-primary/5 border-primary/30 shadow-sm"
                          : !card.visible
                          ? "bg-background border-border opacity-50"
                          : "bg-background border-border hover:border-primary/20"
                      }`}
                    >
                      {isDisabled ? (
                        <Ban className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      ) : (
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0 cursor-grab active:cursor-grabbing" />
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium truncate block">{card.label}</span>
                        {isDisabled && (
                          <span className="text-[9px] text-muted-foreground">{disabledReason}</span>
                        )}
                      </div>
                      <Switch
                        checked={isDisabled ? false : card.visible}
                        onCheckedChange={() => toggleVisibility(index)}
                        disabled={isDisabled}
                        className="shrink-0 scale-90"
                      />
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Save button inside phone */}
          {hasChanges && (
            <div className="px-3 pb-3 pt-1 border-t border-border">
              <Button
                className="w-full h-8 text-xs"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Layout"}
              </Button>
            </div>
          )}

          {/* Bottom home indicator */}
          <div className="h-4 bg-foreground/5 flex items-center justify-center">
            <div className="w-16 h-1 rounded-full bg-foreground/20" />
          </div>
        </div>
      </div>
    </div>
  );
}