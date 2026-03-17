import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Platform,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/components/Icon";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors, ThemeColors } from "@/lib/theme-context";
import { useWeekData, useWellnessPlans, DayData, Meal, Workout } from "@/lib/api-hooks";
import { getWeekStartUTC, getWeekEndUTC } from "@/lib/week-utils";
import { useWeekStart } from "@/lib/week-start-context";
import { useAuth } from "@/lib/auth-context";

const MONTHS_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS_SHORT_SUN = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DAYS_SHORT_MON = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

function getScoreColor(score: number, Colors: ThemeColors) {
  if (score >= 50) return Colors.scoreGreen;
  if (score >= 35) return Colors.scoreYellow;
  return Colors.scoreRed;
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + "T12:00:00Z");
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const sm = MONTHS_SHORT[start.getUTCMonth()];
  const sd = start.getUTCDate();
  const em = MONTHS_SHORT[end.getUTCMonth()];
  const ed = end.getUTCDate();
  if (sm === em) return `${sm} ${sd} — ${em} ${ed}`;
  return `${sm} ${sd} — ${em} ${ed}`;
}

function formatFullDate(weekStart: string): string {
  const d = new Date(weekStart + "T12:00:00Z");
  return `${MONTHS_FULL[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

function formatDayHeader(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  return `${dayNames[d.getUTCDay()]}, ${MONTHS_FULL[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

function ScoreRing({ score, size = 140, Colors }: { score: number; size?: number; Colors: ThemeColors }) {
  const color = getScoreColor(score, Colors);
  const strokeWidth = 10;
  return (
    <View style={{ width: size, height: size, justifyContent: "center", alignItems: "center" }}>
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        borderWidth: strokeWidth, borderColor: Colors.surfaceElevated,
        position: "absolute",
      }} />
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        borderWidth: strokeWidth,
        borderColor: color,
        borderTopColor: color,
        borderRightColor: score > 25 ? color : Colors.surfaceElevated,
        borderBottomColor: score > 50 ? color : Colors.surfaceElevated,
        borderLeftColor: score > 75 ? color : Colors.surfaceElevated,
        position: "absolute",
        transform: [{ rotate: "-90deg" }],
        opacity: 0.9,
      }} />
      <Text style={{ fontSize: 30, fontFamily: "Inter_700Bold", color }}>{score}</Text>
      <Text style={{ fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.textSecondary, marginTop: 2 }}>SCORE</Text>
    </View>
  );
}

function WeekScoreCard({ weekStart, days, Colors }: { weekStart: string; days: DayData[]; Colors: ThemeColors }) {
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  let mealsTotal = 0, mealsCompleted = 0, workoutsTotal = 0, workoutsCompleted = 0;
  for (const day of days) {
    mealsTotal += day.meals.length;
    mealsCompleted += day.meals.filter(m => m.completed).length;
    workoutsTotal += day.workouts.length;
    workoutsCompleted += day.workouts.filter(w => w.completed).length;
  }
  const total = mealsTotal + workoutsTotal;
  const completed = mealsCompleted + workoutsCompleted;
  const score = total > 0 ? Math.round((completed / total) * 100) : 0;
  const mealPct = mealsTotal > 0 ? Math.round((mealsCompleted / mealsTotal) * 100) : 0;
  const workoutPct = workoutsTotal > 0 ? Math.round((workoutsCompleted / workoutsTotal) * 100) : 0;
  const weekRange = formatWeekRange(weekStart);

  const insightText = workoutPct >= 50 && mealPct < 50
    ? "Your training is on track. Bringing more consistency to your meals will amplify your results."
    : mealPct >= 50 && workoutPct < 50
    ? "Your nutrition is solid. Adding more workout consistency will boost your progress."
    : mealPct >= 70 && workoutPct >= 70
    ? "Outstanding week! Keep this momentum going for lasting results."
    : "Stay consistent with both meals and workouts to see the best results.";

  return (
    <View style={styles.scoreCard}>
      <View style={{ alignItems: "center", marginBottom: 20 }}>
        <ScoreRing score={score} size={100} Colors={Colors} />
      </View>
      <Text style={styles.thisWeekLabel}>THIS WEEK</Text>
      <Text style={styles.weekRangeText}>{weekRange}</Text>
      <View style={styles.splitStatsRow}>
        <View style={[styles.splitStatCard, { borderColor: Colors.accent + "30" }]}>
          <View style={styles.splitStatHeader}>
            <Text style={styles.splitStatTitle}>Meals</Text>
            <Text style={[styles.splitStatPct, { color: getScoreColor(mealPct, Colors) }]}>{mealPct}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${mealPct}%`, backgroundColor: Colors.accent }]} />
          </View>
          <Text style={styles.splitStatSub}>{mealsCompleted}/{mealsTotal} completed</Text>
        </View>
        <View style={[styles.splitStatCard, { borderColor: Colors.warning + "30" }]}>
          <View style={styles.splitStatHeader}>
            <Text style={styles.splitStatTitle}>Workouts</Text>
            <Text style={[styles.splitStatPct, { color: getScoreColor(workoutPct, Colors) }]}>{workoutPct}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${workoutPct}%`, backgroundColor: Colors.warning }]} />
          </View>
          <Text style={styles.splitStatSub}>{workoutsCompleted}/{workoutsTotal} completed</Text>
        </View>
      </View>
      <Text style={styles.insightText}>{insightText}</Text>
    </View>
  );
}

function WeekDayPicker({ days, selectedDate, onSelectDate, weekStart, onPrev, onNext, onToday, isCurrentWeek, Colors, weekStartDay }: {
  days: DayData[];
  selectedDate: string;
  onSelectDate: (d: string) => void;
  weekStart: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  isCurrentWeek: boolean;
  Colors: ThemeColors;
  weekStartDay: "sunday" | "monday";
}) {
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const todayStr = new Date().toISOString().split("T")[0];
  const dayLabels = weekStartDay === "sunday" ? DAYS_SHORT_SUN : DAYS_SHORT_MON;

  const sortedDays = useMemo(() => {
    const ws = new Date(weekStart + "T12:00:00Z");
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(ws);
      d.setUTCDate(d.getUTCDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      return days.find(dd => dd.date === dateStr) || { date: dateStr, meals: [], workouts: [], score: 0, hasDailyMeal: false, hasDailyWorkout: false };
    });
  }, [days, weekStart]);

  return (
    <View style={styles.weekPickerCard}>
      <View style={styles.weekPickerHeader}>
        <View>
          <Text style={styles.weekOfLabel}>WEEK OF</Text>
          <Text style={styles.weekOfDate}>{formatFullDate(weekStart)}</Text>
        </View>
        <View style={styles.weekNavRow}>
          <Pressable onPress={onPrev} hitSlop={12}>
            <Icon name="back" size={24} color={Colors.textSecondary} />
          </Pressable>
          <Pressable onPress={onToday} style={styles.todayBtn}>
            <Text style={[styles.todayBtnText, isCurrentWeek && { color: Colors.textTertiary }]}>Today</Text>
          </Pressable>
          <Pressable onPress={onNext} hitSlop={12}>
            <Icon name="forward" size={24} color={Colors.textSecondary} />
          </Pressable>
        </View>
      </View>
      <View style={styles.dayPickerRow}>
        {sortedDays.map((day, idx) => {
          const d = new Date(day.date + "T12:00:00Z");
          const dayNum = d.getUTCDate();
          const isSelected = day.date === selectedDate;
          const isToday = day.date === todayStr;
          const hasMeals = day.meals.length > 0;
          const hasWorkouts = day.workouts.length > 0;
          const mealsComplete = day.meals.length > 0 && day.meals.every(m => m.completed);
          const workoutsComplete = day.workouts.length > 0 && day.workouts.every(w => w.completed);

          return (
            <Pressable
              key={day.date}
              style={styles.dayPickerItem}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelectDate(day.date);
              }}
            >
              <Text style={[styles.dayPickerLabel, isToday && { color: Colors.primary, fontFamily: "Inter_600SemiBold" }]}>
                {dayLabels[idx]}
              </Text>
              <View style={[
                styles.dayPickerCircle,
                isSelected && { backgroundColor: Colors.text },
                isToday && !isSelected && { borderWidth: 2, borderColor: Colors.primary },
              ]}>
                <Text style={[
                  styles.dayPickerNum,
                  isSelected && { color: Colors.background },
                  isToday && !isSelected && { color: Colors.primary, fontFamily: "Inter_700Bold" },
                ]}>
                  {dayNum}
                </Text>
              </View>
              <View style={styles.dotRow}>
                {hasMeals && <View style={[styles.dayDot, { backgroundColor: mealsComplete ? Colors.scoreGreen : Colors.warning }]} />}
                {hasWorkouts && <View style={[styles.dayDot, { backgroundColor: workoutsComplete ? Colors.scoreGreen : Colors.primary }]} />}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function DayDetailSection({ day, Colors }: { day: DayData | undefined; Colors: ThemeColors }) {
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  if (!day) return null;

  const hasMeals = day.meals.length > 0;
  const hasWorkouts = day.workouts.length > 0;
  const hasContent = hasMeals || hasWorkouts;

  return (
    <View>
      <Text style={styles.dayHeaderText}>{formatDayHeader(day.date)}</Text>

      {hasMeals && (
        <View style={styles.nutritionCard}>
          <View style={styles.nutritionHeader}>
            <View style={[styles.nutritionIconBg, { backgroundColor: Colors.warning + "20" }]}>
              <Icon name="restaurant" size={20} color={Colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nutritionTitle}>Nutrition</Text>
              <Text style={styles.nutritionSub}>Tap a meal to view details</Text>
            </View>
          </View>
          {day.meals.map((meal, idx) => (
            <Pressable
              key={meal.id || idx}
              style={({ pressed }) => [styles.mealListItem, idx === 0 && { borderTopWidth: 1, borderTopColor: Colors.border + "40" }, pressed && { opacity: 0.7 }]}
              onPress={() => router.push({ pathname: "/daily/[date]", params: { date: day.date } })}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.mealSlotLabel}>{capitalizeFirst(meal.type)}</Text>
                <Text style={styles.mealItemName} numberOfLines={1}>{meal.name}</Text>
                {meal.ingredients && meal.ingredients.length > 0 && (
                  <Text style={styles.mealIngredientPreview} numberOfLines={1}>
                    {meal.ingredients.join(", ")}
                  </Text>
                )}
              </View>
              <View style={styles.mealItemRight}>
                <View style={[styles.completionCircle, meal.completed && { backgroundColor: Colors.scoreGreen, borderColor: Colors.scoreGreen }]}>
                  {meal.completed && <Icon name="checkmark" size={16} color="#fff" />}
                </View>
                <Icon name="forward" size={16} color={Colors.textTertiary} />
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {hasWorkouts && day.workouts.map((workout, idx) => (
        <Pressable
          key={workout.id || idx}
          style={({ pressed }) => [styles.workoutCard, pressed && { opacity: 0.7 }]}
          onPress={() => router.push({ pathname: "/daily/[date]", params: { date: day.date } })}
        >
          <View style={[styles.nutritionIconBg, { backgroundColor: Colors.scoreGreen + "20" }]}>
            <Icon name="barbell" size={20} color={Colors.scoreGreen} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.nutritionTitle}>Workout</Text>
            <Text style={styles.workoutDesc} numberOfLines={2}>
              {workout.name}
              {workout.duration ? ` · ${workout.duration} min` : ""}
            </Text>
          </View>
          <View style={styles.mealItemRight}>
            <View style={[styles.completionCircle, workout.completed && { backgroundColor: Colors.scoreGreen, borderColor: Colors.scoreGreen }]}>
              {workout.completed && <Icon name="checkmark" size={16} color="#fff" />}
            </View>
            <Icon name="forward" size={16} color={Colors.textTertiary} />
          </View>
        </Pressable>
      ))}

      {!hasMeals && (
        <Pressable
          style={({ pressed }) => [styles.addContentCard, pressed && { opacity: 0.7 }]}
          onPress={() => router.push({ pathname: "/daily-meal-form", params: { date: day.date } } as any)}
        >
          <View style={[styles.nutritionIconBg, { backgroundColor: Colors.warning + "20" }]}>
            <Icon name="restaurant" size={20} color={Colors.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.addContentLabel}>Add Meal</Text>
            <Text style={styles.addContentSub}>Generate nutrition for this day</Text>
          </View>
          <View style={styles.addContentBadge}>
            <Icon name="add" size={18} color={Colors.primary} />
          </View>
        </Pressable>
      )}

      {!hasWorkouts && (
        <Pressable
          style={({ pressed }) => [styles.addContentCard, pressed && { opacity: 0.7 }]}
          onPress={() => router.push({ pathname: "/daily-workout-form", params: { date: day.date } } as any)}
        >
          <View style={[styles.nutritionIconBg, { backgroundColor: Colors.scoreGreen + "20" }]}>
            <Icon name="barbell" size={20} color={Colors.scoreGreen} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.addContentLabel}>Add Workout</Text>
            <Text style={styles.addContentSub}>Generate training for this day</Text>
          </View>
          <View style={styles.addContentBadge}>
            <Icon name="add" size={18} color={Colors.primary} />
          </View>
        </Pressable>
      )}

    </View>
  );
}

function getTodayUTC(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString().split("T")[0];
}

function isPlanActive(plan: any): boolean {
  const backendStatus = plan.status || plan.generationStatus;
  if (backendStatus && backendStatus !== "ready") return false;
  const startDate = plan.startDate || plan.start_date || plan.planStartDate;
  if (!startDate) return false;
  const today = getTodayUTC();
  const endDate = new Date(startDate + "T12:00:00Z");
  endDate.setUTCDate(endDate.getUTCDate() + 6);
  const end = endDate.toISOString().split("T")[0];
  return today >= startDate && today <= end;
}

function ActivePlansSection({ Colors }: { Colors: ThemeColors }) {
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { data: wellnessPlans } = useWellnessPlans();

  const activePlans = useMemo(() =>
    (wellnessPlans || []).filter((p: any) => {
      const status = p.status || p.generationStatus;
      if (status && status !== "ready" && status !== "active") return false;
      const startDate = p.startDate || p.start_date || p.planStartDate;
      if (!startDate) return false;
      const today = getTodayUTC();
      const endDate = new Date(startDate + "T12:00:00Z");
      endDate.setUTCDate(endDate.getUTCDate() + 6);
      const end = endDate.toISOString().split("T")[0];
      return today >= startDate && today <= end;
    }).slice(0, 3),
    [wellnessPlans]
  );

  if (activePlans.length === 0) {
    return (
      <View style={styles.activePlansSection}>
        <View style={styles.emptyPlansCard}>
          <View style={styles.emptyPlansIconBg}>
            <Icon name="add" size={28} color={Colors.primary} />
          </View>
          <Text style={styles.emptyPlansTitle}>Start Your First Plan</Text>
          <Text style={styles.emptyPlansSub}>Create a wellness plan to get personalized meal and workout recommendations.</Text>
          <Pressable
            style={({ pressed }) => [styles.createPlanBtn, pressed && { opacity: 0.85 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/(tabs)/create");
            }}
          >
            <Icon name="add" size={16} color="#fff" />
            <Text style={styles.createPlanBtnText}>Create Plan</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  function formatPlanDates(plan: any) {
    const start = plan.startDate || plan.start_date;
    const end = plan.endDate || plan.end_date;
    if (!start) return "";
    const s = new Date(start + "T12:00:00Z");
    const e = end ? new Date(end + "T12:00:00Z") : null;
    const sStr = `${MONTHS_SHORT[s.getUTCMonth()]} ${s.getUTCDate()}`;
    if (!e) return sStr;
    const eStr = `${MONTHS_SHORT[e.getUTCMonth()]} ${e.getUTCDate()}`;
    return `${sStr} — ${eStr}`;
  }

  return (
    <View style={styles.activePlansSection}>
      <Text style={styles.sectionLabel}>ACTIVE PLANS</Text>
      {activePlans.map((plan: any) => {
        const id = plan._id || plan.id;
        return (
          <Pressable
            key={id}
            style={({ pressed }) => [styles.activePlanCard, pressed && { opacity: 0.85 }]}
            onPress={() => {
              router.push({ pathname: "/plan/wellness/[id]", params: { id } });
            }}
          >
            <View style={[styles.planIconBg, { backgroundColor: Colors.primary + "20" }]}>
              <Icon name="sparkles" size={20} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.planCardTitle} numberOfLines={1}>{plan.name || plan.title || "Wellness Plan"}</Text>
              <View style={styles.planBadgeRow}>
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>Active</Text>
                </View>
              </View>
              {formatPlanDates(plan) ? (
                <View style={styles.planDateRow}>
                  <Icon name="calendar" size={16} color={Colors.textSecondary} />
                  <Text style={styles.planDateText}>{formatPlanDates(plan)}</Text>
                </View>
              ) : null}
            </View>
            <Icon name="forward" size={20} color={Colors.textTertiary} />
          </Pressable>
        );
      })}
    </View>
  );
}

function QuickActionsGrid({ Colors }: { Colors: ThemeColors }) {
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const actions = [
    { icon: "heart" as const, label: "Wellness", sub: "Your health journey", color: Colors.error, onPress: () => router.push("/plans" as any) },
    { icon: "calendar" as const, label: "View Week", sub: "See your schedule", color: Colors.primary, onPress: () => router.push("/(tabs)/calendar") },
    { icon: "restaurant" as const, label: "Daily Meal", sub: "Today's nutrition", color: Colors.warning, onPress: () => router.push("/daily-meal-form" as any) },
    { icon: "barbell" as const, label: "Daily Workout", sub: "Today's training", color: Colors.scoreGreen, onPress: () => router.push("/daily-workout-form" as any) },
  ];

  return (
    <View style={styles.quickActionsGrid}>
      {actions.map((action, idx) => (
        <Pressable
          key={idx}
          style={({ pressed }) => [styles.quickActionCard, pressed && { opacity: 0.8 }]}
          onPress={action.onPress}
        >
          <View style={styles.quickActionTop}>
            <View style={[styles.quickActionIconBg, { backgroundColor: action.color + "18" }]}>
              <Icon name={action.icon} size={20} color={action.color} />
            </View>
            <Icon name="arrowForward" size={16} color={Colors.textTertiary} />
          </View>
          <Text style={styles.quickActionLabel}>{action.label}</Text>
          <Text style={styles.quickActionSub}>{action.sub}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function DashboardScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const { weekStartDay } = useWeekStart();
  const { user } = useAuth();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const currentWeekStart = useMemo(() => getWeekStartUTC(0, undefined, weekStartDay), [weekStartDay]);

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const viewedWeekStart = useMemo(
    () => getWeekStartUTC(weekOffset, undefined, weekStartDay),
    [weekOffset, weekStartDay]
  );

  const { data: weekDays, isLoading, refetch } = useWeekData(viewedWeekStart);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetch(),
      queryClient.invalidateQueries({ queryKey: ["week-data"] }),
      queryClient.invalidateQueries({ queryKey: ["weekly-summary"] }),
      queryClient.invalidateQueries({ queryKey: ["wellness-plans"] }),
    ]);
    setRefreshing(false);
  }, [refetch, queryClient]);

  const isCurrentWeek = viewedWeekStart === currentWeekStart;

  const selectedDay = useMemo(() => {
    if (!weekDays) return undefined;
    return weekDays.find(d => d.date === selectedDate);
  }, [weekDays, selectedDate]);

  const handlePrev = useCallback(() => {
    setWeekOffset(o => o - 1);
    const newStart = getWeekStartUTC(weekOffset - 1, undefined, weekStartDay);
    const d = new Date(newStart + "T12:00:00Z");
    setSelectedDate(d.toISOString().split("T")[0]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [weekOffset, weekStartDay]);

  const handleNext = useCallback(() => {
    setWeekOffset(o => o + 1);
    const newStart = getWeekStartUTC(weekOffset + 1, undefined, weekStartDay);
    const d = new Date(newStart + "T12:00:00Z");
    setSelectedDate(d.toISOString().split("T")[0]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [weekOffset, weekStartDay]);

  const handleToday = useCallback(() => {
    setWeekOffset(0);
    setSelectedDate(todayStr);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [todayStr]);


  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top + webTopInset }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const todayDate = new Date();
  const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const headerSubtitle = `${dayNames[todayDate.getDay()]}, ${MONTHS_FULL[todayDate.getMonth()]} ${todayDate.getDate()}`;

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour <= 11) return "Good morning";
    if (hour >= 12 && hour <= 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const firstName = useMemo(() => {
    if (!user) return "";
    return user.firstName || "";
  }, [user]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 8 + webTopInset, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="never"
      automaticallyAdjustContentInsets={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.primary}
          colors={[Colors.primary]}
        />
      }
    >

      <View style={styles.dashboardHeader}>
        <Text style={styles.headerTitle}>{greeting}{firstName ? `, ${firstName}` : ""}</Text>
        <Text style={styles.headerSubtitle}>{headerSubtitle}</Text>
      </View>

      <WeekScoreCard weekStart={viewedWeekStart} days={weekDays || []} Colors={Colors} />

      <WeekDayPicker
        days={weekDays || []}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        weekStart={viewedWeekStart}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        isCurrentWeek={isCurrentWeek}
        Colors={Colors}
        weekStartDay={weekStartDay}
      />

      <DayDetailSection day={selectedDay} Colors={Colors} />

      <ActivePlansSection Colors={Colors} />

      <QuickActionsGrid Colors={Colors} />
    </ScrollView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center" },
  scrollContent: { paddingHorizontal: 20 },


  dashboardHeader: { marginBottom: 20 },
  headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: Colors.text },
  headerSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },

  scoreCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    marginTop: 4,
    marginBottom: 16,
  },
  thisWeekLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, letterSpacing: 0.5, marginBottom: 2 },
  weekRangeText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text, marginBottom: 16 },

  splitStatsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  splitStatCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  splitStatHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  splitStatIcon: { fontSize: 12 },
  splitStatTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.text, flex: 1 },
  splitStatPct: { fontSize: 14, fontFamily: "Inter_700Bold" },
  progressBarBg: { height: 6, backgroundColor: Colors.surfaceElevated, borderRadius: 3, marginBottom: 8 },
  progressBarFill: { height: 6, borderRadius: 3 },
  splitStatSub: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textSecondary },

  insightText: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textSecondary, lineHeight: 19 },

  weekPickerCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  weekPickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  weekOfLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, letterSpacing: 0.5 },
  weekOfDate: { fontSize: 15, fontFamily: "Inter_700Bold", color: Colors.text, marginTop: 2 },
  weekNavRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 },
  todayBtn: { paddingHorizontal: 4, paddingVertical: 2 },
  todayBtnText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.text },

  dayPickerRow: { flexDirection: "row", justifyContent: "space-between" },
  dayPickerItem: { alignItems: "center", width: 42 },
  dayPickerLabel: { fontSize: 9, fontFamily: "Inter_500Medium", color: Colors.textSecondary, marginBottom: 8 },
  dayPickerCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  dayPickerNum: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
  dotRow: { flexDirection: "row", gap: 4, height: 8, alignItems: "center" },
  dayDot: { width: 6, height: 6, borderRadius: 3 },

  dayHeaderText: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 16 },

  nutritionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  nutritionHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  nutritionIconBg: { width: 42, height: 42, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  nutritionTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.text },
  nutritionSub: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 1 },

  mealListItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + "30",
    gap: 12,
  },
  mealSlotLabel: { fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.textSecondary, marginBottom: 2 },
  mealItemName: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text },
  mealIngredientPreview: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },
  mealItemRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  completionCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
  },

  workoutCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  workoutDesc: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 },

  addContentCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addContentLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  addContentSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  addContentBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primary + "15",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  activePlansSection: { marginBottom: 20 },
  sectionLabel: { fontSize: 9, fontFamily: "Inter_700Bold", color: Colors.textSecondary, letterSpacing: 0.8, marginBottom: 12 },
  activePlanCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  planIconBg: { width: 46, height: 46, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  planCardTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text, marginBottom: 4 },
  planBadgeRow: { flexDirection: "row", gap: 6, marginBottom: 4 },
  activeBadge: { backgroundColor: Colors.scoreGreen + "20", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  activeBadgeText: { fontSize: 9, fontFamily: "Inter_600SemiBold", color: Colors.scoreGreen },
  planDateRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  planDateText: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textSecondary },

  emptyPlansCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.primary + "20",
    borderStyle: "dashed" as const,
  },
  emptyPlansIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyPlansTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 8,
  },
  emptyPlansSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center" as const,
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  createPlanBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 6,
  },
  createPlanBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },

  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  quickActionCard: {
    width: "47%",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  quickActionTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  quickActionIconBg: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  quickActionLabel: { fontSize: 12, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 2 },
  quickActionSub: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
});
