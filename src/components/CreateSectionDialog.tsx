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
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateSectionDialogProps {
  collectionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const layoutOptions = [
  { value: "large_cards", label: "Large Cards" },
  { value: "narrow_cards", label: "Narrow Cards" },
  { value: "small_cards", label: "Small Cards" },
  { value: "list", label: "List View" },
];

export function CreateSectionDialog({
  collectionId,
  open,
  onOpenChange,
}: CreateSectionDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [layout, setLayout] = useState("large_cards");

  const { data: sections } = useQuery({
    queryKey: ["collection-sections", collectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collection_sections")
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
      const maxOrder = sections?.[0]?.order_index ?? -1;
      const { error } = await supabase.from("collection_sections").insert({
        collection_id: collectionId,
        name: name.trim(),
        layout_type: layout as any,
        order_index: maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-collection", collectionId] });
      toast({ title: "Section created successfully" });
      onOpenChange(false);
      setName("");
      setLayout("large_cards");
    },
    onError: () => {
      toast({ title: "Failed to create section", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Please enter a section name", variant: "destructive" });
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Section</DialogTitle>
          <DialogDescription>
            Add a new section to organize your resources
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Section Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Nutrition Resources, Getting Started"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="layout">Layout Style</Label>
            <Select value={layout} onValueChange={setLayout}>
              <SelectTrigger id="layout">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {layoutOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Section"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
