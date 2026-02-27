import { Play, Dumbbell, FileText } from "lucide-react";

// --- Shared image fallback ---
export function ContentImage({
  src,
  fallbackSrc,
  className,
  fallbackIcon = "play",
}: {
  src?: string | null;
  fallbackSrc?: string | null;
  className?: string;
  fallbackIcon?: "play" | "dumbbell" | "file";
}) {
  const url = src || fallbackSrc;
  if (url) {
    return <img src={url} alt="" className={`w-full h-full object-cover ${className || ""}`} />;
  }
  const Icon = fallbackIcon === "dumbbell" ? Dumbbell : fallbackIcon === "file" ? FileText : Play;
  return (
    <div className={`w-full h-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center ${className || ""}`}>
      <Icon className="h-4 w-4 text-muted-foreground/50" />
    </div>
  );
}

// --- Workout card item type ---
export interface CardItem {
  id: string;
  name: string;
  cover_image_url?: string | null;
  duration_minutes?: number | null;
  level?: string | null;
}

// ============================
// PHONE PREVIEW LAYOUTS (small)
// ============================

export function PreviewLargeCards({ items, fallbackImage }: { items: CardItem[]; fallbackImage?: string | null }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="w-full rounded-lg overflow-hidden">
          <div className="h-[120px] bg-muted relative">
            <ContentImage src={item.cover_image_url} fallbackSrc={fallbackImage} />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
              <span className="text-[10px] font-semibold text-white line-clamp-1">{item.name}</span>
              <span className="text-[8px] text-white/70">
                {item.duration_minutes ? `${item.duration_minutes}+ MIN` : ""}
                {item.level ? ` - ${item.level.toUpperCase()}` : ""}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PreviewSquareCards({ items, fallbackImage }: { items: CardItem[]; fallbackImage?: string | null }) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {items.map((item) => (
        <div key={item.id} className="rounded-lg overflow-hidden">
          <div className="aspect-square bg-muted relative">
            <ContentImage src={item.cover_image_url} fallbackSrc={fallbackImage} />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
              <span className="text-[8px] font-medium text-white line-clamp-1">{item.name}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PreviewNarrowCards({ items, fallbackImage }: { items: CardItem[]; fallbackImage?: string | null }) {
  return (
    <div className="flex gap-2 overflow-hidden">
      {items.map((item) => (
        <div key={item.id} className="w-[100px] shrink-0 rounded-lg overflow-hidden">
          <div className="h-[140px] bg-muted relative">
            <ContentImage src={item.cover_image_url} fallbackSrc={fallbackImage} />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
              <span className="text-[8px] font-semibold text-white line-clamp-2">{item.name}</span>
              <span className="text-[7px] text-white/70">
                {item.duration_minutes ? `${item.duration_minutes}+ MIN` : ""}
                {item.level ? ` - ${item.level.toUpperCase()}` : ""}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PreviewListCards({ items, fallbackImage }: { items: CardItem[]; fallbackImage?: string | null }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex gap-3 items-center">
          <div className="w-16 h-16 rounded-lg bg-muted shrink-0 overflow-hidden">
            <ContentImage src={item.cover_image_url} fallbackSrc={fallbackImage} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-foreground line-clamp-1">{item.name}</p>
            <p className="text-[8px] text-muted-foreground">
              {item.duration_minutes ? `${item.duration_minutes}+ MIN` : ""}
              {item.level ? ` - ${item.level.toUpperCase()}` : ""}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PreviewCardsByLayout({
  layout,
  items,
  fallbackImage,
  maxItems,
}: {
  layout: string;
  items: CardItem[];
  fallbackImage?: string | null;
  maxItems?: number;
}) {
  if (items.length === 0) {
    return <p className="text-[9px] text-muted-foreground py-2 text-center">No content</p>;
  }

  const max = maxItems || (layout === "list" ? 4 : 3);
  const displayed = items.slice(0, max);

  switch (layout) {
    case "square":
    case "small_cards":
      return <PreviewSquareCards items={displayed} fallbackImage={fallbackImage} />;
    case "narrow":
    case "narrow_cards":
      return <PreviewNarrowCards items={displayed} fallbackImage={fallbackImage} />;
    case "list":
      return <PreviewListCards items={displayed} fallbackImage={fallbackImage} />;
    default:
      return <PreviewLargeCards items={displayed} fallbackImage={fallbackImage} />;
  }
}

// ============================
// FULL-SIZE CLIENT LAYOUTS
// ============================

export function ClientLargeCards({ items, fallbackImage, onClick }: { items: CardItem[]; fallbackImage?: string | null; onClick?: (id: string) => void }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="w-full rounded-xl overflow-hidden cursor-pointer group"
          onClick={() => onClick?.(item.id)}
        >
          <div className="h-48 bg-muted relative">
            <ContentImage src={item.cover_image_url} fallbackSrc={fallbackImage} className="group-hover:scale-105 transition-transform duration-300" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4">
              <p className="text-white font-bold text-base line-clamp-2 drop-shadow-lg">{item.name}</p>
              <p className="text-white/70 text-xs mt-0.5">
                {item.duration_minutes ? `${item.duration_minutes}+ MIN` : ""}
                {item.level ? ` - ${item.level.toUpperCase()}` : ""}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ClientSquareCards({ items, fallbackImage, onClick }: { items: CardItem[]; fallbackImage?: string | null; onClick?: (id: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-xl overflow-hidden cursor-pointer group"
          onClick={() => onClick?.(item.id)}
        >
          <div className="aspect-square bg-muted relative">
            <ContentImage src={item.cover_image_url} fallbackSrc={fallbackImage} className="group-hover:scale-105 transition-transform duration-300" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
              <p className="text-white font-semibold text-sm line-clamp-2">{item.name}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ClientNarrowCards({ items, fallbackImage, onClick }: { items: CardItem[]; fallbackImage?: string | null; onClick?: (id: string) => void }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
      {items.map((item) => (
        <div
          key={item.id}
          className="w-36 shrink-0 rounded-xl overflow-hidden cursor-pointer group"
          onClick={() => onClick?.(item.id)}
        >
          <div className="h-48 bg-muted relative">
            <ContentImage src={item.cover_image_url} fallbackSrc={fallbackImage} className="group-hover:scale-105 transition-transform duration-300" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
              <p className="text-white font-semibold text-xs line-clamp-2">{item.name}</p>
              <p className="text-white/60 text-[10px] mt-0.5">
                {item.duration_minutes ? `${item.duration_minutes}+ MIN` : ""}
                {item.level ? ` - ${item.level.toUpperCase()}` : ""}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ClientListCards({ items, fallbackImage, onClick }: { items: CardItem[]; fallbackImage?: string | null; onClick?: (id: string) => void }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex gap-4 items-center p-2 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => onClick?.(item.id)}
        >
          <div className="w-20 h-16 rounded-lg bg-muted shrink-0 overflow-hidden">
            <ContentImage src={item.cover_image_url} fallbackSrc={fallbackImage} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground line-clamp-1">{item.name}</p>
            <p className="text-xs text-muted-foreground">
              {item.duration_minutes ? `${item.duration_minutes}+ MIN` : ""}
              {item.level ? ` - ${item.level.toUpperCase()}` : ""}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ClientCardsByLayout({
  layout,
  items,
  fallbackImage,
  onClick,
}: {
  layout: string;
  items: CardItem[];
  fallbackImage?: string | null;
  onClick?: (id: string) => void;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No content</p>;
  }

  switch (layout) {
    case "square":
    case "small_cards":
      return <ClientSquareCards items={items} fallbackImage={fallbackImage} onClick={onClick} />;
    case "narrow":
    case "narrow_cards":
      return <ClientNarrowCards items={items} fallbackImage={fallbackImage} onClick={onClick} />;
    case "list":
      return <ClientListCards items={items} fallbackImage={fallbackImage} onClick={onClick} />;
    default:
      return <ClientLargeCards items={items} fallbackImage={fallbackImage} onClick={onClick} />;
  }
}
