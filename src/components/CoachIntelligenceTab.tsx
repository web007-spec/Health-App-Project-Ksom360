import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Minus,
  Search,
  ChevronRight,
  CheckCircle2,
  Clock,
  Shield,
  Users,
  Loader2,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { ImpactTrendsSection } from "@/components/command-center/ImpactTrendsSection";

interface CoachIntelligenceTabProps {
  trainerId: string;
}

export function CoachIntelligenceTab({ trainerId }: CoachIntelligenceTabProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [engineFilter, setEngineFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Fetch all clients with their feature settings and latest recommendation
  const { data: clientsData, isLoading } = useQuery({
    queryKey: ["coach-intelligence", trainerId],
    queryFn: async () => {
      // Get all trainer clients
      const { data: clients, error: clientsErr } = await supabase
        .from("trainer_clients")
        .select(`
          client_id,
          status,
          client:profiles!trainer_clients_client_id_fkey(id, full_name, email, avatar_url)
        `)
        .eq("trainer_id", trainerId)
        .eq("status", "active");

      if (clientsErr) throw clientsErr;
      if (!clients || clients.length === 0) return [];

      const clientIds = clients.map((c) => c.client_id);

      // Get feature settings for all clients
      const { data: settings } = await supabase
        .from("client_feature_settings")
        .select("client_id, engine_mode, current_level")
        .in("client_id", clientIds);

      // Get latest recommendation events (last 14 days)
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data: events } = await supabase
        .from("recommendation_events")
        .select("client_id, score_total, status, lowest_factor, plan_suggestion_type, plan_suggestion_text, created_at, dismissed, coach_approved")
        .in("client_id", clientIds)
        .gte("created_at", fourteenDaysAgo)
        .order("created_at", { ascending: false });

      // Get weekly summaries
      const { data: summaries } = await supabase
        .from("client_weekly_summaries")
        .select("*")
        .in("client_id", clientIds);

      const settingsMap = new Map((settings || []).map((s) => [s.client_id, s]));
      const summaryMap = new Map((summaries || []).map((s) => [s.client_id, s]));

      // Group events by client
      const eventsMap = new Map<string, typeof events>();
      (events || []).forEach((e) => {
        if (!eventsMap.has(e.client_id)) eventsMap.set(e.client_id, []);
        eventsMap.get(e.client_id)!.push(e);
      });

      return clients.map((c) => {
        const clientEvents = eventsMap.get(c.client_id) || [];
        const latestEvent = clientEvents[0];
        const setting = settingsMap.get(c.client_id);
        const summary = summaryMap.get(c.client_id);

        // Compute 7-day metrics
        const sevenDayEvents = clientEvents.filter(
          (e) => new Date(e.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        );
        const avgScore = sevenDayEvents.length > 0
          ? Math.round(sevenDayEvents.reduce((s, e) => s + (e.score_total || 0), 0) / sevenDayEvents.length)
          : summary?.avg_score_7d ? Number(summary.avg_score_7d) : null;

        const needsSupportDays = clientEvents.filter(
          (e) => (e.status || "").toLowerCase().includes("needs")
        ).length;

        // Completion from summary or default
        const completion7d = summary?.completion_7d ? Number(summary.completion_7d) : null;

        // Trend
        let trend: "up" | "down" | "flat" = "flat";
        if (summary?.trend_direction) {
          trend = summary.trend_direction as any;
        } else if (sevenDayEvents.length >= 3) {
          const firstHalf = sevenDayEvents.slice(Math.floor(sevenDayEvents.length / 2));
          const secondHalf = sevenDayEvents.slice(0, Math.floor(sevenDayEvents.length / 2));
          const avgFirst = firstHalf.reduce((s, e) => s + (e.score_total || 0), 0) / firstHalf.length;
          const avgSecond = secondHalf.reduce((s, e) => s + (e.score_total || 0), 0) / secondHalf.length;
          if (avgSecond - avgFirst > 5) trend = "up";
          else if (avgFirst - avgSecond > 5) trend = "down";
        }

        // Pending suggestion
        const pendingSuggestion = clientEvents.find(
          (e) => e.plan_suggestion_type && !e.dismissed && !e.coach_approved
        );

        // Level up eligibility (simplified check)
        const currentLevel = setting?.current_level || 1;
        const levelUpEligible = summary?.level_up_eligible || (avgScore && avgScore >= 80 && currentLevel < 7);

        return {
          clientId: c.client_id,
          name: c.client?.full_name || c.client?.email || "Client",
          avatarUrl: c.client?.avatar_url,
          engineMode: (setting?.engine_mode as string) || "performance",
          currentLevel: currentLevel,
          avgScore,
          scoreStatus: latestEvent?.status || summary?.score_status || "moderate",
          lowestFactor: latestEvent?.lowest_factor || summary?.lowest_factor_mode,
          completion7d,
          trend,
          needsSupportDays14d: needsSupportDays,
          pendingSuggestion,
          levelUpEligible,
        };
      });
    },
    enabled: !!trainerId,
  });

  // Filter clients
  const filteredClients = useMemo(() => {
    if (!clientsData) return [];
    return clientsData.filter((c) => {
      if (engineFilter !== "all" && c.engineMode !== engineFilter) return false;
      if (statusFilter !== "all") {
        const status = (c.scoreStatus || "").toLowerCase();
        if (statusFilter === "strong" && !status.includes("strong")) return false;
        if (statusFilter === "moderate" && !status.includes("moderate")) return false;
        if (statusFilter === "needs_support" && !status.includes("needs")) return false;
      }
      if (levelFilter !== "all") {
        const lvl = c.currentLevel;
        if (levelFilter === "1-3" && (lvl < 1 || lvl > 3)) return false;
        if (levelFilter === "4-6" && (lvl < 4 || lvl > 6)) return false;
        if (levelFilter === "7" && lvl !== 7) return false;
      }
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [clientsData, engineFilter, statusFilter, levelFilter, search]);

  // Priority queue: needs attention
  const priorityClients = useMemo(() => {
    if (!filteredClients) return [];
    return filteredClients
      .filter(
        (c) =>
          (c.scoreStatus || "").toLowerCase().includes("needs") ||
          c.needsSupportDays14d >= 3 ||
          (c.trend === "down" && (c.completion7d ?? 100) < 70)
      )
      .sort((a, b) => (a.avgScore ?? 100) - (b.avgScore ?? 100));
  }, [filteredClients]);

  // Pending review
  const pendingReviewClients = useMemo(() => {
    return (filteredClients || []).filter((c) => c.pendingSuggestion);
  }, [filteredClients]);

  // Level up ready
  const levelUpClients = useMemo(() => {
    return (filteredClients || []).filter((c) => c.levelUpEligible);
  }, [filteredClients]);

  // Engine distribution
  const engineDistribution = useMemo(() => {
    if (!clientsData) return [];
    const counts: Record<string, number> = { metabolic: 0, performance: 0, athletic: 0 };
    clientsData.forEach((c) => {
      if (counts[c.engineMode] !== undefined) counts[c.engineMode]++;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [clientsData]);

  // Weekly outcomes per engine
  const weeklyOutcomes = useMemo(() => {
    if (!clientsData) return [];
    const engines = ["metabolic", "performance", "athletic"];
    return engines.map((engine) => {
      const engineClients = clientsData.filter((c) => c.engineMode === engine);
      const withScores = engineClients.filter((c) => c.avgScore !== null);
      const avgScore = withScores.length > 0
        ? Math.round(withScores.reduce((s, c) => s + (c.avgScore || 0), 0) / withScores.length)
        : null;
      const withCompletion = engineClients.filter((c) => c.completion7d !== null);
      const avgCompletion = withCompletion.length > 0
        ? Math.round(withCompletion.reduce((s, c) => s + (c.completion7d || 0), 0) / withCompletion.length)
        : null;
      const trendingUp = engineClients.filter((c) => c.trend === "up").length;
      const trendingDown = engineClients.filter((c) => c.trend === "down").length;

      return { engine, count: engineClients.length, avgScore, avgCompletion, trendingUp, trendingDown };
    });
  }, [clientsData]);

  const ENGINE_COLORS: Record<string, string> = {
    metabolic: "hsl(var(--primary))",
    performance: "hsl(var(--accent))",
    athletic: "hsl(var(--success, 142 76% 36%))",
  };

  const statusBadgeClass = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s.includes("strong")) return "bg-green-500/10 text-green-700 dark:text-green-400";
    if (s.includes("needs")) return "bg-red-500/10 text-red-700 dark:text-red-400";
    return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
  };

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === "up") return <ArrowUp className="h-3.5 w-3.5 text-green-600" />;
    if (trend === "down") return <ArrowDown className="h-3.5 w-3.5 text-red-600" />;
    return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const ClientRow = ({ client }: { client: (typeof filteredClients)[0] }) => (
    <div
      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={() => navigate(`/clients/${client.clientId}`)}
    >
      <Avatar className="h-9 w-9">
        <AvatarImage src={client.avatarUrl || undefined} />
        <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
          {client.name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{client.name}</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize shrink-0">
            {client.engineMode}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          <span>L{client.currentLevel}</span>
          <span>{client.avgScore !== null ? `${client.avgScore}/100` : "—"}</span>
          {client.lowestFactor && <span className="capitalize">{client.lowestFactor}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="secondary" className={`text-[10px] ${statusBadgeClass(client.scoreStatus)}`}>
          {client.scoreStatus}
        </Badge>
        <TrendIcon trend={client.trend} />
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={engineFilter} onValueChange={setEngineFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Engine" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Engines</SelectItem>
            <SelectItem value="metabolic">Metabolic</SelectItem>
            <SelectItem value="performance">Performance</SelectItem>
            <SelectItem value="athletic">Athletic</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="strong">Strong</SelectItem>
            <SelectItem value="moderate">Moderate</SelectItem>
            <SelectItem value="needs_support">Needs Support</SelectItem>
          </SelectContent>
        </Select>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="1-3">Level 1–3</SelectItem>
            <SelectItem value="4-6">Level 4–6</SelectItem>
            <SelectItem value="7">Level 7</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* A) Priority Queue */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Priority Queue
            {priorityClients.length > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                {priorityClients.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>Clients requiring immediate attention</CardDescription>
        </CardHeader>
        <CardContent>
          {priorityClients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No clients require immediate attention.
            </p>
          ) : (
            <div className="space-y-2">
              {priorityClients.map((c) => (
                <ClientRow key={c.clientId} client={c} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* B) Pending Coach Review */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            Pending Coach Review
            {pendingReviewClients.length > 0 && (
              <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px]">
                {pendingReviewClients.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>Plan suggestions awaiting your approval</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingReviewClients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No pending reviews.
            </p>
          ) : (
            <div className="space-y-2">
              {pendingReviewClients.map((c) => (
                <div
                  key={c.clientId}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/clients/${c.clientId}`)}
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={c.avatarUrl || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                      {c.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{c.name}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {c.pendingSuggestion?.plan_suggestion_type}
                      </Badge>
                      {c.pendingSuggestion?.plan_suggestion_text && (
                        <span className="text-xs text-muted-foreground truncate">
                          {c.pendingSuggestion.plan_suggestion_text}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* C) Level-Up Ready */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Level-Up Ready
            {levelUpClients.length > 0 && (
              <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 text-[10px]">
                {levelUpClients.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>Clients eligible for level advancement</CardDescription>
        </CardHeader>
        <CardContent>
          {levelUpClients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No clients ready for level-up.
            </p>
          ) : (
            <div className="space-y-2">
              {levelUpClients.map((c) => (
                <div
                  key={c.clientId}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/clients/${c.clientId}`)}
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={c.avatarUrl || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                      {c.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{c.name}</span>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span>Level {c.currentLevel}</span>
                      <ArrowUp className="h-3 w-3 text-green-600" />
                      <span>Level {c.currentLevel + 1}</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/clients/${c.clientId}`);
                    }}
                  >
                    Review
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* D) Engine Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Engine Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie
                    data={engineDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={55}
                    dataKey="value"
                    strokeWidth={2}
                  >
                    {engineDistribution.map((entry) => (
                      <Cell key={entry.name} fill={ENGINE_COLORS[entry.name] || "hsl(var(--muted))"} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {engineDistribution.map((e) => (
                  <div key={e.name} className="flex items-center gap-2 text-sm">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: ENGINE_COLORS[e.name] }}
                    />
                    <span className="capitalize">{e.name}</span>
                    <span className="text-muted-foreground">{e.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* E) Weekly Outcomes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Weekly Outcomes (7 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {weeklyOutcomes.map((w) => (
                <div key={w.engine} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{w.engine}</span>
                    <span className="text-xs text-muted-foreground">{w.count} clients</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Avg Score: {w.avgScore !== null ? w.avgScore : "—"}</span>
                    <span>Completion: {w.avgCompletion !== null ? `${w.avgCompletion}%` : "—"}</span>
                    <span className="flex items-center gap-1">
                      <ArrowUp className="h-3 w-3 text-green-600" /> {w.trendingUp}
                    </span>
                    <span className="flex items-center gap-1">
                      <ArrowDown className="h-3 w-3 text-red-600" /> {w.trendingDown}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Impact Trends — Adaptive Calibration Analytics */}
      <ImpactTrendsSection trainerId={trainerId} />

      {/* All Clients Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Clients ({filteredClients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredClients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No clients match your filters.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredClients
                .sort((a, b) => (a.avgScore ?? 100) - (b.avgScore ?? 100))
                .map((c) => (
                  <ClientRow key={c.clientId} client={c} />
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
