import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { ClientLayout } from "@/components/ClientLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { OnDemandWorkoutsTab } from "@/components/on-demand/OnDemandWorkoutsTab";
import { OnDemandResourcesTab } from "@/components/on-demand/OnDemandResourcesTab";
import { OnDemandAllTab } from "@/components/on-demand/OnDemandAllTab";

export default function ClientOnDemand() {
  const clientId = useEffectiveClientId();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Mark on-demand as seen when client visits this page
  useEffect(() => {
    if (!clientId) return;
    localStorage.setItem(`ondemand-last-seen-${clientId}`, new Date().toISOString());
    queryClient.invalidateQueries({ queryKey: ["unseen-ondemand-badge", clientId] });
  }, [clientId, queryClient]);

  // Fetch workout collections
  const { data: workoutCollections, isLoading: loadingWorkouts } = useQuery({
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

  // Fetch resource collections
  const { data: resourceCollections, isLoading: loadingResources } = useQuery({
    queryKey: ["client-resource-collections", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_collection_access")
        .select(`
          *,
          resource_collections(
            *,
            collection_sections(
              *,
              section_resources(
                *,
                resources(*)
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

  const isLoading = loadingWorkouts || loadingResources;

  return (
    <ClientLayout>
      <div className="p-4 space-y-4 pb-24">
        <h1 className="text-2xl font-bold text-foreground">On-demand</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full bg-transparent p-0 h-auto gap-0 justify-start border-b border-border rounded-none">
            {["all", "resources", "workouts"].map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="capitalize rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2 text-sm font-medium"
              >
                {tab === "all" ? "All" : tab === "resources" ? "Resources" : "Workouts"}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Search bar */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={`Search ${activeTab === "all" ? "content" : activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/50 border-0"
            />
          </div>

          <TabsContent value="all" className="mt-4 space-y-6">
            <OnDemandAllTab
              workoutCollections={workoutCollections}
              resourceCollections={resourceCollections}
              searchQuery={searchQuery}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="resources" className="mt-4 space-y-6">
            <OnDemandResourcesTab
              collections={resourceCollections}
              searchQuery={searchQuery}
              isLoading={loadingResources}
            />
          </TabsContent>

          <TabsContent value="workouts" className="mt-4 space-y-6">
            <OnDemandWorkoutsTab
              collections={workoutCollections}
              searchQuery={searchQuery}
              isLoading={loadingWorkouts}
            />
          </TabsContent>
        </Tabs>
      </div>
    </ClientLayout>
  );
}
