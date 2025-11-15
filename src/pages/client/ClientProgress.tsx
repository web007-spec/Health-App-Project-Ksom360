import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, TrendingDown, Minus, Image as ImageIcon } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { LogProgressDialog } from "@/components/LogProgressDialog";
import { format, parseISO } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ClientProgress() {
  const { user } = useAuth();
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<string[] | null>(null);

  // Fetch progress entries
  const { data: progressEntries, isLoading } = useQuery({
    queryKey: ["progress-entries", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("progress_entries")
        .select("*")
        .eq("client_id", user?.id)
        .order("entry_date", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Prepare chart data
  const weightData = progressEntries?.filter((e) => e.weight).map((e) => ({
    date: format(parseISO(e.entry_date), "MMM d"),
    weight: e.weight,
  })) || [];

  const bodyFatData = progressEntries?.filter((e) => e.body_fat_percentage).map((e) => ({
    date: format(parseISO(e.entry_date), "MMM d"),
    bodyFat: e.body_fat_percentage,
  })) || [];

  // Calculate current vs previous values
  const latest = progressEntries?.[progressEntries.length - 1];
  const previous = progressEntries?.[progressEntries.length - 2];

  const calculateChange = (current: number | null | undefined, prev: number | null | undefined) => {
    if (!current || !prev) return null;
    return current - prev;
  };

  const weightChange = calculateChange(latest?.weight, previous?.weight);
  const bodyFatChange = calculateChange(latest?.body_fat_percentage, previous?.body_fat_percentage);

  // Extract measurements from latest entry
  const latestMeasurements = latest?.measurements as any;
  const previousMeasurements = previous?.measurements as any;

  const measurements = [
    {
      name: "Chest",
      current: latestMeasurements?.chest,
      change: calculateChange(latestMeasurements?.chest, previousMeasurements?.chest),
    },
    {
      name: "Waist",
      current: latestMeasurements?.waist,
      change: calculateChange(latestMeasurements?.waist, previousMeasurements?.waist),
    },
    {
      name: "Hips",
      current: latestMeasurements?.hips,
      change: calculateChange(latestMeasurements?.hips, previousMeasurements?.hips),
    },
    {
      name: "Arms",
      current: latestMeasurements?.arms,
      change: calculateChange(latestMeasurements?.arms, previousMeasurements?.arms),
    },
    {
      name: "Thighs",
      current: latestMeasurements?.thighs,
      change: calculateChange(latestMeasurements?.thighs, previousMeasurements?.thighs),
    },
  ].filter((m) => m.current !== undefined && m.current !== null);

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading progress...</p>
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
            <h1 className="text-3xl font-bold text-foreground">Progress Tracking</h1>
            <p className="text-muted-foreground mt-1">Monitor your fitness journey</p>
          </div>
          <Button className="gap-2" onClick={() => setLogDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Log Progress
          </Button>
        </div>

        {progressEntries && progressEntries.length > 0 ? (
          <>
            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Weight</span>
                    {weightChange !== null && (
                      <span className={`text-sm flex items-center gap-1 ${weightChange > 0 ? "text-destructive" : "text-success"}`}>
                        {weightChange > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        {Math.abs(weightChange).toFixed(1)}kg
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{latest?.weight ? `${latest.weight}kg` : "—"}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Body Fat %</span>
                    {bodyFatChange !== null && (
                      <span className={`text-sm flex items-center gap-1 ${bodyFatChange > 0 ? "text-destructive" : "text-success"}`}>
                        {bodyFatChange > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        {Math.abs(bodyFatChange).toFixed(1)}%
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{latest?.body_fat_percentage ? `${latest.body_fat_percentage}%` : "—"}</p>
                </CardContent>
              </Card>
            </div>

            {/* Weight Chart */}
            {weightData.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Weight Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={weightData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="weight"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--primary))", r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Body Fat Chart */}
            {bodyFatData.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Body Fat % Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={bodyFatData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="bodyFat"
                        stroke="hsl(var(--accent))"
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--accent))", r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Measurements */}
            {measurements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Body Measurements (cm)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {measurements.map((measurement) => (
                      <div key={measurement.name} className="p-4 rounded-lg border border-border">
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-sm font-medium text-muted-foreground">{measurement.name}</p>
                          {measurement.change !== null && measurement.change !== 0 && (
                            <span className={`flex items-center gap-1 text-xs ${measurement.change > 0 ? "text-primary" : "text-success"}`}>
                              {measurement.change > 0 ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : measurement.change < 0 ? (
                                <TrendingDown className="h-3 w-3" />
                              ) : (
                                <Minus className="h-3 w-3" />
                              )}
                              {Math.abs(measurement.change).toFixed(1)}
                            </span>
                          )}
                        </div>
                        <p className="text-2xl font-bold">{measurement.current}cm</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Progress History */}
            <Card>
              <CardHeader>
                <CardTitle>Progress History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {progressEntries.slice().reverse().map((entry) => (
                    <div key={entry.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium">{format(parseISO(entry.entry_date), "PPP")}</p>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        {entry.weight && (
                          <div>
                            <p className="text-muted-foreground">Weight</p>
                            <p className="font-medium">{entry.weight}kg</p>
                          </div>
                        )}
                        {entry.body_fat_percentage && (
                          <div>
                            <p className="text-muted-foreground">Body Fat</p>
                            <p className="font-medium">{entry.body_fat_percentage}%</p>
                          </div>
                        )}
                      </div>
                      {entry.photos && Array.isArray(entry.photos) && entry.photos.length > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center gap-2 mb-2">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm font-medium">Progress Photos</p>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {entry.photos.map((photoUrl: string, idx: number) => (
                              <img
                                key={idx}
                                src={photoUrl}
                                alt={`Progress photo ${idx + 1}`}
                                className="w-full h-20 object-cover rounded-lg border border-border cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => setSelectedPhotos(entry.photos as string[])}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      {entry.notes && (
                        <p className="text-sm text-muted-foreground mt-3 italic">{entry.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No progress entries yet</h3>
              <p className="text-muted-foreground mb-4">
                Start tracking your progress to see your fitness journey
              </p>
              <Button onClick={() => setLogDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Log Your First Entry
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <LogProgressDialog open={logDialogOpen} onOpenChange={setLogDialogOpen} />
      
      <Dialog open={selectedPhotos !== null} onOpenChange={() => setSelectedPhotos(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Progress Photos</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            {selectedPhotos?.map((photoUrl, idx) => (
              <img
                key={idx}
                src={photoUrl}
                alt={`Progress photo ${idx + 1}`}
                className="w-full h-auto rounded-lg border border-border"
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </ClientLayout>
  );
}
