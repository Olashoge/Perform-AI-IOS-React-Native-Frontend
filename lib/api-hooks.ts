import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "./api-client";
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

function normalizeDayData(raw: any, date: string): DayData {
  const rawMeals = Array.isArray(raw?.meals) ? raw.meals : [];
  const rawWorkouts = Array.isArray(raw?.workouts) ? raw.workouts : [];
  const meals = rawMeals.map((m: any, i: number) => normalizeMeal(m, date, i));
  const workouts = rawWorkouts.map((w: any, i: number) => normalizeWorkout(w, date, i));
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
}

export interface Workout {
  id: string;
  name: string;
  type: string;
  duration?: number;
  completed: boolean;
  time?: string;
}

export function useWeeklySummary() {
  return useQuery<WeeklySummary>({
    queryKey: ["weekly-summary"],
    queryFn: async () => {
      const url = "/api/weekly-summary";
      try {
        const response = await apiClient.get(url);
        logApiCall("GET", url, response.status);
        return response.data;
      } catch (err: any) {
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
    mutationFn: async ({ type, id, completed, date }: { type: "meal" | "workout"; id: string; completed: boolean; date: string }) => {
      if (!id || id === "undefined" || id === "null") {
        console.warn("Missing id for patch:", { type, id, date });
        return { id, completed, _date: date, _type: type, _id: id, _completed: completed };
      }
      const url = `/api/${type}s/${id}`;
      try {
        const response = await apiClient.patch(url, { completed });
        logApiCall("PATCH", url, response.status);
        return { ...response.data, _date: date, _type: type, _id: id, _completed: completed };
      } catch (err: any) {
        logApiCall("PATCH", url, err.response?.status ?? "ERR");
        console.log("[Toggle] PATCH", url, "->", err.response?.status ?? err.message);
        return { id, completed, _date: date, _type: type, _id: id, _completed: completed };
      }
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
          `["week-data", "${weekStart}"]`,
          `["weekly-summary"]`,
        ],
      });

      queryClient.invalidateQueries({ queryKey: ["day-data", date] });
      queryClient.invalidateQueries({ queryKey: ["week-data", weekStart] });
      queryClient.invalidateQueries({ queryKey: ["weekly-summary"] });
    },
    onError: (_err, variables, context) => {
      if (context?.previousDayData) {
        queryClient.setQueryData(["day-data", variables.date], context.previousDayData);
      }
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

  return { date, meals, workouts, score };
}
