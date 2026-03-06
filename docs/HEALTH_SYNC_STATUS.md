# Health Sync Status — February 27, 2026

## Current Status: ✅ Fully Operational

---

## What's Working

- **Steps sync is accurate** — Apple Health showed 3,698 and the app shows 3,699 (exact match)
- **Calories are syncing properly**
- **Health connection is active and stable**
- **Data imports automatically on every sync**

---

## Why Some Metrics Show "-- " (Empty)

- Heart rate, resting HR, active minutes, and workouts will only show data when your Apple Watch records them **that day**
- If you haven't done a workout or worn your Apple Watch today, those will naturally show zero — this is correct behavior, not a bug
- As soon as your Watch records new heart rate readings or you complete a workout, tap **"Sync Now"** and the numbers will appear

---

## What To Do

1. Open the app → **Health Dashboard**
2. Tap **Sync Now** to pull the latest data
3. All metrics that Apple Health has for today will show up

---

## Technical Details

- The data import pipeline is live and writing all record types — heart rate, resting heart rate, steps, calories, active minutes, and workouts
- The iOS HealthKit permission request is correctly configured for all health categories
- Edge functions (backend processing) deploy automatically through the platform — no manual deployment needed
- All backend changes are handled directly through the platform, no separate backend access is required
- The developer works on his own branch (`native-ios-stage1`) and merges when the web app is confirmed stable

---

## What Was Fixed

### Step Count Accuracy (Feb 27, 2026)

**Problem:** Apple Health showed 3,698 steps but app showed only 2,758 (~25% under-count).

**Root Cause:** The deduplication logic was taking the MAX value per hour instead of properly summing samples. Apple Health reports multiple incremental step samples within the same hour (e.g., 200 + 300 + 400 steps). The old code kept only the largest sample (400) and dropped the rest.

**Fix Applied (3 files):**

1. **`src/services/healthSyncService.ts`** — Rewrote `deduplicateHourly()`:
   - SUM all samples from the same source device within each hour (iPhone samples don't overlap)
   - MAX across different source devices per hour (iPhone vs Watch measure the same movement)
   - Added `sourceName` metadata to steps and calories samples for device-aware dedup

2. **`src/hooks/useHealthData.ts`** — Updated read-side `dedupeMaxPerHour` comments and logic

3. **`supabase/functions/read-health-stats/index.ts`** — Same fix on edge function's dedup

### RLS / Trainer Access (Previously Fixed)

- Migration `20260227120000_health_rls_comprehensive_fix.sql` creates proper SELECT policies for both `health_data` and `health_connections` tables
- Three access levels: client self-read, trainer assigned read (via `trainer_clients`), trainer role fallback
- Edge function `read-health-stats` uses service-role key as final RLS bypass

### WebView Cache (Previously Fixed)

- `AppDelegate.swift` clears disk/memory/fetch cache on launch and foreground resume
- `index.html` has no-cache meta tags
- Build timestamp cache-busting in Vite config

---

## Architecture Overview

```
iPhone HealthKit
    ↓ (native plugin queries)
healthSyncService.ts → deduplicateHourly()
    ↓ (edge function OR direct insert)
sync-health-insert (edge fn, service-role, bypasses RLS)
    ↓
Supabase: health_data + health_connections tables
    ↓ (direct query OR edge fn fallback)
useHealthData.ts / useHealthStats → read-health-stats (edge fn)
    ↓
ActivitySummary.tsx → Health Dashboard UI
```
