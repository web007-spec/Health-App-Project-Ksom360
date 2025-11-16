import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TrendingUp, TrendingDown, Target, Calendar, Apple } from "lucide-react";
import { format, subDays, startOfDay, parseISO } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function MacroTracking() {
  const { user } = useAuth();
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [daysRange, setDaysRange] = useState<number>(7);

  // Fetch trainer's clients
  const { data: clients } = useQuery({
    queryKey: ["trainer-clients", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainer_clients")
        .select(`
          client_id,
          profiles!trainer_clients_client_id_fkey (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq("trainer_id", user?.id)
        .eq("status", "active");

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch selected client's meal plan assignment
  const { data: assignment } = useQuery({
    queryKey: ["client-meal-assignment", selectedClientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_meal_plan_assignments")
        .select(`
          *,
          meal_plans (
            target_calories,
            target_protein,
            target_carbs,
            target_fats
          )
        `)
        .eq("client_id", selectedClientId)
        .order("assigned_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!selectedClientId,
  });

  // Fetch nutrition logs for selected client
  const { data: nutritionLogs } = useQuery({
    queryKey: ["client-nutrition-logs", selectedClientId, daysRange],
    queryFn: async () => {
      const startDate = format(subDays(new Date(), daysRange), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("nutrition_logs")
        .select("*")
        .eq("client_id", selectedClientId)
        .gte("log_date", startDate)
        .order("log_date", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedClientId,
  });

  // Calculate daily totals and compliance
  const dailyData = nutritionLogs?.reduce((acc, log) => {
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

  const chartData = dailyData ? Object.values(dailyData).map((day: any) => ({
    date: format(parseISO(day.date), "MMM dd"),
    calories: Math.round(day.calories),
    protein: Math.round(day.protein),
    carbs: Math.round(day.carbs),
    fats: Math.round(day.fats),
    targetCalories: assignment?.meal_plans?.target_calories || 0,
    targetProtein: assignment?.meal_plans?.target_protein || 0,
    targetCarbs: assignment?.meal_plans?.target_carbs || 0,
    targetFats: assignment?.meal_plans?.target_fats || 0,
  })) : [];

  // Calculate overall compliance
  const calculateCompliance = () => {
    if (!dailyData || !assignment?.meal_plans) return null;

    const days = Object.values(dailyData);
    const targets = assignment.meal_plans;

    const avgCalories = days.reduce((sum: number, d: any) => sum + d.calories, 0) / days.length;
    const avgProtein = days.reduce((sum: number, d: any) => sum + d.protein, 0) / days.length;
    const avgCarbs = days.reduce((sum: number, d: any) => sum + d.carbs, 0) / days.length;
    const avgFats = days.reduce((sum: number, d: any) => sum + d.fats, 0) / days.length;

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
      overall: Math.round(overallCompliance),
      calories: Math.round(calorieCompliance),
      protein: Math.round(proteinCompliance),
      carbs: Math.round(carbCompliance),
      fats: Math.round(fatCompliance),
      avgCalories: Math.round(avgCalories),
      avgProtein: Math.round(avgProtein),
      avgCarbs: Math.round(avgCarbs),
      avgFats: Math.round(avgFats),
    };
  };

  const compliance = calculateCompliance();

  const getComplianceColor = (value: number) => {
    if (value >= 90) return "text-green-600";
    if (value >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getComplianceBadge = (value: number) => {
    if (value >= 90) return { variant: "default" as const, label: "Excellent" };
    if (value >= 70) return { variant: "secondary" as const, label: "Good" };
    return { variant: "destructive" as const, label: "Needs Improvement" };
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Macro Tracking Dashboard</h1>
            <p className="text-muted-foreground mt-1">Monitor client nutrition compliance</p>
          </div>

          <div className="flex gap-3">
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

            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients?.map((client) => (
                  <SelectItem key={client.client_id} value={client.client_id}>
                    {client.profiles?.full_name || client.profiles?.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!selectedClientId ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select a Client</h3>
              <p className="text-muted-foreground">Choose a client to view their macro tracking data</p>
            </CardContent>
          </Card>
        ) : !assignment ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Apple className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Meal Plan Assigned</h3>
              <p className="text-muted-foreground">This client doesn't have an active meal plan with macro targets</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Compliance Overview */}
            {compliance && (
              <div className="grid gap-4 md:grid-cols-5">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center space-y-2">
                      <p className="text-sm text-muted-foreground">Overall</p>
                      <div className={`text-3xl font-bold ${getComplianceColor(compliance.overall)}`}>
                        {compliance.overall}%
                      </div>
                      <Badge {...getComplianceBadge(compliance.overall)}>
                        {getComplianceBadge(compliance.overall).label}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Calories</p>
                      <Progress value={compliance.calories} className="h-2" />
                      <div className="flex justify-between text-xs">
                        <span>{compliance.avgCalories}</span>
                        <span className="text-muted-foreground">
                          / {assignment.meal_plans?.target_calories}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Protein</p>
                      <Progress value={compliance.protein} className="h-2" />
                      <div className="flex justify-between text-xs">
                        <span>{compliance.avgProtein}g</span>
                        <span className="text-muted-foreground">
                          / {assignment.meal_plans?.target_protein}g
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Carbs</p>
                      <Progress value={compliance.carbs} className="h-2" />
                      <div className="flex justify-between text-xs">
                        <span>{compliance.avgCarbs}g</span>
                        <span className="text-muted-foreground">
                          / {assignment.meal_plans?.target_carbs}g
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Fats</p>
                      <Progress value={compliance.fats} className="h-2" />
                      <div className="flex justify-between text-xs">
                        <span>{compliance.avgFats}g</span>
                        <span className="text-muted-foreground">
                          / {assignment.meal_plans?.target_fats}g
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Calorie Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Calorie Tracking</CardTitle>
                <CardDescription>Daily calorie intake vs target</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
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

            {/* Macro Breakdown Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Macro Breakdown</CardTitle>
                <CardDescription>Daily protein, carbs, and fats tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
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

            {/* Recent Logs */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Meal Logs</CardTitle>
                <CardDescription>Latest nutrition entries from client</CardDescription>
              </CardHeader>
              <CardContent>
                {nutritionLogs && nutritionLogs.length > 0 ? (
                  <div className="space-y-3">
                    {nutritionLogs.slice(-5).reverse().map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{log.meal_name}</p>
                            <Badge variant="outline" className="text-xs">
                              {format(parseISO(log.log_date), "MMM dd")}
                            </Badge>
                          </div>
                          {log.notes && (
                            <p className="text-sm text-muted-foreground mt-1">{log.notes}</p>
                          )}
                        </div>
                        <div className="flex gap-4 text-sm">
                          <div className="text-center">
                            <p className="text-muted-foreground">Calories</p>
                            <p className="font-semibold">{log.calories}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-muted-foreground">P</p>
                            <p className="font-semibold">{log.protein}g</p>
                          </div>
                          <div className="text-center">
                            <p className="text-muted-foreground">C</p>
                            <p className="font-semibold">{log.carbs}g</p>
                          </div>
                          <div className="text-center">
                            <p className="text-muted-foreground">F</p>
                            <p className="font-semibold">{log.fats}g</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No meal logs found for this period
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
