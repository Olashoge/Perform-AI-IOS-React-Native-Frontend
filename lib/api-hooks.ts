import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "./api-client";
import { logApiCall } from "./api-log";

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
        return {
          score: 78,
          mealsCompleted: 18,
          mealsTotal: 21,
          workoutsCompleted: 4,
          workoutsTotal: 5,
          streak: 12,
          weekStart: getWeekStart(),
          weekEnd: getWeekEnd(),
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
        const response = await apiClient.get(url);
        logApiCall("GET", url, response.status);
        return response.data;
      } catch (err: any) {
        logApiCall("GET", url, err.response?.status ?? "ERR");
        console.log("[Calendar] GET", url, "->", err.response?.status ?? err.message);
        return generateMockWeekData(weekStart);
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
        return response.data;
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
    mutationFn: async ({ type, id, completed }: { type: "meal" | "workout"; id: string; completed: boolean }) => {
      const url = `/api/${type}s/${id}`;
      try {
        const response = await apiClient.patch(url, { completed });
        logApiCall("PATCH", url, response.status);
        return response.data;
      } catch (err: any) {
        logApiCall("PATCH", url, err.response?.status ?? "ERR");
        console.log("[Toggle] PATCH", url, "->", err.response?.status ?? err.message);
        return { id, completed };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["day-data"] });
      queryClient.invalidateQueries({ queryKey: ["week-data"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-summary"] });
    },
  });
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split("T")[0];
}

function getWeekEnd(): string {
  const start = new Date(getWeekStart());
  start.setDate(start.getDate() + 6);
  return start.toISOString().split("T")[0];
}

function generateMockWeekData(weekStart?: string): DayData[] {
  const start = weekStart ? new Date(weekStart) : new Date(getWeekStart());
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
