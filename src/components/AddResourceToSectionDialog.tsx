import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Search, X, MoreHorizontal } from "lucide-react";

interface AddResourceToSectionDialogProps {
  sectionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddResourceToSectionDialog({
  sectionId,
  open,
  onOpenChange,
}: AddResourceToSectionDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: resources } = useQuery({
    queryKey: ["resources", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .eq("trainer_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && open,
  });

  const { data: existingResources } = useQuery({
    queryKey: ["section-resources", sectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("section_resources")
        .select("resource_id, order_index")
        .eq("section_id", sectionId)
        .order("order_index", { ascending: false })
        .limit(1);

      if (error) throw error;
      return data;
    },
    enabled: !!sectionId && open,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const maxOrder = existingResources?.[0]?.order_index ?? -1;

      const inserts = selectedResources.map((resourceId, index) => ({
        section_id: sectionId,
        resource_id: resourceId,
        order_index: maxOrder + index + 1,
      }));

      const { error } = await supabase.from("section_resources").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-collection"] });
      toast({ title: `${selectedResources.length} resource(s) added successfully` });
      onOpenChange(false);
      setSelectedResources([]);
      setSearchQuery("");
    },
    onError: () => {
      toast({ title: "Failed to add resources", variant: "destructive" });
    },
  });

  const toggleResource = (resourceId: string) => {
    setSelectedResources((prev) =>
      prev.includes(resourceId)
        ? prev.filter((id) => id !== resourceId)
        : [...prev, resourceId]
    );
  };

  const handleSubmit = () => {
    if (selectedResources.length === 0) {
      toast({ title: "Please select at least one resource", variant: "destructive" });
      return;
    }
    addMutation.mutate();
  };

  const filteredResources = resources?.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalCount = resources?.length || 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setSelectedResources([]); setSearchQuery(""); } }}>
      <DialogContent className="sm:max-w-[640px] p-0 gap-0 overflow-hidden">
        {/* Close button */}
        <button
          className="absolute right-3 top-3 rounded-full bg-foreground text-background w-7 h-7 flex items-center justify-center hover:opacity-80 transition-opacity z-10"
          onClick={() => { onOpenChange(false); setSelectedResources([]); setSearchQuery(""); }}
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Choose your resources</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Maximum of 25 resources per section</p>
          </div>
          <div className="relative w-56 shrink-0 mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search resource name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Count bar */}
        <div className="flex items-center justify-between px-6 py-2 border-b">
          <span className="text-sm font-semibold text-primary">
            All Resources ({totalCount})
          </span>
          <span className="text-sm text-muted-foreground">
            {selectedResources.length}/25 selected
          </span>
        </div>

        {/* Resource list */}
        <div className="max-h-[400px] overflow-y-auto px-6 py-2">
          {!filteredResources?.length ? (
            <p className="text-center text-muted-foreground py-12 text-sm">
              {totalCount === 0 ? "No resources available. Create resources first." : "No resources match your search."}
            </p>
          ) : (
            <div className="space-y-2">
              {filteredResources.map((resource) => {
                const isSelected = selectedResources.includes(resource.id);
                return (
                  <div
                    key={resource.id}
                    className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => toggleResource(resource.id)}
                  >
                    {/* Thumbnail */}
                    {resource.cover_image_url ? (
                      <img
                        src={resource.cover_image_url}
                        alt={resource.name}
                        className="w-14 h-14 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase">{resource.type}</span>
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{resource.name}</p>
                      {resource.url && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{resource.url}</p>
                      )}
                    </div>

                    {/* Checkbox */}
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleResource(resource.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t">
          <Button
            onClick={handleSubmit}
            disabled={addMutation.isPending || selectedResources.length === 0}
            className="min-w-[100px]"
          >
            {addMutation.isPending ? "Adding..." : "Add"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
