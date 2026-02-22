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

## Recent Changes
- 2026-02-22: Initial build - Auth flow, Dashboard, Calendar, Daily Detail, Profile screens
- 2026-02-22: Added diagnostics screen and API call logging
- 2026-02-22: Fixed React Query cache invalidation with optimistic updates
- 2026-02-22: Implemented local Express API routes (weekly-summary, week-data, day-data, completions)
- 2026-02-22: Split API clients - auth goes to external backend, data goes to local server
