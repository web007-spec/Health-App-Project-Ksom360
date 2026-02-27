import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, TrendingUp, TrendingDown, Minus, ArrowLeft, BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { format, subMonths } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface MetricDefinition {
  id: string;
  name: string;
  unit: string;
  category: string;
}

interface ClientMetric {
  id: string;
  client_id: string;
  metric_definition_id: string;
  is_pinned: boolean;
  goal_value: number | null;
  starting_value: number | null;
  metric_definitions: MetricDefinition;
}

interface MetricEntry {
  id: string;
  client_metric_id: string;
  value: number;
  recorded_at: string;
  notes: string | null;
}

export default function ClientProgress() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(searchParams.get("metric"));
  const [logOpen, setLogOpen] = useState(false);
  const [bulkValues, setBulkValues] = useState<Record<string, string>>({});
  const [addResultOpen, setAddResultOpen] = useState(false);
  const [resultValue, setResultValue] = useState("");
  const [resultDate, setResultDate] = useState(new Date().toISOString().split("T")[0]);
  const [dateRange, setDateRange] = useState<"3m" | "6m" | "1y" | "2y" | "3y">("3m");

  // Fetch client's enabled metrics with definitions
  const { data: clientMetrics, isLoading } = useQuery({
    queryKey: ["client-metrics", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_metrics")
        .select("*, metric_definitions(*)")
        .eq("client_id", user?.id)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as ClientMetric[];
    },
    enabled: !!user?.id,
  });

  // Fetch latest entry for each metric
  const { data: latestEntries } = useQuery({
    queryKey: ["metric-latest-entries", user?.id],
    queryFn: async () => {
      if (!clientMetrics || clientMetrics.length === 0) return {};
      const results: Record<string, MetricEntry & { previousValue?: number }> = {};
      for (const cm of clientMetrics) {
        const { data } = await supabase
          .from("metric_entries")
          .select("*")
          .eq("client_metric_id", cm.id)
          .order("recorded_at", { ascending: false })
          .limit(2);
        if (data && data.length > 0) {
          results[cm.id] = { ...data[0] as MetricEntry, previousValue: data[1]?.value };
        }
      }
      return results;
    },
    enabled: !!clientMetrics && clientMetrics.length > 0,
  });

  const selectedClientMetric = clientMetrics?.find(cm => cm.id === selectedMetricId);
  const selectedDef = selectedClientMetric?.metric_definitions;

  const getRangeStart = () => {
    const now = new Date();
    switch (dateRange) {
      case "3m": return subMonths(now, 3);
      case "6m": return subMonths(now, 6);
      case "1y": return subMonths(now, 12);
      case "2y": return subMonths(now, 24);
      case "3y": return subMonths(now, 36);
    }
  };

  // Fetch entries for selected metric detail
  const { data: selectedEntries } = useQuery({
    queryKey: ["metric-entries-detail", selectedMetricId, dateRange],
    queryFn: async () => {
      if (!selectedMetricId) return [];
      const { data, error } = await supabase
        .from("metric_entries")
        .select("*")
        .eq("client_metric_id", selectedMetricId)
        .gte("recorded_at", getRangeStart().toISOString())
        .order("recorded_at", { ascending: true });
      if (error) throw error;
      return data as MetricEntry[];
    },
    enabled: !!selectedMetricId,
  });

  // Add single result
  const addResultMutation = useMutation({
    mutationFn: async ({ clientMetricId, value, date }: { clientMetricId: string; value: number; date: string }) => {
      const { error } = await supabase.from("metric_entries").insert({
        client_metric_id: clientMetricId,
        client_id: user?.id,
        value,
        recorded_at: new Date(date).toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metric-latest-entries", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["metric-entries-detail", selectedMetricId] });
      toast({ title: "Result added" });
      setAddResultOpen(false);
      setResultValue("");
    },
  });

  // Bulk update
  const updateAllMutation = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const inserts = Object.entries(values)
        .filter(([_, v]) => v.trim())
        .map(([clientMetricId, value]) => ({
          client_metric_id: clientMetricId,
          client_id: user?.id!,
          value: parseFloat(value),
          recorded_at: new Date().toISOString(),
        }));
      if (inserts.length === 0) return;
      const { error } = await supabase.from("metric_entries").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metric-latest-entries", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["metric-entries-detail"] });
      toast({ title: "Metrics updated" });
      setLogOpen(false);
      setBulkValues({});
    },
  });

  const getChange = (cmId: string) => {
    const entry = latestEntries?.[cmId];
    if (!entry || entry.previousValue == null) return null;
    return entry.value - entry.previousValue;
  };

  const TrendIcon = ({ value }: { value: number | null | undefined }) => {
    if (value == null || value === 0) return <Minus className="h-3 w-3 text-muted-foreground" />;
    if (value > 0) return <TrendingUp className="h-3 w-3 text-orange-500" />;
    return <TrendingDown className="h-3 w-3 text-green-500" />;
  };

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-muted-foreground">Loading metrics...</p>
          </div>
        </div>
      </ClientLayout>
    );
  }

  // ---- DETAIL VIEW ----
  if (selectedMetricId && selectedClientMetric && selectedDef) {
    const latest = latestEntries?.[selectedMetricId];
    const starting = selectedClientMetric.starting_value;
    const goal = selectedClientMetric.goal_value;
    const pctChange = starting && latest ? (((latest.value - starting) / starting) * 100) : null;

    const chartData = (selectedEntries || []).map(e => ({
      date: format(new Date(e.recorded_at), "MMM d"),
      value: Number(e.value),
    }));

    return (
      <ClientLayout>
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSelectedMetricId(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-xl font-bold">{selectedDef.name}</h2>
            <Badge variant="outline" className="ml-auto">{selectedDef.unit || "—"}</Badge>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">CURRENT</p>
                <p className="text-xl font-bold">
                  {latest ? `${Number(latest.value).toLocaleString()}` : "—"}
                </p>
                {pctChange != null && (
                  <p className={`text-xs mt-1 ${pctChange < 0 ? "text-green-600" : pctChange > 0 ? "text-orange-600" : "text-muted-foreground"}`}>
                    {pctChange > 0 ? "↑" : "↓"}{Math.abs(pctChange).toFixed(1)}%
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">GOAL</p>
                <p className="text-xl font-bold">
                  {goal != null ? Number(goal).toLocaleString() : "—"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">STARTING</p>
                <p className="text-xl font-bold">
                  {starting != null ? Number(starting).toLocaleString() : "—"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Date range + Add */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {(["3m", "6m", "1y", "2y", "3y"] as const).map(r => (
                <Button key={r} size="sm" variant={dateRange === r ? "default" : "outline"} onClick={() => setDateRange(r)} className="text-xs px-3">
                  {r.toUpperCase()}
                </Button>
              ))}
            </div>
            <Button size="sm" className="gap-1" onClick={() => { setResultValue(""); setResultDate(new Date().toISOString().split("T")[0]); setAddResultOpen(true); }}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>

          {/* Chart */}
          {chartData.length > 0 ? (
            <Card>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(val: number) => [`${val} ${selectedDef.unit}`, selectedDef.name]} />
                    {goal != null && <ReferenceLine y={Number(goal)} stroke="hsl(var(--primary))" strokeDasharray="5 5" label={{ value: "Goal", position: "right", fontSize: 11 }} />}
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No data in this range</CardContent></Card>
          )}

          {/* Entries list */}
          {selectedEntries && selectedEntries.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[...selectedEntries].reverse().map(entry => (
                    <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <p className="text-sm">{format(new Date(entry.recorded_at), "MMM dd, yyyy")}</p>
                      <p className="text-sm font-semibold">{Number(entry.value).toLocaleString()} {selectedDef.unit}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Add single result dialog */}
        <Dialog open={addResultOpen} onOpenChange={setAddResultOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add {selectedDef.name} Result</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Value ({selectedDef.unit})</Label>
                <Input type="number" step="0.1" value={resultValue} onChange={e => setResultValue(e.target.value)} placeholder="Enter value" />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={resultDate} onChange={e => setResultDate(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddResultOpen(false)}>Cancel</Button>
              <Button disabled={!resultValue || addResultMutation.isPending} onClick={() => addResultMutation.mutate({ clientMetricId: selectedMetricId, value: parseFloat(resultValue), date: resultDate })}>
                {addResultMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </ClientLayout>
    );
  }

  // ---- OVERVIEW ----
  const pinnedMetrics = clientMetrics?.filter(cm => cm.is_pinned) || [];
  const unpinnedMetrics = clientMetrics?.filter(cm => !cm.is_pinned) || [];
  const hasMetrics = clientMetrics && clientMetrics.length > 0;

  return (
    <ClientLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Progress</h1>
            <p className="text-muted-foreground mt-1">Track your progress</p>
          </div>
          {hasMetrics && (
            <Button className="gap-2" onClick={() => { setBulkValues({}); setLogOpen(true); }}>
              <Plus className="h-4 w-4" />
              Update All
            </Button>
          )}
        </div>

        {hasMetrics ? (
          <>
            {/* Pinned metrics */}
            {pinnedMetrics.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                {pinnedMetrics.map(cm => {
                  const entry = latestEntries?.[cm.id];
                  const change = getChange(cm.id);
                  return (
                    <Card key={cm.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedMetricId(cm.id)}>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center justify-between text-base">
                          <span>{cm.metric_definitions.name}</span>
                          {change != null && (
                            <span className="flex items-center gap-1 text-xs">
                              <TrendIcon value={change} />
                              {Math.abs(change).toFixed(1)} {cm.metric_definitions.unit}
                            </span>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold">
                          {entry ? `${Number(entry.value).toLocaleString()} ${cm.metric_definitions.unit}` : "—"}
                        </p>
                        {cm.goal_value != null && (
                          <p className="text-xs text-muted-foreground mt-1">Goal: {Number(cm.goal_value).toLocaleString()} {cm.metric_definitions.unit}</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* All metrics list */}
            <Card>
              <CardHeader>
                <CardTitle>All Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[...pinnedMetrics, ...unpinnedMetrics].map(cm => {
                    const entry = latestEntries?.[cm.id];
                    const change = getChange(cm.id);
                    return (
                      <div
                        key={cm.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedMetricId(cm.id)}
                      >
                        <div className="flex items-center gap-3">
                          <BarChart3 className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium">{cm.metric_definitions.name}</p>
                            <p className="text-xs text-muted-foreground">{cm.metric_definitions.category}</p>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          {change != null && <TrendIcon value={change} />}
                          <p className="font-semibold">
                            {entry ? `${Number(entry.value).toLocaleString()} ${cm.metric_definitions.unit}` : "—"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No metrics enabled yet</h3>
              <p className="text-muted-foreground">
                Your trainer will set up the metrics they'd like you to track.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bulk update sheet */}
      <Sheet open={logOpen} onOpenChange={setLogOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Update All Metrics</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            {clientMetrics?.map(cm => (
              <div key={cm.id} className="space-y-1">
                <Label className="text-sm">{cm.metric_definitions.name} ({cm.metric_definitions.unit})</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder={latestEntries?.[cm.id] ? `Last: ${latestEntries[cm.id].value}` : "Enter value"}
                  value={bulkValues[cm.id] || ""}
                  onChange={e => setBulkValues(prev => ({ ...prev, [cm.id]: e.target.value }))}
                />
              </div>
            ))}
            <Button
              className="w-full"
              disabled={updateAllMutation.isPending || !Object.values(bulkValues).some(v => v.trim())}
              onClick={() => updateAllMutation.mutate(bulkValues)}
            >
              {updateAllMutation.isPending ? "Saving..." : "Save All"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </ClientLayout>
  );
}
