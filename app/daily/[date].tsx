import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  Modal,
  Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors, ThemeColors } from "@/lib/theme-context";
import {
  useDayData,
  useToggleCompletion,
  useCreateDailyMeal,
  useCreateDailyWorkout,
  Meal,
  Workout,
} from "@/lib/api-hooks";
import { useQueryClient } from "@tanstack/react-query";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function MealItem({ meal, onToggle }: { meal: Meal; onToggle: () => void }) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

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
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

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

function PlanBottomSheet({
  visible,
  onClose,
  canAddMeal,
  canAddWorkout,
  onGenerateMeal,
  onGenerateWorkout,
  dateLabel,
  generatingMeal,
  generatingWorkout,
}: {
  visible: boolean;
  onClose: () => void;
  canAddMeal: boolean;
  canAddWorkout: boolean;
  onGenerateMeal: (mealsPerDay: number) => void;
  onGenerateWorkout: () => void;
  dateLabel: string;
  generatingMeal: boolean;
  generatingWorkout: boolean;
}) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [showMealPicker, setShowMealPicker] = useState(false);

  const handleMealTap = () => {
    setShowMealPicker(true);
  };

  const handleMealCount = (count: number) => {
    setShowMealPicker(false);
    onGenerateMeal(count);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <Pressable style={[styles.sheetContainer, { paddingBottom: 34 }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Plan This Day</Text>
          <Text style={styles.sheetSubtitle}>{dateLabel}</Text>

          {!showMealPicker ? (
            <View style={styles.sheetOptions}>
              {canAddMeal && (
                <Pressable
                  style={({ pressed }) => [styles.sheetOption, pressed && { opacity: 0.8 }]}
                  onPress={handleMealTap}
                  disabled={generatingMeal}
                >
                  <View style={[styles.sheetIconCircle, { backgroundColor: Colors.accent + "20" }]}>
                    {generatingMeal ? (
                      <ActivityIndicator size="small" color={Colors.accent} />
                    ) : (
                      <Ionicons name="restaurant" size={22} color={Colors.accent} />
                    )}
                  </View>
                  <View style={styles.sheetOptionContent}>
                    <Text style={styles.sheetOptionTitle}>
                      {generatingMeal ? "Generating Meals..." : "Generate Daily Meal"}
                    </Text>
                    <Text style={styles.sheetOptionDesc}>
                      AI-powered meals based on your profile
                    </Text>
                  </View>
                  {!generatingMeal && (
                    <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
                  )}
                </Pressable>
              )}

              {canAddWorkout && (
                <Pressable
                  style={({ pressed }) => [styles.sheetOption, pressed && { opacity: 0.8 }]}
                  onPress={onGenerateWorkout}
                  disabled={generatingWorkout}
                >
                  <View style={[styles.sheetIconCircle, { backgroundColor: Colors.primary + "20" }]}>
                    {generatingWorkout ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <Ionicons name="fitness" size={22} color={Colors.primary} />
                    )}
                  </View>
                  <View style={styles.sheetOptionContent}>
                    <Text style={styles.sheetOptionTitle}>
                      {generatingWorkout ? "Generating Workout..." : "Generate Daily Workout"}
                    </Text>
                    <Text style={styles.sheetOptionDesc}>
                      AI-powered workout based on your profile
                    </Text>
                  </View>
                  {!generatingWorkout && (
                    <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
                  )}
                </Pressable>
              )}

              {!canAddMeal && !canAddWorkout && (
                <View style={styles.sheetEmpty}>
                  <Ionicons name="checkmark-circle" size={32} color={Colors.accent} />
                  <Text style={styles.sheetEmptyText}>This day is fully planned!</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.sheetOptions}>
              <Text style={styles.mealPickerLabel}>How many meals?</Text>
              <View style={styles.mealPickerRow}>
                <Pressable
                  style={({ pressed }) => [styles.mealPickerBtn, pressed && { opacity: 0.8 }]}
                  onPress={() => handleMealCount(2)}
                >
                  <Text style={styles.mealPickerNum}>2</Text>
                  <Text style={styles.mealPickerBtnLabel}>Lunch & Dinner</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.mealPickerBtn, pressed && { opacity: 0.8 }]}
                  onPress={() => handleMealCount(3)}
                >
                  <Text style={styles.mealPickerNum}>3</Text>
                  <Text style={styles.mealPickerBtnLabel}>Breakfast, Lunch & Dinner</Text>
                </Pressable>
              </View>
              <Pressable onPress={() => setShowMealPicker(false)} style={styles.mealPickerBack}>
                <Text style={styles.mealPickerBackText}>Back</Text>
              </Pressable>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function DailyDetailScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const { date, generate } = useLocalSearchParams<{ date: string; generate?: string }>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: dayData, isLoading, refetch } = useDayData(date || "");
  const toggleMutation = useToggleCompletion();
  const createDailyMeal = useCreateDailyMeal();
  const createDailyWorkout = useCreateDailyWorkout();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const [localToggles, setLocalToggles] = useState<Record<string, boolean>>({});
  const [showSheet, setShowSheet] = useState(false);
  const [generatingMeal, setGeneratingMeal] = useState(false);
  const [generatingWorkout, setGeneratingWorkout] = useState(false);
  const [pollInterval, setPollInterval] = useState<number | null>(null);
  const [generateHandled, setGenerateHandled] = useState(false);

  const dateObj = date ? new Date(date + "T12:00:00") : new Date();
  const dayName = WEEKDAYS[dateObj.getDay()];
  const monthName = MONTHS[dateObj.getMonth()];
  const dayNum = dateObj.getDate();

  const today = new Date().toISOString().split("T")[0];
  const isToday = date === today;

  const meals = (dayData?.meals || []).map((m) => ({
    ...m,
    completed: localToggles[m.id] !== undefined ? localToggles[m.id] : m.completed,
  }));

  const workouts = (dayData?.workouts || []).map((w) => ({
    ...w,
    completed: localToggles[w.id] !== undefined ? localToggles[w.id] : w.completed,
  }));

  const hasMeals = meals.length > 0;
  const hasWorkouts = workouts.length > 0;
  const canAddMeal = !hasMeals && !dayData?.hasDailyMeal && !generatingMeal;
  const canAddWorkout = !hasWorkouts && !dayData?.hasDailyWorkout && !generatingWorkout;
  const isEmpty = !hasMeals && !hasWorkouts && !isLoading;

  const totalItems = meals.length + workouts.length;
  const completedItems = [...meals, ...workouts].filter((i) => i.completed).length;
  const score = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  useEffect(() => {
    if (pollInterval) {
      const timer = setInterval(() => {
        refetch().then((result) => {
          const data = result.data;
          if (data) {
            const mealsDone = generatingMeal && data.meals.length > 0;
            const workoutsDone = generatingWorkout && data.workouts.length > 0;
            if (mealsDone) {
              setGeneratingMeal(false);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            if (workoutsDone) {
              setGeneratingWorkout(false);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            if (!generatingMeal && !generatingWorkout) {
              setPollInterval(null);
            }
            if (mealsDone && !generatingWorkout) setPollInterval(null);
            if (workoutsDone && !generatingMeal) setPollInterval(null);
          }
        });
      }, pollInterval);
      return () => clearInterval(timer);
    }
  }, [pollInterval, generatingMeal, generatingWorkout]);

  useEffect(() => {
    if (generate && !generateHandled && dayData && !isLoading) {
      setGenerateHandled(true);
      if (generate === "meal" && canAddMeal) {
        setShowSheet(true);
      } else if (generate === "workout" && canAddWorkout) {
        handleGenerateWorkout();
      }
    }
  }, [generate, generateHandled, dayData, isLoading]);

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

  const handleGenerateMeal = useCallback((mealsPerDay: number) => {
    if (!date) return;
    setGeneratingMeal(true);
    setShowSheet(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    createDailyMeal.mutate(
      { date, mealsPerDay },
      {
        onSuccess: () => {
          setPollInterval(2500);
        },
        onError: (err: any) => {
          setGeneratingMeal(false);
          const msg = err?.response?.data?.error || err?.message || "Failed to generate meal";
          Alert.alert("Error", msg);
        },
      }
    );
  }, [date, createDailyMeal]);

  const handleGenerateWorkout = useCallback(() => {
    if (!date) return;
    setGeneratingWorkout(true);
    setShowSheet(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    createDailyWorkout.mutate(
      { date },
      {
        onSuccess: () => {
          setPollInterval(2500);
        },
        onError: (err: any) => {
          setGeneratingWorkout(false);
          const msg = err?.response?.data?.error || err?.message || "Failed to generate workout";
          Alert.alert("Error", msg);
        },
      }
    );
  }, [date, createDailyWorkout]);

  function getScoreColor(s: number) {
    if (s >= 80) return Colors.scoreGreen;
    if (s >= 50) return Colors.scoreYellow;
    return Colors.scoreRed;
  }

  const dateLabel = `${dayName}, ${monthName} ${dayNum}`;

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
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 + (Platform.OS === "web" ? 34 : 0) }]}
          showsVerticalScrollIndicator={false}
        >
          {totalItems > 0 && (
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
          )}

          {(generatingMeal || generatingWorkout) && (
            <View style={styles.generatingBanner}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.generatingText}>
                {generatingMeal && generatingWorkout
                  ? "Generating your meals and workout..."
                  : generatingMeal
                  ? "Generating your meals..."
                  : "Generating your workout..."}
              </Text>
            </View>
          )}

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

          {isEmpty && !generatingMeal && !generatingWorkout && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="calendar-outline" size={40} color={Colors.textTertiary} />
              </View>
              <Text style={styles.emptyTitle}>Nothing planned yet</Text>
              <Text style={styles.emptySubtitle}>
                Generate AI-powered meals and workouts for this day
              </Text>
              <Pressable
                style={({ pressed }) => [styles.planButton, pressed && { opacity: 0.85 }]}
                onPress={() => setShowSheet(true)}
              >
                <Ionicons name="sparkles" size={18} color="#fff" />
                <Text style={styles.planButtonText}>Plan This Day</Text>
              </Pressable>
            </View>
          )}

          {!isEmpty && (canAddMeal || canAddWorkout) && !generatingMeal && !generatingWorkout && (
            <Pressable
              style={({ pressed }) => [styles.addMoreBtn, pressed && { opacity: 0.8 }]}
              onPress={() => setShowSheet(true)}
            >
              <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
              <Text style={styles.addMoreText}>
                {canAddMeal && canAddWorkout
                  ? "Add meals or workout"
                  : canAddMeal
                  ? "Add meals"
                  : "Add workout"}
              </Text>
            </Pressable>
          )}
        </ScrollView>
      )}

      {(canAddMeal || canAddWorkout) && !isLoading && !isEmpty && !generatingMeal && !generatingWorkout && (
        <Pressable
          style={[styles.fab, { bottom: insets.bottom + 20 + (Platform.OS === "web" ? 34 : 0) }]}
          onPress={() => setShowSheet(true)}
        >
          <Ionicons name="sparkles" size={22} color="#fff" />
        </Pressable>
      )}

      <PlanBottomSheet
        visible={showSheet}
        onClose={() => setShowSheet(false)}
        canAddMeal={canAddMeal}
        canAddWorkout={canAddWorkout}
        onGenerateMeal={handleGenerateMeal}
        onGenerateWorkout={handleGenerateWorkout}
        dateLabel={dateLabel}
        generatingMeal={generatingMeal}
        generatingWorkout={generatingWorkout}
      />
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
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
  emptyState: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    maxWidth: 260,
  },
  planButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  planButtonText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  addMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginBottom: 16,
  },
  addMoreText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  generatingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.primary + "15",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.primary + "30",
  },
  generatingText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
    flex: 1,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceTertiary,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    textAlign: "center",
  },
  sheetSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 20,
  },
  sheetOptions: {
    gap: 10,
    paddingBottom: 16,
  },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 14,
    padding: 16,
  },
  sheetIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  sheetOptionContent: {
    flex: 1,
    gap: 2,
  },
  sheetOptionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  sheetOptionDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  sheetEmpty: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 24,
  },
  sheetEmptyText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  mealPickerLabel: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 4,
  },
  mealPickerRow: {
    flexDirection: "row",
    gap: 12,
  },
  mealPickerBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    gap: 6,
  },
  mealPickerNum: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  mealPickerBtnLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  mealPickerBack: {
    alignItems: "center",
    paddingVertical: 8,
  },
  mealPickerBackText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
});
