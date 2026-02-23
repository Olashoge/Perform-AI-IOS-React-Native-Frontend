# Perform AI - Mobile App

## Overview
Perform AI is a React Native (Expo) mobile app for meal and workout tracking. It uses JWT authentication and connects to both a local Express server (data) and an external backend (auth).

## Architecture
- **Frontend**: Expo Router (file-based routing) with React Native
- **Auth Backend**: External API at `https://mealplanai.replit.app` (login, token refresh)
- **Data Backend**: Local Express server on port 5000 (weekly-summary, week-data, day-data, completions)
- **Database**: PostgreSQL (Neon) with drizzle-orm — stores completion states
- **Auth**: JWT tokens stored in expo-secure-store, auto-refresh on 401
- **State**: React Query for server state, React Context for auth state
- **HTTP Clients**: 
  - `apiClient` (axios) → external auth backend
  - `dataClient` (axios) → local Express server for data routes

## Key Files
- `lib/api-client.ts` - Axios instances (apiClient for auth, dataClient for data) with JWT interceptors
- `lib/auth-context.tsx` - Auth context provider (login, logout, auto-refresh)
- `lib/api-hooks.ts` - React Query hooks for data fetching (uses dataClient)
- `lib/api-log.ts` - In-memory API call log (last 5 calls)
- `lib/query-client.ts` - React Query client config
- `server/routes.ts` - Express API routes with JWT decode middleware
- `server/schedule-service.ts` - Deterministic schedule generation + DB-backed completions
- `server/db.ts` - Drizzle/Neon database connection
- `shared/schema.ts` - Database schema (users, completions tables)
- `app/login.tsx` - Login screen
- `app/(tabs)/index.tsx` - Dashboard with weekly summary
- `app/(tabs)/calendar.tsx` - Week view calendar
- `app/(tabs)/performance.tsx` - Performance tab (adherence %, 4-week trend, meal/workout split, streak, AI insight banner)
- `app/(tabs)/profile.tsx` - User profile with logout
- `app/daily/[date].tsx` - Daily detail view with completion toggles
- `app/diagnostics.tsx` - Developer diagnostics (API config, auth state, call log)

## API Endpoints

### Auth (external backend: mealplanai.replit.app)
- POST `/api/auth/token-login` - Login with email/password → JWT tokens
- POST `/api/auth/refresh` - Refresh access token

### Data (local Express server: port 5000)
- GET `/api/weekly-summary` - Weekly adherence score, meal/workout counts
- GET `/api/week-data?weekStart=YYYY-MM-DD` - 7-day schedule array
- GET `/api/day-data/:date` - Single day meals + workouts + score
- PATCH `/api/meals/:id` - Toggle meal completion
- PATCH `/api/workouts/:id` - Toggle workout completion

All data routes require `Authorization: Bearer <token>` header.
JWT is decoded (not verified) to extract userId.

## React Query Keys
- `["weekly-summary"]` - Dashboard weekly score
- `["week-data", weekStart]` - Calendar week data
- `["day-data", date]` - Daily detail data

## Cache Invalidation
Toggle mutations use optimistic updates on day-data, then invalidate:
- `["day-data", date]` (exact)
- `["week-data", computedWeekStart]` (exact)
- `["weekly-summary"]`

## Database Schema
- `users` - id (uuid), username, password
- `completions` - id (item id like "meal-2026-02-22-0"), userId, itemType, completed

## Theme
- Dark mode with electric blue (#0A84FF) primary color
- Font: Inter (Google Fonts)
- iOS 26 liquid glass tab bar support

## Week Computation
- All week boundaries use ISO 8601: Monday-based, UTC
- Shared utility: `lib/week-utils.ts` (getWeekStartUTC, getWeekEndUTC, computeWeekStartForDate)
- Server-side equivalent in `server/routes.ts` (getWeekStartISO, getWeekEndISO)
- Both client and server use UTC to avoid timezone-dependent discrepancies

## Mobile Dev Connectivity

### How it works
- The Expo dev server runs on port 8081 (internal) → mapped to external port 80 via Replit proxy
- Expo Go connects via `exp://<REPLIT_DEV_DOMAIN>` which routes through the Replit proxy to Metro
- The Express backend runs on port 5000 (internal) → mapped to external port 5000

### Troubleshooting: "Could not connect to the server" on iPhone
1. **Disable iCloud Private Relay**: Settings → Apple ID → iCloud → Private Relay → OFF. Private Relay blocks dev domain connections.
2. **Disable VPN/DNS blockers**: AdGuard, 1Blocker, NextDNS, Pi-hole can block `*.replit.dev` domains. Temporarily disable them.
3. **Check Wi-Fi captive portal**: Some networks (hotel, corporate) block non-standard ports. Try mobile data instead.
4. **Restart Expo Go**: Force-close and reopen the app, then scan the QR code again.
5. **Restart the frontend workflow**: The dev server may have gone idle. Restart it from the Replit workspace.
6. **Verify backend health**: Visit `https://<REPLIT_DEV_DOMAIN>/health` in a browser to confirm the server is responding.
7. **Web fallback**: If Expo Go won't connect, use the web version at port 8081 for development and testing.

### Backend health endpoint
- `GET /health` → `{ status: "ok", uptime, timestamp }`

## Completion Toggle Architecture
- PATCH /api/meals/:id and /api/workouts/:id are handled **locally** (not proxied)
- Completions saved to PostgreSQL `completions` table with columns: id, userId, itemType, completed
- GET endpoints (weekly-summary, week-data, day-data) proxy to external backend then **merge** local completion state
- Mutation uses optimistic updates on day-data, then onSuccess invalidates ["day-data", date], ["week-data"], ["weekly-summary"]
- staleTime is 30 seconds (not Infinity) to ensure queries refresh after navigation
- Mutation throws on error (not swallowed) so onError properly rolls back optimistic updates

## Plan Detail Architecture
- Plan detail screens live at `app/plan/{type}/[id].tsx` (meal, workout, wellness)
- Meal detail: Shows 7 days of meals with expandable recipe cards (ingredients, instructions, macros), nutrition notes, grocery list
- Workout detail: Shows 7 days with workout sessions (exercises, sets, reps, rest) and rest days
- Wellness detail: Shows goal plan overview with tappable linked meal/workout plan cards
- All detail screens use the corresponding hooks: `useMealPlan(id)`, `useWorkoutPlan(id)`, `useGoalPlan(id)`
- Generating screens navigate to detail view on completion (not Plans Hub)
- Plan cards in Plans Hub are tappable → navigate to `/plan/{type}/{id}`
- Detail screens handle "generating" status with spinner + refresh option

## Recent Changes
- 2026-02-22: Initial build - Auth flow, Dashboard, Calendar, Daily Detail, Profile screens
- 2026-02-22: Added diagnostics screen and API call logging
- 2026-02-22: Fixed React Query cache invalidation with optimistic updates
- 2026-02-22: Implemented local Express API routes (weekly-summary, week-data, day-data, completions)
- 2026-02-22: Split API clients - auth goes to external backend, data goes to local server
- 2026-02-22: Aligned week computation - shared UTC-based Monday-start utility (lib/week-utils.ts)
- 2026-02-22: Added GET /api/meta and GET /api/week-bounds endpoints to local Express server
- 2026-02-22: Enhanced Diagnostics screen with timezone, week bounds, computed URLs, server meta
- 2026-02-22: Added /api/meta footer to web landing page
- 2026-02-22: Fixed SecureStore web compatibility with localStorage fallback
- 2026-02-22: Fixed cache invalidation - staleTime 30s, broad ["week-data"] invalidation, PATCH in CORS
- 2026-02-22: Implemented local completion storage (PostgreSQL) - PATCH no longer proxied to external backend
- 2026-02-22: GET routes now merge local completion state with external backend data
- 2026-02-22: Added server/db.ts for Drizzle/PostgreSQL connection
- 2026-02-23: Added Performance tab with adherence %, 4-week trend chart, meal/workout split, streak, AI insight banner
- 2026-02-23: Web proxy preserves external API format (object meals, singular workout) for client-side normalization
- 2026-02-23: Rebuilt Profile tab as full editable form (5 sections, pill selectors, GET/PUT /api/profile)
- 2026-02-23: Synced Profile with web spec: correct enums (primaryGoal, activityLevel, spicePreference, workoutLocation), feet/inches height input, categorized equipment accordion with auto-preselect, tag inputs for healthConstraints and allergiesIntolerances, legacy field copying on submission
- 2026-02-23: Added plan creation flow: Create CTA on Dashboard, floating FAB on Calendar, /create plan type picker
- 2026-02-23: Built 4-step Wellness Plan Wizard (app/wellness/step1-4): goal, nutrition, training, review+submit
- 2026-02-23: Added generating screen (polls status) and ready screen (celebration + navigation)
- 2026-02-23: WellnessProvider context for wizard state, profile prefill, LOCATION_PRESETS for equipment
- 2026-02-23: Built Plans Hub (app/plans.tsx) with 3-tab layout (Wellness, Meals, Workouts), plan cards with status badges, 3-dot action menu (change date, delete), empty states
- 2026-02-23: Added plan management hooks: useWellnessPlans, useMealPlans, useWorkoutPlans, useUpdateGoalPlan, useDelete* with cache invalidation
- 2026-02-23: Added proxy routes for GET /api/goal-plans, /api/plans, /api/workouts; PATCH/DELETE mutations
- 2026-02-23: Added "View My Plans" link on Dashboard and Ready screen navigation to Plans Hub
- 2026-02-23: Built plan detail screens: meal (7-day with expandable recipes, grocery list), workout (sessions, exercises, rest days), wellness (overview with linked plan cards)
- 2026-02-23: Made plan cards tappable in Plans Hub → navigates to detail views
- 2026-02-23: Generating screens now navigate to plan detail view on completion (not just Plans Hub)
