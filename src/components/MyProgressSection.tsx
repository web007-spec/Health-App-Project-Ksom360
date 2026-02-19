import { Card, CardContent } from "@/components/ui/card";
import { Settings } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface ProgressTile {
  id: string;
  client_id: string;
  tile_key: string;
  label: string;
  unit: string;
  is_visible: boolean;
  order_index: number;
  metric_definition_id: string | null;
}

interface Props {
  clientId: string;
}

export function MyProgressSection({ clientId }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Fetch tiles config
  const { data: tiles } = useQuery({
    queryKey: ["progress-tiles", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_progress_tiles")
        .select("*")
        .eq("client_id", clientId)
        .order("order_index", { ascending: true });
      if (error) throw error;
      // Auto-provision if empty
      if (!data || data.length === 0) {
        await supabase.rpc("provision_default_progress_tiles", { p_client_id: clientId });
        const { data: newData } = await supabase
          .from("client_progress_tiles")
          .select("*")
          .eq("client_id", clientId)
          .order("order_index", { ascending: true });
        return (newData || []) as ProgressTile[];
      }
      return data as ProgressTile[];
    },
    enabled: !!clientId,
  });

  // Fetch latest metric entry + sparkline data for each visible tile
  const visibleTiles = tiles?.filter(t => t.is_visible) || [];
  const metricDefIds = visibleTiles
    .filter(t => t.metric_definition_id)
    .map(t => t.metric_definition_id!);

  // Get client_metrics mapping for the metric_definition_ids
  const { data: clientMetricsMap } = useQuery({
    queryKey: ["progress-client-metrics", clientId, metricDefIds],
    queryFn: async () => {
      if (metricDefIds.length === 0) return {};
      const { data, error } = await supabase
        .from("client_metrics")
        .select("id, metric_definition_id")
        .eq("client_id", clientId)
        .in("metric_definition_id", metricDefIds);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((cm: any) => {
        map[cm.metric_definition_id] = cm.id;
      });
      return map;
    },
    enabled: metricDefIds.length > 0,
  });

  // Fetch latest entries and sparkline data for all client_metric ids
  const clientMetricIds = Object.values(clientMetricsMap || {});
  
  const { data: tileData } = useQuery({
    queryKey: ["progress-tile-data", clientMetricIds],
    queryFn: async () => {
      if (clientMetricIds.length === 0) return {};
      const results: Record<string, { latestValue: number; latestDate: string; sparkline: number[] }> = {};
      
      for (const cmId of clientMetricIds) {
        const { data } = await supabase
          .from("metric_entries")
          .select("value, recorded_at")
          .eq("client_metric_id", cmId)
          .order("recorded_at", { ascending: false })
          .limit(14);
        
        if (data && data.length > 0) {
          results[cmId] = {
            latestValue: data[0].value,
            latestDate: data[0].recorded_at,
            sparkline: [...data].reverse().map(d => d.value),
          };
        }
      }
      return results;
    },
    enabled: clientMetricIds.length > 0,
  });

  const toggleVisibility = useMutation({
    mutationFn: async ({ tileId, visible }: { tileId: string; visible: boolean }) => {
      const { error } = await supabase
        .from("client_progress_tiles")
        .update({ is_visible: visible })
        .eq("id", tileId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress-tiles", clientId] });
    },
  });

  if (!tiles || tiles.length === 0) return null;

  const getRelativeDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return format(d, "MMM d");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">My Progress</h2>
        <button onClick={() => setSettingsOpen(true)} className="text-muted-foreground hover:text-foreground transition-colors">
          <Settings className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {visibleTiles.map(tile => {
          const cmId = tile.metric_definition_id ? clientMetricsMap?.[tile.metric_definition_id] : null;
          const data = cmId ? tileData?.[cmId] : null;
          
          return (
            <Card
              key={tile.id}
              className="cursor-pointer hover:shadow-md transition-all overflow-hidden"
              onClick={() => {
                if (cmId) {
                  navigate(`/client/progress?metric=${cmId}`);
                } else {
                  navigate("/client/progress");
                }
              }}
            >
              <CardContent className="p-4 pb-2 space-y-1">
                <p className="text-sm font-semibold text-foreground">{tile.label}</p>
                <p className="text-[11px] text-muted-foreground">
                  {data ? getRelativeDate(data.latestDate) : "No data"}
                </p>
                <p className="text-2xl font-bold text-foreground leading-tight">
                  {data ? (
                    <>
                      {Number(data.latestValue).toLocaleString()}
                      <span className="text-sm font-normal text-muted-foreground ml-1">{tile.unit}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground text-lg">···</span>
                  )}
                </p>
                {/* Sparkline */}
                <div className="h-8 -mx-1">
                  {data && data.sparkline.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.sparkline.map((v, i) => ({ v, i }))}>
                        <Line
                          type="monotone"
                          dataKey="v"
                          stroke="hsl(45, 93%, 58%)"
                          strokeWidth={1.5}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-end">
                      <div className="w-full h-px bg-muted" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Settings Sheet */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Customize My Progress</SheetTitle>
          </SheetHeader>
          <p className="text-sm text-muted-foreground mt-2 mb-4">Toggle which tiles appear on your dashboard.</p>
          <div className="space-y-3">
            {tiles.map(tile => (
              <div key={tile.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <Label className="text-sm font-medium">{tile.label}</Label>
                <Switch
                  checked={tile.is_visible}
                  onCheckedChange={(checked) => toggleVisibility.mutate({ tileId: tile.id, visible: checked })}
                />
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
