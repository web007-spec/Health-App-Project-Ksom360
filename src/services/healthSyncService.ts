import { Capacitor, registerPlugin } from '@capacitor/core';
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

// ─── Local connection tracking (fallback when RLS blocks DB writes) ─────────
const LOCAL_CONN_KEY = 'native_health_connected';

export function setLocalHealthConnected(clientId: string, provider: string) {
  const data = { clientId, provider, connectedAt: new Date().toISOString(), lastSyncAt: new Date().toISOString() };
  localStorage.setItem(`${LOCAL_CONN_KEY}_${clientId}`, JSON.stringify(data));
  console.log('[localConn] saved connection for', clientId);
}

export function getLocalHealthConnection(clientId: string): { provider: string; lastSyncAt: string } | null {
  try {
    const raw = localStorage.getItem(`${LOCAL_CONN_KEY}_${clientId}`);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return { provider: data.provider, lastSyncAt: data.lastSyncAt };
  } catch {
    return null;
  }
}

export function clearLocalHealthConnection(clientId: string) {
  localStorage.removeItem(`${LOCAL_CONN_KEY}_${clientId}`);
}

// Get current platform
export const getPlatform = (): 'ios' | 'android' | 'web' => {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') return 'ios';
  if (platform === 'android') return 'android';
  return 'web';
};

// ─── HealthKit (iOS) ────────────────────────────────────────────────────────
// Use Capacitor's registerPlugin to create a JS proxy that talks to the native Swift plugin.
// The name 'CapacitorHealthkit' must match jsName in CapacitorHealthkitPlugin.swift.

let HealthKit: any = null;

function getHealthKit() {
  if (HealthKit) return HealthKit;
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') return null;
  try {
    HealthKit = registerPlugin('CapacitorHealthkit');
    return HealthKit;
  } catch {
    console.warn('HealthKit plugin not available');
    return null;
  }
}

// ─── Health Connect (Android) ───────────────────────────────────────────────

let HealthConnect: any = null;

async function getHealthConnect() {
  if (HealthConnect) return HealthConnect;
  try {
    const pkg = ['@nicholasquinn', 'capacitor-healthconnect'].join('/');
    const mod = await (new Function('p', 'return import(p)'))(pkg);
    HealthConnect = mod.CapacitorHealthConnect || mod.HealthConnect || mod.default;
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
      const hk = getHealthKit();
      if (!hk) return false;

      await hk.requestAuthorization({
        all: [],
        read: [
          'heartRate',
          'restingHeartRate',
          'stepCount',
          'activeEnergyBurned',
          'appleExerciseTime',
          'workoutType',
        ],
        write: [],
      });
      return true; // HealthKit doesn't reject, just limits data
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
  const hk = getHealthKit();
  if (!hk) return [];

  const points: HealthDataPoint[] = [];

  try {
    // Current / workout heart rate samples
    const hrResult = await hk.queryHKitSampleType({
      sampleName: 'heartRate',
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
      sampleName: 'restingHeartRate',
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

// ─── Hourly deduplication helper ──────────────────────────────────────────────
// Apple Health returns raw samples from both iPhone AND Watch.
// We bucket by hour and take the MAX per hour to avoid double-counting.
function deduplicateHourly(points: HealthDataPoint[]): HealthDataPoint[] {
  const buckets = new Map<string, HealthDataPoint>();
  for (const p of points) {
    // Bucket key = data_type + hour
    const d = new Date(p.recorded_at);
    const hourKey = `${p.data_type}|${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:00:00`;
    const existing = buckets.get(hourKey);
    if (!existing || p.value > existing.value) {
      // Use the hour-start as recorded_at for consistent dedup
      const hourStart = new Date(d);
      hourStart.setMinutes(0, 0, 0);
      buckets.set(hourKey, { ...p, recorded_at: hourStart.toISOString() });
    }
  }
  return Array.from(buckets.values());
}

async function queryIOSStepsAndCalories(since: Date): Promise<HealthDataPoint[]> {
  const hk = getHealthKit();
  if (!hk) return [];

  const rawPoints: HealthDataPoint[] = [];

  try {
    const stepsResult = await hk.queryHKitSampleType({
      sampleName: 'stepCount',
      startDate: since.toISOString(),
      endDate: new Date().toISOString(),
      limit: 1000,
    });

    for (const sample of stepsResult?.resultData ?? []) {
      rawPoints.push({
        data_type: 'steps',
        value: Math.round(sample.value),
        unit: 'count',
        recorded_at: sample.startDate ?? sample.date,
        source: 'apple_health',
      });
    }

    const calResult = await hk.queryHKitSampleType({
      sampleName: 'activeEnergyBurned',
      startDate: since.toISOString(),
      endDate: new Date().toISOString(),
      limit: 1000,
    });

    for (const sample of calResult?.resultData ?? []) {
      rawPoints.push({
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

  // Deduplicate: iPhone + Watch both report raw samples → take max per hour
  const deduped = deduplicateHourly(rawPoints);
  console.log('[queryIOSStepsAndCalories] raw:', rawPoints.length, 'deduped:', deduped.length);
  return deduped;
}

// ─── iOS Active Minutes + Workouts ──────────────────────────────────────────

async function queryIOSActiveMinutesAndWorkouts(since: Date): Promise<HealthDataPoint[]> {
  const hk = getHealthKit();
  if (!hk) return [];

  const points: HealthDataPoint[] = [];

  try {
    // Apple Exercise Time (active minutes)
    const exerciseResult = await hk.queryHKitSampleType({
      sampleName: 'appleExerciseTime',
      startDate: since.toISOString(),
      endDate: new Date().toISOString(),
      limit: 500,
    });

    for (const sample of exerciseResult?.resultData ?? []) {
      points.push({
        data_type: 'active_minutes',
        value: Math.round(sample.value),
        unit: 'min',
        recorded_at: sample.startDate ?? sample.date,
        source: 'apple_health',
      });
    }
    console.log('[queryIOSActiveMinutesAndWorkouts] exercise time samples:', exerciseResult?.resultData?.length ?? 0);

    // Workouts (HKWorkoutType)
    const workoutResult = await hk.queryHKitSampleType({
      sampleName: 'workoutType',
      startDate: since.toISOString(),
      endDate: new Date().toISOString(),
      limit: 100,
    });

    for (const workout of workoutResult?.resultData ?? []) {
      points.push({
        data_type: 'workout',
        value: Math.round((workout.duration ?? 0) / 60), // seconds → minutes
        unit: 'min',
        recorded_at: workout.startDate ?? workout.date,
        source: 'apple_health',
        metadata: {
          workoutType: workout.workoutActivityName,
          calories: workout.totalEnergyBurned,
          distance: workout.totalDistance,
        } as Json,
      });
    }
    console.log('[queryIOSActiveMinutesAndWorkouts] workouts:', workoutResult?.resultData?.length ?? 0);
  } catch (err) {
    console.error('iOS active minutes/workouts query error:', err);
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
    const permissions = ['heart_rate', 'resting_heart_rate', 'steps', 'calories', 'workouts'];

    // Always save locally so UI shows connected immediately
    setLocalHealthConnected(clientId, source);

    let healthDataPoints: HealthDataPoint[] = [];

    if (platform === 'ios') {
      const [hrPoints, activityPoints, activeWorkoutPoints] = await Promise.all([
        queryIOSHeartRate(sevenDaysAgo),
        queryIOSStepsAndCalories(sevenDaysAgo),
        queryIOSActiveMinutesAndWorkouts(sevenDaysAgo),
      ]);
      healthDataPoints = [...hrPoints, ...activityPoints, ...activeWorkoutPoints];
    } else {
      const [hrPoints, activityPoints] = await Promise.all([
        queryAndroidHeartRate(sevenDaysAgo),
        queryAndroidStepsAndCalories(sevenDaysAgo),
      ]);
      healthDataPoints = [...hrPoints, ...activityPoints];
    }

    console.log('[syncHealthData] fetched', healthDataPoints.length, 'points from', source, 'for client', clientId);

    // Send to edge function (uses service role, bypasses RLS)
    const { data: { session } } = await supabase.auth.getSession();
    const response = await supabase.functions.invoke('sync-health-insert', {
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: {
        client_id: clientId,
        provider: source,
        health_data: healthDataPoints,
        permissions,
      },
    });

    if (response.error) {
      console.error('[syncHealthData] edge function error:', response.error);
      // Fallback: try direct insert (works if user is the client themselves)
      console.log('[syncHealthData] falling back to direct insert...');
      await directInsertFallback(clientId, source, healthDataPoints, permissions);
    } else {
      console.log('[syncHealthData] edge function success:', response.data);
    }

    // Trigger notifications (non-critical, don't fail sync)
    try {
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

      await triggerHealthNotification(clientId, 'health_sync', {
        steps: todaySteps,
        calories: todayCalories,
        heart_rate: todayHeartRate,
        provider: source,
      });

      const isLowActivity = Number(todaySteps) < 5000 || Number(todayCalories) < 300;
      if (isLowActivity && new Date().getHours() >= 18) {
        await triggerHealthNotification(clientId, 'low_activity', {
          steps: todaySteps,
          calories: todayCalories,
        });
      }

      if (todayHeartRate && (Number(todayHeartRate) > 100 || Number(todayHeartRate) < 50)) {
        await triggerHealthNotification(clientId, 'heart_rate_alert', {
          heart_rate: todayHeartRate,
        });
      }
    } catch (notifError) {
      console.warn('[syncHealthData] notification error (non-fatal):', notifError);
    }

    return { success: true, count: healthDataPoints.length };
  } catch (error) {
    console.error('Error syncing health data:', error);
    return { success: false, count: 0 };
  }
};

// Direct insert fallback (works when auth.uid() === client_id)
async function directInsertFallback(
  clientId: string,
  provider: string,
  healthDataPoints: HealthDataPoint[],
  permissions: string[]
) {
  // Upsert connection
  const { error: connError } = await supabase
    .from('health_connections')
    .upsert({
      client_id: clientId,
      provider,
      is_connected: true,
      last_sync_at: new Date().toISOString(),
      permissions,
    }, { onConflict: 'client_id,provider' });
  if (connError) console.error('[directInsertFallback] health_connections error:', connError);

  // Upsert data
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
    if (error) console.error('[directInsertFallback] health_data error:', error);
  }
}

// Disconnect health provider
export const disconnectHealthProvider = async (clientId: string, provider: 'apple_health' | 'health_connect'): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('health_connections')
      .update({ is_connected: false })
      .eq('client_id', clientId)
      .eq('provider', provider);

    if (error) {
      console.error('[disconnectHealthProvider] DB error:', error);
    }
    // Also clear local fallback
    clearLocalHealthConnection(clientId);
    return true;
  } catch (error) {
    console.error('Error disconnecting health provider:', error);
    clearLocalHealthConnection(clientId);
    return false;
  }
};

// Get health connection status
export const getHealthConnectionStatus = async (clientId: string): Promise<HealthConnection[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    console.log('[getHealthConnectionStatus] auth.uid:', user?.id, 'querying client_id:', clientId);
    
    const { data, error } = await supabase
      .from('health_connections')
      .select('*')
      .eq('client_id', clientId);

    if (error) {
      console.error('[getHealthConnectionStatus] query error:', error);
      // If DB query fails, check localStorage fallback on native
      if (isNativePlatform()) {
        const local = getLocalHealthConnection(clientId);
        if (local) {
          console.log('[getHealthConnectionStatus] using localStorage fallback');
          return [{
            provider: local.provider as 'apple_health' | 'health_connect',
            is_connected: true,
            last_sync_at: local.lastSyncAt,
            permissions: ['heart_rate', 'resting_heart_rate', 'steps', 'calories', 'workouts'],
          }];
        }
      }
      throw error;
    }
    
    console.log('[getHealthConnectionStatus] rows returned:', data?.length, data);

    const dbConnections = (data || []).map(conn => ({
      provider: conn.provider as 'apple_health' | 'health_connect',
      is_connected: conn.is_connected || false,
      last_sync_at: conn.last_sync_at,
      permissions: (conn.permissions as string[]) || [],
    }));
    
    // On native, merge with localStorage fallback if DB returned nothing
    if (dbConnections.length === 0 && isNativePlatform()) {
      const local = getLocalHealthConnection(clientId);
      if (local) {
        console.log('[getHealthConnectionStatus] DB empty, using localStorage fallback');
        return [{
          provider: local.provider as 'apple_health' | 'health_connect',
          is_connected: true,
          last_sync_at: local.lastSyncAt,
          permissions: ['heart_rate', 'resting_heart_rate', 'steps', 'calories', 'workouts'],
        }];
      }
    }
    
    return dbConnections;
  } catch (error) {
    console.error('Error getting health connection status:', error);
    // Last resort: check localStorage on native
    if (isNativePlatform()) {
      const local = getLocalHealthConnection(clientId);
      if (local) {
        return [{
          provider: local.provider as 'apple_health' | 'health_connect',
          is_connected: true,
          last_sync_at: local.lastSyncAt,
          permissions: ['heart_rate', 'resting_heart_rate', 'steps', 'calories', 'workouts'],
        }];
      }
    }
    return [];
  }
};
