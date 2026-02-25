import { useState, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Link as LinkIcon, FileText, FileCheck, Upload, Image, X, ArrowLeft, ExternalLink, Plus } from "lucide-react";

interface CreateResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ResourceType = "link" | "document" | "form";
type Step = "pick" | "details";

export function CreateResourceDialog({ open, onOpenChange }: CreateResourceDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("pick");
  const [resourceType, setResourceType] = useState<ResourceType>("link");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [addAnother, setAddAnother] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
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

      if (resourceType === "document" && file) {
        finalUrl = await uploadFile(file, "documents");
      }

      if (coverFile) {
        coverImageUrl = await uploadFile(coverFile, "covers");
      }

      if (!finalUrl && resourceType !== "form") throw new Error("No file or URL provided");

      const { error } = await supabase.from("resources").insert({
        name: name || (file?.name.replace(/\.[^/.]+$/, "") ?? "Untitled"),
        type: resourceType,
        url: finalUrl || null,
        cover_image_url: coverImageUrl,
        trainer_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      toast({ title: "Resource added" });
      if (addAnother) {
        resetForm();
        setStep("pick");
      } else {
        onOpenChange(false);
        resetForm();
      }
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
    setStep("pick");
    setAddAnother(false);
  };

  const handleClose = (val: boolean) => {
    if (!val) resetForm();
    onOpenChange(val);
  };

  const handleSelectType = (type: ResourceType) => {
    setResourceType(type);
    setStep("details");
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setCoverFile(selected);
      setCoverPreview(URL.createObjectURL(selected));
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      setFile(dropped);
      if (!name) setName(dropped.name.replace(/\.[^/.]+$/, ""));
    }
  }, [name]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (resourceType === "link" && !url.trim()) {
      toast({ title: "Please enter a URL", variant: "destructive" });
      return;
    }
    if (resourceType === "document" && !file) {
      toast({ title: "Please select a file to upload", variant: "destructive" });
      return;
    }
    createMutation.mutate();
  };

  const isFormValid = () => {
    if (resourceType === "link") return !!url.trim();
    if (resourceType === "document") return !!file;
    if (resourceType === "form") return !!name.trim();
    return false;
  };

  const typeLabel = resourceType === "link" ? "Add Link" : resourceType === "document" ? "Document" : "Form";

  const typeIcon = resourceType === "link"
    ? <LinkIcon className="h-5 w-5" />
    : resourceType === "document"
    ? <FileText className="h-5 w-5" />
    : <FileCheck className="h-5 w-5" />;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px] p-0 gap-0 overflow-hidden">
        {step === "pick" ? (
          /* ─── Step 1: Type Picker ─── */
          <div className="p-6 space-y-5">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Add Resource</DialogTitle>
              <p className="text-sm text-muted-foreground">Which type of resource do you want to add?</p>
            </DialogHeader>

            <div className="grid grid-cols-3 gap-4">
              {([
                { type: "link" as ResourceType, label: "Link", icon: LinkIcon },
                { type: "document" as ResourceType, label: "Document", icon: FileText },
                { type: "form" as ResourceType, label: "Form", icon: FileCheck },
              ]).map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => handleSelectType(type)}
                  className="flex flex-col items-center justify-center gap-3 p-6 border rounded-xl hover:bg-accent/50 hover:border-primary/30 transition-all cursor-pointer group"
                >
                  <div className="h-14 w-14 rounded-xl border flex items-center justify-center group-hover:border-primary/40 transition-colors">
                    <Icon className="h-7 w-7 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* ─── Step 2: Details Form ─── */
          <form onSubmit={handleSubmit}>
            {/* Header with icon badge */}
            <div className="relative">
              {/* Floating icon badge */}
              <div className="absolute -top-5 left-6 z-10 h-12 w-12 rounded-full bg-accent border-2 border-background flex items-center justify-center shadow-sm">
                {typeIcon}
              </div>

              <div className="pt-4 px-6 pb-0">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep("pick")}
                    className="flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors text-sm font-medium"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {typeLabel}
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 pb-6 pt-4 space-y-5">
              {/* Link type: just URL field */}
              {resourceType === "link" && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Link</Label>
                  <div className="relative">
                    <Input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="pr-10"
                      autoFocus
                    />
                    <ExternalLink className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              )}

              {/* Document type: name + drag-drop upload */}
              {resourceType === "document" && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resource Name</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Resource Name"
                      autoFocus
                    />
                  </div>

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
                    <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/30">
                      <FileText className="h-6 w-6 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFile(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex flex-col items-center justify-center gap-2 p-10 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                        isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-center gap-1 text-muted-foreground/60">
                        <span className="text-xs font-bold">XLS</span>
                        <span className="text-xs font-bold text-primary/60">DOC</span>
                        <span className="text-xs font-bold text-destructive/60">PDF</span>
                      </div>
                      <p className="text-sm text-muted-foreground text-center">
                        Drag and drop <span className="font-semibold">.xls .doc .pdf</span> document here or{" "}
                        <span className="text-primary font-medium cursor-pointer">Choose file</span>
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Form type: name + cover image */}
              {resourceType === "form" && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resource Name</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Resource Name"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Forms & Questionnaires</Label>
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <div
                        className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 flex items-center justify-center gap-2 text-muted-foreground/50 cursor-pointer hover:border-primary/30 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        <span className="text-sm">Add a form</span>
                      </div>
                    </div>
                  </div>

                  {/* Cover image */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cover Image (Optional)</Label>
                    <input
                      ref={coverInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleCoverSelect}
                    />
                    {coverPreview ? (
                      <div className="relative w-40">
                        <img src={coverPreview} alt="Cover" className="w-full h-28 object-cover rounded-lg border" />
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="absolute top-1.5 right-1.5 h-5 w-5"
                          onClick={() => { setCoverFile(null); setCoverPreview(null); }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        onClick={() => coverInputRef.current?.click()}
                        className="w-40 h-28 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-primary/30 transition-colors"
                      >
                        <Image className="h-6 w-6 text-muted-foreground/40" />
                        <p className="text-xs text-muted-foreground text-center">
                          Drag and drop or{" "}
                          <span className="text-primary font-medium">Choose file</span>
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Footer: Add Another + Add button */}
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={addAnother} onCheckedChange={(v) => setAddAnother(!!v)} />
                  <span className="text-sm text-muted-foreground">Add Another</span>
                </label>
                <Button
                  type="submit"
                  disabled={!isFormValid() || createMutation.isPending || isUploading}
                  className="px-8"
                >
                  {isUploading ? "Uploading..." : createMutation.isPending ? "Adding..." : "Add"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}