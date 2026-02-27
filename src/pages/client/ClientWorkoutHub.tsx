import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Dumbbell, Search } from "lucide-react";
import { ClientLayout } from "@/components/ClientLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ClientWorkoutHub() {
  const clientId = useEffectiveClientId();
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: collections, isLoading } = useQuery({
    queryKey: ["client-workout-collections", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_workout_collection_access")
        .select(`
          *,
          workout_collections(
            *,
            workout_collection_categories(
              *,
              category_workouts(
                *,
                ondemand_workouts(
                  *,
                  workout_workout_labels(
                    workout_labels(*)
                  )
                )
              )
            )
          )
        `)
        .eq("client_id", clientId);

      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const currentCollection = selectedCollection
    ? collections?.find((c: any) => c.workout_collections.id === selectedCollection)
        ?.workout_collections
    : collections?.[0]?.workout_collections;

  const filteredCategories = currentCollection?.workout_collection_categories?.filter(
    (category: any) =>
      category.is_active &&
      category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ClientLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">On-Demand Workouts</h1>
          <p className="text-muted-foreground mt-2">
            Browse and access your workout collections anytime
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading workouts...</div>
        ) : !collections?.length ? (
          <Card className="text-center py-12">
            <CardContent className="pt-6">
              <Play className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No workout collections yet</h3>
              <p className="text-muted-foreground">
                Your trainer hasn't shared any workout collections with you yet
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Collection selector */}
            {collections.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {collections.map((access: any) => {
                  const collection = access.workout_collections;
                  return (
                    <Button
                      key={collection.id}
                      variant={
                        currentCollection?.id === collection.id ? "default" : "outline"
                      }
                      onClick={() => setSelectedCollection(collection.id)}
                    >
                      {collection.name}
                    </Button>
                  );
                })}
              </div>
            )}

            {currentCollection && (
              <>
                {/* Collection header */}
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">{currentCollection.name}</h2>
                  {currentCollection.description && (
                    <p className="text-muted-foreground">{currentCollection.description}</p>
                  )}
                </div>

                {/* Search */}
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search categories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Categories */}
                <div className="space-y-8">
                  {filteredCategories?.map((category: any) => (
                    <div key={category.id} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-semibold">{category.name}</h3>
                        {category.description && (
                          <p className="text-sm text-muted-foreground">
                            {category.description}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {category.category_workouts?.map((cw: any) => {
                          const workout = cw.ondemand_workouts;
                          const labels =
                            workout.workout_workout_labels?.map(
                              (l: any) => l.workout_labels
                            ) || [];
                          const levelLabel = labels.find((l: any) => l?.category === "level");
                          const durationLabel = labels.find(
                            (l: any) => l?.category === "duration"
                          );

                          return (
                            <Card
                              key={cw.id}
                              className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                              onClick={() => {
                                if (workout.video_url) {
                                  window.open(workout.video_url, "_blank");
                                }
                              }}
                            >
                              <CardHeader className="p-0">
                                {workout.thumbnail_url ? (
                                  <img
                                    src={workout.thumbnail_url}
                                    alt={workout.name}
                                    className="w-full h-32 object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-32 bg-muted flex items-center justify-center">
                                    {workout.type === "video" ? (
                                      <Play className="h-8 w-8 text-muted-foreground" />
                                    ) : (
                                      <Dumbbell className="h-8 w-8 text-muted-foreground" />
                                    )}
                                  </div>
                                )}
                              </CardHeader>
                              <CardContent className="p-3">
                                <h4 className="font-semibold line-clamp-2 text-sm mb-2">
                                  {workout.name}
                                </h4>
                                <div className="flex gap-1 flex-wrap">
                                  {levelLabel && (
                                    <Badge variant="secondary" className="text-xs">
                                      {levelLabel.value}
                                    </Badge>
                                  )}
                                  {durationLabel && (
                                    <Badge variant="outline" className="text-xs">
                                      {durationLabel.value}
                                    </Badge>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </ClientLayout>
  );
}
