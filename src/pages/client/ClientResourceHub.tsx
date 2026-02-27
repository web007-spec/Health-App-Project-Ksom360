import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { Card, CardContent } from "@/components/ui/card";
import { Package } from "lucide-react";
import { ClientLayout } from "@/components/ClientLayout";
import { ClientCardsByLayout, type CardItem } from "@/components/on-demand/CardLayouts";

export default function ClientResourceHub() {
  const clientId = useEffectiveClientId();

  const { data: collections, isLoading } = useQuery({
    queryKey: ["client-resource-collections", clientId],
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
        .eq("client_id", clientId);

      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

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
                    const layout = section.layout_type || "large_cards";
                    const items: CardItem[] = (section.section_resources || [])
                      .map((sr: any) => sr.resources)
                      .filter(Boolean)
                      .map((r: any) => ({
                        id: r.id,
                        name: r.name,
                        cover_image_url: r.cover_image_url,
                      }));

                    const handleClick = (id: string) => {
                      const resource = section.section_resources?.find(
                        (sr: any) => sr.resources?.id === id
                      )?.resources;
                      if (resource?.url) {
                        window.open(resource.url, "_blank");
                      }
                    };

                    return (
                      <div key={section.id} className="space-y-3">
                        <h3 className="text-lg font-semibold">{section.name}</h3>
                        <ClientCardsByLayout
                          layout={layout}
                          items={items}
                          onClick={handleClick}
                        />
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
