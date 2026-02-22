
# Plan 4: KSOM Vibes -- Complete Build Specification

This is the consolidated implementation plan combining Plans 1-3 (database/UI, Howler.js audio engine, share utility) with the refined requirements from this message.

---

## Summary

Build a premium in-app soundscape module called "KSOM Vibes" with:
- A dark, BetterSleep-inspired client UI with wooden sound tiles
- Multi-track audio mixer using Howler.js (seamless looping, per-sound volume)
- Timer with fade-out, save/share mixes, localStorage persistence
- Full admin dashboard for trainers to manage categories, sounds, and starter mixes
- Seed data for immediate testing

---

## A. Database Migration

### New Tables (5 tables)

**`vibes_categories`**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK default gen_random_uuid() | |
| name | text NOT NULL | e.g. "Sounds", "Music", "Sleep", "Meditations" |
| slug | text NOT NULL UNIQUE | URL-safe identifier |
| sort_order | int default 0 | |
| created_at | timestamptz default now() | |

**`vibes_sounds`**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK default gen_random_uuid() | |
| name | text NOT NULL | |
| description | text | |
| category_id | uuid FK vibes_categories ON DELETE SET NULL | |
| tags | text[] default '{}' | e.g. {nature, rain, asmr} |
| is_featured | boolean default false | Show on Home tab |
| is_premium | boolean default false | Future premium lock |
| icon_url | text | Storage path for tile icon |
| audio_url | text NOT NULL | Storage path for audio file |
| thumbnail_url | text | Optional cover art |
| duration_seconds | int | Auto-detected or manual |
| sort_order | int default 0 | |
| created_at | timestamptz default now() | |
| updated_at | timestamptz default now() | |

**`vibes_mixes`** (both starter mixes by trainer and saved mixes by clients)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK default gen_random_uuid() | |
| user_id | uuid NOT NULL | FK profiles -- trainer or client |
| name | text NOT NULL | |
| is_public | boolean default false | Starter mixes are public, client saves are private |
| share_slug | text UNIQUE | For shareable links |
| cover_url | text | |
| created_at | timestamptz default now() | |

**`vibes_mix_items`**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK default gen_random_uuid() | |
| mix_id | uuid FK vibes_mixes ON DELETE CASCADE | |
| sound_id | uuid FK vibes_sounds ON DELETE CASCADE | |
| volume | float default 0.7 | 0.0 to 1.0 |
| sort_order | int default 0 | |

**`vibes_favorites`**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK default gen_random_uuid() | |
| user_id | uuid NOT NULL | FK profiles |
| sound_id | uuid FK vibes_sounds ON DELETE CASCADE | |
| created_at | timestamptz default now() | |
| UNIQUE(user_id, sound_id) | | |

### Storage Buckets (2 new)

- **`vibes-audio`** (public) -- MP3/WAV files
- **`vibes-icons`** (public) -- Icons, thumbnails, mix covers

### RLS Policies

- **vibes_categories**: All authenticated users can SELECT. Trainers (via profiles.role check with security definer function) can INSERT/UPDATE/DELETE.
- **vibes_sounds**: All authenticated users can SELECT. Trainers can INSERT/UPDATE/DELETE.
- **vibes_mixes**: Users can SELECT public mixes (is_public = true) OR their own. Users can INSERT/UPDATE/DELETE their own.
- **vibes_mix_items**: Users can SELECT items where they can see the parent mix. Users can INSERT/UPDATE/DELETE items in their own mixes.
- **vibes_favorites**: Users can full CRUD on their own rows only.
- **Storage buckets**: All authenticated can read. Trainers can upload/update/delete.

### Security Definer Function

```text
is_trainer(uuid) -- checks profiles.role = 'trainer' for the given user_id
```

This avoids infinite recursion in RLS policies that need to check role.

### Triggers

- `update_updated_at` trigger on `vibes_sounds` (reuses existing `update_updated_at_column()` function)

---

## B. Admin / Trainer Dashboard

**New route: `/vibes-admin`** (trainer role, added to TrainerSidebar under "On-Demand Studio")

### Admin Page Sections

1. **Categories Manager**
   - List all categories with drag-to-reorder (sort_order)
   - Add/edit/delete categories (name, slug)
   - Uses a dialog similar to `CreateCategoryDialog` pattern

2. **Sound Manager**
   - Table/grid listing all sounds with filters by category
   - "Add Sound" dialog:
     - Upload audio file (MP3/WAV) to `vibes-audio` bucket
     - Upload icon (PNG/SVG) to `vibes-icons` bucket
     - Optional thumbnail upload
     - Name, description, category select, tags (multi-select chips)
     - Toggle: Featured on Home
     - Toggle: Premium locked
   - Edit/delete existing sounds

3. **Starter Mixes Manager**
   - Create a named mix with `is_public = true`
   - Pick sounds from the library, set default volume per sound
   - Optional cover image
   - Auto-generate `share_slug`
   - Edit/delete existing starter mixes

### New Files (Admin)

- `src/pages/VibesAdmin.tsx` -- Main admin page with tabs (Categories | Sounds | Mixes)
- `src/components/vibes/admin/ManageCategoryDialog.tsx`
- `src/components/vibes/admin/AddSoundDialog.tsx`
- `src/components/vibes/admin/EditSoundDialog.tsx`
- `src/components/vibes/admin/CreateStarterMixDialog.tsx`

---

## C. Client UI

**New route: `/client/vibes`** (client role)

### Page Structure

Dark premium background (near-black with subtle gradient). On load, a brief "Mode Activated" toast appears.

**Top Tabs:**
- **Home** -- Featured sounds grid + "Quick Start" starter mixes carousel + time-of-day suggestion (Morning/Afternoon/Evening based on local time)
- **Sounds** -- Full wooden tile grid with filter chips: My Favorites / Popular / New / Nature / ASMR / Colored Noise / Brainwaves / Musical Layers
- **Mixes** -- Saved mixes + Starter mixes in separate sections
- **Sleep** -- Filtered view showing sounds/mixes tagged "sleep", "bedtime", "meditation"

**Wooden Tiles:**
- Uses the exact CSS from Plan 1 (`.ksom-wood-tile` classes) implemented as Tailwind + inline styles
- Square, rounded-[18px], wood grain gradients, subtle shadow
- Tap to toggle in/out of current mix
- Active state: purple glowing border (`.ksom-wood-tile--active`)
- Icon container + title label

**Bottom Mini Player** (fixed, above ClientBottomNav):
- Visible whenever mix has 1+ sounds
- Shows: mix item count, play/pause button, timer icon (with countdown if active), save button, share button
- Tap the bar area to expand the mixer drawer

**Current Mix Drawer** (bottom sheet via Vaul drawer):
- Slides up from mini player
- Lists each active sound with: icon, name, volume slider (0-100%), remove (X) button
- "Clear All" button at bottom
- Smooth drag-to-dismiss

**Timer Dialog:**
- Preset buttons: 15, 30, 45, 60, 90 minutes + custom input
- "Fade out last 60 seconds" toggle
- Shows countdown on mini player when active

**Save Mix Dialog:**
- Name input
- Saves current sound list + volumes to `vibes_mixes` with `is_public = false`

**Share Mix:**
- Uses the `shareMixLink` utility from Plan 3
- Generates a URL like `/client/vibes?mix=<share_slug>`
- On native (Capacitor): uses `navigator.share` via native bridge
- Fallback: copy to clipboard with toast confirmation

**Persistence:**
- On mix change, save current state to `localStorage` key `ksom-vibes-last-mix`
- On page load, restore last mix from localStorage and auto-populate (without auto-playing)

### New Files (Client)

- `src/pages/client/ClientVibes.tsx` -- Main page with tabs
- `src/components/vibes/VibesTile.tsx` -- Wooden tile component
- `src/components/vibes/VibesMiniPlayer.tsx` -- Bottom mini player bar
- `src/components/vibes/VibesMixerSheet.tsx` -- Bottom sheet mixer drawer
- `src/components/vibes/VibesTimerDialog.tsx` -- Timer picker
- `src/components/vibes/SaveMixDialog.tsx` -- Save mix name dialog
- `src/components/vibes/ShareMixButton.tsx` -- Share handler
- `src/components/vibes/VibesHomeTab.tsx` -- Home tab content
- `src/components/vibes/VibesSoundsTab.tsx` -- Sounds tab with chips
- `src/components/vibes/VibesMixesTab.tsx` -- Mixes tab
- `src/components/vibes/VibesSleepTab.tsx` -- Sleep tab

---

## D. Audio Engine (Howler.js)

**New dependency:** `howler`

**Hook: `src/hooks/useAudioMixer.ts`**

Wraps the Howler.js utilities from Plan 2 into a React hook with state management:

```text
useAudioMixer() returns:
  - mixItems: MixItem[]         -- current mix state
  - isPlaying: boolean
  - addSound(sound)             -- creates Howl, adds to mix
  - removeSound(soundId)        -- stops + unloads Howl, removes
  - setVolume(soundId, vol)     -- adjusts GainNode via howl.volume()
  - play()                      -- plays all items
  - pause()                     -- pauses all items
  - clearAll()                  -- stops + unloads all
  - timerRemaining: number|null -- seconds left
  - startTimer(minutes, fadeOut)
  - cancelTimer()
  - loadMix(items)              -- bulk load from saved mix
```

Key behaviors:
- All Howl instances use `loop: true` and `html5: true`
- Timer countdown via `setInterval`, fade-out ramps volume to 0 over last 60s using `howl.fade()`
- Mix state synced to localStorage on every change

**Utility: `src/lib/vibesShare.ts`**
- `shareMixLink(url)` -- from Plan 3 (navigator.share with clipboard fallback)

**Utility: `src/lib/vibesMixer.ts`**
- `createHowl`, `playMix`, `pauseMix`, `setItemVolume`, `removeFromMix`, `clearMix` from Plan 2

---

## E. Navigation Integration

### Client Bottom Nav
Add "Vibes" tab to `ClientBottomNav`:
- Icon: Music2 (from lucide-react)
- Route: `/client/vibes`
- Position: between "On-demand" and "You"

### Trainer Sidebar
Add "KSOM Vibes" to the "On-Demand Studio" section in `TrainerSidebar`:
- Icon: Music (from lucide-react)
- Route: `/vibes-admin`

### App.tsx Routes
- `/client/vibes` -- ProtectedRoute allowedRoles={["client"]}
- `/vibes-admin` -- ProtectedRoute allowedRoles={["trainer"]}

---

## F. Seed Data

Insert via migration (or data insert after tables exist):

**Categories:**
1. Sounds (slug: sounds)
2. Music (slug: music)
3. Sleep (slug: sleep)
4. Meditations (slug: meditations)

**Sample Sounds** (6-8 entries with placeholder/free audio URLs):
- Rain, Ocean Waves, Forest, Campfire (category: Sounds, tags: nature)
- White Noise, Pink Noise (category: Sounds, tags: colored-noise)
- Gentle Piano, Lo-fi Beat (category: Music)

These use publicly available royalty-free audio sample URLs so the mixer is immediately testable.

**One Starter Mix:**
- "Rainy Evening" -- Rain + Campfire + Gentle Piano with preset volumes

---

## G. Build Sequence

| Step | What | Dependencies |
|------|------|-------------|
| 1 | DB migration: tables, buckets, RLS, triggers, security definer | None |
| 2 | Install `howler` dependency | None |
| 3 | `vibesMixer.ts` + `vibesShare.ts` utility files | Step 2 |
| 4 | `useAudioMixer` hook | Step 3 |
| 5 | Trainer admin page (VibesAdmin + dialogs) | Step 1 |
| 6 | Client browse page (ClientVibes + tabs + tiles) | Steps 1, 4 |
| 7 | Mini player + mixer sheet | Step 6 |
| 8 | Timer dialog + fade-out | Step 7 |
| 9 | Save mix + share mix | Step 7 |
| 10 | localStorage persistence | Step 7 |
| 11 | Routes in App.tsx + nav integration | Steps 5, 6 |
| 12 | Seed sample data | Step 1 |

---

## Technical Notes

- The wooden tile CSS will be converted to a combination of Tailwind classes and a small CSS block in `index.css` (or a dedicated `vibes.css` imported in the component) since the layered gradients require raw CSS
- The Profile tab mentioned in the spec is deferred -- client already has `/client/profile` and `/client/settings` which cover those needs
- Premium lock (`is_premium`) is stored but not enforced yet -- the toggle exists in admin for future use
- Share links route to `/client/vibes?mix=<slug>` which the ClientVibes page parses on mount to load a shared mix
