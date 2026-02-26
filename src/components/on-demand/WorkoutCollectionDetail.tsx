import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Dumbbell, ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClientCardsByLayout, type CardItem } from "./CardLayouts";

interface WorkoutCollectionDetailProps {
  collection: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkoutCollectionDetail({ collection, open, onOpenChange }: WorkoutCollectionDetailProps) {
  const [activeView, setActiveView] = useState<"for_you" | "categories" | "about">("for_you");

  const activeCategories = collection.workout_collection_categories
    ?.filter((c: any) => c.is_active)
    ?.sort((a: any, b: any) => a.order_index - b.order_index) || [];

  const allWorkouts = activeCategories.flatMap((cat: any) =>
    (cat.category_workouts || []).map((cw: any) => ({
      ...cw.ondemand_workouts,
      categoryName: cat.name,
    }))
  );

  const handleWorkoutClick = (workoutId: string) => {
    const workout = allWorkouts.find((w: any) => w.id === workoutId);
    if (workout?.video_url) {
      window.open(workout.video_url, "_blank");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 h-[85vh] flex flex-col overflow-hidden">
        {/* Hero header */}
        <div className="relative shrink-0">
          {collection.cover_image_url ? (
            <img
              src={collection.cover_image_url}
              alt={collection.name}
              className="w-full h-48 object-cover"
            />
          ) : (
            <div className="w-full h-48 bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center">
              <Dumbbell className="h-16 w-16 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 left-3 bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm rounded-full"
            onClick={() => onOpenChange(false)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="absolute bottom-4 left-4 right-4">
            <h2 className="text-2xl font-bold text-foreground drop-shadow-lg">
              {collection.name}
            </h2>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-0 border-b border-border px-4 shrink-0">
          {(["for_you", "categories", "about"] as const).map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeView === view
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {view === "for_you" ? "For you" : view === "categories" ? "Categories" : "About"}
            </button>
          ))}
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {activeView === "for_you" && (
              <>
                {activeCategories.map((category: any) => {
                  const workouts = category.category_workouts || [];
                  if (workouts.length === 0) return null;

                  const layout = category.card_layout || "large";
                  const items: CardItem[] = workouts
                    .map((cw: any) => cw.ondemand_workouts)
                    .filter(Boolean)
                    .map((w: any) => ({
                      id: w.id,
                      name: w.name,
                      cover_image_url: w.thumbnail_url || w.cover_image_url,
                      duration_minutes: w.duration_minutes,
                      level: w.workout_workout_labels?.find((l: any) => l.workout_labels?.category === "level")?.workout_labels?.value,
                    }));

                  return (
                    <div key={category.id}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-foreground">{category.name}</h3>
                        {workouts.length > 3 && (
                          <button
                            className="text-xs text-primary font-medium flex items-center gap-0.5"
                            onClick={() => setActiveView("categories")}
                          >
                            View more
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <ClientCardsByLayout
                        layout={layout}
                        items={items}
                        fallbackImage={category.cover_image_url}
                        onClick={handleWorkoutClick}
                      />
                    </div>
                  );
                })}

                {activeCategories.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    No workouts in this collection yet
                  </div>
                )}
              </>
            )}

            {activeView === "categories" && (
              <div className="space-y-3">
                {activeCategories.map((category: any) => {
                  const workoutCount = category.category_workouts?.length || 0;
                  return (
                    <div
                      key={category.id}
                      className="relative overflow-hidden rounded-xl"
                    >
                      {category.cover_image_url ? (
                        <img
                          src={category.cover_image_url}
                          alt={category.name}
                          className="w-full h-24 object-cover"
                        />
                      ) : (
                        <div className="w-full h-24 bg-gradient-to-r from-muted to-muted/40" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/20 flex items-center px-4">
                        <div>
                          <h4 className="text-white font-bold text-base">{category.name}</h4>
                          <p className="text-white/70 text-xs mt-0.5">{workoutCount} workouts</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeView === "about" && (
              <div className="space-y-4">
                {collection.description ? (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {collection.description}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No description provided
                  </p>
                )}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Categories</span>
                    <span className="font-medium text-foreground">{activeCategories.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total workouts</span>
                    <span className="font-medium text-foreground">{allWorkouts.length}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
