import { useState, useRef } from "react";
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
import { Link as LinkIcon, FileText, FileCheck, Upload, Image, X } from "lucide-react";

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
  const [file, setFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (f: File, folder: string): Promise<string> => {
    const ext = f.name.split(".").pop();
    const filePath = `${user!.id}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("resource-files").upload(filePath, f);
    if (error) throw error;
    const { data } = supabase.storage.from("resource-files").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      setIsUploading(true);
      let finalUrl = url;
      let coverImageUrl: string | null = null;

      // Upload document file if selected
      if (resourceType === "document" && file) {
        finalUrl = await uploadFile(file, "documents");
      }

      // Upload cover image if selected
      if (coverFile) {
        coverImageUrl = await uploadFile(coverFile, "covers");
      }

      if (!finalUrl) throw new Error("No file or URL provided");

      const { error } = await supabase.from("resources").insert({
        name,
        type: resourceType,
        url: finalUrl,
        cover_image_url: coverImageUrl,
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
    onSettled: () => {
      setIsUploading(false);
    },
  });

  const resetForm = () => {
    setName("");
    setUrl("");
    setFile(null);
    setCoverFile(null);
    setCoverPreview(null);
    setResourceType("link");
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setCoverFile(selected);
      setCoverPreview(URL.createObjectURL(selected));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Please enter a resource name", variant: "destructive" });
      return;
    }
    if (resourceType === "document" && !file) {
      toast({ title: "Please select a file to upload", variant: "destructive" });
      return;
    }
    if ((resourceType === "link" || resourceType === "form") && !url.trim()) {
      toast({ title: "Please enter a URL", variant: "destructive" });
      return;
    }
    createMutation.mutate();
  };

  const isDocType = resourceType === "document";

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
            <RadioGroup value={resourceType} onValueChange={(v) => { setResourceType(v as any); setFile(null); setUrl(""); }}>
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
                    <div className="text-sm text-muted-foreground">Upload PDF, DOC, XLS, video, or image files</div>
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

          {/* Document: File Upload */}
          {isDocType ? (
            <div className="space-y-2">
              <Label>Upload File *</Label>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.mp4,.mov,.avi,.jpg,.jpeg,.png,.webp,.gif"
                onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (selected) {
                    setFile(selected);
                    if (!name) setName(selected.name.replace(/\.[^/.]+$/, ""));
                  }
                }}
              />
              {file ? (
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setFile(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-20 border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center gap-1">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Click to upload file</span>
                  </div>
                </Button>
              )}
            </div>
          ) : (
            /* Link / Form: URL Input */
            <div className="space-y-2">
              <Label htmlFor="url">URL *</Label>
              <Input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                required
              />
            </div>
          )}

          {/* Cover Image Upload */}
          <div className="space-y-2">
            <Label>Cover Image (Optional)</Label>
            <input
              ref={coverInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleCoverSelect}
            />
            {coverPreview ? (
              <div className="relative">
                <img src={coverPreview} alt="Cover preview" className="w-full h-32 object-cover rounded-lg" />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={() => { setCoverFile(null); setCoverPreview(null); }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => coverInputRef.current?.click()}
              >
                <Image className="h-4 w-4 mr-2" />
                Upload Cover Image
              </Button>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={createMutation.isPending || isUploading}>
              {isUploading ? "Uploading..." : createMutation.isPending ? "Creating..." : "Create Resource"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
