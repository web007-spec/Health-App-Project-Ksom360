import { Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { WorkoutCollectionCard } from "./WorkoutCollectionCard";

interface OnDemandWorkoutsTabProps {
  collections: any[] | undefined;
  searchQuery: string;
  isLoading: boolean;
}

export function OnDemandWorkoutsTab({ collections, searchQuery, isLoading }: OnDemandWorkoutsTabProps) {
  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground text-sm">Loading workouts...</div>;
  }

  const filtered = collections?.filter((access: any) =>
    access.workout_collections.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!filtered?.length) {
    return (
      <Card className="text-center py-12">
        <CardContent className="pt-6">
          <Play className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No workout collections yet</h3>
          <p className="text-muted-foreground text-sm">
            Your trainer hasn't shared any workout collections with you yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {filtered.map((access: any) => (
        <WorkoutCollectionCard
          key={access.id}
          collection={access.workout_collections}
          variant="large"
        />
      ))}
    </div>
  );
}
