import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { triggerHealthNotification } from '@/hooks/useHealthNotifications';

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

// ─── HealthKit (iOS) ────────────────────────────────────────────────────────

let HealthKit: any = null;

async function getHealthKit() {
  if (HealthKit) return HealthKit;
  try {
    // @ts-ignore – Plugin installed locally in native project, not in web deps
    const mod = await import(/* @vite-ignore */ '@nicearma/capacitor-healthkit');
    HealthKit = mod.HealthKit;
    return HealthKit;
  } catch {
    console.warn('HealthKit plugin not installed – running in stub mode');
    return null;
  }
}

// ─── Health Connect (Android) ───────────────────────────────────────────────

let HealthConnect: any = null;

async function getHealthConnect() {
  if (HealthConnect) return HealthConnect;
  try {
    // @ts-ignore – Plugin installed locally in native project, not in web deps
    const mod = await import(/* @vite-ignore */ '@nicearma/capacitor-health-connect');
    HealthConnect = mod.HealthConnect;
    return HealthConnect;
  } catch {
    console.warn('Health Connect plugin not installed – running in stub mode');
    return null;
  }
}

// ─── Permissions ────────────────────────────────────────────────────────────

export const requestHealthPermissions = async (): Promise<boolean> => {
  const platform = getPlatform();

  if (platform === 'web') {
    console.log('Health permissions not available on web');
    return false;
  }

  try {
    if (platform === 'ios') {
      const hk = await getHealthKit();
      if (!hk) return false;

      const result = await hk.requestAuthorization({
        all: [],
        read: [
          'HKQuantityTypeIdentifierHeartRate',
          'HKQuantityTypeIdentifierRestingHeartRate',
          'HKQuantityTypeIdentifierStepCount',
          'HKQuantityTypeIdentifierActiveEnergyBurned',
          'HKQuantityTypeIdentifierAppleExerciseTime',
        ],
        write: [],
      });
      return result?.granted ?? true; // HealthKit doesn't reject, just limits data
    }

    if (platform === 'android') {
      const hc = await getHealthConnect();
      if (!hc) return false;

      await hc.requestHealthPermissions({
        read: [
          'HeartRate',
          'RestingHeartRate',
          'Steps',
          'ActiveCaloriesBurned',
          'ExerciseSession',
        ],
        write: [],
      });
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error requesting health permissions:', error);
    return false;
  }
};

// ─── iOS heart-rate queries ────────────────────────────────────────────────

async function queryIOSHeartRate(since: Date): Promise<HealthDataPoint[]> {
  const hk = await getHealthKit();
  if (!hk) return [];

  const points: HealthDataPoint[] = [];

  try {
    // Current / workout heart rate samples
    const hrResult = await hk.queryHKitSampleType({
      sampleName: 'HKQuantityTypeIdentifierHeartRate',
      startDate: since.toISOString(),
      endDate: new Date().toISOString(),
      limit: 500,
    });

    for (const sample of hrResult?.resultData ?? []) {
      points.push({
        data_type: 'heart_rate',
        value: Math.round(sample.value),
        unit: 'bpm',
        recorded_at: sample.startDate ?? sample.date,
        source: 'apple_health',
        metadata: { device: sample.sourceName } as Json,
      });
    }

    // Resting heart rate
    const restingResult = await hk.queryHKitSampleType({
      sampleName: 'HKQuantityTypeIdentifierRestingHeartRate',
      startDate: since.toISOString(),
      endDate: new Date().toISOString(),
      limit: 100,
    });

    for (const sample of restingResult?.resultData ?? []) {
      points.push({
        data_type: 'resting_heart_rate',
        value: Math.round(sample.value),
        unit: 'bpm',
        recorded_at: sample.startDate ?? sample.date,
        source: 'apple_health',
        metadata: { device: sample.sourceName } as Json,
      });
    }
  } catch (err) {
    console.error('iOS heart rate query error:', err);
  }

  return points;
}

async function queryIOSStepsAndCalories(since: Date): Promise<HealthDataPoint[]> {
  const hk = await getHealthKit();
  if (!hk) return [];

  const points: HealthDataPoint[] = [];

  try {
    const stepsResult = await hk.queryHKitSampleType({
      sampleName: 'HKQuantityTypeIdentifierStepCount',
      startDate: since.toISOString(),
      endDate: new Date().toISOString(),
      limit: 500,
    });

    for (const sample of stepsResult?.resultData ?? []) {
      points.push({
        data_type: 'steps',
        value: Math.round(sample.value),
        unit: 'count',
        recorded_at: sample.startDate ?? sample.date,
        source: 'apple_health',
      });
    }

    const calResult = await hk.queryHKitSampleType({
      sampleName: 'HKQuantityTypeIdentifierActiveEnergyBurned',
      startDate: since.toISOString(),
      endDate: new Date().toISOString(),
      limit: 500,
    });

    for (const sample of calResult?.resultData ?? []) {
      points.push({
        data_type: 'calories_burned',
        value: Math.round(sample.value),
        unit: 'kcal',
        recorded_at: sample.startDate ?? sample.date,
        source: 'apple_health',
      });
    }
  } catch (err) {
    console.error('iOS steps/calories query error:', err);
  }

  return points;
}

// ─── Android Health Connect queries ─────────────────────────────────────────

async function queryAndroidHeartRate(since: Date): Promise<HealthDataPoint[]> {
  const hc = await getHealthConnect();
  if (!hc) return [];

  const points: HealthDataPoint[] = [];

  try {
    const hrResult = await hc.readRecords({
      type: 'HeartRate',
      timeRangeFilter: {
        startTime: since.toISOString(),
        endTime: new Date().toISOString(),
      },
    });

    for (const record of hrResult?.records ?? []) {
      for (const sample of record.samples ?? [record]) {
        points.push({
          data_type: 'heart_rate',
          value: Math.round(sample.beatsPerMinute ?? sample.value ?? 0),
          unit: 'bpm',
          recorded_at: sample.time ?? record.startTime,
          source: 'health_connect',
          metadata: { device: record.metadata?.dataOrigin } as Json,
        });
      }
    }

    const restingResult = await hc.readRecords({
      type: 'RestingHeartRate',
      timeRangeFilter: {
        startTime: since.toISOString(),
        endTime: new Date().toISOString(),
      },
    });

    for (const record of restingResult?.records ?? []) {
      points.push({
        data_type: 'resting_heart_rate',
        value: Math.round(record.beatsPerMinute ?? record.value ?? 0),
        unit: 'bpm',
        recorded_at: record.time ?? record.startTime,
        source: 'health_connect',
      });
    }
  } catch (err) {
    console.error('Android heart rate query error:', err);
  }

  return points;
}

async function queryAndroidStepsAndCalories(since: Date): Promise<HealthDataPoint[]> {
  const hc = await getHealthConnect();
  if (!hc) return [];

  const points: HealthDataPoint[] = [];

  try {
    const stepsResult = await hc.readRecords({
      type: 'Steps',
      timeRangeFilter: {
        startTime: since.toISOString(),
        endTime: new Date().toISOString(),
      },
    });

    for (const record of stepsResult?.records ?? []) {
      points.push({
        data_type: 'steps',
        value: record.count ?? 0,
        unit: 'count',
        recorded_at: record.startTime,
        source: 'health_connect',
      });
    }

    const calResult = await hc.readRecords({
      type: 'ActiveCaloriesBurned',
      timeRangeFilter: {
        startTime: since.toISOString(),
        endTime: new Date().toISOString(),
      },
    });

    for (const record of calResult?.records ?? []) {
      points.push({
        data_type: 'calories_burned',
        value: Math.round(record.energy?.inKilocalories ?? 0),
        unit: 'kcal',
        recorded_at: record.startTime,
        source: 'health_connect',
      });
    }
  } catch (err) {
    console.error('Android steps/calories query error:', err);
  }

  return points;
}

// ─── Main sync ──────────────────────────────────────────────────────────────

export const syncHealthData = async (clientId: string): Promise<{ success: boolean; count: number }> => {
  const platform = getPlatform();

  if (platform === 'web') {
    return { success: false, count: 0 };
  }

  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const source = platform === 'ios' ? 'apple_health' : 'health_connect';

    let healthDataPoints: HealthDataPoint[] = [];

    if (platform === 'ios') {
      const [hrPoints, activityPoints] = await Promise.all([
        queryIOSHeartRate(sevenDaysAgo),
        queryIOSStepsAndCalories(sevenDaysAgo),
      ]);
      healthDataPoints = [...hrPoints, ...activityPoints];
    } else {
      const [hrPoints, activityPoints] = await Promise.all([
        queryAndroidHeartRate(sevenDaysAgo),
        queryAndroidStepsAndCalories(sevenDaysAgo),
      ]);
      healthDataPoints = [...hrPoints, ...activityPoints];
    }

    if (healthDataPoints.length > 0) {
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
        provider: source,
        is_connected: true,
        last_sync_at: new Date().toISOString(),
        permissions: ['heart_rate', 'resting_heart_rate', 'steps', 'calories', 'workouts'],
      }, { onConflict: 'client_id,provider' });

    // Get today's totals for notification
    const today = new Date().toISOString().split('T')[0];
    const { data: todayData } = await supabase
      .from('health_data')
      .select('data_type, value')
      .eq('client_id', clientId)
      .gte('recorded_at', `${today}T00:00:00`)
      .lte('recorded_at', `${today}T23:59:59`);

    const todaySteps = todayData?.find(d => d.data_type === 'steps')?.value || 0;
    const todayCalories = todayData?.find(d => d.data_type === 'calories_burned')?.value || 0;
    const todayHeartRate = todayData?.find(d => d.data_type === 'heart_rate')?.value;

    // Trigger health sync notification
    await triggerHealthNotification(clientId, 'health_sync', {
      steps: todaySteps,
      calories: todayCalories,
      heart_rate: todayHeartRate,
      provider: source,
    });

    // Check for low activity and trigger alert if needed
    const isLowActivity = todaySteps < 5000 || todayCalories < 300;
    if (isLowActivity && new Date().getHours() >= 18) {
      await triggerHealthNotification(clientId, 'low_activity', {
        steps: todaySteps,
        calories: todayCalories,
      });
    }

    // Check for heart rate alerts
    if (todayHeartRate && (todayHeartRate > 100 || todayHeartRate < 50)) {
      await triggerHealthNotification(clientId, 'heart_rate_alert', {
        heart_rate: todayHeartRate,
      });
    }

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
