import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useDayData, useToggleCompletion, Meal, Workout } from "@/lib/api-hooks";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function MealItem({ meal, onToggle }: { meal: Meal; onToggle: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.itemCard, pressed && { opacity: 0.85 }]}
      onPress={onToggle}
    >
      <Pressable
        onPress={onToggle}
        style={[styles.checkbox, meal.completed && styles.checkboxChecked]}
      >
        {meal.completed && <Ionicons name="checkmark" size={14} color="#fff" />}
      </Pressable>
      <View style={styles.itemContent}>
        <Text style={[styles.itemName, meal.completed && styles.itemNameCompleted]}>
          {meal.name}
        </Text>
        <View style={styles.itemMeta}>
          <Text style={styles.itemType}>{meal.type}</Text>
          {meal.time && (
            <>
              <View style={styles.dot} />
              <Text style={styles.itemTime}>{meal.time}</Text>
            </>
          )}
          {meal.calories && (
            <>
              <View style={styles.dot} />
              <Text style={styles.itemCalories}>{meal.calories} cal</Text>
            </>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function WorkoutItem({ workout, onToggle }: { workout: Workout; onToggle: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.itemCard, pressed && { opacity: 0.85 }]}
      onPress={onToggle}
    >
      <Pressable
        onPress={onToggle}
        style={[styles.checkbox, styles.checkboxWorkout, workout.completed && styles.checkboxCheckedWorkout]}
      >
        {workout.completed && <Ionicons name="checkmark" size={14} color="#fff" />}
      </Pressable>
      <View style={styles.itemContent}>
        <Text style={[styles.itemName, workout.completed && styles.itemNameCompleted]}>
          {workout.name}
        </Text>
        <View style={styles.itemMeta}>
          <Text style={styles.itemType}>{workout.type}</Text>
          {workout.time && (
            <>
              <View style={styles.dot} />
              <Text style={styles.itemTime}>{workout.time}</Text>
            </>
          )}
          {workout.duration && (
            <>
              <View style={styles.dot} />
              <Text style={styles.itemCalories}>{workout.duration} min</Text>
            </>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function DailyDetailScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const insets = useSafeAreaInsets();
  const { data: dayData, isLoading, refetch } = useDayData(date || "");
  const toggleMutation = useToggleCompletion();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const [localToggles, setLocalToggles] = useState<Record<string, boolean>>({});

  const dateObj = date ? new Date(date + "T12:00:00") : new Date();
  const dayName = WEEKDAYS[dateObj.getDay()];
  const monthName = MONTHS[dateObj.getMonth()];
  const dayNum = dateObj.getDate();

  const today = new Date().toISOString().split("T")[0];
  const isToday = date === today;

  function handleToggle(type: "meal" | "workout", item: Meal | Workout, currentCompleted: boolean) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newCompleted = !(localToggles[item.id] !== undefined ? localToggles[item.id] : currentCompleted);
    setLocalToggles((prev) => ({ ...prev, [item.id]: newCompleted }));
    toggleMutation.mutate({
      type,
      id: item.id,
      completed: newCompleted,
      date: date || "",
      itemKey: item.itemKey,
      sourceType: item.sourceType,
      sourceId: item.sourceId,
    });
  }

  function getItemCompleted(id: string, originalCompleted: boolean): boolean {
    return localToggles[id] !== undefined ? localToggles[id] : originalCompleted;
  }

  const meals = (dayData?.meals || []).map((m) => ({
    ...m,
    completed: getItemCompleted(m.id, m.completed),
  }));

  const workouts = (dayData?.workouts || []).map((w) => ({
    ...w,
    completed: getItemCompleted(w.id, w.completed),
  }));

  const totalItems = meals.length + workouts.length;
  const completedItems = [...meals, ...workouts].filter((i) => i.completed).length;
  const score = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerDate}>
            {isToday ? "Today" : dayName}
          </Text>
          <Text style={styles.headerSubdate}>
            {monthName} {dayNum}
          </Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 + (Platform.OS === "web" ? 34 : 0) }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.scoreBar}>
            <View style={styles.scoreBarInfo}>
              <Text style={styles.scoreBarLabel}>Daily Score</Text>
              <Text style={[styles.scoreBarValue, { color: getScoreColor(score) }]}>{score}%</Text>
            </View>
            <View style={styles.progressBarLarge}>
              <View
                style={[
                  styles.progressFillLarge,
                  {
                    width: `${score}%`,
                    backgroundColor: getScoreColor(score),
                  },
                ]}
              />
            </View>
            <Text style={styles.scoreBarSummary}>
              {completedItems} of {totalItems} completed
            </Text>
          </View>

          {meals.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="restaurant" size={18} color={Colors.accent} />
                <Text style={styles.sectionTitle}>Meals</Text>
                <Text style={styles.sectionCount}>
                  {meals.filter((m) => m.completed).length}/{meals.length}
                </Text>
              </View>
              <View style={styles.itemsList}>
                {meals.map((meal) => (
                  <MealItem
                    key={meal.id}
                    meal={meal}
                    onToggle={() => handleToggle("meal", meal, meal.completed)}
                  />
                ))}
              </View>
            </View>
          )}

          {workouts.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="fitness" size={18} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Workouts</Text>
                <Text style={styles.sectionCount}>
                  {workouts.filter((w) => w.completed).length}/{workouts.length}
                </Text>
              </View>
              <View style={styles.itemsList}>
                {workouts.map((workout) => (
                  <WorkoutItem
                    key={workout.id}
                    workout={workout}
                    onToggle={() => handleToggle("workout", workout, workout.completed)}
                  />
                ))}
              </View>
            </View>
          )}

          {workouts.length === 0 && (
            <View style={styles.emptySection}>
              <Ionicons name="barbell-outline" size={32} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No workouts scheduled</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function getScoreColor(score: number) {
  if (score >= 80) return Colors.scoreGreen;
  if (score >= 50) return Colors.scoreYellow;
  return Colors.scoreRed;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    alignItems: "center",
  },
  headerDate: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  headerSubdate: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  scoreBar: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    gap: 10,
  },
  scoreBarInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scoreBarLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  scoreBarValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  progressBarLarge: {
    height: 8,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFillLarge: {
    height: "100%",
    borderRadius: 4,
  },
  scoreBarSummary: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    flex: 1,
  },
  sectionCount: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  itemsList: {
    gap: 8,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 14,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  checkboxWorkout: {
    borderColor: Colors.primary,
  },
  checkboxCheckedWorkout: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  itemContent: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  itemNameCompleted: {
    color: Colors.textSecondary,
    textDecorationLine: "line-through",
  },
  itemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  itemType: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.textTertiary,
  },
  itemTime: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  itemCalories: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  emptySection: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
});
