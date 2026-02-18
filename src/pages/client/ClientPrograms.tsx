import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, ChevronRight, ArrowLeft } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";

interface FastingProtocol {
  id: string;
  name: string;
  category: string;
  description: string | null;
  duration_days: number;
  fast_target_hours: number;
}

const CATEGORY_ORDER = ["FOUNDATIONS", "FAT LOSS", "ENERGY & FOCUS"];

export default function ClientPrograms() {
  const clientId = useEffectiveClientId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: protocols, isLoading } = useQuery({
    queryKey: ["fasting-protocols"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fasting_protocols")
        .select("*")
        .order("duration_days");
      if (error) throw error;
      return data as FastingProtocol[];
    },
  });

  const selectProtocolMutation = useMutation({
    mutationFn: async (protocolId: string) => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { error } = await supabase
        .from("client_feature_settings")
        .update({
          selected_protocol_id: protocolId,
          protocol_start_date: today,
        })
        .eq("client_id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings"] });
      toast.success("Protocol selected!");
      navigate("/client/dashboard");
    },
    onError: () => {
      toast.error("Failed to select protocol");
    },
  });

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: protocols?.filter((p) => p.category === cat) || [],
  })).filter((g) => g.items.length > 0);

  return (
    <ClientLayout>
      <div className="px-3 pt-4 pb-8 space-y-6 w-full">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">All Programs</h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.category} className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {group.category}
              </h2>
              {group.items.map((protocol) => (
                <Card
                  key={protocol.id}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => selectProtocolMutation.mutate(protocol.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1.5">
                        <h3 className="font-semibold text-base">{protocol.name}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {protocol.description}
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <Badge variant="secondary" className="text-xs">
                            {protocol.duration_days} days
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {protocol.fast_target_hours}h fast
                          </Badge>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ))
        )}
      </div>
    </ClientLayout>
  );
}
