import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Play, Check, Clock, Dumbbell } from "lucide-react";

const assignedWorkouts = [
  {
    id: 1,
    name: "Upper Body Strength",
    exercises: 8,
    duration: "45 min",
    difficulty: "Intermediate",
    progress: 62,
    status: "in-progress" as const,
    scheduledDate: "Today",
  },
  {
    id: 2,
    name: "Core & Stability",
    exercises: 12,
    duration: "35 min",
    difficulty: "Beginner",
    progress: 0,
    status: "scheduled" as const,
    scheduledDate: "Tomorrow",
  },
  {
    id: 3,
    name: "Lower Body Power",
    exercises: 10,
    duration: "55 min",
    difficulty: "Advanced",
    progress: 100,
    status: "completed" as const,
    scheduledDate: "Yesterday",
  },
  {
    id: 4,
    name: "HIIT Cardio Blast",
    exercises: 6,
    duration: "30 min",
    difficulty: "Advanced",
    progress: 0,
    status: "scheduled" as const,
    scheduledDate: "Saturday",
  },
];

const difficultyColors = {
  Beginner: "bg-success/10 text-success",
  Intermediate: "bg-accent/10 text-accent",
  Advanced: "bg-destructive/10 text-destructive",
};

const statusIcons = {
  "in-progress": Play,
  scheduled: Clock,
  completed: Check,
};

export default function ClientWorkouts() {
  return (
    <ClientLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Workouts</h1>
          <p className="text-muted-foreground mt-1">Your personalized training program</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {assignedWorkouts.map((workout) => {
            const StatusIcon = statusIcons[workout.status];
            return (
              <Card key={workout.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <CardTitle className="text-lg mb-1">{workout.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{workout.scheduledDate}</p>
                    </div>
                    <Badge className={difficultyColors[workout.difficulty as keyof typeof difficultyColors]}>
                      {workout.difficulty}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Dumbbell className="h-4 w-4" />
                      <span>{workout.exercises} exercises</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      <span>{workout.duration}</span>
                    </div>
                  </div>

                  {workout.status !== "completed" && workout.status !== "scheduled" && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{workout.progress}%</span>
                      </div>
                      <Progress value={workout.progress} className="h-2" />
                    </div>
                  )}

                  <Button
                    className="w-full"
                    variant={workout.status === "completed" ? "outline" : "default"}
                  >
                    <StatusIcon className="h-4 w-4 mr-2" />
                    {workout.status === "in-progress" && "Continue Workout"}
                    {workout.status === "scheduled" && "Start Workout"}
                    {workout.status === "completed" && "View Details"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Workout History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { workout: "Lower Body Power", date: "Nov 14, 2025", duration: "52 min" },
                { workout: "Upper Body Strength", date: "Nov 13, 2025", duration: "47 min" },
                { workout: "Core & Stability", date: "Nov 12, 2025", duration: "33 min" },
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                      <Check className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{item.workout}</p>
                      <p className="text-sm text-muted-foreground">{item.date}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.duration}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
