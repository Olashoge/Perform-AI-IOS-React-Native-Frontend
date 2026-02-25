# Perform AI - Mobile App

## Overview
Perform AI is a React Native (Expo) mobile application designed for comprehensive meal and workout tracking. It aims to provide users with tools for logging daily activities, managing their fitness and nutrition plans, and visualizing their progress. The project's vision is to offer a seamless and intuitive mobile experience for health-conscious individuals, leveraging AI for personalized insights and plan generation.

## User Preferences
I prefer clear and concise communication. When suggesting changes, please provide a brief overview of the impact. For complex features or architectural decisions, I appreciate detailed explanations. I prefer an iterative development approach, focusing on core functionalities first. Please ensure the application's responsiveness and a smooth user experience.

## System Architecture
The application is built with React Native and Expo Router for file-based navigation. It utilizes a hybrid backend approach:
- **Frontend**: Expo Router with React Native.
- **Auth Backend**: External API for user authentication and token management.
- **Data Backend**: A local Express.js server handles core data operations and acts as a proxy for certain external backend calls, merging data with local completion states.
- **Database**: PostgreSQL (Neon) with Drizzle ORM for storing user-specific completion states and other dynamic data.
- **Authentication**: JWT tokens stored in `expo-secure-store`, with an automatic refresh mechanism upon 401 errors.
- **State Management**: React Query manages server-side data caching and synchronization, while React Context handles global authentication and theme-related states.
- **HTTP Clients**: Axios instances (`apiClient` for authentication, `dataClient` for data operations) are configured with JWT interceptors for seamless token handling.
- **UI/UX**: Features dynamic theming (Light, Dark, System modes) using `ThemeProvider` and `useColors()` hook for reactive color schemes, defined in `lib/theme.ts`. Color palette is "institutional blue + muted accents": light primary=#2D5BFF (blue), accent=#2E8B57 (sage), warning=#D08A1D (gold), error=#B65C5C (muted red). Dark mode uses lighter counterparts (#5B8AFF, #4CAF6E, #D9A84E, #CF7070). Score colors use dedicated scoreGreen/scoreYellow/scoreRed tokens. Tab bar selection uses primary blue (light) / #5B8AFF (dark). It uses the Inter font and supports iOS 26 liquid glass tab bar. Week computations are consistently ISO 8601, Monday-based, and UTC-driven across client and server.
- **Navigation Flow**: Unauthenticated → /welcome → /auth/sign-in or /auth/sign-up → (first time) /onboarding (5-step wizard) → /(tabs). AsyncStorage key `perform_onboarding_complete` tracks completion. Auth screens route through `/` (index) after login so onboarding check runs.
- **Onboarding**: 5-step wizard (Basics, Goal, Training, Nutrition, Lifestyle). All numeric fields enforce integers via `intOnly()` strip. Imperial height uses separate ft + in inputs. On finish, filters out null/empty values before PUT /api/profile. Activity level enum values: sedentary, moderate, active.
- **Core Features**:
    - User authentication and profile management.
    - Dashboard with weekly summaries and performance metrics (adherence, trends, streaks, AI insights).
    - Performance tab with Intelligent Coaching Layer: Performance Identity Block (score + state label + delta), Momentum Trend (4-week chart + narrative), Performance Drivers (meal/workout split + bottleneck detection), Adaptive Coaching (state-based week type recommendation with CTA), Streak & Consistency (streak + 14-day completion rate). Computed client-side via `computePerformanceState` in `usePerformanceData`.
    - Calendar view for daily and weekly activity tracking.
    - Daily detail view for meal and workout completion toggles, with "Plan This Day" generation.
    - Comprehensive plan management for Wellness, Meals, and Workouts, including creation wizards and detailed plan views.
    - Settings with profile, preferences (food, exercise), week start, and theme customization.
    - Developer diagnostics screen for monitoring API calls and application state.
    - Adaptive Plan placeholder screen (`app/adaptive-plan.tsx`) for future AI-driven plan adjustments.
- **Completion Toggle Architecture**: PATCH requests for meal/workout completions are handled locally, updating a PostgreSQL database. GET requests for data (weekly-summary, week-data, day-data) merge external backend data with local completion states. Optimistic updates are used with React Query, invalidating relevant caches on success.
- **Plan Detail Architecture**: Dedicated screens for meal, workout, and wellness plan details, providing rich content like recipes, exercise routines, and goal overviews.
- **Budget/Allowance System**: `useAllowance()` hook fetches daily limits from `GET /api/allowance/current`. Meal plan detail screen shows a "Today's Budget" card with remaining swaps, day regens, and plan regens. Swap/regen buttons check budget before proceeding and disable when exhausted. On swap/regen success, the allowance query is invalidated to refresh counts. 403 errors from the backend are surfaced via Alert. Query key: `["allowance"]`.
- **Meal Swap / Day Regen**: `useMealSwap(planId)` calls `POST /api/plan/:id/swap` with `{ dayIndex, mealType }`. `useDayRegen(planId)` calls `POST /api/plan/:id/regenerate-day` with `{ dayIndex }`. Both invalidate plan, grocery, and allowance queries on success.

## External Dependencies
- **Auth Service**: `https://mealplanai.replit.app` (for user login and token refresh).
- **Database**: PostgreSQL (Neon) accessed via Drizzle ORM.
- **HTTP Client**: Axios.
- **State Management**: React Query.
- **Secure Storage**: `expo-secure-store`.
- **UI Framework**: React Native, Expo.
- **Font**: Google Fonts (Inter).