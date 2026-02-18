import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveClientId } from "@/hooks/useEffectiveClientId";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { useState } from "react";
import {
  CATEGORY_CONFIG,
  CATEGORY_ORDER,
  getDifficultyLabel,
  getDurationLabel,
} from "@/lib/fastingCategoryConfig";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FastingProtocol {
  id: string;
  name: string;
  category: string;
  description: string | null;
  duration_days: number;
  fast_target_hours: number;
  difficulty_level: string;
}

export default function ClientPrograms() {
  const clientId = useEffectiveClientId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedProtocol, setSelectedProtocol] = useState<FastingProtocol | null>(null);

  const { data: protocols, isLoading } = useQuery({
    queryKey: ["fasting-protocols"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fasting_protocols")
        .select("*")
        .order("duration_days");
      if (error) throw error;
      return (data as any[]).map((d) => ({
        ...d,
        difficulty_level: d.difficulty_level || "beginner",
      })) as FastingProtocol[];
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
      queryClient.invalidateQueries({ queryKey: ["my-feature-settings-fasting"] });
      toast.success("Protocol selected!");
      navigate("/client/dashboard");
    },
    onError: () => {
      toast.error("Failed to select protocol");
    },
  });

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    config: CATEGORY_CONFIG[cat],
    items: protocols?.filter((p) => p.category === cat) || [],
  })).filter((g) => g.items.length > 0);

  return (
    <ClientLayout>
      <div className="px-3 pt-4 pb-8 space-y-6 w-full">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/client/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">All Programs</h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          grouped.map((group) => {
            const Icon = group.config.icon;
            return (
              <div key={group.category} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${group.config.color}`} />
                  <h2 className={`text-xs font-bold uppercase tracking-wider ${group.config.color}`}>
                    {group.config.label}
                  </h2>
                </div>
                {group.items.map((protocol) => {
                  const CatIcon = group.config.icon;
                  return (
                    <Card
                      key={protocol.id}
                      className={`cursor-pointer border-l-4 ${group.config.borderColor} transition-colors hover:bg-muted/30`}
                      onClick={() => setSelectedProtocol(protocol)}
                    >
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full ${group.config.bgColor} flex items-center justify-center shrink-0`}>
                            <CatIcon className={`h-5 w-5 ${group.config.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base">{protocol.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {getDurationLabel(protocol.duration_days)}
                            </p>
                          </div>
                        </div>
                        {protocol.description && (
                          <p className="text-sm text-muted-foreground leading-relaxed pl-[52px]">
                            {protocol.description}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {/* Protocol Detail Dialog */}
      <Dialog open={!!selectedProtocol} onOpenChange={(open) => !open && setSelectedProtocol(null)}>
        <DialogContent className="sm:max-w-[420px]">
          {selectedProtocol && (() => {
            const config = CATEGORY_CONFIG[selectedProtocol.category];
            const Icon = config?.icon;
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3 mb-2">
                    {config && (
                      <div className={`h-12 w-12 rounded-full ${config.bgColor} flex items-center justify-center`}>
                        <Icon className={`h-6 w-6 ${config.color}`} />
                      </div>
                    )}
                    <div>
                      <DialogTitle className="text-xl">{selectedProtocol.name}</DialogTitle>
                      <p className={`text-xs font-semibold uppercase tracking-wider ${config?.color || "text-muted-foreground"}`}>
                        {selectedProtocol.category}
                      </p>
                    </div>
                  </div>
                </DialogHeader>
                <div className="space-y-4">
                  {selectedProtocol.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedProtocol.description}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-2xl font-bold">{selectedProtocol.fast_target_hours}h</p>
                      <p className="text-xs text-muted-foreground">Fasting Window</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-2xl font-bold">
                        {selectedProtocol.duration_days === 0 ? "∞" : `${selectedProtocol.duration_days}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedProtocol.duration_days === 0 ? "Ongoing" : "Days"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {getDurationLabel(selectedProtocol.duration_days)}
                    </Badge>
                    <Badge variant="outline" className="text-xs capitalize">
                      {getDifficultyLabel(selectedProtocol.difficulty_level)}
                    </Badge>
                  </div>
                  <Button
                    className="w-full h-12 text-base"
                    onClick={() => selectProtocolMutation.mutate(selectedProtocol.id)}
                    disabled={selectProtocolMutation.isPending}
                  >
                    {selectProtocolMutation.isPending ? "Starting..." : "Ready to Start"}
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </ClientLayout>
  );
}
