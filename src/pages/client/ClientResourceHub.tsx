import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Link as LinkIcon, FileCheck, Package } from "lucide-react";
import { ClientLayout } from "@/components/ClientLayout";
import { Button } from "@/components/ui/button";

export default function ClientResourceHub() {
  const { user } = useAuth();

  const { data: collections, isLoading } = useQuery({
    queryKey: ["client-resource-collections", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_collection_access")
        .select(`
          *,
          resource_collections(
            *,
            collection_sections(
              *,
              section_resources(
                *,
                resources(*)
              )
            )
          )
        `)
        .eq("client_id", user?.id);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const getResourceIcon = (type: string) => {
    switch (type) {
      case "link":
        return <LinkIcon className="h-5 w-5" />;
      case "document":
        return <FileText className="h-5 w-5" />;
      case "form":
        return <FileCheck className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  return (
    <ClientLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Resource Hub</h1>
          <p className="text-muted-foreground mt-2">
            Access documents, links, and forms from your trainer
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading resources...</div>
        ) : !collections?.length ? (
          <Card className="text-center py-12">
            <CardContent className="pt-6">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No resources yet</h3>
              <p className="text-muted-foreground">
                Your trainer hasn't shared any resources with you yet
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {collections.map((access: any) => {
              const collection = access.resource_collections;
              return (
                <div key={collection.id} className="space-y-4">
                  <h2 className="text-2xl font-bold">{collection.name}</h2>
                  {collection.description && (
                    <p className="text-muted-foreground">{collection.description}</p>
                  )}

                  {collection.collection_sections?.map((section: any) => {
                    const layoutClass =
                      section.layout_type === "list"
                        ? "grid-cols-1"
                        : section.layout_type === "small_cards"
                        ? "grid-cols-2 md:grid-cols-4 lg:grid-cols-6"
                        : section.layout_type === "narrow_cards"
                        ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                        : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";

                    return (
                      <div key={section.id} className="space-y-3">
                        <h3 className="text-lg font-semibold">{section.name}</h3>
                        <div className={`grid ${layoutClass} gap-4`}>
                          {section.section_resources?.map((sr: any) => {
                            const resource = sr.resources;
                            const isListView = section.layout_type === "list";

                            return (
                              <Card
                                key={sr.id}
                                className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                                onClick={() => {
                                  if (resource.url) {
                                    window.open(resource.url, "_blank");
                                  }
                                }}
                              >
                                {!isListView && (
                                  <CardHeader className="p-0">
                                    {resource.cover_image_url ? (
                                      <img
                                        src={resource.cover_image_url}
                                        alt={resource.name}
                                        className="w-full h-32 object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-32 bg-muted flex items-center justify-center">
                                        {getResourceIcon(resource.type)}
                                      </div>
                                    )}
                                  </CardHeader>
                                )}
                                <CardContent className={isListView ? "p-4" : "p-3"}>
                                  <div className="flex items-start justify-between gap-2">
                                    <h4 className="font-semibold line-clamp-2 text-sm">
                                      {resource.name}
                                    </h4>
                                    {isListView && (
                                      <Badge variant="secondary" className="capitalize text-xs">
                                        {resource.type}
                                      </Badge>
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
        )}
      </div>
    </ClientLayout>
  );
}
