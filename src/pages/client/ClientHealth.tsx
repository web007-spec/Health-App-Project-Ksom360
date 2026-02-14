import { ClientLayout } from '@/components/ClientLayout';
import { ActivitySummary } from '@/components/health/ActivitySummary';
import { HeartRateChart } from '@/components/health/HeartRateChart';
import { WeeklyActivityChart } from '@/components/health/WeeklyActivityChart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useHealthConnections, useSyncHealth, isNativePlatform } from '@/hooks/useHealthData';
import { useAuth } from '@/hooks/useAuth';
import { RefreshCw, Settings, Watch, AlertCircle, Database } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export default function ClientHealth() {
  const { user } = useAuth();
  const { data: connections, isLoading: connectionsLoading } = useHealthConnections();
  const syncMutation = useSyncHealth();
  const queryClient = useQueryClient();
  const [seeding, setSeeding] = useState(false);
  
  const isConnected = connections?.some(c => c.is_connected);
  const lastSync = connections?.find(c => c.is_connected)?.last_sync_at;
  const isNative = isNativePlatform();
  
  const handleSync = async () => {
    try {
      const result = await syncMutation.mutateAsync();
      toast.success(`Synced ${result.count} health records`);
    } catch (error) {
      toast.error('Failed to sync health data');
    }
  };

  const handleSeedDemoData = async () => {
    setSeeding(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('seed-health-data', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      if (response.error) throw response.error;
      toast.success(`Generated ${response.data.count} demo health records!`);
      queryClient.invalidateQueries({ queryKey: ['health-data'] });
      queryClient.invalidateQueries({ queryKey: ['health-stats'] });
      queryClient.invalidateQueries({ queryKey: ['health-connections'] });
    } catch (error) {
      toast.error('Failed to generate demo data');
    } finally {
      setSeeding(false);
    }
  };
  
  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Health Dashboard</h1>
            <p className="text-muted-foreground">
              Track your heart rate, activity, and more from your wearable
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isConnected && lastSync && (
              <span className="text-sm text-muted-foreground">
                Last sync: {formatDistanceToNow(new Date(lastSync), { addSuffix: true })}
              </span>
            )}
            {isConnected && (
              <Button 
                variant="outline" 
                onClick={handleSync}
                disabled={syncMutation.isPending}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                Sync Now
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link to="/client/health-connect">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Link>
            </Button>
          </div>
        </div>
        
        {!isNative && !isConnected && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Web Preview Mode</AlertTitle>
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-3">
              <span>Apple Health sync requires the native mobile app. For now, generate demo data to preview the dashboard.</span>
              <Button 
                size="sm" 
                onClick={handleSeedDemoData} 
                disabled={seeding}
                className="shrink-0"
              >
                <Database className={`h-4 w-4 mr-2 ${seeding ? 'animate-spin' : ''}`} />
                {seeding ? 'Generating...' : 'Generate Demo Data'}
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        {isNative && !isConnected && !connectionsLoading && (
          <Card>
            <CardHeader className="text-center">
              <Watch className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <CardTitle>Connect Your Health App</CardTitle>
              <CardDescription>
                Sync data from Apple Health or Samsung Health to track your progress
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button asChild>
                <Link to="/client/health-connect">
                  Connect Now
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
        
        {(isConnected || !isNative) && (
          <>
            <div>
              <h2 className="text-lg font-semibold mb-4">Today's Summary</h2>
              <ActivitySummary />
            </div>
            
            <div className="grid gap-6 lg:grid-cols-2">
              <HeartRateChart />
              <WeeklyActivityChart />
            </div>
          </>
        )}
      </div>
    </ClientLayout>
  );
}
