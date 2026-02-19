import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, TrendingDown, TrendingUp, Minus, Settings2, Target, Pin, PinOff, Pencil, Trash2, ArrowLeft, BarChart3 } from "lucide-react";
import { format, subDays, subMonths } from "date-fns";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface Props {
  clientId: string;
  trainerId: string;
}

interface MetricDefinition {
  id: string;
  name: string;
  unit: string;
  category: string;
  is_default: boolean;
}

interface ClientMetric {
  id: string;
  client_id: string;
  trainer_id: string;
  metric_definition_id: string;
  is_pinned: boolean;
  goal_value: number | null;
  starting_value: number | null;
  order_index: number;
  metric_definitions: MetricDefinition;
}

interface MetricEntry {
  id: string;
  client_metric_id: string;
  client_id: string;
  value: number;
  recorded_at: string;
  notes: string | null;
}

export function ClientMetricsTab({ clientId, trainerId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [manageOpen, setManageOpen] = useState(false);
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null);
  const [addResultOpen, setAddResultOpen] = useState(false);
  const [updateAllOpen, setUpdateAllOpen] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalValue, setGoalValue] = useState("");
  const [resultValue, setResultValue] = useState("");
  const [resultDate, setResultDate] = useState(new Date().toISOString().split("T")[0]);
  const [bulkValues, setBulkValues] = useState<Record<string, string>>({});
  const [addCustomOpen, setAddCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customUnit, setCustomUnit] = useState("");
  const [editEntryId, setEditEntryId] = useState<string | null>(null);
  const [editEntryValue, setEditEntryValue] = useState("");
  const [dateRange, setDateRange] = useState<"4w" | "3m" | "6m" | "1y">("4w");

  // Fetch all available metric definitions
  const { data: allDefinitions } = useQuery({
    queryKey: ["metric-definitions", trainerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metric_definitions")
        .select("*")
        .or(`is_default.eq.true,trainer_id.eq.${trainerId}`)
        .order("category", { ascending: true });
      if (error) throw error;
      return data as MetricDefinition[];
    },
  });

  // Fetch client's enabled metrics with definitions
  const { data: clientMetrics } = useQuery({
    queryKey: ["client-metrics", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_metrics")
        .select("*, metric_definitions(*)")
        .eq("client_id", clientId)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as ClientMetric[];
    },
  });

  // Fetch latest entry for each client metric
  const { data: latestEntries } = useQuery({
    queryKey: ["metric-latest-entries", clientId],
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

  // Fetch entries for selected metric detail
  const getRangeStart = () => {
    const now = new Date();
    switch (dateRange) {
      case "4w": return subDays(now, 28);
      case "3m": return subMonths(now, 3);
      case "6m": return subMonths(now, 6);
      case "1y": return subMonths(now, 12);
    }
  };

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

  // Toggle metric for client
  const toggleMetricMutation = useMutation({
    mutationFn: async ({ defId, enabled }: { defId: string; enabled: boolean }) => {
      if (enabled) {
        const { error } = await supabase.from("client_metrics").insert({
          client_id: clientId,
          trainer_id: trainerId,
          metric_definition_id: defId,
          order_index: (clientMetrics?.length || 0),
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("client_metrics")
          .delete()
          .eq("client_id", clientId)
          .eq("metric_definition_id", defId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-metrics", clientId] });
      queryClient.invalidateQueries({ queryKey: ["metric-latest-entries", clientId] });
    },
  });

  // Toggle pin
  const togglePinMutation = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const { error } = await supabase
        .from("client_metrics")
        .update({ is_pinned: pinned })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["client-metrics", clientId] }),
  });

  // Add result
  const addResultMutation = useMutation({
    mutationFn: async ({ clientMetricId, value, date }: { clientMetricId: string; value: number; date: string }) => {
      const { error } = await supabase.from("metric_entries").insert({
        client_metric_id: clientMetricId,
        client_id: clientId,
        value,
        recorded_at: new Date(date).toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metric-latest-entries", clientId] });
      queryClient.invalidateQueries({ queryKey: ["metric-entries-detail", selectedMetricId] });
      toast({ title: "Result added" });
      setAddResultOpen(false);
      setResultValue("");
    },
  });

  // Update all metrics
  const updateAllMutation = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const inserts = Object.entries(values)
        .filter(([_, v]) => v.trim())
        .map(([clientMetricId, value]) => ({
          client_metric_id: clientMetricId,
          client_id: clientId,
          value: parseFloat(value),
          recorded_at: new Date().toISOString(),
        }));
      if (inserts.length === 0) return;
      const { error } = await supabase.from("metric_entries").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metric-latest-entries", clientId] });
      queryClient.invalidateQueries({ queryKey: ["metric-entries-detail"] });
      toast({ title: `Updated metrics` });
      setUpdateAllOpen(false);
      setBulkValues({});
    },
  });

  // Set goal
  const setGoalMutation = useMutation({
    mutationFn: async ({ id, goal }: { id: string; goal: number | null }) => {
      const { error } = await supabase
        .from("client_metrics")
        .update({ goal_value: goal })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-metrics", clientId] });
      toast({ title: "Goal updated" });
      setGoalDialogOpen(false);
    },
  });

  // Create custom metric
  const createCustomMutation = useMutation({
    mutationFn: async () => {
      const { data: def, error: defError } = await supabase
        .from("metric_definitions")
        .insert({ name: customName, unit: customUnit, category: "custom", trainer_id: trainerId })
        .select()
        .single();
      if (defError) throw defError;
      const { error } = await supabase.from("client_metrics").insert({
        client_id: clientId,
        trainer_id: trainerId,
        metric_definition_id: def.id,
        order_index: (clientMetrics?.length || 0),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metric-definitions"] });
      queryClient.invalidateQueries({ queryKey: ["client-metrics", clientId] });
      toast({ title: "Custom metric created" });
      setAddCustomOpen(false);
      setCustomName("");
      setCustomUnit("");
    },
  });

  // Delete entry
  const deleteEntryMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase.from("metric_entries").delete().eq("id", entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metric-entries-detail", selectedMetricId] });
      queryClient.invalidateQueries({ queryKey: ["metric-latest-entries", clientId] });
      toast({ title: "Entry deleted" });
    },
  });

  // Edit entry
  const editEntryMutation = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: number }) => {
      const { error } = await supabase.from("metric_entries").update({ value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metric-entries-detail", selectedMetricId] });
      queryClient.invalidateQueries({ queryKey: ["metric-latest-entries", clientId] });
      toast({ title: "Entry updated" });
      setEditEntryId(null);
    },
  });

  const enabledDefIds = new Set(clientMetrics?.map(cm => cm.metric_definition_id) || []);
  const pinnedCount = clientMetrics?.filter(cm => cm.is_pinned).length || 0;

  const TrendIcon = ({ value }: { value: number | null | undefined }) => {
    if (value == null || value === 0) return <Minus className="h-3 w-3 text-muted-foreground" />;
    if (value > 0) return <TrendingUp className="h-3 w-3 text-orange-500" />;
    return <TrendingDown className="h-3 w-3 text-green-500" />;
  };

  const getChange = (cmId: string) => {
    const entry = latestEntries?.[cmId];
    if (!entry || entry.previousValue == null) return null;
    return entry.value - entry.previousValue;
  };

  // ---- DETAIL VIEW ----
  if (selectedMetricId && selectedClientMetric && selectedDef) {
    const latest = latestEntries?.[selectedMetricId];
    const starting = selectedClientMetric.starting_value;
    const goal = selectedClientMetric.goal_value;
    const pctChange = starting && latest ? (((latest.value - starting) / starting) * 100) : null;

    const chartData = (selectedEntries || []).map(e => ({
      date: format(new Date(e.recorded_at), "MMM d"),
      value: Number(e.value),
      fullDate: format(new Date(e.recorded_at), "MMM d, yyyy"),
    }));

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedMetricId(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-semibold">{selectedDef.name}</h2>
          <Badge variant="outline" className="ml-auto">{selectedDef.unit || "—"}</Badge>
        </div>

        {/* Current / Goal / Starting */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">CURRENT</p>
              <p className="text-xl font-bold">
                {latest ? `${Number(latest.value).toLocaleString()} ${selectedDef.unit}` : "—"}
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
                {goal != null ? `${Number(goal).toLocaleString()} ${selectedDef.unit}` : "—"}
              </p>
              <Button variant="link" size="sm" className="text-xs p-0 h-auto" onClick={() => { setGoalValue(goal?.toString() || ""); setGoalDialogOpen(true); }}>
                {goal != null ? "Edit" : "Set Goal"}
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">STARTING</p>
              <p className="text-xl font-bold">
                {starting != null ? `${Number(starting).toLocaleString()} ${selectedDef.unit}` : "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Date range selector */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {(["4w", "3m", "6m", "1y"] as const).map(r => (
              <Button key={r} size="sm" variant={dateRange === r ? "default" : "outline"} onClick={() => setDateRange(r)} className="text-xs px-3">
                {r === "4w" ? "4 Weeks" : r === "3m" ? "3 Months" : r === "6m" ? "6 Months" : "1 Year"}
              </Button>
            ))}
          </div>
          <Button size="sm" className="gap-1" onClick={() => { setResultValue(""); setResultDate(new Date().toISOString().split("T")[0]); setAddResultOpen(true); }}>
            <Plus className="h-4 w-4" /> Add Result
          </Button>
        </div>

        {/* Chart */}
        {chartData.length > 0 ? (
          <Card>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
                  <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                    formatter={(val: number) => [`${val} ${selectedDef.unit}`, selectedDef.name]}
                    labelFormatter={(label) => label}
                  />
                  {goal != null && <ReferenceLine y={Number(goal)} stroke="hsl(var(--primary))" strokeDasharray="5 5" label={{ value: "Goal", position: "right", fontSize: 11 }} />}
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No data in this range</CardContent></Card>
        )}

        {/* All Entries */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">All Entries</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedEntries && selectedEntries.length > 0 ? (
              <div className="space-y-2">
                {[...selectedEntries].reverse().map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{format(new Date(entry.recorded_at), "MMM dd, yyyy h:mm a")}</p>
                      {entry.notes && <p className="text-xs text-muted-foreground">{entry.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {editEntryId === entry.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="0.1"
                            value={editEntryValue}
                            onChange={e => setEditEntryValue(e.target.value)}
                            className="w-24 h-8 text-sm"
                          />
                          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => {
                            if (editEntryValue) editEntryMutation.mutate({ id: entry.id, value: parseFloat(editEntryValue) });
                          }}>Save</Button>
                          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditEntryId(null)}>✕</Button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm font-semibold">{Number(entry.value).toLocaleString()} {selectedDef.unit}</span>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditEntryId(entry.id); setEditEntryValue(entry.value.toString()); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteEntryMutation.mutate(entry.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No entries yet</p>
            )}
          </CardContent>
        </Card>

        {/* Add Result Dialog */}
        <Dialog open={addResultOpen} onOpenChange={setAddResultOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Result — {selectedDef.name}</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Value ({selectedDef.unit || "—"})</Label>
                <Input type="number" step="0.1" value={resultValue} onChange={e => setResultValue(e.target.value)} placeholder="Enter value" />
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={resultDate} onChange={e => setResultDate(e.target.value)} />
              </div>
              <Button
                className="w-full"
                disabled={!resultValue || addResultMutation.isPending}
                onClick={() => addResultMutation.mutate({ clientMetricId: selectedMetricId, value: parseFloat(resultValue), date: resultDate })}
              >
                Save Result
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Goal Dialog */}
        <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Set Goal — {selectedDef.name}</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Goal Value ({selectedDef.unit || "—"})</Label>
                <Input type="number" step="0.1" value={goalValue} onChange={e => setGoalValue(e.target.value)} placeholder="Target value" />
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  disabled={!goalValue || setGoalMutation.isPending}
                  onClick={() => setGoalMutation.mutate({ id: selectedMetricId, goal: parseFloat(goalValue) })}
                >
                  Save Goal
                </Button>
                {selectedClientMetric.goal_value != null && (
                  <Button variant="outline" onClick={() => setGoalMutation.mutate({ id: selectedMetricId, goal: null })}>
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ---- LIST VIEW ----
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Body Metrics</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1" onClick={() => { setBulkValues({}); setUpdateAllOpen(true); }}>
            <Pencil className="h-4 w-4" /> Update All
          </Button>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setManageOpen(true)}>
            <Settings2 className="h-4 w-4" /> Manage Metrics
          </Button>
        </div>
      </div>

      {/* Pinned metrics summary cards */}
      {clientMetrics && clientMetrics.filter(cm => cm.is_pinned).length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {clientMetrics.filter(cm => cm.is_pinned).map(cm => {
            const entry = latestEntries?.[cm.id];
            const change = getChange(cm.id);
            return (
              <Card key={cm.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedMetricId(cm.id)}>
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground">{cm.metric_definitions.name}</p>
                  {entry ? (
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-lg font-bold">{Number(entry.value).toLocaleString()}</p>
                      <span className="text-xs text-muted-foreground">{cm.metric_definitions.unit}</span>
                      {change != null && (
                        <div className="flex items-center gap-0.5 ml-auto">
                          <TrendIcon value={change} />
                          <span className="text-xs text-muted-foreground">{Math.abs(change).toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic mt-1">—</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* All Metrics list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Metrics ({clientMetrics?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {clientMetrics && clientMetrics.length > 0 ? (
            <div className="divide-y divide-border">
              {clientMetrics.map(cm => {
                const entry = latestEntries?.[cm.id];
                const change = getChange(cm.id);
                return (
                  <div key={cm.id} className="flex items-center justify-between py-3 cursor-pointer hover:bg-muted/30 px-2 -mx-2 rounded-md transition-colors" onClick={() => setSelectedMetricId(cm.id)}>
                    <div className="flex items-center gap-3">
                      {cm.is_pinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
                      <div>
                        <p className="text-sm font-medium">{cm.metric_definitions.name}</p>
                        {cm.goal_value != null && <p className="text-[10px] text-muted-foreground">Goal: {Number(cm.goal_value).toLocaleString()} {cm.metric_definitions.unit}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {entry ? (
                        <>
                          <div className="text-right">
                            <p className="text-sm font-semibold">{Number(entry.value).toLocaleString()} {cm.metric_definitions.unit}</p>
                            <p className="text-[10px] text-muted-foreground">{format(new Date(entry.recorded_at), "MMM d")}</p>
                          </div>
                          {change != null && <TrendIcon value={change} />}
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No metrics set up yet</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => setManageOpen(true)}>
                Manage Metrics
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manage Metrics Sheet */}
      <Sheet open={manageOpen} onOpenChange={setManageOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Setup Metrics</SheetTitle>
          </SheetHeader>
          <p className="text-sm text-muted-foreground mt-2 mb-4">Select metrics to track. Pin any to the overview.</p>

          {(["body", "measurement", "performance", "custom"] as const).map(category => {
            const defs = allDefinitions?.filter(d => d.category === category) || [];
            if (defs.length === 0 && category !== "custom") return null;
            return (
              <div key={category} className="mb-6">
                <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2 tracking-wider">
                  {category === "body" ? "Body Composition" : category === "measurement" ? "Measurements" : category === "performance" ? "Performance" : "Custom"}
                </h3>
                <div className="space-y-2">
                  {defs.map(d => {
                    const enabled = enabledDefIds.has(d.id);
                    const cm = clientMetrics?.find(cm => cm.metric_definition_id === d.id);
                    return (
                      <div key={d.id} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={enabled}
                            onCheckedChange={(checked) => toggleMetricMutation.mutate({ defId: d.id, enabled: !!checked })}
                          />
                          <div>
                            <span className="text-sm">{d.name}</span>
                            {d.unit && <span className="text-xs text-muted-foreground ml-1">({d.unit})</span>}
                          </div>
                        </div>
                        {enabled && cm && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            disabled={false}
                            onClick={(e) => { e.stopPropagation(); togglePinMutation.mutate({ id: cm.id, pinned: !cm.is_pinned }); }}
                          >
                            {cm.is_pinned ? <Pin className="h-3.5 w-3.5 text-primary" /> : <PinOff className="h-3.5 w-3.5 text-muted-foreground" />}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <Button variant="outline" className="w-full gap-1 mt-2" onClick={() => setAddCustomOpen(true)}>
            <Plus className="h-4 w-4" /> Add Custom Metric
          </Button>
        </SheetContent>
      </Sheet>

      {/* Add Custom Metric Dialog */}
      <Dialog open={addCustomOpen} onOpenChange={setAddCustomOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Custom Metric</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Metric Name</Label>
              <Input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="e.g., Bicep Curl 1RM" />
            </div>
            <div>
              <Label>Unit</Label>
              <Input value={customUnit} onChange={e => setCustomUnit(e.target.value)} placeholder="e.g., lbs, cm, reps" />
            </div>
            <Button className="w-full" disabled={!customName || createCustomMutation.isPending} onClick={() => createCustomMutation.mutate()}>
              Create Metric
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Update All Sheet */}
      <Sheet open={updateAllOpen} onOpenChange={setUpdateAllOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader><SheetTitle>Update All Metrics</SheetTitle></SheetHeader>
          <p className="text-sm text-muted-foreground mt-2 mb-4">Enter values for the metrics you want to update.</p>
          <div className="space-y-4">
            {clientMetrics?.map(cm => (
              <div key={cm.id}>
                <Label className="text-xs">{cm.metric_definitions.name} ({cm.metric_definitions.unit || "—"})</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={bulkValues[cm.id] || ""}
                  onChange={e => setBulkValues(prev => ({ ...prev, [cm.id]: e.target.value }))}
                  placeholder={latestEntries?.[cm.id] ? `Last: ${latestEntries[cm.id].value}` : "Enter value"}
                />
              </div>
            ))}
            <Button
              className="w-full"
              disabled={Object.values(bulkValues).every(v => !v.trim()) || updateAllMutation.isPending}
              onClick={() => updateAllMutation.mutate(bulkValues)}
            >
              Save All
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
