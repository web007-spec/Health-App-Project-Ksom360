# EverFit Stride 

Personal fitness and nutrition coaching platform. Track workouts, nutrition, and health metrics. Built for trainers and clients with Apple HealthKit integration on iOS.

## Features (Phase - 1)

- **Health Dashboard** — Steps, active energy, resting energy, sleep, weight, workouts, heart rate, and active minutes synced from Apple HealthKit
- **Trainer & Client Roles** — Trainers manage clients, assign workouts, and view health progress
- **Exercise Library** — Custom exercises with muscle groups, equipment, tags, and demo videos
- **Nutrition Tracking** — Food logging with USDA database integration
- **Workout Builder** — Create and assign workout programs with drag-and-drop
- **PWA & Native** — Web app with Capacitor for iOS (HealthKit) and Android

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| UI | shadcn/ui (Radix primitives) |
| State/Data | TanStack React Query v5 |
| Backend | Supabase |
| Database | PostgreSQL 15 |
| Auth | Supabase Auth (email/password) |
| Mobile | Capacitor 8 (iOS, Android) |
| Health | HealthKit (iOS) via `@johnjasonhudson/capacitor-healthkit` |

## Prerequisites

- Node.js 18+ and npm
- Supabase project (for backend)
- Xcode (for iOS builds with HealthKit)

## Getting Started

```sh
# Clone the repository
git clone <YOUR_GIT_URL>
cd everfit-stride-cloud-updated

# Install dependencies
npm install

# Configure environment
# Create .env with:
#   VITE_SUPABASE_URL=
#   VITE_SUPABASE_PUBLISHABLE_KEY=
#   VITE_SUPABASE_PROJECT_ID=

# Start development server
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run build:ios` | Build and sync to iOS (Capacitor) |
| `npm run build:ios:open` | Build, sync, and open in Xcode |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## iOS Build (HealthKit)

1. Run `npm run build:ios:open`
2. Open the project in Xcode
3. Add HealthKit capability in Signing & Capabilities
4. Add required HealthKit usage descriptions in `Info.plist`
5. Build and run on a physical device (HealthKit requires a real device)

## Project Structure

```
├── src/                 # React app source
├── supabase/            # Edge functions, migrations, config
├── ios/                 # Capacitor iOS project
├── docs/                # Backend, Health sync, dashboard guides
└── scripts/             # Build and HealthKit setup scripts
```

## Documentation

- [Backend Reference](docs/backend.readme.md) — Database schema, edge functions, RLS
- [Health Dashboard Guide](docs/HEALTH_DASHBOARD_GUIDE.md) — Health cards and data flow
- [Health Sync Verification](docs/HEALTH_SYNC_VERIFICATION.md) — Testing HealthKit sync

## License

Private project.