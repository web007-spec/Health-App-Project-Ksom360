import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const weightData = [
  { date: "Nov 1", weight: 178 },
  { date: "Nov 8", weight: 177 },
  { date: "Nov 15", weight: 175 },
  { date: "Nov 22", weight: 174 },
];

const measurements = [
  { name: "Weight", current: "175 lbs", change: "-3 lbs", trend: "down" },
  { name: "Body Fat", current: "18%", change: "-2%", trend: "down" },
  { name: "Chest", current: "42 in", change: "+0.5 in", trend: "up" },
  { name: "Waist", current: "32 in", change: "-1 in", trend: "down" },
  { name: "Arms", current: "15.5 in", change: "+0.3 in", trend: "up" },
  { name: "Legs", current: "24 in", change: "+0.5 in", trend: "up" },
];

const progressPhotos = [
  { date: "Nov 1, 2025", url: "https://api.dicebear.com/7.x/shapes/svg?seed=photo1" },
  { date: "Oct 1, 2025", url: "https://api.dicebear.com/7.x/shapes/svg?seed=photo2" },
  { date: "Sep 1, 2025", url: "https://api.dicebear.com/7.x/shapes/svg?seed=photo3" },
];

export default function ClientProgress() {
  return (
    <ClientLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Progress Tracking</h1>
            <p className="text-muted-foreground mt-1">Monitor your fitness journey</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Log Progress
          </Button>
        </div>

        {/* Weight Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Weight Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weightData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[170, 180]} />
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

        {/* Measurements */}
        <Card>
          <CardHeader>
            <CardTitle>Body Measurements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {measurements.map((measurement, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">{measurement.name}</p>
                    {measurement.trend === "down" ? (
                      <TrendingDown className="h-4 w-4 text-success" />
                    ) : (
                      <TrendingUp className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <p className="text-2xl font-bold text-foreground mb-1">{measurement.current}</p>
                  <p className="text-sm text-muted-foreground">{measurement.change}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Progress Photos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Progress Photos</CardTitle>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Photo
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {progressPhotos.map((photo, index) => (
                <div key={index} className="space-y-2">
                  <div className="aspect-[3/4] rounded-lg border-2 border-border overflow-hidden bg-muted">
                    <img
                      src={photo.url}
                      alt={`Progress ${photo.date}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-sm text-center text-muted-foreground">{photo.date}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Personal Records */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { exercise: "Bench Press", weight: "225 lbs", date: "Nov 12, 2025" },
                { exercise: "Squat", weight: "315 lbs", date: "Nov 10, 2025" },
                { exercise: "Deadlift", weight: "405 lbs", date: "Nov 8, 2025" },
              ].map((record, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border border-border"
                >
                  <div>
                    <p className="font-medium text-foreground">{record.exercise}</p>
                    <p className="text-sm text-muted-foreground">{record.date}</p>
                  </div>
                  <p className="text-lg font-bold text-primary">{record.weight}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
