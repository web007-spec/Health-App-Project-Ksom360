import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

// Type definitions for health data
export interface HealthDataPoint {
  data_type: 'heart_rate' | 'calories_burned' | 'steps' | 'active_minutes' | 'workout' | 'resting_heart_rate';
  value: number;
  unit: string;
  recorded_at: string;
  source: 'apple_health' | 'samsung_health' | 'google_fit' | 'health_connect';
  metadata?: Json;
}

export interface HealthConnection {
  provider: 'apple_health' | 'health_connect';
  is_connected: boolean;
  last_sync_at: string | null;
  permissions: string[];
}

// Check if running on native platform
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

// Get current platform
export const getPlatform = (): 'ios' | 'android' | 'web' => {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') return 'ios';
  if (platform === 'android') return 'android';
  return 'web';
};

// Request health permissions based on platform
export const requestHealthPermissions = async (): Promise<boolean> => {
  const platform = getPlatform();
  
  if (platform === 'web') {
    console.log('Health permissions not available on web');
    return false;
  }
  
  try {
    if (platform === 'ios') {
      // HealthKit permissions request would go here
      // This requires the actual HealthKit plugin to be installed
      console.log('Requesting HealthKit permissions...');
      // Simulated success for now - actual implementation requires plugin
      return true;
    } else if (platform === 'android') {
      // Health Connect permissions request would go here
      // This requires the actual Health Connect plugin to be installed
      console.log('Requesting Health Connect permissions...');
      // Simulated success for now - actual implementation requires plugin
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error requesting health permissions:', error);
    return false;
  }
};

// Sync health data from the device
export const syncHealthData = async (clientId: string): Promise<{ success: boolean; count: number }> => {
  const platform = getPlatform();
  
  if (platform === 'web') {
    return { success: false, count: 0 };
  }
  
  try {
    // Get data from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const source = platform === 'ios' ? 'apple_health' : 'health_connect';
    
    // This is where actual health data would be fetched from HealthKit/Health Connect
    // For now, we'll create mock data structure that would be replaced with actual plugin calls
    const healthDataPoints: HealthDataPoint[] = [];
    
    // In production, this would be:
    // const heartRateData = await HealthKit.queryHeartRate({ startDate: sevenDaysAgo });
    // const stepsData = await HealthKit.querySteps({ startDate: sevenDaysAgo });
    // etc.
    
    if (healthDataPoints.length > 0) {
      // Insert health data with upsert to avoid duplicates
      const { error } = await supabase
        .from('health_data')
        .upsert(
          healthDataPoints.map(point => ({
            client_id: clientId,
            ...point,
          })),
          { onConflict: 'client_id,data_type,recorded_at' }
        );
      
      if (error) throw error;
    }
    
    // Update last sync time
    await supabase
      .from('health_connections')
      .upsert({
        client_id: clientId,
        provider: platform === 'ios' ? 'apple_health' : 'health_connect',
        is_connected: true,
        last_sync_at: new Date().toISOString(),
        permissions: ['heart_rate', 'steps', 'calories', 'workouts'],
      }, { onConflict: 'client_id,provider' });
    
    return { success: true, count: healthDataPoints.length };
  } catch (error) {
    console.error('Error syncing health data:', error);
    return { success: false, count: 0 };
  }
};

// Disconnect health provider
export const disconnectHealthProvider = async (clientId: string, provider: 'apple_health' | 'health_connect'): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('health_connections')
      .update({ is_connected: false })
      .eq('client_id', clientId)
      .eq('provider', provider);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error disconnecting health provider:', error);
    return false;
  }
};

// Get health connection status
export const getHealthConnectionStatus = async (clientId: string): Promise<HealthConnection[]> => {
  try {
    const { data, error } = await supabase
      .from('health_connections')
      .select('*')
      .eq('client_id', clientId);
    
    if (error) throw error;
    
    return (data || []).map(conn => ({
      provider: conn.provider as 'apple_health' | 'health_connect',
      is_connected: conn.is_connected || false,
      last_sync_at: conn.last_sync_at,
      permissions: (conn.permissions as string[]) || [],
    }));
  } catch (error) {
    console.error('Error getting health connection status:', error);
    return [];
  }
};
