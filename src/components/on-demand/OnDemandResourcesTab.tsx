import { Package, FileText, Link as LinkIcon, FileCheck } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface OnDemandResourcesTabProps {
  collections: any[] | undefined;
  searchQuery: string;
  isLoading: boolean;
}

export function OnDemandResourcesTab({ collections, searchQuery, isLoading }: OnDemandResourcesTabProps) {
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
            <div>
              <h2 className="text-lg font-bold text-foreground">{collection.name}</h2>
              {collection.description && (
                <p className="text-sm text-muted-foreground mt-1">{collection.description}</p>
              )}
            </div>

            {collection.collection_sections?.map((section: any) => {
              const layoutClass =
                section.layout_type === "list"
                  ? "grid-cols-1"
                  : section.layout_type === "small_cards"
                  ? "grid-cols-2"
                  : "grid-cols-1";

              return (
                <div key={section.id} className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">{section.name}</h3>
                  <div className={`grid ${layoutClass} gap-3`}>
                    {section.section_resources?.map((sr: any) => {
                      const resource = sr.resources;
                      return (
                        <Card
                          key={sr.id}
                          className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => resource.url && window.open(resource.url, "_blank")}
                        >
                          {section.layout_type !== "list" && (
                            <CardHeader className="p-0">
                              {resource.cover_image_url ? (
                                <img src={resource.cover_image_url} alt={resource.name} className="w-full h-28 object-cover" />
                              ) : (
                                <div className="w-full h-28 bg-muted flex items-center justify-center">
                                  {getResourceIcon(resource.type)}
                                </div>
                              )}
                            </CardHeader>
                          )}
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-semibold line-clamp-2 text-sm">{resource.name}</h4>
                              {section.layout_type === "list" && (
                                <Badge variant="secondary" className="capitalize text-xs shrink-0">{resource.type}</Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
