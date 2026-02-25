import { useState, useRef } from "react";
import { ImageIcon, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CollectionHeaderProps {
  collection: {
    id: string;
    name: string;
    description: string | null;
    collection_type: string | null;
    cover_image_url: string | null;
    is_published: boolean;
  };
  onTogglePublished: (value: string) => void;
}

export function CollectionHeader({ collection, onTogglePublished }: CollectionHeaderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const typeLabel = collection.collection_type || "";
  const descLabel = collection.description || "";

  const [editingField, setEditingField] = useState<"name" | "type" | "desc" | null>(null);
  const [editName, setEditName] = useState(collection.name);
  const [editType, setEditType] = useState(typeLabel);
  const [editDesc, setEditDesc] = useState(descLabel);
  const [uploading, setUploading] = useState(false);

  const saveField = async (field: string, value: string) => {
    const updateData: Record<string, string | null> = {};
    if (field === "name") updateData.name = value;
    if (field === "type") updateData.collection_type = value || null;
    if (field === "desc") updateData.description = value || null;

    const { error } = await supabase
      .from("workout_collections")
      .update(updateData)
      .eq("id", collection.id);

    if (error) {
      toast({ title: "Failed to update", variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["workout-collection", collection.id] });
    }
    setEditingField(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: string, value: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveField(field, value);
    }
    if (e.key === "Escape") setEditingField(null);
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `${collection.id}/cover.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("workout-covers")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Upload failed", variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("workout-covers")
      .getPublicUrl(path);

    const { error: updateError } = await supabase
      .from("workout_collections")
      .update({ cover_image_url: urlData.publicUrl })
      .eq("id", collection.id);

    if (updateError) {
      toast({ title: "Failed to save image", variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["workout-collection", collection.id] });
      toast({ title: "Cover image updated" });
    }
    setUploading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-5">
        {/* Thumbnail - clickable to upload */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative w-24 h-24 rounded-lg flex-shrink-0 overflow-hidden group cursor-pointer border-0 p-0 bg-transparent"
          disabled={uploading}
        >
          {collection.cover_image_url ? (
            <img
              src={collection.cover_image_url}
              alt={collection.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted/60 flex items-center justify-center">
              <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-center justify-center">
            <Camera className="h-5 w-5 text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleThumbnailUpload}
          />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-0.5">
              {/* Type label - editable */}
              {editingField === "type" ? (
                <input
                  autoFocus
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  onBlur={() => saveField("type", editType)}
                  onKeyDown={(e) => handleKeyDown(e, "type", editType)}
                  className="text-xs font-semibold uppercase tracking-wider text-primary bg-transparent border border-primary/30 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary w-full max-w-xs"
                  placeholder="Add a type label..."
                />
              ) : (
                <p
                  onClick={() => { setEditType(typeLabel); setEditingField("type"); }}
                  className="text-xs font-semibold uppercase tracking-wider text-primary cursor-pointer hover:opacity-70 transition-opacity min-h-[1.25rem]"
                >
                  {typeLabel || <span className="text-muted-foreground normal-case">Click to add type label</span>}
                </p>
              )}

              {/* Name - editable */}
              {editingField === "name" ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => saveField("name", editName)}
                  onKeyDown={(e) => handleKeyDown(e, "name", editName)}
                  className="text-2xl font-bold text-foreground bg-transparent border border-primary/30 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary w-full"
                />
              ) : (
                <h1
                  onClick={() => { setEditName(collection.name); setEditingField("name"); }}
                  className="text-2xl font-bold text-foreground cursor-pointer hover:opacity-70 transition-opacity"
                >
                  {collection.name}
                </h1>
              )}

              {/* Description - editable */}
              {editingField === "desc" ? (
                <input
                  autoFocus
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  onBlur={() => saveField("desc", editDesc)}
                  onKeyDown={(e) => handleKeyDown(e, "desc", editDesc)}
                  className="text-sm text-muted-foreground bg-transparent border border-primary/30 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary w-full mt-1"
                  placeholder="Add collection description"
                />
              ) : (
                <p
                  onClick={() => { setEditDesc(descLabel); setEditingField("desc"); }}
                  className="text-sm text-muted-foreground mt-1 cursor-pointer hover:text-foreground transition-colors"
                >
                  {descLabel || "Add collection description"}
                </p>
              )}
            </div>

            <Select
              value={collection.is_published ? "published" : "draft"}
              onValueChange={onTogglePublished}
            >
              <SelectTrigger className="w-[130px] flex-shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Draft
                  </span>
                </SelectItem>
                <SelectItem value="published">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Published
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
