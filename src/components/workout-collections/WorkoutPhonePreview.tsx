import { Search } from "lucide-react";
import { PreviewCardsByLayout, type CardItem } from "@/components/on-demand/CardLayouts";

interface PreviewCategory {
  id: string;
  name: string;
  cover_image_url?: string | null;
  is_active?: boolean;
  card_layout?: string;
  category_workouts?: {
    id: string;
    ondemand_workouts?: {
      id: string;
      name: string;
      cover_image_url?: string | null;
      level?: string | null;
      duration_minutes?: number | null;
    } | null;
  }[];
}

interface WorkoutPhonePreviewProps {
  collectionName: string;
  categories: PreviewCategory[];
}

export function WorkoutPhonePreview({ collectionName, categories }: WorkoutPhonePreviewProps) {
  const activeCategories = categories.filter((c) => c.is_active !== false);

  return (
    <div className="sticky top-6">
      <div className="mx-auto w-[280px] rounded-[2rem] border-[6px] border-foreground/80 bg-background shadow-2xl overflow-hidden">
        {/* Status bar */}
        <div className="flex items-center justify-between px-5 py-1.5 bg-foreground/5">
          <span className="text-[10px] font-semibold text-muted-foreground">9:41</span>
          <div className="flex items-center gap-1">
            <div className="w-3.5 h-2 rounded-sm border border-muted-foreground/50">
              <div className="w-2 h-full bg-muted-foreground/50 rounded-sm" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="h-[480px] overflow-y-auto scrollbar-hide">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">‹</span>
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>

          <div className="px-4 pb-1">
            <h3 className="font-bold text-sm text-foreground">{collectionName || "On-demand"}</h3>
          </div>

          <div className="flex gap-4 px-4 border-b border-border mt-1">
            <span className="text-[11px] font-semibold text-primary border-b-2 border-primary pb-1.5">For you</span>
            <span className="text-[11px] text-muted-foreground pb-1.5">Categories</span>
            <span className="text-[11px] text-muted-foreground pb-1.5">About</span>
          </div>

          <div className="px-3 py-3 space-y-4">
            {activeCategories.length === 0 && (
              <p className="text-[10px] text-muted-foreground text-center py-8">No categories yet</p>
            )}

            {activeCategories.map((cat) => {
              const items: CardItem[] = (cat.category_workouts || [])
                .map((cw) => cw.ondemand_workouts)
                .filter(Boolean)
                .map((w) => ({
                  id: w!.id,
                  name: w!.name,
                  cover_image_url: w!.cover_image_url,
                  duration_minutes: w!.duration_minutes,
                  level: w!.level,
                }));

              const layout = cat.card_layout || "large";

              return (
                <div key={cat.id}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-[11px] text-foreground">{cat.name}</h4>
                    <span className="text-[9px] text-primary font-medium">See more</span>
                  </div>

                  <PreviewCardsByLayout layout={layout} items={items} fallbackImage={cat.cover_image_url} />

                  <hr className="border-border mt-3" />
                </div>
              );
            })}
          </div>
        </div>

        <div className="h-5 bg-foreground/5 flex items-center justify-center">
          <div className="w-24 h-1 rounded-full bg-foreground/20" />
        </div>
      </div>
    </div>
  );
}
