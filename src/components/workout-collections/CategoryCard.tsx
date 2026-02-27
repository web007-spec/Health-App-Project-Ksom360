import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  GripVertical,
  MoreVertical,
  Play,
  Dumbbell,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CardLayoutPicker } from "./CardLayoutPicker";

interface CategoryCardProps {
  category: any;
  onDelete: (id: string) => void;
  onAddWorkout: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onChangeLayout: (id: string, layout: string) => void;
  onNavigate: (id: string) => void;
}

export function CategoryCard({
  category,
  onDelete,
  onAddWorkout,
  onToggleActive,
  onChangeLayout,
  onNavigate,
}: CategoryCardProps) {
  const [layoutPickerOpen, setLayoutPickerOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: category.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const workoutCount = category.category_workouts?.length || 0;
  // Show up to 3 preview thumbnails
  const previewWorkouts = (category.category_workouts || []).slice(0, 3);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onNavigate(category.id)}
    >
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 py-3 px-4">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* Thumbnail stack */}
        <div className="flex -space-x-2">
          {previewWorkouts.length > 0 ? (
            previewWorkouts.map((cw: any) => (
              <div key={cw.id} className="w-10 h-10 rounded overflow-hidden border-2 border-background flex-shrink-0">
                {cw.ondemand_workouts?.thumbnail_url ? (
                  <img
                    src={cw.ondemand_workouts.thumbnail_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Play className="h-3 w-3 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
              <Dumbbell className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{category.name}</p>
          <p className="text-xs text-muted-foreground">{workoutCount} Workouts</p>
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Switch
            checked={category.is_active !== false}
            onCheckedChange={(checked) => onToggleActive(category.id, checked)}
          />
        </div>

        {/* Format button */}
        <div onClick={(e) => e.stopPropagation()}>
          <CardLayoutPicker
            open={layoutPickerOpen}
            onOpenChange={setLayoutPickerOpen}
            currentLayout={category.card_layout || "large"}
            onSelect={(layout) => onChangeLayout(category.id, layout)}
          />
        </div>

        {/* 3-dot menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(category.id);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Category
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
    </Card>
  );
}
