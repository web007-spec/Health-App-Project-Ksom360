import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { ClientCard } from "@/components/ClientCard";
import { Users, Dumbbell, TrendingUp, DollarSign, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const mockClients = [
  {
    name: "Sarah Johnson",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    program: "Strength Training Pro",
    progress: 78,
    lastCheckIn: "2 days ago",
    status: "active" as const,
  },
  {
    name: "Mike Rodriguez",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike",
    program: "Weight Loss Intensive",
    progress: 45,
    lastCheckIn: "1 day ago",
    status: "active" as const,
  },
  {
    name: "Emily Chen",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily",
    program: "Marathon Prep",
    progress: 92,
    lastCheckIn: "Today",
    status: "active" as const,
  },
  {
    name: "David Kim",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
    program: "Muscle Building",
    progress: 34,
    lastCheckIn: "5 days ago",
    status: "paused" as const,
  },
];

const recentActivity = [
  { client: "Sarah Johnson", action: "Completed workout: Upper Body Strength", time: "2h ago" },
  { client: "Mike Rodriguez", action: "Logged meal: High Protein Breakfast", time: "4h ago" },
  { client: "Emily Chen", action: "Achieved goal: 5K Run under 25 min", time: "6h ago" },
  { client: "Alex Turner", action: "Sent message about nutrition plan", time: "1d ago" },
];

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Welcome back, Coach!</h1>
            <p className="text-muted-foreground mt-1">Here's what's happening with your clients today.</p>
          </div>
          <Button size="lg" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Client
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Active Clients"
            value={28}
            change="+3 this week"
            changeType="positive"
            icon={Users}
          />
          <StatCard
            title="Workouts Created"
            value={142}
            change="+12 this month"
            changeType="positive"
            icon={Dumbbell}
          />
          <StatCard
            title="Avg. Progress"
            value="67%"
            change="+5%"
            changeType="positive"
            icon={TrendingUp}
          />
          <StatCard
            title="Monthly Revenue"
            value="$8,400"
            change="+18%"
            changeType="positive"
            icon={DollarSign}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Active Clients */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Active Clients</h2>
              <Button variant="ghost" size="sm">View All</Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {mockClients.map((client) => (
                <ClientCard key={client.name} {...client} />
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">Recent Activity</h2>
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium text-foreground">{activity.client}</p>
                        <p className="text-sm text-muted-foreground">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Workout Plan
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Users className="h-4 w-4 mr-2" />
                  Schedule Check-in
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  View Analytics
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
