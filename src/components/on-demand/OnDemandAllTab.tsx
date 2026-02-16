import { Play, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { WorkoutCollectionCard } from "./WorkoutCollectionCard";
import { ChevronRight } from "lucide-react";

interface OnDemandAllTabProps {
  workoutCollections: any[] | undefined;
  resourceCollections: any[] | undefined;
  searchQuery: string;
  isLoading: boolean;
}

export function OnDemandAllTab({
  workoutCollections,
  resourceCollections,
  searchQuery,
  isLoading,
}: OnDemandAllTabProps) {
  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground text-sm">Loading content...</div>;
  }

  const filteredWorkouts = workoutCollections?.filter((access: any) =>
    access.workout_collections.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredResources = resourceCollections?.filter((access: any) =>
    access.resource_collections.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasWorkouts = (filteredWorkouts?.length || 0) > 0;
  const hasResources = (filteredResources?.length || 0) > 0;

  if (!hasWorkouts && !hasResources) {
    return (
      <Card className="text-center py-12">
        <CardContent className="pt-6">
          <Play className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No on-demand content yet</h3>
          <p className="text-muted-foreground text-sm">
            Your trainer hasn't shared any content with you yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resource Collections - horizontal scroll */}
      {hasResources && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Resource Collections</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
            {filteredResources!.map((access: any) => {
              const collection = access.resource_collections;
              return (
                <div
                  key={collection.id}
                  className="relative overflow-hidden rounded-xl cursor-pointer group flex-shrink-0 w-36"
                >
                  {collection.cover_image_url ? (
                    <img
                      src={collection.cover_image_url}
                      alt={collection.name}
                      className="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-24 bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-2">
                    <p className="text-white font-semibold text-xs line-clamp-2 drop-shadow-lg">
                      {collection.name}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Workout Collections - Netflix style stacked cards */}
      {hasWorkouts && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Workout Collections</h2>
          </div>
          <div className="space-y-4">
            {filteredWorkouts!.map((access: any) => (
              <WorkoutCollectionCard
                key={access.id}
                collection={access.workout_collections}
                variant="large"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
