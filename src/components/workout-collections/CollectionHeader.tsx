import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play } from "lucide-react";
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button variant="ghost" size="sm" className="gap-1 px-2" onClick={() => navigate("/workout-collections")}>
          <ArrowLeft className="h-4 w-4" />
          Workout Collections
        </Button>
        <span>/</span>
        <span className="text-foreground font-medium">{collection.name}</span>
      </div>

      <div className="flex items-start gap-5">
        {collection.cover_image_url ? (
          <img
            src={collection.cover_image_url}
            alt={collection.name}
            className="w-28 h-28 object-cover rounded-lg flex-shrink-0"
          />
        ) : (
          <div className="w-28 h-28 bg-muted flex items-center justify-center rounded-lg flex-shrink-0">
            <Play className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{collection.name}</h1>
              {collection.description && (
                <p className="text-muted-foreground mt-1 line-clamp-2">
                  {collection.description}
                </p>
              )}
            </div>
            <Select
              value={collection.is_published ? "published" : "draft"}
              onValueChange={onTogglePublished}
            >
              <SelectTrigger className="w-[140px] flex-shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                    Draft
                  </span>
                </SelectItem>
                <SelectItem value="published">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" />
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
