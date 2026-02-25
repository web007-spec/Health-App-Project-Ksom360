import { FileText } from "lucide-react";

interface PreviewSection {
  id: string;
  name: string;
  layout_type?: string;
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

function ResourceThumbnail({ resource, size = "sm" }: { resource: any; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = size === "lg" ? "w-full h-24" : size === "md" ? "h-16 w-16" : "h-8 w-8";
  return (
    <div className={`${sizeClasses} rounded overflow-hidden shrink-0 bg-muted`}>
      {resource?.cover_image_url ? (
        <img src={resource.cover_image_url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <FileText className="h-3 w-3 text-muted-foreground" />
        </div>
      )}
    </div>
  );
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
                <img src={coverImageUrl} alt="" className="w-full h-full object-cover" />
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

            {sections.map((section) => {
              const layout = section.layout_type || "large_cards";
              const resources = (section.section_resources || []).slice(0, 4);

              return (
                <div key={section.id}>
                  {/* Section header */}
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-[11px] text-foreground">{section.name}</h4>
                    <span className="text-[9px] text-primary font-medium">View more</span>
                  </div>

                  {/* Large Cards */}
                  {layout === "large_cards" && (
                    <div className="space-y-2">
                      {resources.slice(0, 2).map((sr) => {
                        const r = sr.resources;
                        if (!r) return null;
                        return (
                          <div key={sr.id} className="rounded-lg overflow-hidden border border-border">
                            <ResourceThumbnail resource={r} size="lg" />
                            <div className="px-2 py-1.5">
                              <span className="text-[10px] font-medium text-foreground line-clamp-1">{r.name}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Squares (small_cards) */}
                  {layout === "small_cards" && (
                    <div className="grid grid-cols-3 gap-2">
                      {resources.slice(0, 3).map((sr) => {
                        const r = sr.resources;
                        if (!r) return null;
                        return (
                          <div key={sr.id} className="flex flex-col items-center gap-1">
                            <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted">
                              {r.cover_image_url ? (
                                <img src={r.cover_image_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                  <FileText className="h-3 w-3 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <span className="text-[8px] font-medium text-foreground text-center line-clamp-2">{r.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Narrow Cards */}
                  {layout === "narrow_cards" && (
                    <div className="flex gap-2 overflow-hidden">
                      {resources.slice(0, 3).map((sr) => {
                        const r = sr.resources;
                        if (!r) return null;
                        return (
                          <div key={sr.id} className="w-20 shrink-0 rounded-lg overflow-hidden border border-border">
                            <div className="h-16 bg-muted">
                              {r.cover_image_url ? (
                                <img src={r.cover_image_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
                              )}
                            </div>
                            <div className="px-1 py-1">
                              <span className="text-[8px] font-medium text-foreground line-clamp-2">{r.name}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* List */}
                  {layout === "list" && (
                    <div className="space-y-1">
                      {resources.slice(0, 3).map((sr) => {
                        const r = sr.resources;
                        if (!r) return null;
                        return (
                          <div key={sr.id} className="flex items-center gap-2.5 rounded-lg bg-muted/40 px-2 py-1.5">
                            <ResourceThumbnail resource={r} size="sm" />
                            <div className="flex-1 min-w-0">
                              <span className="text-[10px] font-medium text-foreground line-clamp-1 leading-tight">{r.name}</span>
                              {r.url && (
                                <span className="text-[8px] text-muted-foreground line-clamp-1 leading-tight">{r.url}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {(section.section_resources?.length || 0) === 0 && (
                    <p className="text-[9px] text-muted-foreground py-2 text-center">No resources</p>
                  )}

                  {/* Divider */}
                  <hr className="border-border mt-3" />
                </div>
              );
            })}
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
