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
- **UI/UX**: Features dynamic theming (Light, Dark, System modes) using `ThemeProvider` and `useColors()` hook for reactive color schemes, defined in `lib/theme.ts`. Color palette is "ink + stone + muted accents": light primary=#0B1F3A (navy ink), accent=#3F6B4E (sage), warning=#8A6A2F (bronze), error=#8B3A3A (brick). Dark mode uses lighter counterparts. Score colors use dedicated scoreGreen/scoreYellow/scoreRed tokens. Tab bar selection uses ink (light) / white (dark). It uses the Inter font and supports iOS 26 liquid glass tab bar. Week computations are consistently ISO 8601, Monday-based, and UTC-driven across client and server.
- **Icon System**: Centralized `<Icon>` wrapper component (`components/Icon.tsx`) using Ionicons outline variants exclusively. Semantic naming maps (e.g., `restaurant`, `barbell`, `sparkles`) to Ionicons `-outline` names. Enforces standard sizes (16|20|24|28) and defaults color to theme text. Tab bar icons use Ionicons directly (dynamic size from navigator) but with `-outline` names. Some screens retain direct Ionicons for dynamic icon names (thumbs-up/down, chevron-up/down) or oversized decorative icons.
- **Pill Component**: Centralized `<Pill>` and `<PillGrid>` components (`components/Pill.tsx`). Theme-aware: selected pills use `Colors.primary` bg with white text (readable in both light and dark modes). Variants: `"default"` (borderRadius 10), `"rounded"` (borderRadius 999, used in onboarding/profile), `"compact"` (smaller padding/font, used for equipment lists). Supports `conflict` prop for error styling.
- **Navigation Flow**: Unauthenticated → /welcome → /auth/sign-in or /auth/sign-up → (first time) /onboarding (5-step wizard) → /(tabs). AsyncStorage key `perform_onboarding_complete` tracks completion. Auth screens route through `/` (index) after login so onboarding check runs.
- **Onboarding**: 5-step wizard (Basics, Goal, Training, Nutrition, Lifestyle). All numeric fields enforce integers via `intOnly()` strip. Imperial height uses separate ft + in inputs. On finish, filters out null/empty values before PUT /api/profile. Activity level enum values: sedentary, moderate, active.
- **Core Features**:
    - User authentication and profile management.
    - Dashboard with weekly summaries and performance metrics (adherence, trends, streaks, AI insights).
    - Performance tab with Intelligent Coaching Layer: Performance Identity Block (score + state label + delta), Momentum Trend (4-week chart + narrative), Performance Drivers (meal/workout split + bottleneck detection), Adaptive Coaching (state-based week type recommendation with CTA), Streak & Consistency (streak + 14-day completion rate). Computed client-side via `computePerformanceState` in `usePerformanceData`.
    - Calendar view for daily and weekly activity tracking.
    - Daily detail view for meal and workout completion toggles, with "Plan This Day" generation.
    - Comprehensive plan management for Wellness, Meals, and Workouts, including creation wizards and detailed plan views.
    - Settings with profile, preferences (food, exercise), week start, theme customization, security (change password), and account deletion.
    - Developer diagnostics screen for monitoring API calls and application state.
    - Adaptive Plan placeholder screen (`app/adaptive-plan.tsx`) for future AI-driven plan adjustments.
- **Completion Toggle Architecture**: PATCH requests for meal/workout completions are handled locally, updating a PostgreSQL database. GET requests for data (weekly-summary, week-data, day-data) merge external backend data with local completion states. Optimistic updates are used with React Query, invalidating relevant caches on success.
- **Plan Detail Architecture**: Dedicated screens for meal, workout, and wellness plan details, providing rich content like recipes, exercise routines, and goal overviews.
- **Budget/Allowance System**: `useAllowance()` hook fetches daily limits from `GET /api/allowance/current`. Meal plan detail screen shows a "Today's Budget" card with remaining swaps, day regens, and plan regens. Swap/regen buttons check budget before proceeding and disable when exhausted. On swap/regen success, the allowance query is invalidated to refresh counts. 403 errors from the backend are surfaced via Alert. Query key: `["allowance"]`.
- **Meal Swap / Day Regen**: `useMealSwap(planId)` calls `POST /api/plan/:id/swap` with `{ dayIndex, mealType }`. `useDayRegen(planId)` calls `POST /api/plan/:id/regenerate-day` with `{ dayIndex }`. Both invalidate plan, grocery, and allowance queries on success.

## How to Run

### Expo Go (Physical Device — Tunnel Mode)
Run the **Expo Tunnel** workflow, which executes:
```
EXPO_NO_DOCTOR=1 EXPO_PUBLIC_DOMAIN=$REPLIT_DEV_DOMAIN:5000 npx expo start --tunnel --clear <<< $'\n'
```
- Uses ngrok tunnel so Expo Go on your phone can connect regardless of network.
- Scan the QR code shown in the terminal output with Expo Go (Android) or Camera (iOS).
- The **Start Frontend** workflow must be stopped first (they share port 8081).
- Requires `@expo/ngrok` (already installed as a dev dependency).

### Web Preview (Browser Dev — Localhost Mode)
Run the **Start Frontend** workflow:
```
EXPO_PACKAGER_PROXY_URL=https://$REPLIT_DEV_DOMAIN REACT_NATIVE_PACKAGER_HOSTNAME=$REPLIT_DEV_DOMAIN EXPO_PUBLIC_DOMAIN=$REPLIT_DEV_DOMAIN:5000 npx expo start --localhost
```
- Best for web browser development in Replit's webview.
- The **Expo Tunnel** workflow must be stopped first (they share port 8081).

### Backend
Always run **Start Backend** (`npm run server:dev`) alongside either frontend workflow. It serves the Express API on port 5000.

## External Dependencies
- **Auth Service**: `https://mealplanai.replit.app` (for user login and token refresh).
- **Database**: PostgreSQL (Neon) accessed via Drizzle ORM.
- **HTTP Client**: Axios.
- **State Management**: React Query.
- **Secure Storage**: `expo-secure-store`.
- **UI Framework**: React Native, Expo.
- **Font**: Google Fonts (Inter).