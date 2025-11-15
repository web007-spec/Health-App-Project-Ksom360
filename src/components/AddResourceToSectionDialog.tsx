import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Link as LinkIcon, FileCheck } from "lucide-react";

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

  const getResourceIcon = (type: string) => {
    switch (type) {
      case "link":
        return <LinkIcon className="h-4 w-4" />;
      case "document":
        return <FileText className="h-4 w-4" />;
      case "form":
        return <FileCheck className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Resources to Section</DialogTitle>
          <DialogDescription>
            Select resources to add to this section
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {!resources?.length ? (
            <p className="text-center text-muted-foreground py-8">
              No resources available. Create resources first.
            </p>
          ) : (
            resources.map((resource) => (
              <Card
                key={resource.id}
                className="cursor-pointer hover:bg-accent"
                onClick={() => toggleResource(resource.id)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <Checkbox
                    checked={selectedResources.includes(resource.id)}
                    onCheckedChange={() => toggleResource(resource.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {getResourceIcon(resource.type)}
                  <div className="flex-1">
                    <p className="font-medium">{resource.name}</p>
                    {resource.url && (
                      <p className="text-sm text-muted-foreground truncate">{resource.url}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {resource.type}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => {
              onOpenChange(false);
              setSelectedResources([]);
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={handleSubmit}
            disabled={addMutation.isPending || selectedResources.length === 0}
          >
            {addMutation.isPending ? "Adding..." : `Add ${selectedResources.length} Resource(s)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
