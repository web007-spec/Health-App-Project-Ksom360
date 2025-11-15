import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, Dumbbell, TrendingUp, Flame, Play, Check } from "lucide-react";

const todayWorkout = {
  name: "Upper Body Strength",
  exercises: 8,
  duration: "45 min",
  completed: 5,
};

const weekProgress = [
  { day: "Mon", completed: true },
  { day: "Tue", completed: true },
  { day: "Wed", completed: true },
  { day: "Thu", completed: false },
  { day: "Fri", completed: false },
  { day: "Sat", completed: false },
  { day: "Sun", completed: false },
];

const upcomingWorkouts = [
  { name: "Core & Abs", date: "Tomorrow", time: "8:00 AM" },
  { name: "Lower Body Power", date: "Saturday", time: "9:00 AM" },
  { name: "HIIT Cardio", date: "Sunday", time: "7:00 AM" },
];

const recentProgress = [
  { metric: "Weight", value: "175 lbs", change: "-3 lbs" },
  { metric: "Body Fat", value: "18%", change: "-2%" },
  { metric: "Workouts", value: "12", change: "+3" },
];

export default function ClientDashboard() {
  return (
    <ClientLayout>
      <div className="p-6 space-y-6">
        {/* Welcome Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Today's Focus</h1>
          <p className="text-muted-foreground mt-1">Thursday, November 15, 2025</p>
        </div>

        {/* Today's Workout Card */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <Badge className="mb-2">Today's Workout</Badge>
                <h2 className="text-2xl font-bold text-foreground mb-1">{todayWorkout.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {todayWorkout.exercises} exercises • {todayWorkout.duration}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Dumbbell className="h-6 w-6 text-primary" />
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{todayWorkout.completed}/{todayWorkout.exercises} exercises</span>
              </div>
              <Progress value={(todayWorkout.completed / todayWorkout.exercises) * 100} className="h-2" />
            </div>

            <div className="flex gap-3">
              <Button className="flex-1" size="lg">
                <Play className="h-4 w-4 mr-2" />
                Continue Workout
              </Button>
              <Button variant="outline" size="lg">
                View Details
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Week Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between mb-4">
                {weekProgress.map((day, index) => (
                  <div key={index} className="flex flex-col items-center gap-2">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        day.completed
                          ? "bg-success text-success-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {day.completed ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <span className="text-xs font-medium">{day.day[0]}</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{day.day}</span>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Completion</span>
                  <span className="text-2xl font-bold text-foreground">3/7</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentProgress.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.metric}</p>
                      <p className="text-xs text-muted-foreground">{item.change} this month</p>
                    </div>
                    <p className="text-lg font-bold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Streak */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-accent" />
                Workout Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <p className="text-5xl font-bold text-foreground mb-2">7</p>
                <p className="text-sm text-muted-foreground mb-4">Days in a row! 🔥</p>
                <Progress value={70} className="h-2 mb-2" />
                <p className="text-xs text-muted-foreground">3 more days to beat your record!</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Workouts */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Workouts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingWorkouts.map((workout, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Dumbbell className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{workout.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {workout.date} at {workout.time}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">View</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
