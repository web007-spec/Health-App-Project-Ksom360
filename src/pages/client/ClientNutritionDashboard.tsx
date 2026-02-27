import { useState } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TrendingUp, TrendingDown, Target, Calendar, Apple, Activity } from "lucide-react";
import { format, subDays, parseISO, eachDayOfInterval, startOfDay } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ClientNutritionDashboard() {
  const { user } = useAuth();
  const [daysRange, setDaysRange] = useState<number>(7);

  // Fetch active meal plan assignment
  const { data: assignment } = useQuery({
    queryKey: ["client-meal-assignment", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_meal_plan_assignments")
        .select(`
          *,
          meal_plans (
            name,
            target_calories,
            target_protein,
            target_carbs,
            target_fats
          )
        `)
        .eq("client_id", user?.id)
        .order("assigned_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch nutrition logs
  const { data: nutritionLogs } = useQuery({
    queryKey: ["client-nutrition-logs", user?.id, daysRange],
    queryFn: async () => {
      const startDate = format(subDays(new Date(), daysRange), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("nutrition_logs")
        .select("*")
        .eq("client_id", user?.id)
        .gte("log_date", startDate)
        .order("log_date", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Calculate daily data with all days in range
  const getDailyData = () => {
    const startDate = subDays(new Date(), daysRange - 1);
    const endDate = new Date();
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

    const logsByDate = nutritionLogs?.reduce((acc, log) => {
      const date = log.log_date;
      if (!acc[date]) {
        acc[date] = {
          date,
          calories: 0,
          protein: 0,
          carbs: 0,
          fats: 0,
          count: 0,
        };
      }
      acc[date].calories += log.calories || 0;
      acc[date].protein += Number(log.protein) || 0;
      acc[date].carbs += Number(log.carbs) || 0;
      acc[date].fats += Number(log.fats) || 0;
      acc[date].count += 1;
      return acc;
    }, {} as Record<string, any>);

    return dateRange.map((date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const dayData = logsByDate?.[dateStr] || {
        date: dateStr,
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
        count: 0,
      };

      return {
        date: format(date, "MMM dd"),
        fullDate: dateStr,
        calories: Math.round(dayData.calories),
        protein: Math.round(dayData.protein),
        carbs: Math.round(dayData.carbs),
        fats: Math.round(dayData.fats),
        logged: dayData.count > 0,
        targetCalories: assignment?.meal_plans?.target_calories || 0,
        targetProtein: assignment?.meal_plans?.target_protein || 0,
        targetCarbs: assignment?.meal_plans?.target_carbs || 0,
        targetFats: assignment?.meal_plans?.target_fats || 0,
      };
    });
  };

  const dailyData = getDailyData();

  // Calculate averages and compliance
  const calculateStats = () => {
    if (!assignment?.meal_plans) return null;

    const loggedDays = dailyData.filter((d) => d.logged);
    if (loggedDays.length === 0) return null;

    const avgCalories = loggedDays.reduce((sum, d) => sum + d.calories, 0) / loggedDays.length;
    const avgProtein = loggedDays.reduce((sum, d) => sum + d.protein, 0) / loggedDays.length;
    const avgCarbs = loggedDays.reduce((sum, d) => sum + d.carbs, 0) / loggedDays.length;
    const avgFats = loggedDays.reduce((sum, d) => sum + d.fats, 0) / loggedDays.length;

    const targets = assignment.meal_plans;

    const calorieCompliance = targets.target_calories 
      ? Math.min((avgCalories / targets.target_calories) * 100, 100) 
      : 0;
    const proteinCompliance = targets.target_protein 
      ? Math.min((avgProtein / targets.target_protein) * 100, 100) 
      : 0;
    const carbCompliance = targets.target_carbs 
      ? Math.min((avgCarbs / targets.target_carbs) * 100, 100) 
      : 0;
    const fatCompliance = targets.target_fats 
      ? Math.min((avgFats / targets.target_fats) * 100, 100) 
      : 0;

    const overallCompliance = (calorieCompliance + proteinCompliance + carbCompliance + fatCompliance) / 4;

    return {
      avgCalories: Math.round(avgCalories),
      avgProtein: Math.round(avgProtein),
      avgCarbs: Math.round(avgCarbs),
      avgFats: Math.round(avgFats),
      calorieCompliance: Math.round(calorieCompliance),
      proteinCompliance: Math.round(proteinCompliance),
      carbCompliance: Math.round(carbCompliance),
      fatCompliance: Math.round(fatCompliance),
      overallCompliance: Math.round(overallCompliance),
      daysLogged: loggedDays.length,
      totalDays: daysRange,
    };
  };

  const stats = calculateStats();

  // Radar chart data for macro comparison
  const radarData = stats && assignment?.meal_plans ? [
    {
      nutrient: "Calories",
      actual: (stats.avgCalories / assignment.meal_plans.target_calories) * 100,
      target: 100,
    },
    {
      nutrient: "Protein",
      actual: (stats.avgProtein / assignment.meal_plans.target_protein) * 100,
      target: 100,
    },
    {
      nutrient: "Carbs",
      actual: (stats.avgCarbs / assignment.meal_plans.target_carbs) * 100,
      target: 100,
    },
    {
      nutrient: "Fats",
      actual: (stats.avgFats / assignment.meal_plans.target_fats) * 100,
      target: 100,
    },
  ] : [];

  const getComplianceColor = (value: number) => {
    if (value >= 90) return "text-green-600";
    if (value >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getComplianceBadge = (value: number) => {
    if (value >= 90) return { variant: "default" as const, label: "Excellent", color: "bg-green-500" };
    if (value >= 70) return { variant: "secondary" as const, label: "Good", color: "bg-yellow-500" };
    return { variant: "destructive" as const, label: "Needs Work", color: "bg-red-500" };
  };

  return (
    <ClientLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Nutrition Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Track your progress and compare against your targets
            </p>
          </div>

          <Select value={daysRange.toString()} onValueChange={(v) => setDaysRange(Number(v))}>
            <SelectTrigger className="w-[150px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!assignment ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Apple className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Meal Plan Assigned</h3>
              <p className="text-muted-foreground">
                Your trainer hasn't assigned you a meal plan yet
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Overall Performance Card */}
            {stats && (
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Overall Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <div className="text-center space-y-2">
                        <p className="text-sm text-muted-foreground">Compliance Score</p>
                        <div className={`text-5xl font-bold ${getComplianceColor(stats.overallCompliance)}`}>
                          {stats.overallCompliance}%
                        </div>
                        <Badge {...getComplianceBadge(stats.overallCompliance)}>
                          {getComplianceBadge(stats.overallCompliance).label}
                        </Badge>
                      </div>
                      <div className="text-center text-sm text-muted-foreground">
                        {stats.daysLogged} of {stats.totalDays} days logged
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Calories</span>
                          <span className="font-medium">{stats.calorieCompliance}%</span>
                        </div>
                        <Progress value={stats.calorieCompliance} className="h-2" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Protein</span>
                          <span className="font-medium">{stats.proteinCompliance}%</span>
                        </div>
                        <Progress value={stats.proteinCompliance} className="h-2" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Carbs</span>
                          <span className="font-medium">{stats.carbCompliance}%</span>
                        </div>
                        <Progress value={stats.carbCompliance} className="h-2" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Fats</span>
                          <span className="font-medium">{stats.fatCompliance}%</span>
                        </div>
                        <Progress value={stats.fatCompliance} className="h-2" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Target vs Actual Comparison */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Calories</p>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold">
                          {stats?.avgCalories || 0}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          / {assignment.meal_plans?.target_calories}
                        </span>
                      </div>
                      {stats && (
                        <div className="flex items-center gap-1 text-xs">
                          {stats.avgCalories > assignment.meal_plans?.target_calories ? (
                            <>
                              <TrendingUp className="h-3 w-3 text-red-500" />
                              <span className="text-red-500">
                                +{stats.avgCalories - assignment.meal_plans?.target_calories}
                              </span>
                            </>
                          ) : (
                            <>
                              <TrendingDown className="h-3 w-3 text-green-500" />
                              <span className="text-green-500">
                                {stats.avgCalories - assignment.meal_plans?.target_calories}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Protein</p>
                      <div className="h-3 w-3 rounded-full bg-blue-500" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold">
                          {stats?.avgProtein || 0}g
                        </span>
                        <span className="text-sm text-muted-foreground">
                          / {assignment.meal_plans?.target_protein}g
                        </span>
                      </div>
                      {stats && (
                        <div className="flex items-center gap-1 text-xs">
                          {stats.avgProtein > assignment.meal_plans?.target_protein ? (
                            <>
                              <TrendingUp className="h-3 w-3 text-blue-500" />
                              <span className="text-blue-500">
                                +{stats.avgProtein - assignment.meal_plans?.target_protein}g
                              </span>
                            </>
                          ) : (
                            <>
                              <TrendingDown className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                {stats.avgProtein - assignment.meal_plans?.target_protein}g
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Carbs</p>
                      <div className="h-3 w-3 rounded-full bg-green-500" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold">
                          {stats?.avgCarbs || 0}g
                        </span>
                        <span className="text-sm text-muted-foreground">
                          / {assignment.meal_plans?.target_carbs}g
                        </span>
                      </div>
                      {stats && (
                        <div className="flex items-center gap-1 text-xs">
                          {stats.avgCarbs > assignment.meal_plans?.target_carbs ? (
                            <>
                              <TrendingUp className="h-3 w-3 text-green-500" />
                              <span className="text-green-500">
                                +{stats.avgCarbs - assignment.meal_plans?.target_carbs}g
                              </span>
                            </>
                          ) : (
                            <>
                              <TrendingDown className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                {stats.avgCarbs - assignment.meal_plans?.target_carbs}g
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Fats</p>
                      <div className="h-3 w-3 rounded-full bg-orange-500" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold">
                          {stats?.avgFats || 0}g
                        </span>
                        <span className="text-sm text-muted-foreground">
                          / {assignment.meal_plans?.target_fats}g
                        </span>
                      </div>
                      {stats && (
                        <div className="flex items-center gap-1 text-xs">
                          {stats.avgFats > assignment.meal_plans?.target_fats ? (
                            <>
                              <TrendingUp className="h-3 w-3 text-orange-500" />
                              <span className="text-orange-500">
                                +{stats.avgFats - assignment.meal_plans?.target_fats}g
                              </span>
                            </>
                          ) : (
                            <>
                              <TrendingDown className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                {stats.avgFats - assignment.meal_plans?.target_fats}g
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <Tabs defaultValue="trends" className="space-y-4">
              <TabsList>
                <TabsTrigger value="trends">Trend Analysis</TabsTrigger>
                <TabsTrigger value="comparison">Macro Comparison</TabsTrigger>
                <TabsTrigger value="daily">Daily Breakdown</TabsTrigger>
              </TabsList>

              <TabsContent value="trends" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Calorie Tracking</CardTitle>
                    <CardDescription>Daily calorie intake vs target over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={dailyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="targetCalories" 
                          stroke="hsl(var(--muted-foreground))" 
                          strokeDasharray="5 5"
                          name="Target"
                          dot={false}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="calories" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          name="Actual"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="comparison" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Macro Balance</CardTitle>
                    <CardDescription>
                      How your average intake compares to targets across all macros
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    <ResponsiveContainer width="100%" height={400}>
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="nutrient" />
                        <PolarRadiusAxis angle={90} domain={[0, 120]} />
                        <Radar 
                          name="Target" 
                          dataKey="target" 
                          stroke="hsl(var(--muted-foreground))" 
                          fill="hsl(var(--muted))" 
                          fillOpacity={0.3}
                        />
                        <Radar 
                          name="Actual" 
                          dataKey="actual" 
                          stroke="hsl(var(--primary))" 
                          fill="hsl(var(--primary))" 
                          fillOpacity={0.6}
                        />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="daily" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Macro Breakdown</CardTitle>
                    <CardDescription>Protein, carbs, and fats per day</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={dailyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="protein" fill="#3b82f6" name="Protein (g)" />
                        <Bar dataKey="carbs" fill="#10b981" name="Carbs (g)" />
                        <Bar dataKey="fats" fill="#f59e0b" name="Fats (g)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </ClientLayout>
  );
}
