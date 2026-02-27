import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  syncHealthData, 
  requestHealthPermissions, 
  getHealthConnectionStatus,
  disconnectHealthProvider,
  isNativePlatform,
  getPlatform
} from '@/services/healthSyncService';
import { useAuth } from './useAuth';
import { useEffectiveClientId } from './useEffectiveClientId';
import { useEffect } from 'react';

// ── Edge-function fallback reader (bypasses RLS via service role) ────────────
async function edgeFnRead(body: Record<string, unknown>): Promise<any> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('No session for edge fn read');
  const res = await supabase.functions.invoke('read-health-stats', {
    headers: { Authorization: `Bearer ${session.access_token}` },
    body,
  });
  if (res.error) throw res.error;
  return res.data;
}

export interface HealthDataRow {
  id: string;
  client_id: string;
  data_type: string;
  value: number;
  unit: string | null;
  recorded_at: string;
  source: string;
  metadata: Record<string, unknown> | null;
  synced_at: string;
  created_at: string;
}

export interface HealthStats {
  todaySteps: number;
  todayCalories: number;
  avgHeartRate: number;
  restingHeartRate: number;
  activeMinutes: number;
  workoutsCount: number;
}

// Hook for fetching health data
export const useHealthData = (clientId?: string, dataType?: string, days: number = 7) => {
  const { user } = useAuth();
  const effectiveId = useEffectiveClientId();
  const targetClientId = clientId || effectiveId || user?.id;
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return useQuery({
    queryKey: ['health-data', targetClientId, dataType, days],
    queryFn: async () => {
      if (!targetClientId) return [];
      
      const isImpersonating = user?.id !== targetClientId;
      console.log('[useHealthData] auth.uid:', user?.id, 'effectiveId:', effectiveId, 'targetClientId:', targetClientId, 'isImpersonating:', isImpersonating, 'startDate:', startDate.toISOString());
      
      // ── Direct Supabase query (uses caller's JWT → subject to RLS) ──
      let query = supabase
        .from('health_data')
        .select('*')
        .eq('client_id', targetClientId)
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: false });
      
      if (dataType) {
        query = query.eq('data_type', dataType);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[useHealthData] QUERY ERROR:', error.message, error.code, error.details, '→ falling back to edge fn');
      }
      
      // ── Fallback to edge function when RLS returns 0 or errors ─────
      if ((!data || data.length === 0) && isImpersonating) {
        console.warn('[useHealthData] 0 rows via direct query while impersonating — trying edge fn bypass');
        try {
          const efRes = await edgeFnRead({ client_id: targetClientId, mode: 'data', data_type: dataType, days });
          if (efRes?.data && efRes.data.length > 0) {
            console.log('[useHealthData] edge fn returned', efRes.data.length, 'rows');
            return efRes.data as HealthDataRow[];
          }
        } catch (efErr: any) {
          console.error('[useHealthData] edge fn fallback failed:', efErr.message);
        }
      }
      
      if (error) throw error;
      console.log('[useHealthData] returned', data?.length, 'rows for', targetClientId);
      return data as HealthDataRow[];
    },
    enabled: !!targetClientId,
  });
};

// Hook for fetching health stats summary
export const useHealthStats = (clientId?: string) => {
  const { user } = useAuth();
  const effectiveId = useEffectiveClientId();
  const targetClientId = clientId || effectiveId || user?.id;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return useQuery({
    queryKey: ['health-stats', targetClientId],
    queryFn: async (): Promise<HealthStats> => {
      const emptyStats: HealthStats = {
        todaySteps: 0,
        todayCalories: 0,
        avgHeartRate: 0,
        restingHeartRate: 0,
        activeMinutes: 0,
        workoutsCount: 0,
      };
      if (!targetClientId) return emptyStats;
      
      const isImpersonating = user?.id !== targetClientId;
      console.log('[useHealthStats] auth.uid:', user?.id, 'effectiveId:', effectiveId, 'targetClientId:', targetClientId, 'isImpersonating:', isImpersonating, 'todayISO:', today.toISOString());
      
      // ── Direct Supabase query (subject to RLS) ────────────────────
      const { data, error } = await supabase
        .from('health_data')
        .select('*')
        .eq('client_id', targetClientId)
        .gte('recorded_at', today.toISOString());
      
      if (error) {
        console.error('[useHealthStats] QUERY ERROR:', error.message, error.code, error.details, 'clientId:', targetClientId);
      }
      
      console.log('[useHealthStats] clientId:', targetClientId, 'rows:', data?.length);
      
      // ── Edge function fallback when direct query yields nothing ────
      if ((!data || data.length === 0) && isImpersonating) {
        console.warn('[useHealthStats] 0 rows while impersonating — trying edge fn bypass');
        try {
          const efRes = await edgeFnRead({ client_id: targetClientId, mode: 'stats' });
          if (efRes?.stats) {
            console.log('[useHealthStats] edge fn returned stats:', JSON.stringify(efRes.stats), 'todayRows:', efRes.todayRows, 'allTimeCount:', efRes.allTimeCount);
            return efRes.stats as HealthStats;
          }
        } catch (efErr: any) {
          console.error('[useHealthStats] edge fn fallback failed:', efErr.message);
        }
      }
      
      // Diagnostic for own-user zero-data
      if ((!data || data.length === 0) && !isImpersonating) {
        const { data: allData, error: allErr } = await supabase
          .from('health_data')
          .select('id, data_type, value, recorded_at')
          .eq('client_id', targetClientId)
          .order('recorded_at', { ascending: false })
          .limit(10);
        console.warn('[useHealthStats] NO TODAY DATA (own user). All-time check:', allErr ? `ERROR: ${allErr.message}` : `${allData?.length} rows`, allData?.map(r => `${r.data_type}=${r.value} @ ${r.recorded_at}`));
      }
      
      if (error) throw error;
      
      const healthData = data || [];
      
      // Deduplicate steps & calories: take max value per hour bucket
      // (Apple Health reports raw samples from iPhone + Watch)
      function dedupeMaxPerHour(rows: typeof healthData): number {
        const byHour = new Map<string, number>();
        for (const r of rows) {
          const d = new Date(r.recorded_at);
          const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
          const cur = byHour.get(key) || 0;
          byHour.set(key, Math.max(cur, Number(r.value)));
        }
        return Array.from(byHour.values()).reduce((sum, v) => sum + v, 0);
      }
      
      // Calculate stats
      const stepsData = healthData.filter(d => d.data_type === 'steps');
      const caloriesData = healthData.filter(d => d.data_type === 'calories_burned');
      const heartRateData = healthData.filter(d => d.data_type === 'heart_rate');
      const restingHrData = healthData.filter(d => d.data_type === 'resting_heart_rate');
      const activeMinData = healthData.filter(d => d.data_type === 'active_minutes');
      const workoutData = healthData.filter(d => d.data_type === 'workout');
      
      console.log('[useHealthStats] breakdown — steps:', stepsData.length, 'cal:', caloriesData.length, 'hr:', heartRateData.length, 'rhr:', restingHrData.length, 'active:', activeMinData.length, 'workout:', workoutData.length);
      
      const result: HealthStats = {
        todaySteps: dedupeMaxPerHour(stepsData),
        todayCalories: dedupeMaxPerHour(caloriesData),
        avgHeartRate: heartRateData.length > 0 
          ? Math.round(heartRateData.reduce((sum, d) => sum + Number(d.value), 0) / heartRateData.length)
          : 0,
        restingHeartRate: restingHrData.length > 0 
          ? Math.round(restingHrData[restingHrData.length - 1].value)
          : 0,
        activeMinutes: activeMinData.reduce((sum, d) => sum + Number(d.value), 0),
        workoutsCount: workoutData.length,
      };
      console.log('[useHealthStats] RESULT:', JSON.stringify(result));
      return result;
    },
    enabled: !!targetClientId,
  });
};

// Hook for health connections
export const useHealthConnections = (clientId?: string) => {
  const { user } = useAuth();
  const effectiveId = useEffectiveClientId();
  const targetClientId = clientId || effectiveId || user?.id;
  
  return useQuery({
    queryKey: ['health-connections', targetClientId],
    queryFn: async () => {
      if (!targetClientId) return [];
      const isImpersonating = user?.id !== targetClientId;
      console.log('[useHealthConnections] auth.uid:', user?.id, 'effectiveId:', effectiveId, 'targetClientId:', targetClientId, 'isImpersonating:', isImpersonating);
      
      const result = await getHealthConnectionStatus(targetClientId);
      console.log('[useHealthConnections] result:', JSON.stringify(result));
      
      // ── Edge function fallback if RLS silently returned nothing ──
      if (result.length === 0 && isImpersonating) {
        console.warn('[useHealthConnections] 0 connections while impersonating — trying edge fn bypass');
        try {
          const efRes = await edgeFnRead({ client_id: targetClientId, mode: 'connections' });
          if (efRes?.connections && efRes.connections.length > 0) {
            console.log('[useHealthConnections] edge fn returned', efRes.connections.length, 'connections');
            return efRes.connections.map((c: any) => ({
              provider: c.provider as 'apple_health' | 'health_connect',
              is_connected: c.is_connected || false,
              last_sync_at: c.last_sync_at,
              permissions: (c.permissions as string[]) || [],
            }));
          }
        } catch (efErr: any) {
          console.error('[useHealthConnections] edge fn fallback failed:', efErr.message);
        }
      }
      
      return result;
    },
    enabled: !!targetClientId,
  });
};

// Hook for syncing health data
// On native: HealthKit data belongs to this device, so sync for the effective client (may be impersonated).
// On web: would write wrong person's data, so only allow for own account.
export const useSyncHealth = () => {
  const { user } = useAuth();
  const effectiveId = useEffectiveClientId();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const targetId = isNativePlatform() ? (effectiveId || user?.id) : user?.id;
      if (!targetId) throw new Error('Not authenticated');
      console.log('[useSyncHealth] syncing for targetId:', targetId, 'auth uid:', user?.id, 'native:', isNativePlatform());
      return syncHealthData(targetId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-data'] });
      queryClient.invalidateQueries({ queryKey: ['health-stats'] });
      queryClient.invalidateQueries({ queryKey: ['health-connections'] });
    },
  });
};

// Hook for connecting health provider
export const useConnectHealth = () => {
  const { user } = useAuth();
  const effectiveId = useEffectiveClientId();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const targetId = isNativePlatform() ? (effectiveId || user?.id) : user?.id;
      if (!targetId) throw new Error('Not authenticated');
      
      console.log('[useConnectHealth] requesting permissions for clientId:', targetId, 'native:', isNativePlatform());
      const granted = await requestHealthPermissions();
      if (!granted) {
        throw new Error('Health permissions not granted');
      }
      console.log('[useConnectHealth] permissions granted, syncing data...');
      
      // Sync initial data after connecting
      const result = await syncHealthData(targetId);
      console.log('[useConnectHealth] sync result:', result);
      
      // Immediately invalidate so UI refreshes even before onSuccess
      queryClient.invalidateQueries({ queryKey: ['health-connections'] });
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-connections'] });
      queryClient.invalidateQueries({ queryKey: ['health-data'] });
      queryClient.invalidateQueries({ queryKey: ['health-stats'] });
    },
  });
};

// Hook for disconnecting health provider
export const useDisconnectHealth = () => {
  const { user } = useAuth();
  const effectiveId = useEffectiveClientId();
  const queryClient = useQueryClient();
  const platform = getPlatform();
  
  return useMutation({
    mutationFn: async () => {
      const targetId = isNativePlatform() ? (effectiveId || user?.id) : user?.id;
      if (!targetId) throw new Error('Not authenticated');
      const provider = platform === 'ios' ? 'apple_health' : 'health_connect';
      return disconnectHealthProvider(targetId, provider);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-connections'] });
    },
  });
};

// Hook for realtime health data updates (for trainers)
export const useRealtimeHealthData = (clientId: string) => {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const channel = supabase
      .channel('health-data-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'health_data',
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['health-data', clientId] });
          queryClient.invalidateQueries({ queryKey: ['health-stats', clientId] });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, queryClient]);
};

// Export platform helpers
export { isNativePlatform, getPlatform };
