import { Button } from "@/components/ui/button";
import { ArrowLeft, ImageIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
    cover_image_url: string | null;
    is_published: boolean;
  };
  onTogglePublished: (value: string) => void;
}

export function CollectionHeader({ collection, onTogglePublished }: CollectionHeaderProps) {
  const navigate = useNavigate();

  // Use description as the "type" label (matching the create dialog's Type field)
  const typeLabel = collection.description;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-5">
        {collection.cover_image_url ? (
          <img
            src={collection.cover_image_url}
            alt={collection.name}
            className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
          />
        ) : (
          <div className="w-24 h-24 bg-muted/60 flex items-center justify-center rounded-lg flex-shrink-0">
            <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              {typeLabel && (
                <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-0.5">
                  {typeLabel}
                </p>
              )}
              <h1 className="text-2xl font-bold text-foreground">{collection.name}</h1>
              <p className="text-sm text-muted-foreground mt-1 cursor-pointer hover:text-foreground transition-colors">
                Add collection description
              </p>
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
