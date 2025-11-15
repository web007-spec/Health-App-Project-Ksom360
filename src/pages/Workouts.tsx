import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, Clock, Users, Copy, Edit, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";

const workoutTemplates = [
  {
    id: 1,
    name: "Full Body Strength",
    exercises: 8,
    duration: "45 min",
    difficulty: "Intermediate",
    assignedTo: 12,
    category: "Strength",
  },
  {
    id: 2,
    name: "HIIT Cardio Blast",
    exercises: 6,
    duration: "30 min",
    difficulty: "Advanced",
    assignedTo: 8,
    category: "Cardio",
  },
  {
    id: 3,
    name: "Upper Body Power",
    exercises: 10,
    duration: "60 min",
    difficulty: "Advanced",
    assignedTo: 15,
    category: "Strength",
  },
  {
    id: 4,
    name: "Core & Stability",
    exercises: 12,
    duration: "35 min",
    difficulty: "Beginner",
    assignedTo: 20,
    category: "Core",
  },
  {
    id: 5,
    name: "Lower Body Hypertrophy",
    exercises: 9,
    duration: "55 min",
    difficulty: "Intermediate",
    assignedTo: 10,
    category: "Strength",
  },
  {
    id: 6,
    name: "Mobility & Recovery",
    exercises: 8,
    duration: "25 min",
    difficulty: "Beginner",
    assignedTo: 25,
    category: "Recovery",
  },
];

const difficultyColors = {
  Beginner: "bg-success/10 text-success",
  Intermediate: "bg-accent/10 text-accent",
  Advanced: "bg-destructive/10 text-destructive",
};

export default function Workouts() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Workout Library</h1>
            <p className="text-muted-foreground mt-1">Create and manage workout plans for your clients</p>
          </div>
          <Button size="lg" className="gap-2 w-full md:w-auto">
            <Plus className="h-4 w-4" />
            Create New Workout
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search workout plans..."
              className="pl-9"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>

        {/* Workout Templates Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workoutTemplates.map((workout) => (
            <Card key={workout.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-lg">{workout.name}</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {workout.category}
                    </Badge>
                  </div>
                  <Badge className={difficultyColors[workout.difficulty as keyof typeof difficultyColors]}>
                    {workout.difficulty}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{workout.duration}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{workout.assignedTo} clients</span>
                  </div>
                </div>
                
                <div className="pt-2 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-3">
                    {workout.exercises} exercises
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit className="h-3.5 w-3.5 mr-1.5" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Copy className="h-3.5 w-3.5 mr-1.5" />
                      Duplicate
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Create Workout CTA */}
        <Card className="border-dashed border-2 bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Plus className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Create Your First Custom Workout</h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              Build personalized workout plans with our easy-to-use builder. Add exercises, set reps, and customize for each client.
            </p>
            <Button size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Start Building
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
