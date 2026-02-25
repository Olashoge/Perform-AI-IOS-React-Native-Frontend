import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors, ThemeColors } from "@/lib/theme-context";
import { useWeekData, DayData, Meal, Workout } from "@/lib/api-hooks";
import { getWeekStartUTC } from "@/lib/week-utils";
import { useWeekStart } from "@/lib/week-start-context";

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const DAYS_SHORT = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "BRE",
  lunch: "LUN",
  dinner: "DIN",
  snack: "SNK",
};

function getMealTypeConfig(type: string, Colors: ThemeColors): { label: string; color: string } {
  const key = type.toLowerCase();
  const colorMap: Record<string, string> = {
    breakfast: Colors.warning,
    lunch: Colors.accent,
    dinner: Colors.primary,
    snack: Colors.textSecondary,
  };
  return { label: MEAL_TYPE_LABELS[key] || type.slice(0, 3).toUpperCase(), color: colorMap[key] || Colors.textSecondary };
}

function DayCard({ day, isToday, Colors }: { day: DayData; isToday: boolean; Colors: ThemeColors }) {
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const date = new Date(day.date + "T12:00:00");
  const dayOfWeek = DAYS_SHORT[date.getDay()];
  const dayNum = date.getDate();
  const mealsCompleted = day.meals.filter((m) => m.completed).length;
  const workoutsCompleted = day.workouts.filter((w) => w.completed).length;
  const totalMeals = day.meals.length;
  const totalWorkouts = day.workouts.length;
  const totalItems = totalMeals + totalWorkouts;
  const completedItems = mealsCompleted + workoutsCompleted;

  const getScoreColor = (score: number) => {
    if (score >= 50) return Colors.scoreGreen;
    if (score >= 35) return Colors.scoreYellow;
    return Colors.scoreRed;
  };

  const hasContent = totalItems > 0;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.dayCard,
        isToday && styles.dayCardToday,
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: "/daily/[date]", params: { date: day.date } });
      }}
    >
      <View style={styles.dayCardRow}>
        <View style={styles.dayLeftSection}>
          <View style={[styles.dayNumCircle, isToday && styles.dayNumCircleToday]}>
            <Text style={[styles.dayNumText, isToday && styles.dayNumTextToday]}>{dayNum}</Text>
          </View>
          <Text style={[styles.dayOfWeekText, isToday && { color: Colors.primary }]}>{dayOfWeek}</Text>
        </View>

        <View style={styles.dayContentSection}>
          {day.meals.length > 0 ? (
            day.meals.map((meal, idx) => {
              const config = getMealTypeConfig(meal.type, Colors);
              return (
                <View key={meal.id || idx} style={styles.mealRow}>
                  <View style={[styles.completionDot, { backgroundColor: meal.completed ? Colors.scoreGreen : Colors.surfaceTertiary }]} />
                  <View style={[styles.mealTypeBadge, { backgroundColor: config.color + "20" }]}>
                    <Text style={[styles.mealTypeBadgeText, { color: config.color }]}>{config.label}</Text>
                  </View>
                  <Text style={styles.mealName} numberOfLines={1}>{meal.name}</Text>
                </View>
              );
            })
          ) : null}

          {day.workouts.length > 0 ? (
            day.workouts.map((workout, idx) => (
              <View key={workout.id || idx} style={styles.workoutRow}>
                <View style={[styles.completionDot, { backgroundColor: workout.completed ? Colors.scoreGreen : Colors.surfaceTertiary }]} />
                <Icon name="barbell" size={16} color={Colors.primary} />
                <Text style={styles.workoutName} numberOfLines={1}>{workout.name}</Text>
                {workout.duration ? (
                  <Text style={styles.workoutDuration}>{workout.duration}m</Text>
                ) : null}
              </View>
            ))
          ) : null}

          {!hasContent && (
            <Text style={styles.emptyDayText}>No plans</Text>
          )}
        </View>

        <View style={styles.dayRightSection}>
          {hasContent && (
            <Text style={[styles.scoreValue, { color: getScoreColor(day.score) }]}>{day.score}%</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function CalendarScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const { weekStartDay } = useWeekStart();
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = useMemo(() => getWeekStartUTC(weekOffset, undefined, weekStartDay), [weekOffset, weekStartDay]);
  const { data: weekData, isLoading } = useWeekData(weekStart);
  const safeWeekData = Array.isArray(weekData) ? weekData : [];
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const today = new Date().toISOString().split("T")[0];

  const weekStartDate = new Date(weekStart + "T12:00:00");
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);

  const dateRangeLabel = (() => {
    const startMonth = MONTHS_SHORT[weekStartDate.getMonth()];
    const endMonth = MONTHS_SHORT[weekEndDate.getMonth()];
    const startDay = weekStartDate.getDate();
    const endDay = weekEndDate.getDate();
    const year = weekEndDate.getFullYear();
    if (weekStartDate.getMonth() === weekEndDate.getMonth()) {
      return `${startMonth} ${startDay} - ${endDay}, ${year}`;
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
  })();

  const weekStats = useMemo(() => {
    if (safeWeekData.length === 0) return { mealsTotal: 0, mealsCompleted: 0, workoutsTotal: 0, workoutsCompleted: 0, score: 0 };
    let mealsTotal = 0, mealsCompleted = 0, workoutsTotal = 0, workoutsCompleted = 0;
    for (const day of safeWeekData) {
      mealsTotal += day.meals.length;
      mealsCompleted += day.meals.filter(m => m.completed).length;
      workoutsTotal += day.workouts.length;
      workoutsCompleted += day.workouts.filter(w => w.completed).length;
    }
    const total = mealsTotal + workoutsTotal;
    const completed = mealsCompleted + workoutsCompleted;
    const score = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { mealsTotal, mealsCompleted, workoutsTotal, workoutsCompleted, score };
  }, [safeWeekData]);

  const mealPct = weekStats.mealsTotal > 0 ? Math.round((weekStats.mealsCompleted / weekStats.mealsTotal) * 100) : 0;
  const workoutPct = weekStats.workoutsTotal > 0 ? Math.round((weekStats.workoutsCompleted / weekStats.workoutsTotal) * 100) : 0;

  const getScoreColor = (score: number) => {
    if (score >= 50) return Colors.scoreGreen;
    if (score >= 35) return Colors.scoreYellow;
    return Colors.scoreRed;
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 16 + webTopInset,
            paddingBottom: 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headerTitle}>Calendar</Text>

        <View style={styles.weekNav}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setWeekOffset((o) => o - 1);
            }}
            style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.6 }]}
          >
            <Icon name="back" size={24} color={Colors.text} />
          </Pressable>

          <View style={styles.weekLabel}>
            <Text style={styles.weekLabelText}>{dateRangeLabel}</Text>
          </View>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setWeekOffset((o) => o + 1);
            }}
            style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.6 }]}
          >
            <Icon name="forward" size={24} color={Colors.text} />
          </Pressable>
        </View>

        {weekOffset !== 0 && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setWeekOffset(0);
            }}
            style={({ pressed }) => [styles.todayBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.todayBtnText}>Go to this week</Text>
          </Pressable>
        )}

        {!isLoading && safeWeekData.length > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryScoreRow}>
              <Text style={styles.summaryLabel}>Weekly Score</Text>
              <Text style={[styles.summaryScore, { color: getScoreColor(weekStats.score) }]}>{weekStats.score}%</Text>
            </View>
            <View style={styles.summaryProgressBar}>
              <View style={[styles.summaryProgressFill, { width: `${weekStats.score}%`, backgroundColor: getScoreColor(weekStats.score) }]} />
            </View>
            <View style={styles.adherenceRow}>
              <View style={styles.adherenceItem}>
                <Icon name="restaurant" size={16} color={Colors.accent} />
                <Text style={styles.adherenceLabel}>Meals</Text>
                <Text style={[styles.adherenceValue, { color: getScoreColor(mealPct) }]}>{mealPct}%</Text>
              </View>
              <View style={styles.adherenceDivider} />
              <View style={styles.adherenceItem}>
                <Icon name="barbell" size={16} color={Colors.primary} />
                <Text style={styles.adherenceLabel}>Workouts</Text>
                <Text style={[styles.adherenceValue, { color: getScoreColor(workoutPct) }]}>{workoutPct}%</Text>
              </View>
            </View>
          </View>
        )}

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <View style={styles.daysList}>
            {safeWeekData.map((day) => (
              <DayCard key={day.date} day={day} isToday={day.date === today} Colors={Colors} />
            ))}
          </View>
        )}
      </ScrollView>

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85, transform: [{ scale: 0.92 }] }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push("/(tabs)/create");
        }}
      >
        <Icon name="add" size={28} color="#FFFFFF" />
      </Pressable>
    </>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 20,
  },
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  weekLabel: {
    alignItems: "center",
    flex: 1,
  },
  weekLabelText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  todayBtn: {
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.primary + "1A",
    marginBottom: 8,
    marginTop: 4,
  },
  todayBtnText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  summaryScoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  summaryScore: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  summaryProgressBar: {
    height: 6,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 14,
  },
  summaryProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
  adherenceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  adherenceItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  adherenceDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border,
  },
  adherenceLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  adherenceValue: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  loadingContainer: {
    paddingTop: 60,
    alignItems: "center",
  },
  daysList: {
    gap: 10,
    marginTop: 12,
  },
  dayCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: "transparent",
  },
  dayCardToday: {
    borderLeftColor: Colors.primary,
    backgroundColor: Colors.primary + "08",
  },
  dayCardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  dayLeftSection: {
    alignItems: "center",
    width: 48,
    marginRight: 12,
  },
  dayNumCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 3,
  },
  dayNumCircleToday: {
    backgroundColor: Colors.primary,
  },
  dayNumText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  dayNumTextToday: {
    color: "#FFFFFF",
  },
  dayOfWeekText: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  dayContentSection: {
    flex: 1,
    gap: 5,
    paddingTop: 2,
  },
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  completionDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  mealTypeBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  mealTypeBadgeText: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  mealName: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    flex: 1,
  },
  workoutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  workoutName: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    flex: 1,
  },
  workoutDuration: {
    fontSize: 9,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  emptyDayText: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    fontStyle: "italic",
    paddingTop: 6,
  },
  dayRightSection: {
    alignItems: "flex-end",
    justifyContent: "flex-start",
    paddingTop: 6,
    marginLeft: 8,
  },
  scoreValue: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  fab: {
    position: "absolute",
    bottom: Platform.OS === "web" ? 100 : 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
