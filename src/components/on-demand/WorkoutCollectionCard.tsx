import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Play, Dumbbell } from "lucide-react";
import { WorkoutCollectionDetail } from "./WorkoutCollectionDetail";

interface WorkoutCollectionCardProps {
  collection: any;
  variant?: "large" | "compact";
}

export function WorkoutCollectionCard({ collection, variant = "large" }: WorkoutCollectionCardProps) {
  const [showDetail, setShowDetail] = useState(false);

  // Gather labels from all workouts in the collection
  const allLabels = collection.workout_collection_categories
    ?.flatMap((cat: any) =>
      cat.category_workouts?.flatMap((cw: any) =>
        cw.ondemand_workouts?.workout_workout_labels?.map((l: any) => l.workout_labels) || []
      ) || []
    ) || [];

  const levelLabel = allLabels.find((l: any) => l?.category === "level");
  const totalWorkouts = collection.workout_collection_categories
    ?.reduce((sum: number, cat: any) => sum + (cat.category_workouts?.length || 0), 0) || 0;

  if (variant === "compact") {
    return (
      <>
        <div
          className="relative overflow-hidden rounded-xl cursor-pointer group"
          onClick={() => setShowDetail(true)}
        >
          {collection.cover_image_url ? (
            <img
              src={collection.cover_image_url}
              alt={collection.name}
              className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-36 bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center">
              <Dumbbell className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h3 className="text-white font-semibold text-sm line-clamp-2 drop-shadow-lg">
              {collection.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-1">
              {levelLabel && (
                <span className="text-white/80 text-[10px] font-medium uppercase tracking-wider">
                  {levelLabel.value}
                </span>
              )}
              {totalWorkouts > 0 && (
                <span className="text-white/60 text-[10px]">
                  · {totalWorkouts} workouts
                </span>
              )}
            </div>
          </div>
          <div className="absolute top-2 right-2 bg-black/50 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="h-3 w-3 text-white fill-white" />
          </div>
        </div>

        {showDetail && (
          <WorkoutCollectionDetail
            collection={collection}
            open={showDetail}
            onOpenChange={setShowDetail}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div
        className="relative overflow-hidden rounded-2xl cursor-pointer group"
        onClick={() => setShowDetail(true)}
      >
        {collection.cover_image_url ? (
          <img
            src={collection.cover_image_url}
            alt={collection.name}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center">
            <Dumbbell className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-white font-bold text-lg drop-shadow-lg line-clamp-2">
            {collection.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            {levelLabel && (
              <Badge className="bg-white/20 text-white border-0 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm">
                {levelLabel.value}
              </Badge>
            )}
            {totalWorkouts > 0 && (
              <span className="text-white/70 text-xs">
                {totalWorkouts} workouts
              </span>
            )}
          </div>
        </div>
        <div className="absolute top-3 right-3 bg-black/40 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
          <Play className="h-4 w-4 text-white fill-white" />
        </div>
      </div>

      {showDetail && (
        <WorkoutCollectionDetail
          collection={collection}
          open={showDetail}
          onOpenChange={setShowDetail}
        />
      )}
    </>
  );
}
