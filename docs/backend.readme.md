# Backend Documentation — EverFit Stride

> Auto-generated reference for developers. Covers database schema, edge functions, storage, authentication, and RLS policies.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Environment Variables](#environment-variables)
3. [Authentication](#authentication)
4. [Database Tables](#database-tables)
5. [Database Functions & Triggers](#database-functions--triggers)
6. [Edge Functions (API)](#edge-functions-api)
7. [Storage Buckets](#storage-buckets)
8. [Row-Level Security (RLS) Policies](#row-level-security-rls-policies)
9. [Realtime](#realtime)
10. [Frontend Integration](#frontend-integration)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| UI Components | shadcn/ui (Radix primitives) |
| State/Data | TanStack React Query v5 |
| Backend | Supabase (Lovable Cloud) |
| Database | PostgreSQL 15 |
| Auth | Supabase Auth (email/password) |
| Edge Functions | Deno (Supabase Edge Functions) |
| Storage | Supabase Storage |
| Notifications | Web Push (VAPID), Resend (email) |
| TTS | ElevenLabs API |
| AI | Lovable AI Gateway (Gemini / GPT-5) |

---

## Environment Variables

### Client-Side (Vite — `import.meta.env`)

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |
| `VITE_SUPABASE_PROJECT_ID` | Project ID |

### Server-Side (Edge Function Secrets — `Deno.env.get()`)

| Secret | Description |
|--------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (admin access) |
| `SUPABASE_DB_URL` | Direct database connection string |
| `RESEND_API_KEY` | Resend email service |
| `ELEVENLABS_API_KEY` | ElevenLabs TTS |
| `USDA_API_KEY` | USDA food database |
| `TENOR_API_KEY` | Tenor GIF search |
| `VAPID_PUBLIC_KEY` | Web Push public key |
| `VAPID_PRIVATE_KEY` | Web Push private key |
| `ADMIN_PIN` | Admin PIN login |
| `LOVABLE_API_KEY` | Lovable AI Gateway |
| `VITE_APP_URL` | Application URL (for email links) |

---

## Authentication

- **Method**: Email + Password (Supabase Auth)
- **Auto-confirm**: Disabled (users must verify email)
- **Roles**: Stored in `profiles.role` as enum `user_role` (`trainer`, `client`)
- **Session**: JWT stored in `localStorage`, auto-refreshed
- **Admin**: PIN-based login via `admin-pin-login` edge function

### Auth Flow

```
1. User signs up → auth.users row created
2. Trigger `handle_new_user()` → creates profiles row (role: 'client')
3. Trainer creates client → `create-client` edge function creates auth user + profile + trainer_clients link
4. Client receives welcome email via `send-client-welcome-email`
```

### Supabase Client Setup

```typescript
import { supabase } from "@/integrations/supabase/client";
// Auto-configured — do NOT edit client.ts
```

---

## Database Tables

### Core / User Management

#### `profiles`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK, matches auth.users.id |
| email | text | YES | | User email |
| full_name | text | YES | | Display name |
| role | user_role | YES | 'client' | trainer / client |
| avatar_url | text | YES | | Profile photo URL |
| phone | text | YES | | Phone number |
| created_at | timestamptz | NO | now() | |
| updated_at | timestamptz | NO | now() | |

#### `trainer_clients`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| trainer_id | uuid | NO | | FK → profiles |
| client_id | uuid | NO | | FK → profiles |
| status | client_status | NO | 'active' | active / inactive / archived |
| created_at | timestamptz | NO | now() | |

---

### Exercise Library

#### `exercises`
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | PK |
| trainer_id | uuid | NO | | FK → profiles |
| name | text | NO | | Exercise name |
| description | text | YES | | Instructions |
| muscle_group | text | YES | | Primary muscle group |
| equipment | text | YES | | Equipment needed |
| image_url | text | YES | | Thumbnail URL |
| video_url | text | YES | | Demo video URL |
| created_at | timestamptz | NO | now() | |

#### `exercise_tags`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| name | text | Tag name |
| trainer_id | uuid | FK → profiles |
| created_at | timestamptz | |

#### `exercise_exercise_tags`
Junction table linking exercises ↔ tags.

#### `exercise_alternatives`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| exercise_id | uuid | FK → exercises |
| alternative_id | uuid | FK → exercises |

#### `exercise_custom_options`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| trainer_id | uuid | FK → profiles |
| option_name | text | e.g. "Tempo", "RPE" |

---

### Workout System

#### `workout_plans`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| trainer_id | uuid | FK → profiles |
| name | text | Workout name |
| description | text | |
| workout_type | text | 'gym' / 'circuit' |
| estimated_duration_minutes | integer | |
| cover_image_url | text | |
| is_template | boolean | Template vs assigned |
| created_at / updated_at | timestamptz | |

#### `workout_sections`
Groups exercises within a workout plan (e.g., "Warm Up", "Main Set").

#### `workout_plan_exercises`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| workout_plan_id | uuid | FK → workout_plans |
| section_id | uuid | FK → workout_sections |
| exercise_id | uuid | FK → exercises |
| sets / reps / duration_seconds | integer | Programming |
| rest_seconds | integer | Rest period |
| order_index | integer | Sort order |
| superset_group | text | Superset grouping |
| notes | text | Coaching notes |

#### `client_workouts`
Assigns a workout plan to a client on a specific date.

#### `workout_sessions`
Tracks a client's live workout session (start, end, calories).

#### `workout_exercise_logs`
Per-set logging during a workout session.

#### `workout_labels`
Custom labels/tags for categorizing workouts.

#### `workout_workout_labels`
Junction table: workout_plans ↔ workout_labels.

#### `workout_comments`
Client/trainer comments on assigned workouts.

---

### On-Demand / Collections

#### `ondemand_workouts`
Pre-recorded workout videos with metadata.

#### `workout_collections` / `workout_collection_categories` / `category_workouts`
Organize on-demand workouts into collections with categories.

#### `client_workout_collection_access`
Grants a client access to a workout collection.

---

### Programs

#### `programs`
Multi-week training programs with workout assignments per day.

#### `studio_programs` / `client_studio_program_access`
Studio-style programs with client enrollment tracking.

---

### Nutrition

#### `recipes`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | PK |
| trainer_id | uuid | FK → profiles |
| name | text | Recipe name |
| calories / protein / carbs / fats | numeric | Macros |
| servings | integer | |
| prep_time_minutes / cook_time_minutes | integer | |
| instructions | text | |
| image_url | text | |
| tags | text[] | Array of tags |

#### `recipe_ingredients`
Ingredients for each recipe.

#### `recipe_books` / `recipe_book_recipes`
Organize recipes into books/collections.

#### `client_recipe_book_assignments`
Assign recipe books to clients.

#### `client_saved_recipes` / `client_recipe_collections`
Client's personal saved recipes and collections.

#### `meal_plans` / `meal_plan_days` / `meal_plan_categories` / `meal_plan_flexible_options` / `meal_plan_notes`
Structured and flexible meal planning system.

#### `client_meal_plan_assignments` / `client_meal_selections`
Assign meal plans and track client selections.

#### `nutrition_logs`
Client food journal entries (meal type, calories, macros, photos).

#### `client_macro_targets`
Per-client macro/calorie targets with rest-day variants.

---

### Metrics & Progress

#### `metric_definitions`
Defines trackable metrics (Weight, Body Fat, Steps, etc.).

#### `client_metrics`
Assigns metrics to clients with starting/goal values.

#### `metric_entries`
Individual metric data points with timestamps.

#### `client_progress_tiles`
Configurable dashboard tiles for client progress view.

#### `progress_entries`
Progress photos with before/after tracking.

#### `fitness_goals`
Weight/fitness goals with start/target values, dates, and status.

#### `goal_milestones`
Milestone checkpoints within a fitness goal.

#### `client_goal_countdowns`
Countdown timers for events/competitions.

---

### Fasting

#### `fasting_protocols`
Trainer-defined fasting protocols.

#### `quick_fasting_plans`
Pre-set fasting plans.

#### `eating_window_meal_photos`
Photos logged during eating windows.

> Fasting state (active fast, lock PIN, etc.) is stored in `client_feature_settings`.

---

### Tasks & Habits

#### `task_templates`
Reusable task templates with form questions.

#### `client_tasks`
Assigned tasks with due dates, attachments, form responses.

#### `client_habits` / `habit_completions` / `habit_comments`
Habit tracking with daily completions and trainer comments.

---

### Messaging

#### `conversations` / `conversation_members`
Chat conversations (direct or group).

#### `conversation_messages`
Messages with text, images, files, replies, and pinning.

#### `conversation_read_receipts`
Read tracking per user per conversation.

#### `message_reactions`
Emoji reactions on messages.

---

### Scheduling

#### `appointment_types`
Trainer-defined appointment types (duration, color, location type).

#### `appointments`
Booked appointments between trainer and client.

#### `trainer_availability` / `trainer_date_overrides` / `trainer_vacations`
Trainer schedule configuration.

#### `booking_settings`
Booking rules (window, buffer, cancellation policy).

#### `group_classes` / `group_class_sessions` / `group_class_bookings`
Group fitness classes with session scheduling and client bookings.

#### `google_calendar_connections`
Google Calendar OAuth integration.

#### `client_ical_feeds`
External iCal feed syncing.

---

### Sports

#### `client_sport_profiles`
Sport-specific profile (sport, position, team, jersey#).

#### `sport_schedule_events`
Game/practice schedule with event types.

#### `sport_event_completions`
Game stat tracking completions.

#### `game_stat_entries`
Individual game statistics.

#### `client_sport_day_cards` / `client_rest_day_cards`
Custom motivational cards for game/rest days.

---

### Health

#### `health_connections`
External health app connections (Apple Health, Google Fit, etc.).

#### `health_data`
Synced health metrics (heart rate, steps, sleep, etc.).

#### `health_notifications`
Health-related notification triggers.

---

### Resources

#### `resource_collections` / `collection_sections` / `resources` / `section_resources`
Educational resource library with collections, sections, and individual resources.

#### `client_collection_access`
Grants client access to resource collections.

---

### Notifications

#### `notification_preferences`
Per-client notification settings.

#### `client_reminders`
Scheduled reminders with types and dismiss tracking.

---

### Client Settings

#### `client_feature_settings`
Master feature toggle table per client. Controls:
- Fasting, macros, meal plans, training, goals, tasks, messaging
- Dashboard customization (hero image, greeting, emoji)
- Fasting state (active fast, PIN lock, strict mode)
- Meal plan configuration (type, labels, recipe replacement)
- Sport schedule, progress photos, body metrics, etc.

---

## Database Functions & Triggers

| Function | Purpose |
|----------|---------|
| `handle_new_user()` | Creates profile row when auth user signs up |
| `update_updated_at_column()` | Auto-updates `updated_at` on row change |
| `ensure_single_active_goal()` | Deactivates other goals when one is set active |
| `stamp_goal_end()` | Sets `ended_at` when goal status changes from active |
| `auto_set_goal_start_weight()` | Sets goal start weight from first weigh-in |
| `set_goal_start_weight_from_weighin()` | Enhanced version respecting lock setting |
| `auto_provision_progress_tiles()` | Creates default progress tiles for new clients |
| `provision_default_progress_tiles(uuid)` | Provisions 7 default metric tiles |
| `is_conversation_member(uuid, uuid)` | Security definer for chat RLS |
| `touch_updated_at()` | Alternative updated_at trigger |

---

## Edge Functions (API)

All edge functions are at: `POST /functions/v1/<function-name>`

### Authentication & User Management

| Function | JWT | Description |
|----------|-----|-------------|
| `admin-pin-login` | ❌ | PIN-based admin authentication |
| `create-client` | ✅ | Creates new client (auth user + profile + link) |
| `create-demo-client` | ✅ | Creates demo client with sample data |
| `delete-users` | ✅ | Bulk delete users (admin) |

### Communication

| Function | JWT | Description |
|----------|-----|-------------|
| `send-client-welcome-email` | ✅ | Sends welcome email via Resend |
| `resend-client-welcome-email` | ✅ | Resends welcome email |
| `send-push-notification` | ❌ | Sends web push notification |
| `send-workout-reminders` | ✅ | Sends scheduled workout reminders |
| `send-health-notification` | ❌ | Sends health alert notifications |

### AI & Analysis

| Function | JWT | Description |
|----------|-----|-------------|
| `analyze-food-photo` | ❌ | AI food photo analysis (Lovable AI) |
| `analyze-health-screenshot` | ❌ | AI health screenshot extraction |
| `ai-recipe-builder` | ✅ | AI-powered recipe generation |
| `elevenlabs-tts` | ✅ | Text-to-speech via ElevenLabs |

### Data & Utilities

| Function | JWT | Description |
|----------|-----|-------------|
| `search-usda-foods` | ❌ | USDA food database search |
| `search-gifs` | ✅ | Tenor GIF search |
| `generate-vapid-keys` | ❌ | Generate VAPID key pair |
| `seed-health-data` | ❌ | Seeds sample health data |
| `sync-ical-feed` | ❌ | Syncs external iCal feeds |

### Calling Edge Functions

```typescript
// Method 1: Supabase SDK (preferred)
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { key: 'value' }
});

// Method 2: Direct fetch (for streaming)
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/function-name`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ key: 'value' }),
  }
);
```

---

## Storage Buckets

| Bucket | Public | Purpose |
|--------|--------|---------|
| `exercise-images` | ✅ | Exercise thumbnail images |
| `exercise-videos` | ✅ | Exercise demo videos |
| `avatars` | ✅ | User profile photos |
| `recipe-images` | ✅ | Recipe photos |
| `recipe-book-covers` | ✅ | Recipe book cover images |
| `workout-covers` | ✅ | Workout plan cover images |
| `task-icons` | ✅ | Task template icons |
| `chat-attachments` | ✅ | Message file attachments |
| `rest-day-images` | ✅ | Rest day card images |
| `progress-photos` | ❌ | Client progress photos (private) |

### Upload Example

```typescript
const { data, error } = await supabase.storage
  .from('exercise-images')
  .upload(`${trainerId}/${fileName}`, file);

const { data: { publicUrl } } = supabase.storage
  .from('exercise-images')
  .getPublicUrl(filePath);
```

---

## Row-Level Security (RLS) Policies

All tables have RLS enabled. General patterns:

### Trainer Access
```sql
-- Trainers can manage their own resources
auth.uid() = trainer_id
```

### Client Access
```sql
-- Clients can view/manage their own data
auth.uid() = client_id

-- Clients can view trainer's resources if linked
EXISTS (
  SELECT 1 FROM trainer_clients tc
  WHERE tc.trainer_id = [table].trainer_id
    AND tc.client_id = auth.uid()
    AND tc.status = 'active'
)
```

### Messaging
```sql
-- Uses security definer function to avoid recursion
public.is_conversation_member(auth.uid(), conversation_id)
```

### Public Data
```sql
-- Badge definitions, metric definitions visible to all
true
```

---

## Realtime

Tables with realtime enabled (via `supabase_realtime` publication):
- `conversation_messages` — live chat
- `messages` — legacy messages
- `health_data` — live health sync

### Subscribe Example

```typescript
const channel = supabase
  .channel('chat-messages')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'conversation_messages',
    filter: `conversation_id=eq.${conversationId}`,
  }, (payload) => {
    // Handle new message
  })
  .subscribe();
```

---

## Frontend Integration

### Data Fetching Pattern (TanStack Query)

```typescript
const { data, isLoading } = useQuery({
  queryKey: ['exercises', trainerId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('name');
    if (error) throw error;
    return data;
  },
});
```

### Mutation Pattern

```typescript
const mutation = useMutation({
  mutationFn: async (newExercise) => {
    const { error } = await supabase
      .from('exercises')
      .insert(newExercise);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['exercises'] });
    toast.success('Exercise created');
  },
});
```

### File Structure

```
src/
├── components/          # UI components
├── hooks/               # Custom React hooks
├── integrations/
│   └── supabase/
│       ├── client.ts    # Auto-generated Supabase client
│       └── types.ts     # Auto-generated TypeScript types
├── lib/                 # Utility functions
├── pages/               # Route pages
│   └── client/          # Client-facing pages
└── services/            # Service layer

supabase/
├── config.toml          # Edge function config
├── functions/           # Edge functions (Deno)
│   ├── admin-pin-login/
│   ├── ai-recipe-builder/
│   ├── analyze-food-photo/
│   └── ... (18 functions)
└── migrations/          # SQL migrations
```

---

## Enums

| Enum | Values |
|------|--------|
| `user_role` | trainer, client |
| `client_status` | active, inactive, archived |
| `meal_plan_type` | structured, flexible |
| `meal_type` | breakfast, lunch, dinner, snack |
| `task_type` | todo, form, link, file |
| `layout_type` | grid, list, carousel |

---

*Generated for EverFit Stride — Lovable Cloud Backend*
