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
- **Database**: PostgreSQL (Neon) with Drizzle ORM for storing user-specific completion states, plan schedules, and other dynamic data.
- **Authentication**: JWT tokens stored in `expo-secure-store`, with an automatic refresh mechanism upon 401 errors.
- **State Management**: React Query manages server-side data caching and synchronization, while React Context handles global authentication and theme-related states.
- **HTTP Clients**: Axios instances (`apiClient` for authentication, `dataClient` for data operations) are configured with JWT interceptors for seamless token handling.
- **UI/UX**: Features dynamic theming (Light, Dark, System modes) using `ThemeProvider` and `useColors()` hook for reactive color schemes, defined in `lib/theme.ts`. Color palette is "ink + stone + muted accents": light primary=#0B1F3A (navy ink), accent=#3F6B4E (sage), warning=#8A6A2F (bronze), error=#8B3A3A (brick). Dark mode uses lighter counterparts. Score colors use dedicated scoreGreen/scoreYellow/scoreRed tokens. Tab bar selection uses ink (light) / white (dark). It uses the Inter font and supports iOS 26 liquid glass tab bar. Week computations are consistently ISO 8601, Monday-based, and UTC-driven across client and server.
- **Icon System**: Centralized `<Icon>` wrapper component (`components/Icon.tsx`) using Ionicons outline variants exclusively. Semantic naming maps (e.g., `restaurant`, `barbell`, `sparkles`) to Ionicons `-outline` names. Enforces standard sizes (16|20|24|28) and defaults color to theme text. Tab bar icons use Ionicons directly (dynamic size from navigator) but with `-outline` names. Some screens retain direct Ionicons for dynamic icon names (thumbs-up/down, chevron-up/down) or oversized decorative icons.
- **Pill Component**: Centralized `<Pill>` and `<PillGrid>` components (`components/Pill.tsx`). Theme-aware: selected pills use `Colors.primary` bg with white text (readable in both light and dark modes). Variants: `"default"` (borderRadius 10), `"rounded"` (borderRadius 999, used in onboarding/profile), `"compact"` (smaller padding/font, used for equipment lists). Supports `conflict` prop for error styling.
- **Progressive Disclosure Components**: `ExpandableChipSection` (show N chips + "Show more/less") and `ExpandableEquipmentGroup` (accordion with count badge) in `components/ExpandableChipSection.tsx`. `PlanWizardSummaryBar` in `components/PlanWizardSummaryBar.tsx` provides compact one-line profile summary for wizard steps 2+. Full ProfileSummaryCard only shown on step 1.
- **Navigation Flow**: Unauthenticated → /welcome → /auth/sign-in or /auth/sign-up → (first time) /onboarding (5-step wizard) → /(tabs). AsyncStorage key `perform_onboarding_complete` tracks completion. Auth screens route through `/` (index) after login so onboarding check runs.
- **Weight Utilities**: Shared `lib/weight-utils.ts` with `kgToLbs`, `lbsToKg`, `parseWeightInput`, `formatWeightDisplay`. All screens (Profile, Onboarding, Plan creation, Wellness steps) import from this module for consistent weight formatting. `lbsToKg` stores with 2 decimal places for precision. Imperial display rounds to integer. Metric shows 1 decimal max.
- **Keyboard Handling**: Form screens use `KeyboardAwareScrollViewCompat` from `@/components/KeyboardAwareScrollViewCompat` (wraps `react-native-keyboard-controller`'s `KeyboardAwareScrollView` on native, fallback `ScrollView` on web). Applied to auth screens, profile, onboarding, plan creation forms.
- **Onboarding**: 5-step wizard (Basics, Goal, Training, Nutrition, Lifestyle). All numeric fields enforce integers via `intOnly()` strip. Imperial height uses separate ft + in inputs. On finish, filters out null/empty values before PUT /api/profile. Activity level enum values: sedentary, moderate, active.
- **Core Features**:
    - User authentication and profile management.
    - Dashboard with weekly summaries and performance metrics (adherence, trends, streaks, AI insights).
    - Performance tab with Intelligent Coaching Layer: Performance Identity Block (score + state label + delta), Momentum Trend (4-week chart + narrative), Performance Drivers (meal/workout split + bottleneck detection), Adaptive Coaching (state-based week type recommendation with CTA), Streak & Consistency (streak + 14-day completion rate). Computed client-side via `computePerformanceState` in `usePerformanceData`.
    - Calendar view for daily and weekly activity tracking.
    - Daily detail view for meal and workout completion toggles, with "Plan This Day" generation. Completed meals use opacity (not strikethrough). Subtle inline generating banner.
    - Daily plan creation forms (`app/daily-meal-form.tsx`, `app/daily-workout-form.tsx`) with date picker and relevant options before generating.
    - Comprehensive plan management for Wellness, Meals, and Workouts, including creation wizards and detailed plan views. Plan scheduling: Schedule/Reschedule/Unschedule/Delete via three-dot menu on plan detail and list screens. Uses `useUpdateGoalPlan`, `useUpdateMealPlanSchedule`, `useUpdateWorkoutPlanSchedule` hooks. Meal/workout schedules are stored locally in PostgreSQL `plan_schedules` table (not on external backend). The `useLocalSchedules` hook fetches local schedules and `mergeLocalSchedules` overlays them onto plan data from the external API. MealPlanCard/WorkoutPlanCard use View container with sibling Pressables to avoid nested Pressable issues on iOS.
    - Dashboard greeting: Time-based "Good morning/afternoon/evening, {firstName}" with date subtitle. Empty state card when no active plans.
    - Settings with profile, preferences (food, exercise), week start, theme customization, change password (Security section), and delete account (Danger Zone section with confirmation modal).
    - Forgot password screen (`app/auth/forgot-password.tsx`) linked from login. Proxies to external backend.
    - Developer diagnostics screen for monitoring API calls and application state.
    - Adaptive Plan placeholder screen (`app/adaptive-plan.tsx`) for future AI-driven plan adjustments.
- **Completion Toggle Architecture**: PATCH requests for meal/workout completions are handled locally, updating a PostgreSQL database. GET requests for data (weekly-summary, week-data, day-data) merge external backend data with local completion states. Optimistic updates are used with React Query, invalidating relevant caches on success.
- **Date Sync & Local Schedule Overlay**: `useMealPlan(id)` and `useWorkoutPlan(id)` overlay local schedule `startDate` from `useLocalSchedules` via `useMemo`. Server-side `GET /api/week-data` and `GET /api/day-data/:date` handlers consult the `plan_schedules` table: they remove plan data from original (external backend) dates when a local reschedule exists, and inject correct plan-day data at the locally-scheduled dates. Plan duration is derived from actual plan data (not hardcoded). `getPlanDuration()` helper fetches and caches plan data to determine real duration.
- **Conflict Detection**: `useConflictDates(planType, excludePlanId?)` hook in `lib/api-hooks.ts` computes occupied date ranges from existing plans of the same type. `CalendarPickerField` accepts `conflictDates` and `planDuration` props; dates that would cause overlap are shown with a red border and disabled. All schedule pickers on plans list (Nutrition, Training, Wellness tabs) and plan detail screens (meal/[id], workout/[id]) pass conflict dates.
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