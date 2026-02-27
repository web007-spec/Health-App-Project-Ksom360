import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useHealthData } from '@/hooks/useHealthData';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useMemo } from 'react';

interface WeeklyActivityChartProps {
  clientId?: string;
}

export function WeeklyActivityChart({ clientId }: WeeklyActivityChartProps) {
  const { data: stepsData, isLoading: stepsLoading } = useHealthData(clientId, 'steps', 7);
  const { data: caloriesData, isLoading: caloriesLoading } = useHealthData(clientId, 'calories_burned', 7);
  
  const isLoading = stepsLoading || caloriesLoading;
  
  const chartData = useMemo(() => {
    // Create map for all days
    const dailyData: Record<string, { steps: number; calories: number; date: string }> = {};
    
    // Get last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = format(date, 'yyyy-MM-dd');
      dailyData[dateKey] = { steps: 0, calories: 0, date: dateKey };
    }
    
    // Add steps data
    stepsData?.forEach((point) => {
      const dateKey = format(new Date(point.recorded_at), 'yyyy-MM-dd');
      if (dailyData[dateKey]) {
        dailyData[dateKey].steps += Number(point.value);
      }
    });
    
    // Add calories data
    caloriesData?.forEach((point) => {
      const dateKey = format(new Date(point.recorded_at), 'yyyy-MM-dd');
      if (dailyData[dateKey]) {
        dailyData[dateKey].calories += Number(point.value);
      }
    });
    
    return Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        displayDate: format(new Date(date), 'EEE'),
        steps: data.steps,
        calories: Math.round(data.calories),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [stepsData, caloriesData]);
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }
  
  const hasData = chartData.some(d => d.steps > 0 || d.calories > 0);
  
  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Activity</CardTitle>
          <CardDescription>No activity data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            <p>Connect your health app to see activity data</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Activity</CardTitle>
        <CardDescription>Daily steps and calories burned over the past week</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="displayDate" 
              className="text-xs fill-muted-foreground"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              yAxisId="steps"
              orientation="left"
              className="text-xs fill-muted-foreground"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              yAxisId="calories"
              orientation="right"
              className="text-xs fill-muted-foreground"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
              formatter={(value: number, name: string) => [
                name === 'steps' ? value.toLocaleString() : `${value} kcal`,
                name === 'steps' ? 'Steps' : 'Calories'
              ]}
            />
            <Legend />
            <Bar 
              yAxisId="steps"
              dataKey="steps" 
              fill="hsl(var(--primary))" 
              name="Steps"
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              yAxisId="calories"
              dataKey="calories" 
              fill="hsl(var(--accent))" 
              name="Calories"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
