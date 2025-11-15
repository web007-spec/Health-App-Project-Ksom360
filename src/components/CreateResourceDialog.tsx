import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Link as LinkIcon, FileText, FileCheck } from "lucide-react";

interface CreateResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateResourceDialog({ open, onOpenChange }: CreateResourceDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [resourceType, setResourceType] = useState<"link" | "document" | "form">("link");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [coverImage, setCoverImage] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("resources").insert({
        name,
        type: resourceType,
        url,
        cover_image_url: coverImage || null,
        trainer_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      toast({ title: "Resource created successfully" });
      onOpenChange(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to create resource", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setName("");
    setUrl("");
    setCoverImage("");
    setResourceType("link");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Resource</DialogTitle>
          <DialogDescription>
            Choose a resource type and add the details
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <Label>Resource Type</Label>
            <RadioGroup value={resourceType} onValueChange={(v) => setResourceType(v as any)}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="link" id="link" />
                <Label htmlFor="link" className="flex items-center gap-2 cursor-pointer flex-1">
                  <LinkIcon className="h-4 w-4" />
                  <div>
                    <div className="font-medium">Link</div>
                    <div className="text-sm text-muted-foreground">Add a URL link</div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="document" id="document" />
                <Label htmlFor="document" className="flex items-center gap-2 cursor-pointer flex-1">
                  <FileText className="h-4 w-4" />
                  <div>
                    <div className="font-medium">Document</div>
                    <div className="text-sm text-muted-foreground">Upload PDF, DOC, XLS</div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="form" id="form" />
                <Label htmlFor="form" className="flex items-center gap-2 cursor-pointer flex-1">
                  <FileCheck className="h-4 w-4" />
                  <div>
                    <div className="font-medium">Form</div>
                    <div className="text-sm text-muted-foreground">Link to external form</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Resource Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Recipe Book, Intake Form"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">
              {resourceType === "link" || resourceType === "form" ? "URL" : "File URL"} *
            </Label>
            <Input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cover">Cover Image URL (Optional)</Label>
            <Input
              id="cover"
              type="url"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Resource"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
