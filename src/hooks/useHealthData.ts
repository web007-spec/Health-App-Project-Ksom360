import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  syncHealthData, 
  requestHealthPermissions, 
  getHealthConnectionStatus,
  disconnectHealthProvider,
  isNativePlatform,
  getPlatform,
  queryTodayLiveStats
} from '@/services/healthSyncService';
import { useAuth } from './useAuth';
import { useEffectiveClientId } from './useEffectiveClientId';
import { useEffect } from 'react';

// ── Edge-function fallback reader (bypasses RLS via service role) ────────────
async function edgeFnRead(body: Record<string, unknown>): Promise<any> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('No session for edge fn read');
  // Pass the client's timezone offset so the edge function computes
  // "today" relative to the user's local midnight, not UTC midnight.
  const tz_offset = -(new Date().getTimezoneOffset());  // JS gives offset inverted
  const res = await supabase.functions.invoke('read-health-stats', {
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: { ...body, tz_offset },
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
  todayActiveEnergy: number;
  todayRestingEnergy: number;
  todaySleep: number;
  todayWeight: number | null;
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

// Normalize edge function stats response to our HealthStats shape.
// The edge function may return different field names (e.g. activeEnergy vs todayActiveEnergy).
function normalizeEdgeStats(raw: Record<string, any>): HealthStats {
  return {
    todaySteps: raw.todaySteps ?? 0,
    todayCalories: raw.todayCalories ?? raw.activeEnergy ?? 0,
    todayActiveEnergy: raw.todayActiveEnergy ?? raw.activeEnergy ?? 0,
    todayRestingEnergy: raw.todayRestingEnergy ?? raw.restingEnergy ?? 0,
    todaySleep: raw.todaySleep ?? (raw.sleepHours != null ? Math.round(raw.sleepHours * 60) : 0),
    todayWeight: raw.todayWeight ?? raw.weight ?? null,
    avgHeartRate: raw.avgHeartRate ?? 0,
    restingHeartRate: raw.restingHeartRate ?? 0,
    activeMinutes: raw.activeMinutes ?? 0,
    workoutsCount: raw.workoutsCount ?? 0,
  };
}

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
        todayActiveEnergy: 0,
        todayRestingEnergy: 0,
        todaySleep: 0,
        todayWeight: null,
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
            return normalizeEdgeStats(efRes.stats);
          }
        } catch (efErr: any) {
          console.error('[useHealthStats] edge fn fallback failed:', efErr.message);
        }
      }
      
      // Fallback for own-user zero-data — try edge function as well
      // (handles case where RLS is misconfigured or client_id mismatch)
      if ((!data || data.length === 0) && !isImpersonating) {
        const { data: allData, error: allErr } = await supabase
          .from('health_data')
          .select('id, data_type, value, recorded_at')
          .eq('client_id', targetClientId)
          .order('recorded_at', { ascending: false })
          .limit(10);
        console.warn('[useHealthStats] NO TODAY DATA (own user). All-time check:', allErr ? `ERROR: ${allErr.message}` : `${allData?.length} rows`, allData?.map(r => `${r.data_type}=${r.value} @ ${r.recorded_at}`));
        
        // If there IS data in the table but the today-filter returned nothing,
        // OR direct query errored out, try the edge function which uses
        // service-role and computes stats server-side.
        if ((allData && allData.length > 0) || error) {
          console.warn('[useHealthStats] Own-user data exists but today query returned 0 — trying edge fn');
          try {
            const efRes = await edgeFnRead({ client_id: targetClientId, mode: 'stats' });
            if (efRes?.stats) {
              console.log('[useHealthStats] edge fn (own-user) returned stats:', JSON.stringify(efRes.stats));
              return normalizeEdgeStats(efRes.stats);
            }
          } catch (efErr: any) {
            console.error('[useHealthStats] edge fn (own-user) fallback failed:', efErr.message);
          }
        }
      }
      
      if (error) throw error;
      
      const healthData = data || [];
      
      // Fetch latest weight separately — weight is logged infrequently,
      // so we look back all-time instead of just today.
      let latestWeight: number | null = null;
      try {
        const { data: weightRows } = await supabase
          .from('health_data')
          .select('value, recorded_at')
          .eq('client_id', targetClientId)
          .eq('data_type', 'weight')
          .order('recorded_at', { ascending: false })
          .limit(1);
        if (weightRows && weightRows.length > 0) {
          latestWeight = Number(weightRows[0].value);
        }
      } catch (wErr) {
        console.warn('[useHealthStats] weight lookup failed:', wErr);
      }
      
      // Sum steps & calories across hour buckets.
      // After the sync-side fix, each DB row already holds the correct
      // per-hour total (summed per source, max across sources).
      // If multiple rows per hour still exist (e.g. old data), take
      // the MAX within each hour to avoid double-counting, then sum hours.
      function dedupeMaxPerHour(rows: typeof healthData): number {
        const byHour = new Map<string, number>();
        for (const r of rows) {
          const d = new Date(r.recorded_at);
          const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
          const cur = byHour.get(key) || 0;
          // Use MAX here because each row should already be an hourly sum;
          // if the sync-side correctly merged, there's only one row per hour.
          byHour.set(key, Math.max(cur, Number(r.value)));
        }
        return Array.from(byHour.values()).reduce((sum, v) => sum + v, 0);
      }
      
      // Calculate stats
      const stepsData = healthData.filter(d => d.data_type === 'steps');
      const activeEnergyData = healthData.filter(d => d.data_type === 'active_energy');
      const caloriesData = healthData.filter(d => d.data_type === 'calories_burned');
      const restingEnergyData = healthData.filter(d => d.data_type === 'resting_energy');
      const sleepData = healthData.filter(d => d.data_type === 'sleep');
      const weightData = healthData.filter(d => d.data_type === 'weight');
      const heartRateData = healthData.filter(d => d.data_type === 'heart_rate');
      const restingHrData = healthData.filter(d => d.data_type === 'resting_heart_rate');
      const activeMinData = healthData.filter(d => d.data_type === 'active_minutes');
      const workoutData = healthData.filter(d => d.data_type === 'workout');
      
      console.log('[useHealthStats] breakdown — steps:', stepsData.length, 'activeEnergy:', activeEnergyData.length, 'cal(legacy):', caloriesData.length, 'restingEnergy:', restingEnergyData.length, 'sleep:', sleepData.length, 'weight:', weightData.length, 'hr:', heartRateData.length, 'rhr:', restingHrData.length, 'active:', activeMinData.length, 'workout:', workoutData.length);
      
      // Active energy: prefer new 'active_energy' type, fallback to legacy 'calories_burned'
      const effectiveActiveEnergyData = activeEnergyData.length > 0 ? activeEnergyData : caloriesData;
      
      // Sleep: sum all sleep segments for today (value is in minutes)
      const todaySleepMinutes = sleepData.reduce((sum, d) => sum + Number(d.value), 0);
      
      // Weight: use the separately-fetched latest reading (not limited to today)
      // If today has a weight reading, prefer that over the 90-day lookup
      if (weightData.length > 0) {
        latestWeight = Number(weightData.sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0].value);
      }
      
      // On native iOS, get live cumulative stats directly from HealthKit
      // (using HKStatisticsQuery). These match Apple Health exactly and
      // don't depend on the DB sync being up to date.
      let liveSteps = dedupeMaxPerHour(stepsData);
      let liveActiveEnergy = dedupeMaxPerHour(effectiveActiveEnergyData);
      let liveRestingEnergy = dedupeMaxPerHour(restingEnergyData);

      try {
        const liveStats = await queryTodayLiveStats();
        if (liveStats) {
          console.log('[useHealthStats] live HealthKit stats:', JSON.stringify(liveStats));
          // Use live values if they're > 0 (HealthKit has data)
          if (liveStats.steps > 0) liveSteps = liveStats.steps;
          if (liveStats.activeEnergy > 0) liveActiveEnergy = liveStats.activeEnergy;
          if (liveStats.restingEnergy > 0) liveRestingEnergy = liveStats.restingEnergy;
          if (liveStats.latestWeight !== null) latestWeight = liveStats.latestWeight;
        }
      } catch (liveErr) {
        console.warn('[useHealthStats] live stats failed, using DB values:', liveErr);
      }

      const result: HealthStats = {
        todaySteps: liveSteps,
        todayCalories: liveActiveEnergy,
        todayActiveEnergy: liveActiveEnergy,
        todayRestingEnergy: liveRestingEnergy,
        todaySleep: todaySleepMinutes,
        todayWeight: latestWeight,
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

// Hook for health connections — also exposes error for debug panels
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
