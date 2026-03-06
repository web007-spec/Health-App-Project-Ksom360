# Health Dashboard — How It Works

Simple guide explaining the 9 health cards, where data comes from, and how to test.

---

## The 9 Cards

| # | Card | What It Shows | Where Data Comes From | Unit |
|---|------|--------------|----------------------|------|
| 1 | **Steps** | Steps walked today | HealthKit → `stepCount` | count |
| 2 | **Active Energy** | Calories burned from movement/exercise | HealthKit → `activeEnergyBurned` | kcal |
| 3 | **Resting Energy** | Calories your body burns at rest (BMR) | HealthKit → `basalEnergyBurned` + BMR model | kcal |
| 4 | **Sleep** | Total sleep time last night | HealthKit → `sleepAnalysis` | hours & min |
| 5 | **Weight** | Latest weight reading (any time, all-time) | HealthKit → `bodyMass` | kg |
| 6 | **Workouts** | Number of workouts logged today | HealthKit → `workoutType` | count |
| 7 | **Avg Heart Rate** | Average heart rate today | HealthKit → `heartRate` | bpm |
| 8 | **Resting HR** | Resting heart rate (latest reading) | HealthKit → `restingHeartRate` | bpm |
| 9 | **Active Minutes** | Exercise/active minutes today | HealthKit → `appleExerciseTime` | min |

---

## How Data Flows

```
iPhone/Apple Watch
       ↓
   Apple HealthKit (stores all samples on device)
       ↓
   Our App reads HealthKit using 2 methods:
   
   Method 1: HKStatisticsQuery (LIVE — for today's display)
   → Steps, Active Energy, Resting Energy
   → Reads directly from HealthKit, no DB needed
   → Matches Apple Health numbers exactly
   
   Method 2: HKSampleQuery (SYNC — for history & other metrics)
   → Heart Rate, Sleep, Weight, Workouts, etc.
   → Syncs to Supabase DB every time you open the Health page
   → Also usable by trainers viewing client data on web
       ↓
   Supabase DB (health_data table)
       ↓
   Dashboard Cards (React components)
```

### Resting Energy — Special Handling

Apple Health shows a **projected BMR** (Basal Metabolic Rate) that updates every second. HealthKit samples only get written every ~15 minutes. To match Apple Health:

1. We get yesterday's full resting energy total from HealthKit
2. Calculate your hourly burn rate = yesterday total ÷ 24
3. Estimate today = hourly rate × hours passed since midnight
4. Show whichever is higher: actual HK samples OR model estimate

This makes our Resting Energy card match Apple Health's number closely.

### Weight — Special Handling

Weight is logged infrequently (maybe once a month or less). We search **all-time** for the latest weight reading, not just today.

---

## How to Test

### Step 1: Build & Deploy
```bash
npx vite build
npx cap sync ios
```
Then open Xcode and press **⌘R** to run on your iPhone.

### Step 2: Open the App
- Log in → go to **Health** tab
- The app auto-syncs HealthKit data on page load

### Step 3: Check the Logs (Xcode Console)
Look for these logs:

```
[HealthDashboard] auto-sync triggered on mount
[syncHealthData] fetched 150 points from apple_health
[queryTodayLiveStats] steps=5000 active=200 resting=1150 weight=72
[useHealthStats] RESULT: {"todaySteps":5000,"todayActiveEnergy":200,...}
```

### Step 4: Compare with Apple Health
1. Open **Apple Health** app on your iPhone
2. Go to **Summary → All Health Data**
3. Compare numbers side by side:

| Metric | Apple Health | Our App | Should Match? |
|--------|-------------|---------|---------------|
| Resting Energy | ✅ | ✅ | Yes (close, within ~5%) |
| Active Energy (Move) | ✅ | ✅ | Yes (exact) |
| Steps | ✅ | ✅ | Yes (exact) |
| Weight | ✅ | ✅ | Yes (exact) |
| Heart Rate | ✅ | ✅ | Yes (average) |

### Step 5: Test Sync Button
- Tap the **refresh/sync icon** on the Health page
- Should see toast: "Synced X health records"
- Numbers should update

### Step 6: Test with No Data
- If you have 0 steps/energy (e.g., early morning), cards show 0
- Weight shows `--` if no weight has ever been logged
- This is correct behavior

---

## Files Involved

| File | What It Does |
|------|-------------|
| `ios/App/App/CapacitorHealthkitPlugin.swift` | Native Swift plugin — reads HealthKit on device |
| `src/services/healthSyncService.ts` | Queries HealthKit, syncs data to Supabase |
| `src/hooks/useHealthData.ts` | React hooks — `useHealthStats()`, `useSyncHealth()` |
| `src/components/health/ActivitySummary.tsx` | The 9 card UI components |
| `src/pages/client/ClientHealth.tsx` | Health dashboard page (auto-sync on load) |
| `supabase/functions/sync-health-insert/index.ts` | Edge function to insert data (bypasses RLS) |

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| All cards show 0 | HealthKit permissions not granted | Disconnect & reconnect in Health settings |
| Weight shows `--` | No weight logged in Apple Health | Add weight: Health → Browse → Body Measurements → Weight → Add Data |
| Resting Energy is low | Haven't synced yet / early morning | Tap sync button, or wait for more BMR samples |
| Numbers don't match Apple Health | Sync is stale | Tap sync button, data refreshes automatically |
| Sleep shows 0 | No sleep data from Apple Watch | Need Apple Watch or sleep tracking app |
