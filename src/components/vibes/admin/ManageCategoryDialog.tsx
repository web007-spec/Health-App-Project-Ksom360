import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  category?: { id: string; name: string; slug: string; sort_order: number } | null;
}

export function ManageCategoryDialog({ open, onOpenChange, category }: Props) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const qc = useQueryClient();

  useEffect(() => {
    if (category) { setName(category.name); setSlug(category.slug); }
    else { setName(""); setSlug(""); }
  }, [category, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      const s = slug || name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      if (category) {
        const { error } = await supabase.from("vibes_categories").update({ name, slug: s }).eq("id", category.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vibes_categories").insert({ name, slug: s });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vibes-categories"] });
      toast.success(category ? "Category updated" : "Category created");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? "Edit Category" : "Add Category"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nature" />
          </div>
          <div>
            <Label>Slug</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto-generated from name" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!name || mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
