import { ClientLayout } from '@/components/ClientLayout';
import { ActivitySummary } from '@/components/health/ActivitySummary';
import { HeartRateChart } from '@/components/health/HeartRateChart';
import { WeeklyActivityChart } from '@/components/health/WeeklyActivityChart';
import { HealthSnapshotDialog } from '@/components/health/HealthSnapshotDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useHealthConnections, useSyncHealth, isNativePlatform, useHealthStats } from '@/hooks/useHealthData';
import { useAuth } from '@/hooks/useAuth';
import { useEffectiveClientId } from '@/hooks/useEffectiveClientId';
import { RefreshCw, Settings, Watch, AlertCircle, Database, Camera, Bug } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';

export default function ClientHealth() {
  const { user } = useAuth();
  const effectiveClientId = useEffectiveClientId();
  const { data: connections, isLoading: connectionsLoading, error: connectionsError } = useHealthConnections(effectiveClientId);
  const { data: stats, error: statsError } = useHealthStats(effectiveClientId);
  const syncMutation = useSyncHealth();
  const queryClient = useQueryClient();
  const [seeding, setSeeding] = useState(false);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const autoSyncDone = useRef(false);

  // Auto-sync on page load (native only, once per mount)
  useEffect(() => {
    if (autoSyncDone.current) return;
    if (!isNativePlatform()) return;
    if (!effectiveClientId) return;
    autoSyncDone.current = true;
    console.log('[HealthDashboard] auto-sync triggered on mount');
    syncMutation.mutate();
  }, [effectiveClientId]);
  
  // Detect if trainer is impersonating a client on web (on native, allow sync)
  const isImpersonating = effectiveClientId !== user?.id && !isNativePlatform();
  
  // Debug logging for health dashboard
  console.log('[HealthDashboard] auth uid:', user?.id, 'effectiveClientId:', effectiveClientId, 'isImpersonating:', isImpersonating, 'isNative:', isNativePlatform(), 'connectionsLoading:', connectionsLoading, 'connections:', JSON.stringify(connections));
  
  const isConnected = connections?.some(c => c.is_connected);
  const lastSync = connections?.find(c => c.is_connected)?.last_sync_at;
  const isNative = isNativePlatform();
  
  // FIX: Also show data section if we have non-zero stats (data exists even if connections query failed)
  const hasAnyStats = stats && (stats.todaySteps > 0 || stats.todayCalories > 0 || stats.avgHeartRate > 0 || stats.workoutsCount > 0);
  const showDataSection = isConnected || !isNative || hasAnyStats;
  
  console.log('[HealthDashboard] isConnected:', isConnected, 'lastSync:', lastSync, 'hasAnyStats:', hasAnyStats, 'showDataSection:', showDataSection);
  
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
          <div className="flex items-center gap-2 flex-wrap">
            {isConnected && lastSync && (
              <span className="text-sm text-muted-foreground">
                Last sync: {formatDistanceToNow(new Date(lastSync), { addSuffix: true })}
              </span>
            )}
            <Button
              variant="outline"
              onClick={() => setSnapshotOpen(true)}
            >
              <Camera className="h-4 w-4 mr-2" />
              AI Snapshot
            </Button>
            {isConnected && !isImpersonating && (
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
            <Button variant="ghost" size="icon" onClick={() => setShowDebug(d => !d)} title="Debug info">
              <Bug className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Debug banner — toggled via bug icon */}
        {showDebug && (
          <Alert variant="default" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30">
            <Bug className="h-4 w-4" />
            <AlertTitle>Health Debug Info</AlertTitle>
            <AlertDescription className="text-xs font-mono space-y-1">
              <p><strong>auth.uid:</strong> {user?.id ?? 'null'}</p>
              <p><strong>effectiveClientId:</strong> {effectiveClientId ?? 'null'}</p>
              <p><strong>isImpersonating:</strong> {String(effectiveClientId !== user?.id)}</p>
              <p><strong>isNative:</strong> {String(isNative)}</p>
              <p><strong>connections:</strong> {connectionsLoading ? 'loading...' : JSON.stringify(connections)}</p>
              <p><strong>connectionsError:</strong> <span className={connectionsError ? 'text-red-600 font-bold' : ''}>{connectionsError ? String(connectionsError) : 'none'}</span></p>
              <p><strong>isConnected:</strong> {String(isConnected)}</p>
              <p><strong>hasAnyStats:</strong> {String(hasAnyStats)}</p>
              <p><strong>showDataSection:</strong> {String(showDataSection)}</p>
              <p><strong>stats:</strong> {JSON.stringify(stats)}</p>
              <p><strong>statsError:</strong> <span className={statsError ? 'text-red-600 font-bold' : ''}>{statsError ? String(statsError) : 'none'}</span></p>
              <p><strong>tz offset:</strong> {new Date().getTimezoneOffset()} min (UTC{new Date().getTimezoneOffset() <= 0 ? '+' : '-'}{Math.abs(new Date().getTimezoneOffset() / 60)})</p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { queryClient.invalidateQueries({ queryKey: ['health-stats'] }); queryClient.invalidateQueries({ queryKey: ['health-connections'] }); queryClient.invalidateQueries({ queryKey: ['health-data'] }); toast.info('Force-refreshed all health queries'); }}>
                  Force Refresh Queries
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        {!isNative && !isConnected && !hasAnyStats && (
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
        
        {isNative && !isConnected && !connectionsLoading && !hasAnyStats && (
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
        
        {showDataSection && (
          <>
            <div>
              <h2 className="text-lg font-semibold mb-4">Today's Summary</h2>
              <ActivitySummary clientId={effectiveClientId} />
            </div>
            
            <div className="grid gap-6 lg:grid-cols-2">
              <HeartRateChart clientId={effectiveClientId} />
              <WeeklyActivityChart clientId={effectiveClientId} />
            </div>
          </>
        )}
      </div>

      <HealthSnapshotDialog open={snapshotOpen} onOpenChange={setSnapshotOpen} />
    </ClientLayout>
  );
}
