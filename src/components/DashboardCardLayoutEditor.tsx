import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { GripVertical, RotateCcw } from "lucide-react";
import { DashboardCardConfig, DEFAULT_CARD_ORDER } from "@/lib/dashboardCards";
import { useToast } from "@/hooks/use-toast";
import { TodayScreenPhonePreview } from "@/components/TodayScreenPhonePreview";

interface DashboardCardLayoutEditorProps {
  cards: DashboardCardConfig[];
  onSave: (cards: DashboardCardConfig[]) => Promise<void>;
  isSaving: boolean;
  title?: string;
  description?: string;
  clientName?: string;
  clientId?: string;
  showPreview?: boolean;
}

export function DashboardCardLayoutEditor({
  cards: initialCards,
  onSave,
  isSaving,
  title = "Dashboard Card Layout",
  description = "Drag to reorder, toggle to show/hide cards on the client dashboard.",
  clientName,
  clientId,
  showPreview = true,
}: DashboardCardLayoutEditorProps) {
  const { toast } = useToast();
  const [cards, setCards] = useState<DashboardCardConfig[]>(initialCards);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

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
    <div className="flex gap-6 items-start">
      <Card className="flex-1 min-w-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1 text-xs">
              <RotateCcw className="h-3 w-3" /> Reset
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-1 pb-4">
          {cards.map((card, index) => (
            <div
              key={card.key}
              data-card-index={index}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onTouchStart={() => handleTouchStart(index)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all select-none ${
                dragIndex === index || touchDragIndex === index
                  ? "bg-primary/5 border-primary/30 shadow-sm"
                  : "bg-background border-border hover:border-primary/20"
              } ${!card.visible ? "opacity-50" : ""}`}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab active:cursor-grabbing" />
              <span className="text-sm font-medium flex-1">{card.label}</span>
              <Switch
                checked={card.visible}
                onCheckedChange={() => toggleVisibility(index)}
                className="shrink-0"
              />
            </div>
          ))}

          {hasChanges && (
            <Button
              className="w-full mt-3"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Layout"}
            </Button>
          )}
        </CardContent>
      </Card>

      {showPreview && (
        <div className="hidden md:block shrink-0">
          <TodayScreenPhonePreview cards={cards} clientName={clientName} clientId={clientId} />
        </div>
      )}
    </div>
  );
}
