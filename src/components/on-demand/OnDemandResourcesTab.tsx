import { Package, FileText, Link as LinkIcon, FileCheck } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface OnDemandResourcesTabProps {
  collections: any[] | undefined;
  searchQuery: string;
  isLoading: boolean;
}

export function OnDemandResourcesTab({ collections, searchQuery, isLoading }: OnDemandResourcesTabProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground text-sm">Loading resources...</div>;
  }

  const filtered = collections?.filter((access: any) =>
    access.resource_collections.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!filtered?.length) {
    return (
      <Card className="text-center py-12">
        <CardContent className="pt-6">
          <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No resources yet</h3>
          <p className="text-muted-foreground text-sm">
            Your trainer hasn't shared any resources with you yet
          </p>
        </CardContent>
      </Card>
    );
  }

  const getResourceIcon = (type: string) => {
    switch (type) {
      case "link": return <LinkIcon className="h-5 w-5" />;
      case "document": return <FileText className="h-5 w-5" />;
      case "form": return <FileCheck className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-8">
      {filtered.map((access: any) => {
        const collection = access.resource_collections;
        return (
          <div key={collection.id} className="space-y-4">
            <div
              className="cursor-pointer"
              onClick={() => navigate(`/client/resource-collection/${collection.id}`)}
            >
              <h2 className="text-lg font-bold text-foreground">{collection.name}</h2>
              {collection.description && (
                <p className="text-sm text-muted-foreground mt-1">{collection.description}</p>
              )}
            </div>

            {collection.collection_sections?.map((section: any) => {
              const normalizeLayout = (layout?: string) => {
                switch (layout) {
                  case "large":
                    return "large_cards";
                  case "narrow":
                    return "narrow_cards";
                  case "small":
                    return "small_cards";
                  case "list":
                    return "list";
                  default:
                    return layout || "large_cards";
                }
              };

              const layoutType = normalizeLayout(section.layout_type);

              return (
                <div key={section.id} className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">{section.name}</h3>

                  {layoutType === "list" && (
                    <div className="space-y-2">
                      {section.section_resources?.map((sr: any) => {
                        const resource = sr.resources;
                        return (
                          <Card
                            key={sr.id}
                            className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                            onClick={() => resource.url && window.open(resource.url, "_blank")}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center gap-3">
                                {resource.cover_image_url ? (
                                  <img src={resource.cover_image_url} alt={resource.name} className="w-10 h-10 rounded-lg object-cover" />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                    {getResourceIcon(resource.type)}
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold line-clamp-1 text-sm">{resource.name}</h4>
                                </div>
                                <Badge variant="secondary" className="capitalize text-xs shrink-0">{resource.type}</Badge>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}

                  {layoutType === "small_cards" && (
                    <div className="grid grid-cols-3 gap-3">
                      {section.section_resources?.map((sr: any) => {
                        const resource = sr.resources;
                        return (
                          <div
                            key={sr.id}
                            className="flex flex-col items-center gap-1.5 cursor-pointer"
                            onClick={() => resource.url && window.open(resource.url, "_blank")}
                          >
                            {resource.cover_image_url ? (
                              <img src={resource.cover_image_url} alt={resource.name} className="w-16 h-16 rounded-xl object-cover" />
                            ) : (
                              <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                                {getResourceIcon(resource.type)}
                              </div>
                            )}
                            <h4 className="font-semibold line-clamp-2 text-[11px] text-center">{resource.name}</h4>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {layoutType === "narrow_cards" && (
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                      {section.section_resources?.map((sr: any) => {
                        const resource = sr.resources;
                        return (
                          <Card
                            key={sr.id}
                            className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow flex-shrink-0 w-36"
                            onClick={() => resource.url && window.open(resource.url, "_blank")}
                          >
                            {resource.cover_image_url ? (
                              <img src={resource.cover_image_url} alt={resource.name} className="w-full h-24 object-cover" />
                            ) : (
                              <div className="w-full h-24 bg-muted flex items-center justify-center">
                                {getResourceIcon(resource.type)}
                              </div>
                            )}
                            <CardContent className="p-2">
                              <h4 className="font-semibold line-clamp-2 text-xs">{resource.name}</h4>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}

                  {layoutType === "large_cards" && (
                    <div className="grid grid-cols-1 gap-3">
                      {section.section_resources?.map((sr: any) => {
                        const resource = sr.resources;
                        return (
                          <Card
                            key={sr.id}
                            className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                            onClick={() => resource.url && window.open(resource.url, "_blank")}
                          >
                            <CardHeader className="p-0">
                              {resource.cover_image_url ? (
                                <img src={resource.cover_image_url} alt={resource.name} className="w-full h-32 object-cover" />
                              ) : (
                                <div className="w-full h-32 bg-muted flex items-center justify-center">
                                  {getResourceIcon(resource.type)}
                                </div>
                              )}
                            </CardHeader>
                            <CardContent className="p-3">
                              <h4 className="font-semibold line-clamp-2 text-sm">{resource.name}</h4>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
