import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import apiClient from "./api-client";
import { logApiCall } from "./api-log";
import { getWeekStartUTC, getWeekEndUTC, computeWeekStartForDate } from "./week-utils";

function stripPlanDateSuffix(name: string): string {
  return name.replace(/\s*[·•–\-]\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(?:,?\s*\d{4})?$/i, "").trim();
}

function cleanPlanName(raw: any): string {
  const name = (typeof raw === "string" && raw) ? raw : "";
  return name ? stripPlanDateSuffix(name) : name;
}


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
    ingredients: Array.isArray(item.ingredients) ? item.ingredients : undefined,
    steps: Array.isArray(item.steps) ? item.steps : undefined,
    nutritionEstimateRange: item.nutritionEstimateRange ? {
      calories: item.nutritionEstimateRange.calories ?? undefined,
      protein: item.nutritionEstimateRange.protein ?? item.nutritionEstimateRange.protein_g ?? undefined,
      carbs: item.nutritionEstimateRange.carbs ?? item.nutritionEstimateRange.carbs_g ?? undefined,
      fat: item.nutritionEstimateRange.fat ?? item.nutritionEstimateRange.fat_g ?? undefined,
    } : undefined,
    servings: item.servings ?? undefined,
    prepTime: item.prepTime ?? undefined,
    note: item.note ?? undefined,
    description: item.description ?? undefined,
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
    rawWorkout: item,
  };
}


function normalizeDailyMeals(dailyMeal: any, date: string, completions: any[]): Meal[] {
  if (!dailyMeal || typeof dailyMeal !== "object") return [];
  const mealsObj = dailyMeal.meals || dailyMeal;
  if (typeof mealsObj !== "object") return [];
  
  const mealOrder = ["breakfast", "lunch", "dinner", "snack"];
  const keys = Object.keys(mealsObj).filter(k => 
    typeof mealsObj[k] === "object" && mealsObj[k] !== null && mealsObj[k].name
  ).sort(
    (a, b) => (mealOrder.indexOf(a) === -1 ? 99 : mealOrder.indexOf(a)) - (mealOrder.indexOf(b) === -1 ? 99 : mealOrder.indexOf(b))
  );
  
  return keys.map((key, i) => {
    const m = mealsObj[key];
    const completionRecord = completions.find((c: any) => c.itemType === "meal" && c.itemKey === key);
    const completed = completionRecord ? !!completionRecord.completed : (m.completed ?? false);
    return {
      id: m.id || `daily-meal-${date}-${i}`,
      name: m.name ?? m.title ?? key,
      type: key,
      calories: m.nutritionEstimateRange?.calories ? parseInt(m.nutritionEstimateRange.calories) : (m.calories ?? undefined),
      completed,
      time: m.time ?? undefined,
      itemKey: key,
      sourceType: completionRecord?.sourceType ?? "daily_meal",
      sourceId: completionRecord?.sourceId ?? dailyMeal.id ?? undefined,
      ingredients: Array.isArray(m.ingredients) ? m.ingredients : undefined,
      steps: Array.isArray(m.steps) ? m.steps : undefined,
      nutritionEstimateRange: m.nutritionEstimateRange ? {
        calories: m.nutritionEstimateRange.calories ?? undefined,
        protein: m.nutritionEstimateRange.protein ?? m.nutritionEstimateRange.protein_g ?? undefined,
        carbs: m.nutritionEstimateRange.carbs ?? m.nutritionEstimateRange.carbs_g ?? undefined,
        fat: m.nutritionEstimateRange.fat ?? m.nutritionEstimateRange.fat_g ?? undefined,
      } : undefined,
      servings: m.servings ?? undefined,
      prepTime: m.prepTime ?? undefined,
      note: m.note ?? undefined,
      description: m.description ?? undefined,
    };
  });
}

function normalizeDailyWorkout(dailyWorkout: any, date: string, completions: any[]): Workout[] {
  if (!dailyWorkout || typeof dailyWorkout !== "object") return [];
  const session = dailyWorkout.session || dailyWorkout;
  if (!session || typeof session !== "object") return [];
  
  const mainExercises = Array.isArray(session.main) ? session.main : [];
  const warmupItems = Array.isArray(session.warmup) ? session.warmup : [];
  if (mainExercises.length === 0 && warmupItems.length === 0) return [];
  
  const name = session.name ?? session.title ?? (mainExercises[0]?.type ? `${mainExercises[0].type} workout` : "Daily Workout");
  const duration = session.estimatedDuration ?? session.duration ?? undefined;
  const completionRecord = completions.find((c: any) => c.itemType === "workout");
  const completed = completionRecord ? !!completionRecord.completed : (dailyWorkout.completed ?? false);
  
  return [{
    id: dailyWorkout.id || `daily-workout-${date}-0`,
    name,
    type: mainExercises[0]?.type ?? "strength",
    duration,
    completed,
    time: session.time ?? undefined,
    itemKey: "main",
    sourceType: completionRecord?.sourceType ?? "daily_workout",
    sourceId: completionRecord?.sourceId ?? dailyWorkout.id ?? undefined,
    rawWorkout: session,
  }];
}

function normalizeDayData(raw: any, date: string): DayData {
  let meals: Meal[] = [];
  let workouts: Workout[] = [];
  const completions = Array.isArray(raw?.completions) ? raw.completions : [];

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
      const completionRecord = completions.find((c: any) => c.itemType === "meal" && c.itemKey === key);
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
        ingredients: Array.isArray(m.ingredients) ? m.ingredients : undefined,
        steps: Array.isArray(m.steps) ? m.steps : undefined,
        nutritionEstimateRange: m.nutritionEstimateRange ? {
          calories: m.nutritionEstimateRange.calories ?? undefined,
          protein: m.nutritionEstimateRange.protein ?? m.nutritionEstimateRange.protein_g ?? undefined,
          carbs: m.nutritionEstimateRange.carbs ?? m.nutritionEstimateRange.carbs_g ?? undefined,
          fat: m.nutritionEstimateRange.fat ?? m.nutritionEstimateRange.fat_g ?? undefined,
        } : undefined,
        servings: m.servings ?? undefined,
        prepTime: m.prepTime ?? undefined,
        note: m.note ?? undefined,
        description: m.description ?? undefined,
      };
    });
  }

  if (meals.length === 0 && raw?.hasDailyMeal && raw?.dailyMeal) {
    meals = normalizeDailyMeals(raw.dailyMeal, date, completions);
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
        rawWorkout: w,
      }];
    }
  }

  if (workouts.length === 0 && raw?.hasDailyWorkout && raw?.dailyWorkout) {
    workouts = normalizeDailyWorkout(raw.dailyWorkout, date, completions);
  }

  const totalItems = meals.length + workouts.length;
  const completedItems = [...meals, ...workouts].filter((i) => i.completed).length;
  const score = raw?.score ?? (totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0);
  return {
    date: raw?.date ?? date,
    meals,
    workouts,
    score,
    hasDailyMeal: raw?.hasDailyMeal ?? (meals.length > 0 && meals[0]?.sourceType === "daily_meal"),
    hasDailyWorkout: raw?.hasDailyWorkout ?? (workouts.length > 0 && workouts[0]?.sourceType === "daily_workout"),
    dailyMealGenerating: raw?.dailyMealGenerating ?? false,
    dailyWorkoutGenerating: raw?.dailyWorkoutGenerating ?? false,
    rawMeals: (raw?.meals && typeof raw.meals === "object" && !Array.isArray(raw.meals)) ? raw.meals : undefined,
    rawWorkout: raw?.workout ?? undefined,
  };
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
  hasDailyMeal: boolean;
  hasDailyWorkout: boolean;
  dailyMealGenerating?: boolean;
  dailyWorkoutGenerating?: boolean;
  rawMeals?: Record<string, any>;
  rawWorkout?: any;
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
  ingredients?: string[];
  steps?: string[];
  nutritionEstimateRange?: { calories?: string; protein?: string; carbs?: string; fat?: string };
  servings?: number;
  prepTime?: string;
  note?: string;
  description?: string;
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
  rawWorkout?: any;
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
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params = weekStart ? `?weekStart=${weekStart}` : "";
      const url = `/api/week-data${params}`;
      try {
        const response = await apiClient.get(url);
        logApiCall("GET", url, response.status);
        const responseData = response.data;
        const rawArr = responseData?.weekData ?? responseData?.days ?? responseData;
        const daysArray = Array.isArray(rawArr)
          ? rawArr
          : Array.isArray(rawArr?.days)
            ? rawArr.days
            : [];
        const normalized: DayData[] = daysArray.map((day: any) =>
          normalizeDayData(day, day?.date ?? "unknown")
        );
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
  secondaryFocus: string | null;
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
  mealNotes: string;
  appetiteLevel: string;
  spicePreference: string;
  bodyContext: string;
  favoriteMealsText: string;
  workoutLocationDefault: string;
  equipmentAvailable: string[];
  equipmentOtherNotes: string;
  workoutNotes: string;
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
    mutationFn: async (payload: Partial<ProfileData>) => {
      const submitted = {
        ...payload,
        injuries: payload.healthConstraints ?? [],
        mobilityLimitations: payload.healthConstraints ?? [],
        chronicConditions: payload.healthConstraints ?? [],
        allergies: payload.allergiesIntolerances ?? [],
        intolerances: payload.allergiesIntolerances ?? [],
        religiousRestrictions: [],
      };
      const response = await apiClient.put("/api/profile", submitted);
      logApiCall("PUT", "/api/profile", response.status);
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

export type PerformanceStateKey = "on_track" | "building_momentum" | "recovering" | "at_risk" | "declining";

export interface PerformanceState {
  key: PerformanceStateKey;
  label: string;
  explanation: string[];
}

export interface PerformanceData {
  currentScore: number;
  weekScores: WeekScore[];
  mealPct: number;
  workoutPct: number;
  streak: number;
  trend: "up" | "down" | "flat";
  trendDelta: number;
  performanceState: PerformanceState;
  last14DaysRate: number | null;
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

function computePerformanceState(
  currentScore: number,
  trendDelta: number,
  weekScores: WeekScore[],
  mealPct: number,
  workoutPct: number,
  streak: number,
): PerformanceState {
  const explanation: string[] = [];
  let key: PerformanceStateKey;
  let label: string;

  const isRising = trendDelta > 3;
  const isFalling = trendDelta < -3;
  const recentScores = weekScores.slice(-2).map(w => w.score);
  const avgRecent = recentScores.length > 0 ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length : currentScore;

  if (currentScore >= 80 && !isFalling) {
    key = "on_track";
    label = "On Track";
    explanation.push(`Strong ${currentScore}% completion this week keeps you in the progression zone.`);
    if (streak >= 5) explanation.push(`${streak}-day streak shows excellent consistency.`);
    if (mealPct >= 80 && workoutPct >= 80) explanation.push("Both nutrition and training are well-balanced.");
  } else if (isRising && currentScore >= 50) {
    key = "building_momentum";
    label = "Building Momentum";
    explanation.push(`Score is climbing — up ${trendDelta}% from last week.`);
    if (currentScore < 80) explanation.push(`At ${currentScore}%, you're approaching the on-track zone.`);
    if (streak >= 3) explanation.push(`${streak}-day streak supports your upward trend.`);
  } else if (isFalling && avgRecent < 60) {
    key = "declining";
    label = "Declining";
    explanation.push(`Score dropped ${Math.abs(trendDelta)}% this week — attention needed.`);
    if (mealPct < workoutPct) explanation.push("Meal consistency is slipping more than workouts.");
    else if (workoutPct < mealPct) explanation.push("Workout attendance is the main driver of the decline.");
    explanation.push("A recovery-focused week can help reset your momentum.");
  } else if (currentScore < 50) {
    key = "at_risk";
    label = "At Risk";
    explanation.push(`${currentScore}% completion is below the consistency threshold.`);
    if (streak <= 1) explanation.push("No active streak — rebuilding daily habits is the priority.");
    explanation.push("Focus on completing at least one meal and one workout per day.");
  } else {
    key = "recovering";
    label = "Recovering";
    explanation.push(`At ${currentScore}%, you're stabilizing after a dip.`);
    if (!isFalling) explanation.push("The downward trend has stopped — consistency will push you higher.");
    if (streak >= 2) explanation.push(`Your ${streak}-day streak shows you're getting back on track.`);
  }

  return { key, label, explanation };
}

function computeLast14DaysRate(week2Days: DayData[], week3Days: DayData[]): number | null {
  const allDays = [...week2Days, ...week3Days];
  const today = new Date();
  const fourteenAgo = new Date(today);
  fourteenAgo.setDate(fourteenAgo.getDate() - 14);
  const relevant = allDays.filter(d => {
    const dd = new Date(d.date + "T12:00:00Z");
    return dd >= fourteenAgo && dd <= today;
  });
  if (relevant.length === 0) return null;
  let total = 0, completed = 0;
  for (const day of relevant) {
    total += day.meals.length + day.workouts.length;
    completed += day.meals.filter(m => m.completed).length + day.workouts.filter(w => w.completed).length;
  }
  return total > 0 ? Math.round((completed / total) * 100) : null;
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

    const trend = trendDelta > 3 ? "up" as const : trendDelta < -3 ? "down" as const : "flat" as const;
    const performanceState = computePerformanceState(currentStats.score, trendDelta, weekScores, currentStats.mealPct, currentStats.workoutPct, streak);
    const last14DaysRate = computeLast14DaysRate(week2.data!, week3.data!);

    return {
      currentScore: currentStats.score,
      weekScores,
      mealPct: currentStats.mealPct,
      workoutPct: currentStats.workoutPct,
      streak,
      trend,
      trendDelta,
      performanceState,
      last14DaysRate,
    };
  })() : undefined;

  return { data, isLoading };
}

export function useApplyRecoveryWeek() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { weekStart: string; wellnessPlanId?: string; weekType: string }) => {
      const response = await apiClient.post("/api/performance/apply-recovery-week", payload);
      logApiCall("POST", "/api/performance/apply-recovery-week", response.status);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-summary"] });
      queryClient.invalidateQueries({ queryKey: ["week-data"] });
      queryClient.invalidateQueries({ queryKey: ["wellness-plans"] });
      queryClient.invalidateQueries({ queryKey: ["meal-plans"] });
      queryClient.invalidateQueries({ queryKey: ["workout-plans"] });
      queryClient.invalidateQueries({ queryKey: ["availability"] });
    },
  });
}

export interface AvailabilityData {
  mealDates: string[];
  workoutDates: string[];
  allDates: string[];
}

export function useAvailability() {
  return useQuery<AvailabilityData>({
    queryKey: ["availability"],
    queryFn: async () => {
      const response = await apiClient.get("/api/availability");
      logApiCall("GET", "/api/availability", response.status);
      return response.data;
    },
    staleTime: 0,
  });
}

export interface GenerationStatus {
  goalPlanId: string;
  status: "generating" | "ready" | "failed";
  progress: {
    stage: string;
    stageStatuses: {
      TRAINING: string;
      NUTRITION: string;
      SCHEDULING: string;
      FINALIZING: string;
    };
    errorMessage?: string;
  };
  planType: string;
  mealPlan: { id: string; status: string } | null;
  workoutPlan: { id: string; status: string } | null;
}

export function useGenerationStatus(goalPlanId: string | null, enabled: boolean) {
  return useQuery<GenerationStatus>({
    queryKey: ["generation-status", goalPlanId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/goal-plans/${goalPlanId}/generation-status`);
      logApiCall("GET", `/api/goal-plans/${goalPlanId}/generation-status`, response.status);
      return response.data;
    },
    enabled: !!goalPlanId && enabled,
    refetchInterval: 2000,
  });
}

export function useGenerateGoalPlan() {
  return useMutation({
    mutationFn: async (payload: any) => {
      const response = await apiClient.post("/api/goal-plans/generate", payload);
      logApiCall("POST", "/api/goal-plans/generate", response.status);
      return response.data;
    },
  });
}

export function useGoalPlan(id: string | null) {
  return useQuery({
    queryKey: ["goal-plan", id],
    queryFn: async () => {
      const response = await apiClient.get(`/api/goal-plans/${id}`);
      logApiCall("GET", `/api/goal-plans/${id}`, response.status);
      const data = response.data;
      if (data && typeof data === "object") {
        const rawName = data.name || data.title;
        if (rawName) {
          const cleaned = cleanPlanName(rawName);
          return { ...data, name: cleaned, title: cleaned };
        }
      }
      return data;
    },
    enabled: !!id,
  });
}


export function useOccupiedDates(excludePlanId?: string) {
  const params = new URLSearchParams();
  if (excludePlanId) params.set("excludePlanId", excludePlanId);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return useQuery<string[]>({
    queryKey: ["occupied-dates", excludePlanId || "all"],
    queryFn: async () => {
      const response = await apiClient.get(`/api/calendar/occupied-dates${qs}`);
      logApiCall("GET", `/api/calendar/occupied-dates${qs}`, response.status);
      const data = response.data;
      return data?.occupiedDates || data?.dates || [];
    },
    staleTime: 30000,
  });
}

function computeDateRange(startDate: string, numDays: number): string[] {
  const dates: string[] = [];
  const sd = new Date(startDate + "T12:00:00Z");
  for (let i = 0; i < numDays; i++) {
    const d = new Date(sd);
    d.setUTCDate(d.getUTCDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

export function useConflictDates(excludePlanId?: string) {
  const wellnessPlans = useWellnessPlans();

  return useMemo(() => {
    const dates: string[] = [];
    for (const wp of (wellnessPlans.data || [])) {
      const id = wp._id || wp.id;
      if (excludePlanId && id === excludePlanId) continue;
      const startDate = wp.startDate || wp.start_date || wp.planStartDate;
      if (!startDate) continue;
      dates.push(...computeDateRange(startDate, 7));
    }
    return dates;
  }, [wellnessPlans.data, excludePlanId]);
}

export function useCreateDailyMeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      date,
      mealsPerDay,
      dietStyles,
      cookingTime,
      budgetMode,
      mealNotes,
    }: {
      date: string;
      mealsPerDay: number;
      dietStyles?: string[];
      cookingTime?: string;
      budgetMode?: string;
      mealNotes?: string;
    }) => {
      const response = await apiClient.post("/api/daily-meal", {
        date,
        mealsPerDay,
        dietStyles,
        cookingTime,
        budgetMode,
        mealNotes,
      });
      logApiCall("POST", "/api/daily-meal", response.status);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["day-data", variables.date] });
      queryClient.invalidateQueries({ queryKey: ["week-data"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-summary"] });
      queryClient.invalidateQueries({ queryKey: ["daily-coverage"] });
    },
  });
}

export function useCreateDailyWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      date,
      trainingMode,
      focusAreas,
      workoutNotes,
    }: {
      date: string;
      trainingMode?: string;
      focusAreas?: string[];
      workoutNotes?: string;
    }) => {
      const response = await apiClient.post("/api/daily-workout", {
        date,
        trainingMode,
        focusAreas,
        workoutNotes,
      });
      logApiCall("POST", "/api/daily-workout", response.status);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["day-data", variables.date] });
      queryClient.invalidateQueries({ queryKey: ["week-data"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-summary"] });
      queryClient.invalidateQueries({ queryKey: ["daily-coverage"] });
    },
  });
}

export function useDailyCoverage() {
  return useQuery<Record<string, { hasMeal: boolean; hasWorkout: boolean }>>({
    queryKey: ["daily-coverage"],
    queryFn: async () => {
      const response = await apiClient.get("/api/daily-coverage");
      logApiCall("GET", "/api/daily-coverage", response.status);
      return response.data;
    },
    staleTime: 30000,
  });
}

export function useWellnessPlans() {
  return useQuery({
    queryKey: ["plans:wellness"],
    queryFn: async () => {
      const response = await apiClient.get("/api/goal-plans");
      logApiCall("GET", "/api/goal-plans", response.status);
      const plans = Array.isArray(response.data) ? response.data : response.data?.goalPlans || response.data?.plans || [];
      return plans.filter((p: any) => !p.deleted && !p.isDeleted && !p.deletedAt).map((p: any) => ({
        ...p,
        name: cleanPlanName(p.name || p.title) || "Wellness Plan",
      }));
    },
    staleTime: 30000,
  });
}


export function useUpdateGoalPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiClient.patch(`/api/goal-plans/${id}`, data);
      logApiCall("PATCH", `/api/goal-plans/${id}`, response.status);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["goal-plan", variables.id] });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "goal-plan" });
      queryClient.invalidateQueries({ queryKey: ["plans:wellness"] });
      queryClient.invalidateQueries({ queryKey: ["plans:meal"] });
      queryClient.invalidateQueries({ queryKey: ["plans:workout"] });
      queryClient.invalidateQueries({ queryKey: ["occupied-dates"] });
      queryClient.invalidateQueries({ queryKey: ["availability"] });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "week-data" });
      queryClient.invalidateQueries({ queryKey: ["weekly-summary"] });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "day-data" });
    },
  });
}

export function useDeleteGoalPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/api/goal-plans/${id}`);
      logApiCall("DELETE", `/api/goal-plans/${id}`, response.status);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "goal-plan" });
      queryClient.invalidateQueries({ queryKey: ["plans:wellness"] });
      queryClient.invalidateQueries({ queryKey: ["plans:meal"] });
      queryClient.invalidateQueries({ queryKey: ["plans:workout"] });
      queryClient.invalidateQueries({ queryKey: ["occupied-dates"] });
      queryClient.invalidateQueries({ queryKey: ["availability"] });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "week-data" });
      queryClient.invalidateQueries({ queryKey: ["weekly-summary"] });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "day-data" });
    },
  });
}

export interface MealPreference {
  id: string;
  mealName: string;
  cuisineTag?: string;
  mealFingerprint?: string;
  feedback: "like" | "dislike";
  createdAt?: string;
}

export interface IngredientPreference {
  id: string;
  ingredientKey: string;
  preference: "prefer" | "avoid";
  source?: string;
  createdAt?: string;
}

export interface MealPreferencesData {
  likedMeals: MealPreference[];
  dislikedMeals: MealPreference[];
  avoidIngredients: IngredientPreference[];
  preferIngredients: IngredientPreference[];
}

export interface ExercisePreference {
  id: string;
  exerciseName?: string;
  name?: string;
  type?: string;
  feedback?: string;
  status?: string;
  createdAt?: string;
}

export interface ExercisePreferencesData {
  liked: ExercisePreference[];
  disliked: ExercisePreference[];
  avoided: ExercisePreference[];
}

export function useMealPreferences() {
  return useQuery<MealPreferencesData>({
    queryKey: ["meal-preferences"],
    queryFn: async () => {
      const response = await apiClient.get("/api/preferences");
      logApiCall("GET", "/api/preferences", response.status);
      return response.data;
    },
  });
}

export function useExercisePreferences() {
  return useQuery<ExercisePreferencesData>({
    queryKey: ["exercise-preferences"],
    queryFn: async () => {
      const response = await apiClient.get("/api/preferences/exercise");
      logApiCall("GET", "/api/preferences/exercise", response.status);
      return response.data;
    },
  });
}

export function useDeleteMealPreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/api/preferences/meal/${id}`);
      logApiCall("DELETE", `/api/preferences/meal/${id}`, response.status);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-preferences"] });
    },
  });
}

export function useDeleteIngredientPreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/api/preferences/ingredient/${id}`);
      logApiCall("DELETE", `/api/preferences/ingredient/${id}`, response.status);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-preferences"] });
    },
  });
}

export function useDeleteExercisePreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/api/preferences/exercise/${id}`);
      logApiCall("DELETE", `/api/preferences/exercise/${id}`, response.status);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercise-preferences"] });
    },
  });
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function toExerciseKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export function computeMealFingerprint(name: string, cuisineTag?: string, ingredients?: any[]): string {
  const slugName = slugify(name);
  const slugCuisine = cuisineTag ? slugify(cuisineTag) : "";
  let firstIngredient = "";
  if (Array.isArray(ingredients) && ingredients.length > 0) {
    const raw = typeof ingredients[0] === "string" ? ingredients[0] : ingredients[0]?.item || ingredients[0]?.name || "";
    firstIngredient = slugify(raw);
  }
  return [slugName, slugCuisine, firstIngredient].filter(Boolean).join("|");
}

export function useMealFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { mealFingerprint: string; feedback: "like" | "dislike"; mealName: string; cuisineTag?: string; ingredients?: string[] }) => {
      const response = await apiClient.post("/api/feedback/meal", {
        mealFingerprint: params.mealFingerprint,
        feedback: params.feedback,
        mealName: params.mealName,
        cuisineTag: params.cuisineTag || "",
        ingredients: params.ingredients || [],
      });
      logApiCall("POST", "/api/feedback/meal", response.status);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-preferences"] });
    },
  });
}

export function useResolveIngredientProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { proposalId: string; chosenIngredients: string[]; action?: "accepted" | "declined" }) => {
      const response = await apiClient.post(`/api/ingredient-proposals/${params.proposalId}/resolve`, {
        chosenIngredients: params.chosenIngredients,
        action: params.action || "accepted",
      });
      logApiCall("POST", `/api/ingredient-proposals/${params.proposalId}/resolve`, response.status);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-preferences"] });
    },
  });
}

export function useExerciseFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { exerciseKey: string; exerciseName: string; status: "liked" | "disliked" | "avoided" }) => {
      const response = await apiClient.post("/api/preferences/exercise", {
        exerciseKey: params.exerciseKey,
        exerciseName: params.exerciseName,
        status: params.status,
      });
      logApiCall("POST", "/api/preferences/exercise", response.status);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercise-preferences"] });
    },
  });
}

export function useDeleteExercisePreferenceByKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (key: string) => {
      const response = await apiClient.delete(`/api/preferences/exercise/key/${key}`);
      logApiCall("DELETE", `/api/preferences/exercise/key/${key}`, response.status);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercise-preferences"] });
    },
  });
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

  return { date, meals, workouts, score, hasDailyMeal: false, hasDailyWorkout: false };
}

export interface GrocerySectionItem {
  item: string;
  quantity: string;
}

export interface GrocerySection {
  name: string;
  items: GrocerySectionItem[];
}

export interface GroceryListData {
  groceryList: { sections: GrocerySection[] };
  ownedItems: Record<string, boolean>;
}

export function useGroceryList(mealPlanId: string | null) {
  return useQuery<GroceryListData>({
    queryKey: ["/api/plan", mealPlanId, "grocery"],
    queryFn: async () => {
      const response = await apiClient.get(`/api/plan/${mealPlanId}/grocery`);
      logApiCall("GET", `/api/plan/${mealPlanId}/grocery`, response.status);
      return response.data;
    },
    enabled: !!mealPlanId,
  });
}

export function useToggleGroceryOwned(mealPlanId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemKey, isOwned }: { itemKey: string; isOwned: boolean }) => {
      const response = await apiClient.post(`/api/plan/${mealPlanId}/grocery/owned`, {
        itemKey,
        isOwned,
      });
      logApiCall("POST", `/api/plan/${mealPlanId}/grocery/owned`, response.status);
      return response.data;
    },
    onMutate: async ({ itemKey, isOwned }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/plan", mealPlanId, "grocery"] });
      const previousData = queryClient.getQueryData<GroceryListData>(["/api/plan", mealPlanId, "grocery"]);

      if (previousData) {
        const newOwned = { ...previousData.ownedItems };
        if (isOwned) {
          newOwned[itemKey] = true;
        } else {
          delete newOwned[itemKey];
        }

        queryClient.setQueryData<GroceryListData>(
          ["/api/plan", mealPlanId, "grocery"],
          { ...previousData, ownedItems: newOwned }
        );
      }

      return { previousData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plan", mealPlanId, "grocery"] });
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["/api/plan", mealPlanId, "grocery"], context.previousData);
      }
    },
  });
}

export function useRegenerateGroceryList(mealPlanId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(`/api/plan/${mealPlanId}/grocery/regenerate`);
      logApiCall("POST", `/api/plan/${mealPlanId}/grocery/regenerate`, response.status);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plan", mealPlanId, "grocery"] });
    },
  });
}

// Goal-plan grocery hooks — use these in the Wellness Plan flow
export function useGoalPlanGroceryList(goalPlanId: string | null) {
  return useQuery<GroceryListData>({
    queryKey: ["/api/goal-plans", goalPlanId, "grocery"],
    queryFn: async () => {
      const response = await apiClient.get(`/api/goal-plans/${goalPlanId}/grocery`);
      logApiCall("GET", `/api/goal-plans/${goalPlanId}/grocery`, response.status);
      return response.data;
    },
    enabled: !!goalPlanId,
  });
}

export function useGoalPlanToggleGroceryOwned(goalPlanId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemKey, isOwned }: { itemKey: string; isOwned: boolean }) => {
      const response = await apiClient.post(`/api/goal-plans/${goalPlanId}/grocery/owned`, {
        itemKey,
        isOwned,
      });
      logApiCall("POST", `/api/goal-plans/${goalPlanId}/grocery/owned`, response.status);
      return response.data;
    },
    onMutate: async ({ itemKey, isOwned }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/goal-plans", goalPlanId, "grocery"] });
      const previousData = queryClient.getQueryData<GroceryListData>(["/api/goal-plans", goalPlanId, "grocery"]);

      if (previousData) {
        const newOwned = { ...previousData.ownedItems };
        const sections = previousData.groceryList?.sections ?? [];
        for (const section of sections) {
          for (const item of section.items ?? []) {
            if (item.key === itemKey) {
              newOwned[itemKey] = isOwned;
            }
          }
        }
        queryClient.setQueryData<GroceryListData>(
          ["/api/goal-plans", goalPlanId, "grocery"],
          { ...previousData, ownedItems: newOwned }
        );
      }

      return { previousData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goal-plans", goalPlanId, "grocery"] });
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["/api/goal-plans", goalPlanId, "grocery"], context.previousData);
      }
    },
  });
}

export function useGoalPlanRegenerateGroceryList(goalPlanId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(`/api/goal-plans/${goalPlanId}/grocery/regenerate`);
      logApiCall("POST", `/api/goal-plans/${goalPlanId}/grocery/regenerate`, response.status);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goal-plans", goalPlanId, "grocery"] });
    },
  });
}


