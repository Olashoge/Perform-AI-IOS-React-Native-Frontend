import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dataClient } from "./api-client";
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
        const response = await dataClient.get(url);
        logApiCall("GET", url, response.status);
        console.log("[Dashboard] GET", url, "-> 200");
        return response.data;
      } catch (err: any) {
        logApiCall("GET", url, err.response?.status ?? "ERR");
        console.log("[Dashboard] GET", url, "->", err.response?.status ?? err.message);
        throw err;
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
        const response = await dataClient.get(url);
        logApiCall("GET", url, response.status);
        console.log("[Calendar] GET", url, "-> 200");
        return response.data;
      } catch (err: any) {
        logApiCall("GET", url, err.response?.status ?? "ERR");
        console.log("[Calendar] GET", url, "->", err.response?.status ?? err.message);
        throw err;
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
        const response = await dataClient.get(url);
        logApiCall("GET", url, response.status);
        console.log("[DailyDetail] GET", url, "-> 200");
        return response.data;
      } catch (err: any) {
        logApiCall("GET", url, err.response?.status ?? "ERR");
        console.log("[DailyDetail] GET", url, "->", err.response?.status ?? err.message);
        throw err;
      }
    },
    enabled: !!date,
  });
}

export function useToggleCompletion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ type, id, completed, date }: { type: "meal" | "workout"; id: string; completed: boolean; date: string }) => {
      const url = `/api/${type}s/${id}`;
      try {
        const response = await dataClient.patch(url, { completed });
        logApiCall("PATCH", url, response.status);
        console.log("[Toggle] PATCH", url, "-> 200");
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
      const weekStart = computeWeekStart(date);

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

function computeWeekStart(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

