import { Badge } from "@/components/ui/badge";

interface PreviewSection {
  id: string;
  name: string;
  section_resources?: {
    id: string;
    resources?: {
      id: string;
      name: string;
      cover_image_url?: string | null;
      type: string;
      url?: string | null;
    } | null;
  }[];
}

interface CollectionPhonePreviewProps {
  collectionName: string;
  coverImageUrl?: string | null;
  sections: PreviewSection[];
}

export function CollectionPhonePreview({
  collectionName,
  coverImageUrl,
  sections,
}: CollectionPhonePreviewProps) {
  return (
    <div className="sticky top-6">
      {/* Phone frame */}
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

        {/* Content area */}
        <div className="h-[480px] overflow-y-auto scrollbar-hide">
          {/* Cover / Title area */}
          <div className="relative">
            {coverImageUrl ? (
              <div className="h-28 bg-muted">
                <img
                  src={coverImageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <h3 className="absolute bottom-3 left-4 right-4 text-white font-bold text-sm leading-tight">
                  {collectionName}
                </h3>
              </div>
            ) : (
              <div className="px-4 pt-4 pb-2">
                <h3 className="font-bold text-sm text-foreground">{collectionName}</h3>
              </div>
            )}
          </div>

          {/* Sections */}
          <div className="px-3 py-3 space-y-4">
            {sections.length === 0 && (
              <p className="text-[10px] text-muted-foreground text-center py-8">
                No sections yet
              </p>
            )}

            {sections.map((section) => (
              <div key={section.id}>
                {/* Section header */}
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-[11px] text-foreground">
                    {section.name}
                  </h4>
                  <span className="text-[9px] text-primary font-medium">View more</span>
                </div>

                {/* Resources list */}
                <div className="space-y-1.5">
                  {(section.section_resources || []).slice(0, 3).map((sr) => {
                    const resource = sr.resources;
                    if (!resource) return null;
                    return (
                      <div
                        key={sr.id}
                        className="flex items-center gap-2 py-1"
                      >
                        {/* Thumbnail */}
                        <div className="h-9 w-9 rounded-md overflow-hidden shrink-0 bg-muted">
                          {resource.cover_image_url ? (
                            <img
                              src={resource.cover_image_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <Badge
                                variant="secondary"
                                className="text-[7px] px-1 py-0 capitalize"
                              >
                                {resource.type}
                              </Badge>
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-medium text-foreground line-clamp-2 leading-tight">
                          {resource.name}
                        </span>
                      </div>
                    );
                  })}

                  {(section.section_resources?.length || 0) === 0 && (
                    <p className="text-[9px] text-muted-foreground py-2 text-center">
                      No resources
                    </p>
                  )}
                </div>

                {/* Divider */}
                <hr className="border-border mt-3" />
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="h-5 bg-foreground/5 flex items-center justify-center">
          <div className="w-24 h-1 rounded-full bg-foreground/20" />
        </div>
      </div>
    </div>
  );
}
