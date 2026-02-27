import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface CreateCategoryDialogProps {
  collectionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (category: any) => void;
}

export function CreateCategoryDialog({
  collectionId,
  open,
  onOpenChange,
  onCreated,
}: CreateCategoryDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data: categories } = useQuery({
    queryKey: ["workout-collection-categories", collectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_collection_categories")
        .select("order_index")
        .eq("collection_id", collectionId)
        .order("order_index", { ascending: false })
        .limit(1);

      if (error) throw error;
      return data;
    },
    enabled: !!collectionId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const maxOrder = categories?.[0]?.order_index ?? -1;
      const { data, error } = await supabase.from("workout_collection_categories").insert({
        collection_id: collectionId,
        name: name.trim(),
        description: description.trim() || null,
        order_index: maxOrder + 1,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["workout-collection", collectionId] });
      toast({ title: "Category created successfully" });
      onOpenChange(false);
      setName("");
      setDescription("");
      onCreated?.(data);
    },
    onError: () => {
      toast({ title: "Failed to create category", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Please enter a category name", variant: "destructive" });
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Create New Category</DialogTitle>
          <DialogDescription>
            Use categories to separate and sort workouts in the Collection.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Category Name"
              required
              className="border-primary/40 focus-visible:ring-primary"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
