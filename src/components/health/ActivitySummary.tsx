import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Footprints, Flame, Heart, Timer, Dumbbell, Activity, Moon, Scale, Zap, BatteryCharging } from 'lucide-react';
import { useHealthStats } from '@/hooks/useHealthData';
import { Skeleton } from '@/components/ui/skeleton';

interface ActivitySummaryProps {
  clientId?: string;
}

function formatSleep(minutes: number): string {
  if (minutes <= 0) return '0h';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function ActivitySummary({ clientId }: ActivitySummaryProps) {
  const { data: stats, isLoading } = useHealthStats(clientId);
  
  const statCards = [
    {
      title: 'Steps',
      value: (stats?.todaySteps ?? 0).toLocaleString(),
      icon: Footprints,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      goal: 10000,
      current: stats?.todaySteps ?? 0,
    },
    {
      title: 'Active Energy',
      value: (stats?.todayActiveEnergy ?? 0).toLocaleString(),
      unit: 'kcal',
      icon: Flame,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      title: 'Resting Energy',
      value: (stats?.todayRestingEnergy ?? 0).toLocaleString(),
      unit: 'kcal',
      icon: BatteryCharging,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      title: 'Sleep',
      value: formatSleep(stats?.todaySleep || 0),
      icon: Moon,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-500/10',
      goal: 480, // 8 hours in minutes
      current: stats?.todaySleep || 0,
      goalLabel: '8h goal',
    },
    {
      title: 'Weight',
      value: stats?.todayWeight != null ? stats.todayWeight.toFixed(1) : '--',
      unit: stats?.todayWeight != null ? 'kg' : undefined,
      icon: Scale,
      color: 'text-teal-500',
      bgColor: 'bg-teal-500/10',
    },
    {
      title: 'Workouts',
      value: stats?.workoutsCount || '0',
      icon: Dumbbell,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Avg Heart Rate',
      value: stats?.avgHeartRate || '--',
      unit: 'bpm',
      icon: Heart,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
    {
      title: 'Resting HR',
      value: stats?.restingHeartRate || '--',
      unit: 'bpm',
      icon: Activity,
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10',
    },
    {
      title: 'Active Minutes',
      value: stats?.activeMinutes || '0',
      unit: 'min',
      icon: Timer,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
  ];
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        const progressPercent = stat.goal ? Math.min((stat.current / stat.goal) * 100, 100) : null;
        
        return (
          <Card key={stat.title}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">{stat.value}</span>
                  {stat.unit && (
                    <span className="text-sm text-muted-foreground">{stat.unit}</span>
                  )}
                </div>
                {progressPercent !== null && (
                  <div className="space-y-1">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(progressPercent)}% of {stat.goalLabel ?? stat.goal?.toLocaleString() + ' goal'}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
