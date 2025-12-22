import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Activity, Footprints, Flame, AlertTriangle, CheckCircle } from "lucide-react";
import { format } from "date-fns";

export default function ClientsHealth() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: clientsWithHealth, isLoading } = useQuery({
    queryKey: ['clients-health-overview', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get all clients for this trainer
      const { data: trainerClients, error: clientsError } = await supabase
        .from('trainer_clients')
        .select(`
          client_id,
          status,
          profiles!trainer_clients_client_id_fkey (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('trainer_id', user.id)
        .eq('status', 'active');

      if (clientsError) throw clientsError;

      // Get health connections for all clients
      const clientIds = trainerClients?.map(tc => tc.client_id) || [];
      
      const { data: connections } = await supabase
        .from('health_connections')
        .select('*')
        .in('client_id', clientIds)
        .eq('is_connected', true);

      // Get today's health stats for connected clients
      const today = new Date().toISOString().split('T')[0];
      const { data: healthData } = await supabase
        .from('health_data')
        .select('*')
        .in('client_id', clientIds)
        .gte('recorded_at', `${today}T00:00:00`)
        .lte('recorded_at', `${today}T23:59:59`);

      // Combine data
      return trainerClients?.map(tc => {
        const profile = tc.profiles;
        const connection = connections?.find(c => c.client_id === tc.client_id);
        const clientHealthData = healthData?.filter(h => h.client_id === tc.client_id) || [];
        
        const steps = clientHealthData.find(h => h.data_type === 'steps')?.value || 0;
        const calories = clientHealthData.find(h => h.data_type === 'calories_burned')?.value || 0;
        const heartRate = clientHealthData.find(h => h.data_type === 'heart_rate')?.value;
        const activeMinutes = clientHealthData.find(h => h.data_type === 'active_minutes')?.value || 0;

        return {
          clientId: tc.client_id,
          profile,
          isConnected: !!connection,
          lastSync: connection?.last_sync_at,
          provider: connection?.provider,
          todayStats: {
            steps,
            calories,
            heartRate,
            activeMinutes
          }
        };
      }) || [];
    },
    enabled: !!user?.id,
  });

  const connectedClients = clientsWithHealth?.filter(c => c.isConnected) || [];
  const notConnectedClients = clientsWithHealth?.filter(c => !c.isConnected) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Client Health Overview</h1>
          <p className="text-muted-foreground">
            Monitor your clients' health data from Apple Health and Samsung Health
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connected Clients</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{connectedClients.length}</div>
              <p className="text-xs text-muted-foreground">
                of {clientsWithHealth?.length || 0} total clients
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Steps Today</CardTitle>
              <Footprints className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {connectedClients.length > 0
                  ? Math.round(
                      connectedClients.reduce((sum, c) => sum + (c.todayStats.steps || 0), 0) /
                        connectedClients.length
                    ).toLocaleString()
                  : 0}
              </div>
              <p className="text-xs text-muted-foreground">across connected clients</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Calories Today</CardTitle>
              <Flame className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {connectedClients.length > 0
                  ? Math.round(
                      connectedClients.reduce((sum, c) => sum + (c.todayStats.calories || 0), 0) /
                        connectedClients.length
                    ).toLocaleString()
                  : 0}
              </div>
              <p className="text-xs text-muted-foreground">burned across clients</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Not Connected</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{notConnectedClients.length}</div>
              <p className="text-xs text-muted-foreground">clients need to connect</p>
            </CardContent>
          </Card>
        </div>

        {/* Connected Clients */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Connected Clients
          </h2>
          
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-12 w-12 rounded-full mb-4" />
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : connectedClients.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No clients have connected their health apps yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {connectedClients.map((client) => (
                <Card 
                  key={client.clientId} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/clients/${client.clientId}/health`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={client.profile?.avatar_url || undefined} />
                          <AvatarFallback>
                            {client.profile?.full_name?.charAt(0) || 'C'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{client.profile?.full_name || 'Unknown'}</p>
                          <Badge variant="outline" className="text-xs">
                            {client.provider === 'apple_health' ? 'Apple Health' : 'Health Connect'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Footprints className="h-4 w-4 text-muted-foreground" />
                        <span>{(client.todayStats.steps || 0).toLocaleString()} steps</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Flame className="h-4 w-4 text-orange-500" />
                        <span>{client.todayStats.calories || 0} kcal</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-red-500" />
                        <span>{client.todayStats.heartRate || '--'} bpm</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-green-500" />
                        <span>{client.todayStats.activeMinutes || 0} min</span>
                      </div>
                    </div>
                    
                    {client.lastSync && (
                      <p className="text-xs text-muted-foreground mt-3">
                        Last sync: {format(new Date(client.lastSync), 'MMM d, h:mm a')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Not Connected Clients */}
        {notConnectedClients.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Not Connected
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {notConnectedClients.map((client) => (
                <Card key={client.clientId} className="opacity-75">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={client.profile?.avatar_url || undefined} />
                        <AvatarFallback>
                          {client.profile?.full_name?.charAt(0) || 'C'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{client.profile?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">
                          Health app not connected
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
