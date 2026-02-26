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
import { useEffect } from 'react';

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
  const impersonatedId = typeof window !== 'undefined' ? localStorage.getItem('impersonatedClientId') : null;
  const targetClientId = clientId || impersonatedId || user?.id;
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return useQuery({
    queryKey: ['health-data', targetClientId, dataType, days],
    queryFn: async () => {
      if (!targetClientId) return [];
      
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
      
      if (error) throw error;
      return data as HealthDataRow[];
    },
    enabled: !!targetClientId,
  });
};

// Hook for fetching health stats summary
export const useHealthStats = (clientId?: string) => {
  const { user } = useAuth();
  const impersonatedId = typeof window !== 'undefined' ? localStorage.getItem('impersonatedClientId') : null;
  const targetClientId = clientId || impersonatedId || user?.id;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return useQuery({
    queryKey: ['health-stats', targetClientId],
    queryFn: async (): Promise<HealthStats> => {
      if (!targetClientId) {
        return {
          todaySteps: 0,
          todayCalories: 0,
          avgHeartRate: 0,
          restingHeartRate: 0,
          activeMinutes: 0,
          workoutsCount: 0,
        };
      }
      
      const { data, error } = await supabase
        .from('health_data')
        .select('*')
        .eq('client_id', targetClientId)
        .gte('recorded_at', today.toISOString());
      
      if (error) throw error;
      
      const healthData = data || [];
      
      // Calculate stats
      const stepsData = healthData.filter(d => d.data_type === 'steps');
      const caloriesData = healthData.filter(d => d.data_type === 'calories_burned');
      const heartRateData = healthData.filter(d => d.data_type === 'heart_rate');
      const restingHrData = healthData.filter(d => d.data_type === 'resting_heart_rate');
      const activeMinData = healthData.filter(d => d.data_type === 'active_minutes');
      const workoutData = healthData.filter(d => d.data_type === 'workout');
      
      return {
        todaySteps: stepsData.reduce((sum, d) => sum + Number(d.value), 0),
        todayCalories: caloriesData.reduce((sum, d) => sum + Number(d.value), 0),
        avgHeartRate: heartRateData.length > 0 
          ? Math.round(heartRateData.reduce((sum, d) => sum + Number(d.value), 0) / heartRateData.length)
          : 0,
        restingHeartRate: restingHrData.length > 0 
          ? Math.round(restingHrData[restingHrData.length - 1].value)
          : 0,
        activeMinutes: activeMinData.reduce((sum, d) => sum + Number(d.value), 0),
        workoutsCount: workoutData.length,
      };
    },
    enabled: !!targetClientId,
  });
};

// Hook for health connections
export const useHealthConnections = (clientId?: string) => {
  const { user } = useAuth();
  const impersonatedId = typeof window !== 'undefined' ? localStorage.getItem('impersonatedClientId') : null;
  const targetClientId = clientId || impersonatedId || user?.id;
  
  return useQuery({
    queryKey: ['health-connections', targetClientId],
    queryFn: async () => {
      if (!targetClientId) return [];
      return getHealthConnectionStatus(targetClientId);
    },
    enabled: !!targetClientId,
  });
};

// Hook for syncing health data
export const useSyncHealth = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const impersonatedId = typeof window !== 'undefined' ? localStorage.getItem('impersonatedClientId') : null;
  
  return useMutation({
    mutationFn: async () => {
      const targetId = impersonatedId || user?.id;
      if (!targetId) throw new Error('Not authenticated');
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
  const queryClient = useQueryClient();
  const impersonatedId = typeof window !== 'undefined' ? localStorage.getItem('impersonatedClientId') : null;
  
  return useMutation({
    mutationFn: async () => {
      const targetId = impersonatedId || user?.id;
      if (!targetId) throw new Error('Not authenticated');
      
      const granted = await requestHealthPermissions();
      if (!granted) {
        throw new Error('Health permissions not granted');
      }
      
      // Sync initial data after connecting
      return syncHealthData(targetId);
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
  const queryClient = useQueryClient();
  const platform = getPlatform();
  const impersonatedId = typeof window !== 'undefined' ? localStorage.getItem('impersonatedClientId') : null;
  
  return useMutation({
    mutationFn: async () => {
      const targetId = impersonatedId || user?.id;
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
