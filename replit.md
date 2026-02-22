# Perform AI - Mobile App

## Overview
Perform AI is a React Native (Expo) mobile app that connects to an external backend API at `https://mealplanai.replit.app`. It uses JWT authentication to manage user sessions and displays meal/workout tracking data.

## Architecture
- **Frontend**: Expo Router (file-based routing) with React Native
- **Backend**: External API at `https://mealplanai.replit.app` (not local)
- **Local Express Server**: Serves landing page on port 5000 (not used for app logic)
- **Auth**: JWT tokens stored in expo-secure-store, auto-refresh on app start
- **State**: React Query for server state, React Context for auth state
- **HTTP Client**: Axios with interceptors for JWT auth

## Key Files
- `lib/api-client.ts` - Axios instance with JWT interceptors
- `lib/auth-context.tsx` - Auth context provider (login, logout, auto-refresh)
- `lib/api-hooks.ts` - React Query hooks for data fetching
- `app/login.tsx` - Login screen
- `app/(tabs)/index.tsx` - Dashboard with weekly summary
- `app/(tabs)/calendar.tsx` - Week view calendar
- `app/(tabs)/profile.tsx` - User profile with logout
- `app/daily/[date].tsx` - Daily detail view with completion toggles

## API Endpoints Wired
- POST `/api/auth/token-login` - Login
- POST `/api/auth/refresh` - Token refresh
- GET `/api/weekly-summary` - Weekly summary data
- GET `/api/week-data` - Week data with optional weekStart param
- GET `/api/day-data/:date` - Day data
- PATCH `/api/meals/:id` - Toggle meal completion
- PATCH `/api/workouts/:id` - Toggle workout completion

## Theme
- Dark mode with electric blue (#0A84FF) primary color
- Font: Inter (Google Fonts)
- iOS 26 liquid glass tab bar support

## Recent Changes
- 2026-02-22: Initial build - Auth flow, Dashboard, Calendar, Daily Detail, Profile screens
