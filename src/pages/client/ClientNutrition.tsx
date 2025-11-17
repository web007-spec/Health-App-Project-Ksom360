import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Apple, Flame, TrendingUp, ScanBarcode } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { LogMealDialog } from "@/components/LogMealDialog";
import { BarcodeScannerDialog } from "@/components/BarcodeScannerDialog";
import { format, parseISO, subDays, startOfDay } from "date-fns";
import { Progress } from "@/components/ui/progress";

export default function ClientNutrition() {
  const { user } = useAuth();
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<{
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  } | null>(null);

  const handleProductScanned = (productData: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  }) => {
    setScannedProduct(productData);
    setScannerOpen(false);
    setLogDialogOpen(true);
  };

  // Fetch nutrition logs for last 7 days
  const { data: nutritionLogs, isLoading } = useQuery({
    queryKey: ["nutrition-logs", user?.id],
    queryFn: async () => {
      const sevenDaysAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");
      const { data, error} = await supabase
        .from("nutrition_logs")
        .select("*")
        .eq("client_id", user?.id)
        .gte("log_date", sevenDaysAgo)
        .order("log_date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Get today's logs
  const today = format(new Date(), "yyyy-MM-dd");
  const todayLogs = nutritionLogs?.filter((log) => log.log_date === today) || [];

  // Calculate today's totals
  const todayTotals = {
    calories: todayLogs.reduce((sum, log) => sum + (log.calories || 0), 0),
    protein: todayLogs.reduce((sum, log) => sum + (Number(log.protein) || 0), 0),
    carbs: todayLogs.reduce((sum, log) => sum + (Number(log.carbs) || 0), 0),
    fats: todayLogs.reduce((sum, log) => sum + (Number(log.fats) || 0), 0),
  };

  // Goals (these could come from user settings in a real app)
  const goals = {
    calories: 2000,
    protein: 150,
    carbs: 200,
    fats: 65,
  };

  // Group logs by date
  const logsByDate = nutritionLogs?.reduce((acc, log) => {
    const date = log.log_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {} as Record<string, typeof nutritionLogs>);

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading nutrition data...</p>
          </div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Nutrition Tracking</h1>
            <p className="text-muted-foreground mt-1">Monitor your daily nutrition</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setScannerOpen(true)}>
              <ScanBarcode className="h-4 w-4" />
              Scan Barcode
            </Button>
            <Button className="gap-2" onClick={() => setLogDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Log Meal
            </Button>
          </div>
        </div>

        {/* Today's Summary */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Flame className="h-4 w-4 text-orange-500" />
                    Calories
                  </p>
                  <p className="text-sm font-medium">
                    {todayTotals.calories} / {goals.calories}
                  </p>
                </div>
                <Progress value={(todayTotals.calories / goals.calories) * 100} className="h-2" />
                <p className="text-2xl font-bold">{todayTotals.calories}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Protein (g)</p>
                  <p className="text-sm font-medium">
                    {todayTotals.protein.toFixed(1)} / {goals.protein}
                  </p>
                </div>
                <Progress value={(todayTotals.protein / goals.protein) * 100} className="h-2" />
                <p className="text-2xl font-bold">{todayTotals.protein.toFixed(1)}g</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Carbs (g)</p>
                  <p className="text-sm font-medium">
                    {todayTotals.carbs.toFixed(1)} / {goals.carbs}
                  </p>
                </div>
                <Progress value={(todayTotals.carbs / goals.carbs) * 100} className="h-2" />
                <p className="text-2xl font-bold">{todayTotals.carbs.toFixed(1)}g</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Fats (g)</p>
                  <p className="text-sm font-medium">
                    {todayTotals.fats.toFixed(1)} / {goals.fats}
                  </p>
                </div>
                <Progress value={(todayTotals.fats / goals.fats) * 100} className="h-2" />
                <p className="text-2xl font-bold">{todayTotals.fats.toFixed(1)}g</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Meal Log */}
        {logsByDate && Object.keys(logsByDate).length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Recent Meals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(logsByDate).map(([date, logs]) => (
                <div key={date} className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground">
                    {date === today ? "Today" : format(parseISO(date), "EEEE, MMM d")}
                  </h3>
                  <div className="space-y-2">
                    {logs.map((log) => (
                      <div key={log.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium">{log.meal_name}</p>
                            {log.notes && (
                              <p className="text-sm text-muted-foreground mt-1">{log.notes}</p>
                            )}
                          </div>
                          {log.calories && (
                            <div className="flex items-center gap-1 text-sm font-medium text-orange-500">
                              <Flame className="h-4 w-4" />
                              {log.calories}
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          {log.protein && (
                            <div>
                              <p className="text-muted-foreground">Protein</p>
                              <p className="font-medium">{log.protein}g</p>
                            </div>
                          )}
                          {log.carbs && (
                            <div>
                              <p className="text-muted-foreground">Carbs</p>
                              <p className="font-medium">{log.carbs}g</p>
                            </div>
                          )}
                          {log.fats && (
                            <div>
                              <p className="text-muted-foreground">Fats</p>
                              <p className="font-medium">{log.fats}g</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Apple className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No meals logged yet</h3>
              <p className="text-muted-foreground mb-4">
                Start tracking your nutrition to reach your fitness goals
              </p>
              <Button onClick={() => setLogDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Log Your First Meal
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <BarcodeScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onProductScanned={handleProductScanned}
      />
      <LogMealDialog
        open={logDialogOpen}
        onOpenChange={(open) => {
          setLogDialogOpen(open);
          if (!open) setScannedProduct(null);
        }}
        prefilledData={scannedProduct || undefined}
      />
    </ClientLayout>
  );
}
