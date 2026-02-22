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
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useWeekData, DayData } from "@/lib/api-hooks";
import { getWeekStartUTC } from "@/lib/week-utils";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function DayCard({ day, isToday }: { day: DayData; isToday: boolean }) {
  const date = new Date(day.date + "T12:00:00");
  const dayOfWeek = DAYS[(date.getDay() + 6) % 7];
  const dayNum = date.getDate();
  const mealsCompleted = day.meals.filter((m) => m.completed).length;
  const workoutsCompleted = day.workouts.filter((w) => w.completed).length;
  const totalItems = day.meals.length + day.workouts.length;
  const completedItems = mealsCompleted + workoutsCompleted;

  const getScoreColor = (score: number) => {
    if (score >= 80) return Colors.scoreGreen;
    if (score >= 50) return Colors.scoreYellow;
    return Colors.scoreRed;
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.dayCard,
        isToday && styles.dayCardToday,
        pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: "/daily/[date]", params: { date: day.date } });
      }}
    >
      <View style={styles.dayCardHeader}>
        <View style={styles.dayInfo}>
          <Text style={[styles.dayOfWeek, isToday && styles.dayTextToday]}>{dayOfWeek}</Text>
          <View style={[styles.dayNumBg, isToday && styles.dayNumBgToday]}>
            <Text style={[styles.dayNum, isToday && styles.dayNumToday]}>{dayNum}</Text>
          </View>
        </View>
        <View style={styles.dayScore}>
          <Text style={[styles.dayScoreText, { color: getScoreColor(day.score) }]}>{day.score}%</Text>
        </View>
      </View>

      <View style={styles.dayDetails}>
        <View style={styles.dayDetailRow}>
          <Ionicons name="restaurant" size={14} color={Colors.accent} />
          <Text style={styles.dayDetailText}>
            {mealsCompleted}/{day.meals.length} meals
          </Text>
        </View>
        {day.workouts.length > 0 && (
          <View style={styles.dayDetailRow}>
            <Ionicons name="fitness" size={14} color={Colors.primary} />
            <Text style={styles.dayDetailText}>
              {workoutsCompleted}/{day.workouts.length} workouts
            </Text>
          </View>
        )}
      </View>

      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: totalItems > 0 ? `${(completedItems / totalItems) * 100}%` : "0%",
              backgroundColor: getScoreColor(day.score),
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = useMemo(() => getWeekStartUTC(weekOffset), [weekOffset]);
  const { data: weekData, isLoading } = useWeekData(weekStart);
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const today = new Date().toISOString().split("T")[0];

  const weekStartDate = new Date(weekStart + "T12:00:00");
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);

  const monthLabel =
    weekStartDate.getMonth() === weekEndDate.getMonth()
      ? `${MONTHS[weekStartDate.getMonth()]} ${weekStartDate.getFullYear()}`
      : `${MONTHS[weekStartDate.getMonth()].slice(0, 3)} - ${MONTHS[weekEndDate.getMonth()].slice(0, 3)} ${weekEndDate.getFullYear()}`;

  return (
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
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </Pressable>

        <View style={styles.weekLabel}>
          <Text style={styles.weekLabelText}>{monthLabel}</Text>
          <Text style={styles.weekDates}>
            {weekStartDate.getDate()} - {weekEndDate.getDate()}
          </Text>
        </View>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setWeekOffset((o) => o + 1);
          }}
          style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="chevron-forward" size={22} color={Colors.text} />
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

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <View style={styles.daysList}>
          {(weekData || []).map((day) => (
            <DayCard key={day.date} day={day} isToday={day.date === today} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
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
  },
  weekLabelText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  weekDates: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
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
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  loadingContainer: {
    paddingTop: 60,
    alignItems: "center",
  },
  daysList: {
    gap: 12,
    marginTop: 12,
  },
  dayCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  dayCardToday: {
    borderWidth: 1,
    borderColor: Colors.primary + "40",
  },
  dayCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dayOfWeek: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    width: 36,
  },
  dayTextToday: {
    color: Colors.primary,
  },
  dayNumBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
  },
  dayNumBgToday: {
    backgroundColor: Colors.primary,
  },
  dayNum: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  dayNumToday: {
    color: "#FFFFFF",
  },
  dayScore: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.surfaceElevated,
  },
  dayScoreText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  dayDetails: {
    flexDirection: "row",
    gap: 16,
  },
  dayDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dayDetailText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
});
