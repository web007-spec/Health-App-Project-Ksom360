import { ClientLayout } from "@/components/ClientLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, Apple, Beef, Wheat, Droplet } from "lucide-react";

const dailyGoals = {
  calories: { current: 1847, target: 2200 },
  protein: { current: 142, target: 180 },
  carbs: { current: 198, target: 250 },
  fats: { current: 58, target: 70 },
};

const todaysMeals = [
  {
    name: "Breakfast - Oatmeal & Eggs",
    time: "8:30 AM",
    calories: 450,
    protein: 32,
    carbs: 45,
    fats: 18,
  },
  {
    name: "Lunch - Chicken & Rice Bowl",
    time: "1:00 PM",
    calories: 680,
    protein: 58,
    carbs: 72,
    fats: 18,
  },
  {
    name: "Snack - Protein Shake",
    time: "3:30 PM",
    calories: 320,
    protein: 35,
    carbs: 28,
    fats: 8,
  },
  {
    name: "Dinner - Salmon & Vegetables",
    time: "7:00 PM",
    calories: 397,
    protein: 17,
    carbs: 53,
    fats: 14,
  },
];

export default function ClientNutrition() {
  return (
    <ClientLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Nutrition Tracking</h1>
            <p className="text-muted-foreground mt-1">Thursday, November 15, 2025</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Log Meal
          </Button>
        </div>

        {/* Daily Goals Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Apple className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Calories</p>
                  <p className="text-xs text-muted-foreground">
                    {dailyGoals.calories.current} / {dailyGoals.calories.target}
                  </p>
                </div>
              </div>
              <Progress
                value={(dailyGoals.calories.current / dailyGoals.calories.target) * 100}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {dailyGoals.calories.target - dailyGoals.calories.current} remaining
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <Beef className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Protein</p>
                  <p className="text-xs text-muted-foreground">
                    {dailyGoals.protein.current}g / {dailyGoals.protein.target}g
                  </p>
                </div>
              </div>
              <Progress
                value={(dailyGoals.protein.current / dailyGoals.protein.target) * 100}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {dailyGoals.protein.target - dailyGoals.protein.current}g remaining
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                  <Wheat className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Carbs</p>
                  <p className="text-xs text-muted-foreground">
                    {dailyGoals.carbs.current}g / {dailyGoals.carbs.target}g
                  </p>
                </div>
              </div>
              <Progress
                value={(dailyGoals.carbs.current / dailyGoals.carbs.target) * 100}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {dailyGoals.carbs.target - dailyGoals.carbs.current}g remaining
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-chart-4/10 flex items-center justify-center">
                  <Droplet className="h-5 w-5 text-chart-4" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fats</p>
                  <p className="text-xs text-muted-foreground">
                    {dailyGoals.fats.current}g / {dailyGoals.fats.target}g
                  </p>
                </div>
              </div>
              <Progress value={(dailyGoals.fats.current / dailyGoals.fats.target) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {dailyGoals.fats.target - dailyGoals.fats.current}g remaining
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Today's Meals */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Meals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todaysMeals.map((meal, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium text-foreground">{meal.name}</p>
                      <p className="text-sm text-muted-foreground">{meal.time}</p>
                    </div>
                    <Button variant="ghost" size="sm">Edit</Button>
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-sm">
                    <div className="text-center">
                      <p className="text-muted-foreground">Calories</p>
                      <p className="font-medium">{meal.calories}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">Protein</p>
                      <p className="font-medium">{meal.protein}g</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">Carbs</p>
                      <p className="font-medium">{meal.carbs}g</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">Fats</p>
                      <p className="font-medium">{meal.fats}g</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Overview */}
        <Card>
          <CardHeader>
            <CardTitle>This Week's Average</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 rounded-lg border border-border">
                <p className="text-2xl font-bold text-foreground mb-1">2,100</p>
                <p className="text-sm text-muted-foreground">Avg Calories</p>
              </div>
              <div className="text-center p-4 rounded-lg border border-border">
                <p className="text-2xl font-bold text-foreground mb-1">165g</p>
                <p className="text-sm text-muted-foreground">Avg Protein</p>
              </div>
              <div className="text-center p-4 rounded-lg border border-border">
                <p className="text-2xl font-bold text-foreground mb-1">95%</p>
                <p className="text-sm text-muted-foreground">Goal Adherence</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
