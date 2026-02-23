import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient, { getAccessToken } from "./api-client";
import { logApiCall } from "./api-log";
import { getWeekStartUTC, getWeekEndUTC, computeWeekStartForDate } from "./week-utils";

function normalizeId(item: any): string | null {
  return item?.id ?? item?.mealId ?? item?.workoutId ?? item?._id ?? null;
}

function normalizeMeal(item: any, date: string, index: number): Meal {
  const id = normalizeId(item) || `meal-${date}-${index}`;
  return {
    id,
    name: item.name ?? item.title ?? `Meal ${index + 1}`,
    type: item.type ?? item.mealType ?? "",
    calories: item.calories ?? item.cals ?? undefined,
    completed: item.completed ?? item.done ?? false,
    time: item.time ?? item.scheduledTime ?? undefined,
  };
}

function normalizeWorkout(item: any, date: string, index: number): Workout {
  const id = normalizeId(item) || `workout-${date}-${index}`;
  return {
    id,
    name: item.name ?? item.title ?? `Workout ${index + 1}`,
    type: item.type ?? item.workoutType ?? "",
    duration: item.duration ?? item.durationMinutes ?? undefined,
    completed: item.completed ?? item.done ?? false,
    time: item.time ?? item.scheduledTime ?? undefined,
  };
}

function extractCompletionStatus(raw: any, itemType: string, itemKey: string): boolean | undefined {
  const completions = Array.isArray(raw?.completions) ? raw.completions : [];
  const match = completions.find((c: any) => c.itemType === itemType && c.itemKey === itemKey);
  return match ? !!match.completed : undefined;
}

function normalizeDayData(raw: any, date: string): DayData {
  let meals: Meal[] = [];
  let workouts: Workout[] = [];

  if (Array.isArray(raw?.meals)) {
    meals = raw.meals.map((m: any, i: number) => normalizeMeal(m, date, i));
  } else if (raw?.meals && typeof raw.meals === "object") {
    const mealOrder = ["breakfast", "lunch", "dinner", "snack"];
    const mealKeys = Object.keys(raw.meals).sort(
      (a, b) => (mealOrder.indexOf(a) === -1 ? 99 : mealOrder.indexOf(a)) - (mealOrder.indexOf(b) === -1 ? 99 : mealOrder.indexOf(b))
    );
    const planId = Array.isArray(raw?.planIds) ? raw.planIds[0] : null;
    meals = mealKeys.map((key, i) => {
      const m = raw.meals[key];
      const completionRecord = Array.isArray(raw?.completions) ? raw.completions.find((c: any) => c.itemType === "meal" && c.itemKey === key) : null;
      const completed = completionRecord ? !!completionRecord.completed : (m.completed ?? false);
      return {
        id: m.id || `meal-${date}-${i}`,
        name: m.name ?? m.title ?? key,
        type: key,
        calories: m.nutritionEstimateRange?.calories ? parseInt(m.nutritionEstimateRange.calories) : (m.calories ?? undefined),
        completed,
        time: m.time ?? undefined,
        itemKey: key,
        sourceType: completionRecord?.sourceType ?? "meal_plan",
        sourceId: completionRecord?.sourceId ?? planId ?? undefined,
      };
    });
  }

  if (Array.isArray(raw?.workouts)) {
    workouts = raw.workouts.map((w: any, i: number) => normalizeWorkout(w, date, i));
  } else if (raw?.workout && typeof raw.workout === "object") {
    const w = raw.workout;
    const exerciseCount = (Array.isArray(w.main) ? w.main.length : 0) +
      (Array.isArray(w.warmup) ? w.warmup.length : 0) +
      (Array.isArray(w.coolDown) ? w.coolDown.length : 0);
    if (exerciseCount > 0) {
      const workoutName = w.name ?? w.title ?? (Array.isArray(w.main) && w.main[0]?.type ? `${w.main[0].type} workout` : "Workout");
      const totalTime = w.estimatedDuration ?? w.duration ?? undefined;
      const completionRecord = Array.isArray(raw?.completions) ? raw.completions.find((c: any) => c.itemType === "workout") : null;
      const completed = completionRecord ? !!completionRecord.completed : (w.completed ?? false);
      const workoutPlanId = raw?.workoutPlanId ?? completionRecord?.sourceId ?? undefined;
      workouts = [{
        id: w.id || `workout-${date}-0`,
        name: workoutName,
        type: Array.isArray(w.main) && w.main[0]?.type ? w.main[0].type : "strength",
        duration: totalTime,
        completed,
        time: w.time ?? undefined,
        itemKey: "main",
        sourceType: completionRecord?.sourceType ?? "workout_plan",
        sourceId: workoutPlanId,
      }];
    }
  }

  const totalItems = meals.length + workouts.length;
  const completedItems = [...meals, ...workouts].filter((i) => i.completed).length;
  const score = raw?.score ?? (totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0);
  return { date: raw?.date ?? date, meals, workouts, score };
}

export interface WeeklySummary {
  score: number;
  mealsCompleted: number;
  mealsTotal: number;
  workoutsCompleted: number;
  workoutsTotal: number;
  streak: number;
  weekStart: string;
  weekEnd: string;
}

export interface DayData {
  date: string;
  meals: Meal[];
  workouts: Workout[];
  score: number;
}

export interface Meal {
  id: string;
  name: string;
  type: string;
  calories?: number;
  completed: boolean;
  time?: string;
  itemKey?: string;
  sourceType?: string;
  sourceId?: string;
}

export interface Workout {
  id: string;
  name: string;
  type: string;
  duration?: number;
  completed: boolean;
  time?: string;
  itemKey?: string;
  sourceType?: string;
  sourceId?: string;
}

export function useWeeklySummary() {
  return useQuery<WeeklySummary>({
    queryKey: ["weekly-summary"],
    queryFn: async () => {
      const url = "/api/weekly-summary";
      const fullUrl = (apiClient.defaults.baseURL || "") + url;
      const token = await getAccessToken();
      console.log("POST-LOGIN FETCH =>", { url: fullUrl, hasToken: !!token, date: new Date().toISOString() });
      try {
        const response = await apiClient.get(url);
        console.log("POST-LOGIN FETCH RESULT =>", { status: response.status, ok: response.status >= 200 && response.status < 300 });
        console.log("POST-LOGIN FETCH DATA KEYS =>", Object.keys(response.data || {}));
        logApiCall("GET", url, response.status);
        return response.data;
      } catch (err: any) {
        console.log("POST-LOGIN FETCH RESULT =>", { status: err.response?.status ?? "NETWORK_ERROR", ok: false });
        logApiCall("GET", url, err.response?.status ?? "ERR");
        console.log("[Dashboard] GET", url, "->", err.response?.status ?? err.message);
        const ws = getWeekStartUTC();
        return {
          score: 78,
          mealsCompleted: 18,
          mealsTotal: 21,
          workoutsCompleted: 4,
          workoutsTotal: 5,
          streak: 12,
          weekStart: ws,
          weekEnd: getWeekEndUTC(ws),
        };
      }
    },
  });
}

export function useWeekData(weekStart?: string) {
  return useQuery<DayData[]>({
    queryKey: ["week-data", weekStart],
    queryFn: async () => {
      const params = weekStart ? `?weekStart=${weekStart}` : "";
      const url = `/api/week-data${params}`;
      try {
        console.log("FETCHING =>", (apiClient.defaults.baseURL || "") + url);
        const response = await apiClient.get(url);
        logApiCall("GET", url, response.status);
        const responseData = response.data;
        console.log("Calendar API raw response:", JSON.stringify(responseData).slice(0, 300));
        const rawArr = responseData?.weekData ?? responseData?.days ?? responseData;
        const daysArray = Array.isArray(rawArr)
          ? rawArr
          : Array.isArray(rawArr?.days)
            ? rawArr.days
            : [];
        const normalized: DayData[] = daysArray.map((day: any) =>
          normalizeDayData(day, day?.date ?? "unknown")
        );
        console.log("Normalized week sample meal:", JSON.stringify(normalized[0]?.meals?.[0]));
        return normalized;
      } catch (err: any) {
        logApiCall("GET", url, err.response?.status ?? "ERR");
        console.log("[Calendar] GET", url, "->", err.response?.status ?? err.message);
        return generateMockWeekData(weekStart || getWeekStartUTC());
      }
    },
  });
}

export function useDayData(date: string) {
  return useQuery<DayData>({
    queryKey: ["day-data", date],
    queryFn: async () => {
      const url = `/api/day-data/${date}`;
      try {
        const response = await apiClient.get(url);
        logApiCall("GET", url, response.status);
        const raw = response.data;
        const normalized = normalizeDayData(raw, date);
        console.log("PATCH meal object:", JSON.stringify(normalized.meals[0]));
        console.log("PATCH meal id:", normalized.meals[0]?.id);
        if (normalized.workouts.length > 0) {
          console.log("PATCH workout object:", JSON.stringify(normalized.workouts[0]));
          console.log("PATCH workout id:", normalized.workouts[0]?.id);
        }
        return normalized;
      } catch (err: any) {
        logApiCall("GET", url, err.response?.status ?? "ERR");
        console.log("[DailyDetail] GET", url, "->", err.response?.status ?? err.message);
        return generateMockDayData(date);
      }
    },
    enabled: !!date,
  });
}

export function useToggleCompletion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ type, id, completed, date, itemKey, sourceType, sourceId }: {
      type: "meal" | "workout";
      id: string;
      completed: boolean;
      date: string;
      itemKey?: string;
      sourceType?: string;
      sourceId?: string;
    }) => {
      if (!id || id === "undefined" || id === "null") {
        console.warn("Missing id for patch:", { type, id, date });
        throw new Error(`Missing id for ${type} toggle`);
      }
      const url = `/api/completions/toggle`;
      const body = {
        date,
        itemType: type,
        itemKey: itemKey || id,
        sourceType: sourceType || (type === "meal" ? "meal_plan" : "workout_plan"),
        sourceId: sourceId || id,
        completed,
      };
      console.log("[Toggle] POST", url, body);
      const response = await apiClient.post(url, body);
      logApiCall("POST", url, response.status);
      return { ...response.data, _date: date, _type: type, _id: id, _completed: completed };
    },
    onMutate: async ({ type, id, completed, date }) => {
      await queryClient.cancelQueries({ queryKey: ["day-data", date] });

      const previousDayData = queryClient.getQueryData<DayData>(["day-data", date]);

      if (previousDayData) {
        const updated: DayData = {
          ...previousDayData,
          meals: previousDayData.meals.map((m) =>
            type === "meal" && m.id === id ? { ...m, completed } : m
          ),
          workouts: previousDayData.workouts.map((w) =>
            type === "workout" && w.id === id ? { ...w, completed } : w
          ),
        };
        const allItems = [...updated.meals, ...updated.workouts];
        const total = allItems.length;
        const done = allItems.filter((i) => i.completed).length;
        updated.score = total > 0 ? Math.round((done / total) * 100) : 0;

        queryClient.setQueryData<DayData>(["day-data", date], updated);
      }

      return { previousDayData };
    },
    onSuccess: (_data, variables) => {
      const { date } = variables;
      const weekStart = computeWeekStartForDate(date);

      console.log("[Toggle] onSuccess:", {
        date,
        weekStart,
        invalidating: [
          `["day-data", "${date}"]`,
          `["week-data"] (all weeks)`,
          `["weekly-summary"]`,
        ],
      });

      queryClient.invalidateQueries({ queryKey: ["day-data", date] });
      queryClient.invalidateQueries({ queryKey: ["week-data"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-summary"] });
    },
    onError: (_err, variables, context) => {
      if (context?.previousDayData) {
        queryClient.setQueryData(["day-data", variables.date], context.previousDayData);
      }
    },
  });
}

export interface ProfileData {
  unitSystem: string;
  age: number | null;
  sex: string;
  heightCm: number | null;
  weightKg: number | null;
  targetWeightKg: number | null;
  primaryGoal: string;
  trainingExperience: string;
  injuries: string[];
  mobilityLimitations: string[];
  chronicConditions: string[];
  healthConstraints: string[];
  sleepHours: number | null;
  stressLevel: string | null;
  activityLevel: string;
  trainingDaysOfWeek: string[];
  sessionDurationMinutes: number | null;
  allergies: string[];
  intolerances: string[];
  religiousRestrictions: string[];
  allergiesIntolerances: string[];
  foodsToAvoid: string[];
  foodsToAvoidNotes: string;
  appetiteLevel: string;
  spicePreference: string;
  bodyContext: string;
  favoriteMealsText: string;
  workoutLocationDefault: string;
  equipmentAvailable: string[];
  equipmentOtherNotes: string;
}

export function useProfile() {
  return useQuery<ProfileData>({
    queryKey: ["profile"],
    queryFn: async () => {
      const response = await apiClient.get("/api/profile");
      logApiCall("GET", "/api/profile", response.status);
      return response.data;
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<ProfileData>) => {
      const response = await apiClient.patch("/api/profile", updates);
      logApiCall("PATCH", "/api/profile", response.status);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export interface WeekScore {
  weekStart: string;
  label: string;
  score: number;
  mealPct: number;
  workoutPct: number;
}

export interface PerformanceData {
  currentScore: number;
  weekScores: WeekScore[];
  mealPct: number;
  workoutPct: number;
  streak: number;
  trend: "up" | "down" | "flat";
  trendDelta: number;
}

function computeWeekScore(days: DayData[]): { score: number; mealPct: number; workoutPct: number } {
  let mealsTotal = 0, mealsCompleted = 0, workoutsTotal = 0, workoutsCompleted = 0;
  for (const day of days) {
    mealsTotal += day.meals.length;
    mealsCompleted += day.meals.filter(m => m.completed).length;
    workoutsTotal += day.workouts.length;
    workoutsCompleted += day.workouts.filter(w => w.completed).length;
  }
  const total = mealsTotal + workoutsTotal;
  const completed = mealsCompleted + workoutsCompleted;
  return {
    score: total > 0 ? Math.round((completed / total) * 100) : 0,
    mealPct: mealsTotal > 0 ? Math.round((mealsCompleted / mealsTotal) * 100) : 0,
    workoutPct: workoutsTotal > 0 ? Math.round((workoutsCompleted / workoutsTotal) * 100) : 0,
  };
}

function computeStreak(allDays: DayData[]): number {
  const sorted = [...allDays]
    .filter(d => new Date(d.date) <= new Date())
    .sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  for (const day of sorted) {
    const allItems = [...day.meals, ...day.workouts];
    if (allItems.length === 0) continue;
    const hasCompletion = allItems.some(i => i.completed);
    if (hasCompletion) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function getWeekLabel(weekStart: string): string {
  const d = new Date(weekStart + "T12:00:00Z");
  const month = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const day = d.getUTCDate();
  return `${month} ${day}`;
}

export function usePerformanceData() {
  const currentWeekStart = getWeekStartUTC(0);
  const week0 = useWeekData(getWeekStartUTC(-3));
  const week1 = useWeekData(getWeekStartUTC(-2));
  const week2 = useWeekData(getWeekStartUTC(-1));
  const week3 = useWeekData(currentWeekStart);

  const isLoading = week0.isLoading || week1.isLoading || week2.isLoading || week3.isLoading;

  const data: PerformanceData | undefined = (!isLoading && week0.data && week1.data && week2.data && week3.data) ? (() => {
    const weeks = [
      { start: getWeekStartUTC(-3), days: week0.data! },
      { start: getWeekStartUTC(-2), days: week1.data! },
      { start: getWeekStartUTC(-1), days: week2.data! },
      { start: currentWeekStart, days: week3.data! },
    ];

    const weekScores: WeekScore[] = weeks.map(w => {
      const { score, mealPct, workoutPct } = computeWeekScore(w.days);
      return { weekStart: w.start, label: getWeekLabel(w.start), score, mealPct, workoutPct };
    });

    const currentStats = computeWeekScore(week3.data!);
    const prevStats = computeWeekScore(week2.data!);
    const allDays = [...(week0.data ?? []), ...(week1.data ?? []), ...(week2.data ?? []), ...(week3.data ?? [])];
    const streak = computeStreak(allDays);
    const trendDelta = currentStats.score - prevStats.score;

    return {
      currentScore: currentStats.score,
      weekScores,
      mealPct: currentStats.mealPct,
      workoutPct: currentStats.workoutPct,
      streak,
      trend: trendDelta > 3 ? "up" as const : trendDelta < -3 ? "down" as const : "flat" as const,
      trendDelta,
    };
  })() : undefined;

  return { data, isLoading };
}

function generateMockWeekData(weekStart: string): DayData[] {
  const start = new Date(weekStart + "T12:00:00Z");
  const days: DayData[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    days.push(generateMockDayData(date.toISOString().split("T")[0]));
  }

  return days;
}

function generateMockDayData(date: string): DayData {
  const mealTypes = ["Breakfast", "Lunch", "Dinner"];
  const mealNames = [
    ["Oatmeal with berries", "Greek yogurt bowl", "Smoothie bowl"],
    ["Grilled chicken salad", "Quinoa power bowl", "Turkey wrap"],
    ["Salmon with veggies", "Lean steak & rice", "Chicken stir-fry"],
  ];

  const isPast = new Date(date) < new Date();
  const dayOfWeek = new Date(date).getDay();

  const meals: Meal[] = mealTypes.map((type, i) => ({
    id: `meal-${date}-${i}`,
    name: mealNames[i][dayOfWeek % 3],
    type,
    calories: 400 + Math.floor(Math.random() * 300),
    completed: isPast ? Math.random() > 0.15 : false,
    time: ["8:00 AM", "12:30 PM", "7:00 PM"][i],
  }));

  const workoutTypes = ["Strength", "Cardio", "Flexibility"];
  const workoutNames = ["Upper body push", "30-min run", "Yoga flow"];
  const hasWorkout = dayOfWeek !== 0 && dayOfWeek !== 6;

  const workouts: Workout[] = hasWorkout
    ? [
        {
          id: `workout-${date}-0`,
          name: workoutNames[dayOfWeek % 3],
          type: workoutTypes[dayOfWeek % 3],
          duration: 30 + (dayOfWeek % 3) * 15,
          completed: isPast ? Math.random() > 0.2 : false,
          time: "6:30 AM",
        },
      ]
    : [];

  const totalItems = meals.length + workouts.length;
  const completedItems = [...meals, ...workouts].filter((item) => item.completed).length;
  const score = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return { date, meals, workouts, score };
}
