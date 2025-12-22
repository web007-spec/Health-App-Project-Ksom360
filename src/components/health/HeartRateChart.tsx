import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useHealthData } from '@/hooks/useHealthData';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useMemo } from 'react';

interface HeartRateChartProps {
  clientId?: string;
  days?: number;
}

export function HeartRateChart({ clientId, days = 7 }: HeartRateChartProps) {
  const { data: healthData, isLoading } = useHealthData(clientId, 'heart_rate', days);
  const { data: restingData } = useHealthData(clientId, 'resting_heart_rate', days);
  
  const chartData = useMemo(() => {
    if (!healthData || healthData.length === 0) return [];
    
    // Group by day and calculate min/max/avg
    const dailyData: Record<string, { values: number[]; date: string }> = {};
    
    healthData.forEach((point) => {
      const dateKey = format(new Date(point.recorded_at), 'yyyy-MM-dd');
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { values: [], date: dateKey };
      }
      dailyData[dateKey].values.push(Number(point.value));
    });
    
    // Add resting heart rate data
    const restingByDate: Record<string, number> = {};
    restingData?.forEach((point) => {
      const dateKey = format(new Date(point.recorded_at), 'yyyy-MM-dd');
      restingByDate[dateKey] = Number(point.value);
    });
    
    return Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        displayDate: format(new Date(date), 'EEE'),
        avg: Math.round(data.values.reduce((a, b) => a + b, 0) / data.values.length),
        min: Math.min(...data.values),
        max: Math.max(...data.values),
        resting: restingByDate[date] || null,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [healthData, restingData]);
  
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
  
  if (!chartData || chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Heart Rate Trends</CardTitle>
          <CardDescription>No heart rate data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            <p>Connect your health app to see heart rate data</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Heart Rate Trends</CardTitle>
        <CardDescription>Average, min, and max heart rate over the past {days} days</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="heartRateGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="displayDate" 
              className="text-xs fill-muted-foreground"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              domain={['dataMin - 10', 'dataMax + 10']}
              className="text-xs fill-muted-foreground"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              unit=" bpm"
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
            />
            <Area
              type="monotone"
              dataKey="max"
              stroke="hsl(var(--destructive))"
              fill="url(#heartRateGradient)"
              strokeWidth={1}
              name="Max HR"
            />
            <Line
              type="monotone"
              dataKey="avg"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))' }}
              name="Avg HR"
            />
            <Line
              type="monotone"
              dataKey="resting"
              stroke="hsl(var(--success))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: 'hsl(var(--success))' }}
              name="Resting HR"
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-muted-foreground">Average</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span className="text-muted-foreground">Max</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-muted-foreground">Resting</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
