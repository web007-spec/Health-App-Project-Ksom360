import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, UtensilsCrossed } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { format, subDays, addDays, parseISO } from "date-fns";
import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export default function ClientNutrition() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [viewDate, setViewDate] = useState(new Date());
  const dateStr = format(viewDate, "yyyy-MM-dd");
  const isToday = dateStr === format(new Date(), "yyyy-MM-dd");

  // Fetch nutrition logs for the selected date
  const { data: dayLogs } = useQuery({
    queryKey: ["nutrition-logs-day", user?.id, dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nutrition_logs")
        .select("*")
        .eq("client_id", user?.id)
        .eq("log_date", dateStr)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch macro targets
  const { data: macroTargets } = useQuery({
    queryKey: ["client-macro-targets", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_macro_targets")
        .select("*")
        .eq("client_id", user?.id!)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const totals = {
    calories: dayLogs?.reduce((s, l) => s + (l.calories || 0), 0) || 0,
    protein: dayLogs?.reduce((s, l) => s + (Number(l.protein) || 0), 0) || 0,
    carbs: dayLogs?.reduce((s, l) => s + (Number(l.carbs) || 0), 0) || 0,
    fats: dayLogs?.reduce((s, l) => s + (Number(l.fats) || 0), 0) || 0,
  };

  const goals = {
    calories: macroTargets?.target_calories || 2000,
    protein: Number(macroTargets?.target_protein) || 150,
    carbs: Number(macroTargets?.target_carbs) || 200,
    fats: Number(macroTargets?.target_fats) || 65,
  };

  const pctOfGoal = goals.calories > 0 ? Math.round((totals.calories / goals.calories) * 100) : 0;

  // Macro distribution (actual % of total calories)
  const totalMacroCals = totals.protein * 4 + totals.carbs * 4 + totals.fats * 9;
  const goalMacroCals = goals.protein * 4 + goals.carbs * 4 + goals.fats * 9;
  const actualDist = {
    protein: totalMacroCals > 0 ? Math.round((totals.protein * 4 / totalMacroCals) * 100) : 0,
    carbs: totalMacroCals > 0 ? Math.round((totals.carbs * 4 / totalMacroCals) * 100) : 0,
    fats: totalMacroCals > 0 ? Math.round((totals.fats * 9 / totalMacroCals) * 100) : 0,
  };
  const goalDist = {
    protein: goalMacroCals > 0 ? Math.round((goals.protein * 4 / goalMacroCals) * 100) : 0,
    carbs: goalMacroCals > 0 ? Math.round((goals.carbs * 4 / goalMacroCals) * 100) : 0,
    fats: goalMacroCals > 0 ? Math.round((goals.fats * 9 / goalMacroCals) * 100) : 0,
  };

  const macroColors = { protein: "#6366f1", carbs: "#22c55e", fats: "#eab308" };

  const donutData = [
    { value: Math.min(totals.protein * 4, goals.protein * 4), color: macroColors.protein },
    { value: Math.min(totals.carbs * 4, goals.carbs * 4), color: macroColors.carbs },
    { value: Math.min(totals.fats * 9, goals.fats * 9), color: macroColors.fats },
    { value: Math.max(goals.calories - totals.calories, 0), color: "hsl(var(--muted))" },
  ];

  return (
    <ClientLayout>
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Nutrition</h1>
          </div>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => navigate("/client/log-meal")}>
            <Plus className="h-3.5 w-3.5" /> Log meal
          </Button>
        </div>

        <Tabs defaultValue="summary" className="flex-1">
          <TabsList className="mx-4 mt-3 grid grid-cols-2 w-auto">
            <TabsTrigger value="summary">📊 Summary</TabsTrigger>
            <TabsTrigger value="journal">🍴 Journal</TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="px-4 mt-3 space-y-6 pb-8">
            {/* Date nav */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => setViewDate(subDays(viewDate, 1))}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="text-center">
                <p className="font-semibold">Daily View</p>
                <p className="text-xs text-muted-foreground">{isToday ? "Today" : format(viewDate, "MMM d, yyyy")}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setViewDate(addDays(viewDate, 1))} disabled={isToday}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            {/* Donut chart */}
            <div className="flex justify-center">
              <div className="relative w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      startAngle={90}
                      endAngle={-270}
                      paddingAngle={2}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {donutData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold">{pctOfGoal}%</span>
                  <span className="text-xs text-muted-foreground">of daily goals</span>
                </div>
              </div>
            </div>

            {/* Consumed summary */}
            <div className="text-center">
              <p className="font-semibold">You have consumed</p>
              <p className="text-lg">
                <span className="font-bold text-primary">{totals.calories} Cal</span>
                <span className="text-muted-foreground"> / {goals.calories.toLocaleString()} Cal</span>
              </p>
            </div>

            {/* Macro table */}
            <Card>
              <CardContent className="p-0">
                <div className="grid grid-cols-4 gap-0 text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-2 border-b">
                  <span>Macro</span>
                  <span className="text-center">Consumed</span>
                  <span className="text-center font-bold">Remaining</span>
                  <span className="text-right">Goal</span>
                </div>
                {[
                  { name: "Protein", consumed: totals.protein, goal: goals.protein, color: macroColors.protein },
                  { name: "Carbs", consumed: totals.carbs, goal: goals.carbs, color: macroColors.carbs },
                  { name: "Fat", consumed: totals.fats, goal: goals.fats, color: macroColors.fats },
                ].map((m) => (
                  <div key={m.name} className="grid grid-cols-4 gap-0 px-4 py-3 border-b last:border-b-0 items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                      <span className="text-sm font-medium">{m.name}</span>
                    </div>
                    <span className="text-sm text-center">{Math.round(m.consumed)} g</span>
                    <span className="text-sm text-center font-bold">{Math.max(Math.round(m.goal - m.consumed), 0)} g</span>
                    <span className="text-sm text-right text-muted-foreground">{Math.round(m.goal)} g</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Macro distribution */}
            <div>
              <h3 className="font-bold mb-3">Macro distribution</h3>
              <Card>
                <CardContent className="p-0">
                  <div className="grid grid-cols-3 gap-0 text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-2 border-b">
                    <span>Macro</span>
                    <span className="text-center">Actual</span>
                    <span className="text-right">Goal</span>
                  </div>
                  {[
                    { name: "Protein", actual: actualDist.protein, goal: goalDist.protein, color: macroColors.protein },
                    { name: "Carbs", actual: actualDist.carbs, goal: goalDist.carbs, color: macroColors.carbs },
                    { name: "Fat", actual: actualDist.fats, goal: goalDist.fats, color: macroColors.fats },
                  ].map((m) => (
                    <div key={m.name} className="grid grid-cols-3 gap-0 px-4 py-3 border-b last:border-b-0 items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                        <span className="text-sm font-medium">{m.name}</span>
                      </div>
                      <span className="text-sm text-center font-bold">{m.actual}%</span>
                      <span className="text-sm text-right text-muted-foreground">{m.goal}%</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Journal Tab */}
          <TabsContent value="journal" className="px-4 mt-3 space-y-4 pb-8">
            {/* Date nav */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => setViewDate(subDays(viewDate, 1))}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="text-center">
                <p className="font-semibold">Daily View</p>
                <p className="text-xs text-muted-foreground">{isToday ? "Today" : format(viewDate, "MMM d, yyyy")}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setViewDate(addDays(viewDate, 1))} disabled={isToday}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            <h3 className="font-bold flex items-center gap-2">
              Your meals <span className="text-sm text-muted-foreground font-normal">🍴 {dayLogs?.length || 0}</span>
            </h3>

            {dayLogs && dayLogs.length > 0 ? (
              <div className="space-y-3">
                {dayLogs.map((log) => (
                  <div key={log.id}>
                    <p className="text-xs text-muted-foreground mb-1">{format(parseISO(log.created_at), "h:mm a")}</p>
                    <Card>
                      <CardContent className="p-3">
                        <p className="font-semibold text-sm">{log.meal_name}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          <span>🔥 {log.calories || 0} Cal</span>
                          {log.protein && <><span className="text-muted-foreground">|</span><span><span className="font-bold" style={{ color: "#6366f1" }}>P</span> {log.protein} g</span></>}
                          {log.carbs && <><span><span className="font-bold" style={{ color: "#22c55e" }}>C</span> {log.carbs} g</span></>}
                          {log.fats && <><span><span className="font-bold" style={{ color: "#eab308" }}>F</span> {log.fats} g</span></>}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <UtensilsCrossed className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No meals logged for this day</p>
                  <Button className="mt-3" size="sm" onClick={() => navigate("/client/log-meal")}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Log Meal
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ClientLayout>
  );
}
