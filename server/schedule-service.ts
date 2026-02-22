import { eq, and } from "drizzle-orm";
import { db } from "./db";
import { completions } from "@shared/schema";

interface Meal {
  id: string;
  name: string;
  type: string;
  calories: number;
  completed: boolean;
  time: string;
}

interface Workout {
  id: string;
  name: string;
  type: string;
  duration: number;
  completed: boolean;
  time: string;
}

interface DayData {
  date: string;
  meals: Meal[];
  workouts: Workout[];
  score: number;
}

interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  score: number;
  mealsCompleted: number;
  mealsTotal: number;
  workoutsCompleted: number;
  workoutsTotal: number;
  streak: number;
}

function computeWeekStart(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  return d.toISOString().split("T")[0];
}

function computeWeekEnd(weekStart: string): string {
  const d = new Date(weekStart + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + 6);
  return d.toISOString().split("T")[0];
}

function generateDaySchedule(date: string): { meals: Omit<Meal, "completed">[]; workouts: Omit<Workout, "completed">[] } {
  const d = new Date(date + "T12:00:00Z");
  const dayOfWeek = d.getUTCDay();

  const mealTypes = ["Breakfast", "Lunch", "Dinner"];
  const mealNames = [
    ["Oatmeal with berries", "Greek yogurt bowl", "Smoothie bowl", "Avocado toast", "Egg white omelette", "Protein pancakes", "Overnight oats"],
    ["Grilled chicken salad", "Quinoa power bowl", "Turkey wrap", "Poke bowl", "Mediterranean plate", "Chicken caesar", "Tuna salad"],
    ["Salmon with veggies", "Lean steak & rice", "Chicken stir-fry", "Shrimp pasta", "Turkey meatballs", "Grilled fish tacos", "Beef & broccoli"],
  ];
  const mealCalories = [
    [350, 300, 400, 380, 280, 420, 320],
    [450, 500, 380, 520, 440, 480, 400],
    [550, 600, 480, 520, 500, 450, 580],
  ];
  const mealTimes = ["8:00 AM", "12:30 PM", "7:00 PM"];

  const meals = mealTypes.map((type, i) => ({
    id: `meal-${date}-${i}`,
    name: mealNames[i][dayOfWeek],
    type,
    calories: mealCalories[i][dayOfWeek],
    time: mealTimes[i],
  }));

  const workoutNames = ["Upper body push", "30-min run", "Yoga flow", "Lower body", "HIIT circuit", "Swimming"];
  const workoutTypes = ["Strength", "Cardio", "Flexibility", "Strength", "HIIT", "Cardio"];
  const workoutDurations = [45, 30, 40, 50, 25, 35];
  const hasWorkout = dayOfWeek !== 0;

  const workouts = hasWorkout
    ? [
        {
          id: `workout-${date}-0`,
          name: workoutNames[(dayOfWeek - 1) % workoutNames.length],
          type: workoutTypes[(dayOfWeek - 1) % workoutTypes.length],
          duration: workoutDurations[(dayOfWeek - 1) % workoutDurations.length],
          time: "6:30 AM",
        },
      ]
    : [];

  return { meals, workouts };
}

async function getCompletionMap(userId: string, itemIds: string[]): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();
  if (itemIds.length === 0) return result;

  const rows = await db
    .select()
    .from(completions)
    .where(eq(completions.userId, userId));

  for (const row of rows) {
    if (itemIds.includes(row.id)) {
      result.set(row.id, row.completed);
    }
  }
  return result;
}

export async function getDayData(userId: string, date: string): Promise<DayData> {
  const schedule = generateDaySchedule(date);
  const allIds = [...schedule.meals.map((m) => m.id), ...schedule.workouts.map((w) => w.id)];
  const completionMap = await getCompletionMap(userId, allIds);

  const today = new Date().toISOString().split("T")[0];
  const isPast = date < today;

  const meals: Meal[] = schedule.meals.map((m) => ({
    ...m,
    completed: completionMap.has(m.id) ? completionMap.get(m.id)! : false,
  }));

  const workouts: Workout[] = schedule.workouts.map((w) => ({
    ...w,
    completed: completionMap.has(w.id) ? completionMap.get(w.id)! : false,
  }));

  const totalItems = meals.length + workouts.length;
  const completedItems = [...meals, ...workouts].filter((i) => i.completed).length;
  const score = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return { date, meals, workouts, score };
}

export async function getWeekData(userId: string, weekStart?: string): Promise<DayData[]> {
  const start = weekStart || computeWeekStart(new Date().toISOString().split("T")[0]);
  const days: DayData[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(start + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    days.push(await getDayData(userId, dateStr));
  }

  return days;
}

export async function getWeeklySummary(userId: string, weekStart?: string): Promise<WeeklySummary> {
  const start = weekStart || computeWeekStart(new Date().toISOString().split("T")[0]);
  const end = computeWeekEnd(start);
  const weekData = await getWeekData(userId, start);

  let mealsCompleted = 0;
  let mealsTotal = 0;
  let workoutsCompleted = 0;
  let workoutsTotal = 0;

  for (const day of weekData) {
    mealsTotal += day.meals.length;
    mealsCompleted += day.meals.filter((m) => m.completed).length;
    workoutsTotal += day.workouts.length;
    workoutsCompleted += day.workouts.filter((w) => w.completed).length;
  }

  const totalItems = mealsTotal + workoutsTotal;
  const completedItems = mealsCompleted + workoutsCompleted;
  const score = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return {
    weekStart: start,
    weekEnd: end,
    score,
    mealsCompleted,
    mealsTotal,
    workoutsCompleted,
    workoutsTotal,
    streak: 0,
  };
}

export async function toggleCompletion(
  userId: string,
  itemId: string,
  itemType: "meal" | "workout",
  completed: boolean
): Promise<{ id: string; completed: boolean }> {
  const existing = await db
    .select()
    .from(completions)
    .where(and(eq(completions.id, itemId), eq(completions.userId, userId)));

  if (existing.length > 0) {
    await db
      .update(completions)
      .set({ completed })
      .where(and(eq(completions.id, itemId), eq(completions.userId, userId)));
  } else {
    await db.insert(completions).values({
      id: itemId,
      userId,
      itemType,
      completed,
    });
  }

  return { id: itemId, completed };
}
