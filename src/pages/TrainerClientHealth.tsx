import { DashboardLayout } from '@/components/DashboardLayout';
import { ActivitySummary } from '@/components/health/ActivitySummary';
import { HeartRateChart } from '@/components/health/HeartRateChart';
import { WeeklyActivityChart } from '@/components/health/WeeklyActivityChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useHealthConnections, useHealthData, useRealtimeHealthData } from '@/hooks/useHealthData';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Watch, CheckCircle2, XCircle, Activity, Heart, Flame, Footprints } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow, format } from 'date-fns';

export default function TrainerClientHealth() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  
  // Enable realtime updates for this client
  if (clientId) {
    useRealtimeHealthData(clientId);
  }
  
  // Fetch client profile
  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ['client-profile', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', clientId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });
  
  // Fetch health connections
  const { data: connections, isLoading: connectionsLoading } = useHealthConnections(clientId);
  
  // Fetch recent workouts from health data
  const { data: recentWorkouts } = useHealthData(clientId, 'workout', 30);
  
  const isConnected = connections?.some(c => c.is_connected);
  const connection = connections?.find(c => c.is_connected);
  
  if (clientLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-32 w-full" />
        </div>
      </DashboardLayout>
    );
  }
  
  if (!client) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Client not found</p>
          <Button onClick={() => navigate('/clients')} className="mt-4">
            Back to Clients
          </Button>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-12 w-12">
            <AvatarImage src={client.avatar_url || undefined} />
            <AvatarFallback>{client.full_name?.charAt(0) || client.email.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{client.full_name || client.email}</h1>
            <p className="text-muted-foreground">Health Data</p>
          </div>
          <Badge variant={isConnected ? 'default' : 'secondary'} className="ml-auto">
            {isConnected ? (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Health Connected
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                Not Connected
              </>
            )}
          </Badge>
        </div>
        
        {isConnected && connection && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Watch className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Connection Status</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">
                  Provider: <span className="font-medium text-foreground">
                    {connection.provider === 'apple_health' ? 'Apple Health' : 'Samsung Health / Health Connect'}
                  </span>
                </span>
                {connection.last_sync_at && (
                  <span className="text-muted-foreground">
                    Last sync: <span className="font-medium text-foreground">
                      {formatDistanceToNow(new Date(connection.last_sync_at), { addSuffix: true })}
                    </span>
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        
        {!isConnected && (
          <Card>
            <CardHeader className="text-center">
              <Watch className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <CardTitle>No Health App Connected</CardTitle>
              <CardDescription>
                This client hasn't connected their Apple Health or Samsung Health app yet.
                They'll need to connect from their mobile app to sync health data.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
        
        {isConnected && (
          <>
            <div>
              <h2 className="text-lg font-semibold mb-4">Today's Activity</h2>
              <ActivitySummary clientId={clientId} />
            </div>
            
            <div className="grid gap-6 lg:grid-cols-2">
              <HeartRateChart clientId={clientId} />
              <WeeklyActivityChart clientId={clientId} />
            </div>
            
            {recentWorkouts && recentWorkouts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Synced Workouts</CardTitle>
                  <CardDescription>
                    Workouts recorded on their wearable device
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentWorkouts.slice(0, 5).map((workout) => {
                      const metadata = workout.metadata as Record<string, unknown> | null;
                      return (
                        <div key={workout.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Activity className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">
                                {(metadata?.workout_type as string) || 'Workout'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(workout.recorded_at), 'MMM d, yyyy h:mm a')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            {metadata?.duration && (
                              <span className="text-muted-foreground">
                                {Math.round(Number(metadata.duration) / 60)} min
                              </span>
                            )}
                            <span className="font-medium">{Math.round(workout.value)} kcal</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
