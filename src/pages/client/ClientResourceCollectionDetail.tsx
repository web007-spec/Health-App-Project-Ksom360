import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Link as LinkIcon, FileCheck, Package } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ClientResourceCollectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: collection, isLoading } = useQuery({
    queryKey: ["client-resource-collection-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resource_collections")
        .select(`
          *,
          collection_sections(
            *,
            section_resources(
              *,
              resources(*)
            )
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const getResourceIcon = (type: string) => {
    switch (type) {
      case "link": return <LinkIcon className="h-5 w-5" />;
      case "document": return <FileText className="h-5 w-5" />;
      case "form": return <FileCheck className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="p-4 text-center py-12 text-muted-foreground">Loading...</div>
      </ClientLayout>
    );
  }

  if (!collection) {
    return (
      <ClientLayout>
        <div className="p-4 text-center py-12 text-muted-foreground">Collection not found</div>
      </ClientLayout>
    );
  }

  const sections = collection.collection_sections
    ?.sort((a: any, b: any) => a.order_index - b.order_index) || [];

  return (
    <ClientLayout>
      <div className="pb-24">
        {/* Header with cover image */}
        <div className="relative">
          {(collection as any).cover_image_url ? (
            <img
              src={(collection as any).cover_image_url}
              alt={collection.name}
              className="w-full h-48 object-cover"
            />
          ) : (
            <div className="w-full h-32 bg-gradient-to-br from-primary/20 to-primary/5" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <div className="absolute top-4 left-4">
            <Button
              variant="ghost"
              size="icon"
              className="bg-background/80 backdrop-blur-sm rounded-full"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h1 className="text-2xl font-bold text-foreground">{collection.name}</h1>
            {collection.description && (
              <p className="text-sm text-muted-foreground mt-1">{collection.description}</p>
            )}
          </div>
        </div>

        {/* Sections */}
        <div className="p-4 space-y-6">
          {sections.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No content available yet</p>
            </div>
          ) : (
            sections.map((section: any) => {
              const resources = section.section_resources
                ?.sort((a: any, b: any) => a.order_index - b.order_index) || [];

              const layoutType = section.layout_type || "large_cards";

              return (
                <div key={section.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-foreground">{section.name}</h2>
                    {resources.length > 3 && layoutType !== "list" && (
                      <span className="text-xs text-muted-foreground">View more</span>
                    )}
                  </div>

                  {/* Large Cards layout */}
                  {layoutType === "large_cards" && (
                    <div className="grid grid-cols-1 gap-3">
                      {resources.map((sr: any) => {
                        const resource = sr.resources;
                        return (
                          <Card
                            key={sr.id}
                            className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => resource?.url && window.open(resource.url, "_blank")}
                          >
                            <CardHeader className="p-0">
                              {resource?.cover_image_url ? (
                                <img src={resource.cover_image_url} alt={resource.name} className="w-full h-40 object-cover" />
                              ) : (
                                <div className="w-full h-40 bg-muted flex items-center justify-center">
                                  {getResourceIcon(resource?.type)}
                                </div>
                              )}
                            </CardHeader>
                            <CardContent className="p-3">
                              <h4 className="font-semibold text-sm">{resource?.name}</h4>
                              {resource?.url && (
                                <p className="text-xs text-muted-foreground truncate mt-1">{resource.url}</p>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}

                  {/* Narrow Cards layout */}
                  {layoutType === "narrow_cards" && (
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                      {resources.map((sr: any) => {
                        const resource = sr.resources;
                        return (
                          <Card
                            key={sr.id}
                            className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow flex-shrink-0 w-36"
                            onClick={() => resource?.url && window.open(resource.url, "_blank")}
                          >
                            {resource?.cover_image_url ? (
                              <img src={resource.cover_image_url} alt={resource.name} className="w-full h-28 object-cover" />
                            ) : (
                              <div className="w-full h-28 bg-muted flex items-center justify-center">
                                {getResourceIcon(resource?.type)}
                              </div>
                            )}
                            <CardContent className="p-2">
                              <h4 className="font-semibold text-xs line-clamp-2">{resource?.name}</h4>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}

                  {/* Small Cards layout */}
                  {layoutType === "small_cards" && (
                    <div className="grid grid-cols-3 gap-3">
                      {resources.map((sr: any) => {
                        const resource = sr.resources;
                        return (
                          <div
                            key={sr.id}
                            className="flex flex-col items-center gap-2 cursor-pointer"
                            onClick={() => resource?.url && window.open(resource.url, "_blank")}
                          >
                            {resource?.cover_image_url ? (
                              <img src={resource.cover_image_url} alt={resource.name} className="w-16 h-16 rounded-xl object-cover" />
                            ) : (
                              <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                                {getResourceIcon(resource?.type)}
                              </div>
                            )}
                            <span className="text-xs text-center font-medium line-clamp-2">{resource?.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* List layout */}
                  {layoutType === "list" && (
                    <div className="space-y-2">
                      {resources.map((sr: any) => {
                        const resource = sr.resources;
                        return (
                          <div
                            key={sr.id}
                            className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors"
                            onClick={() => resource?.url && window.open(resource.url, "_blank")}
                          >
                            {resource?.cover_image_url ? (
                              <img src={resource.cover_image_url} alt={resource.name} className="w-10 h-10 rounded-lg object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                {getResourceIcon(resource?.type)}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm">{resource?.name}</h4>
                              {resource?.url && (
                                <p className="text-xs text-muted-foreground truncate">{resource.url}</p>
                              )}
                            </div>
                            <Badge variant="secondary" className="capitalize text-xs shrink-0">{resource?.type}</Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </ClientLayout>
  );
}
