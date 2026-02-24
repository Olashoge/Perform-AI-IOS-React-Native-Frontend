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
  DayData,
} from "@/lib/api-hooks";
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: "#FF9F0A",
  lunch: "#30D158",
  dinner: "#0A84FF",
  snack: "#AF52DE",
};

function getMealTypeLabel(type: string): string {
  const lower = type.toLowerCase();
  if (lower === "breakfast") return "Breakfast";
  if (lower === "lunch") return "Lunch";
  if (lower === "dinner") return "Dinner";
  if (lower === "snack") return "Snack";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function getMealTypeColor(type: string): string {
  return MEAL_TYPE_COLORS[type.toLowerCase()] || "#8E8E93";
}

function MealItem({
  meal,
  onToggle,
}: {
  meal: Meal;
  onToggle: () => void;
}) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [expanded, setExpanded] = useState(false);

  const hasDetails = !!(
    (meal.ingredients && meal.ingredients.length > 0) ||
    (meal.steps && meal.steps.length > 0) ||
    meal.nutritionEstimateRange ||
    meal.description ||
    meal.note
  );

  const typeColor = getMealTypeColor(meal.type);

  const quickInfoParts: string[] = [];
  if (meal.prepTime) quickInfoParts.push(meal.prepTime);
  if (meal.servings) quickInfoParts.push(`${meal.servings} serving${meal.servings > 1 ? "s" : ""}`);
  if (meal.nutritionEstimateRange?.calories) quickInfoParts.push(`${meal.nutritionEstimateRange.calories} cal`);
  else if (meal.calories) quickInfoParts.push(`${meal.calories} cal`);

  const macroSummaryParts: string[] = [];
  if (meal.nutritionEstimateRange?.protein) macroSummaryParts.push(`P: ${meal.nutritionEstimateRange.protein}`);
  if (meal.nutritionEstimateRange?.carbs) macroSummaryParts.push(`C: ${meal.nutritionEstimateRange.carbs}`);
  if (meal.nutritionEstimateRange?.fat) macroSummaryParts.push(`F: ${meal.nutritionEstimateRange.fat}`);
  if (macroSummaryParts.length > 0 && quickInfoParts.length < 4) {
    quickInfoParts.push(macroSummaryParts.join(" / "));
  }

  return (
    <View style={[styles.expandableCard, expanded && styles.expandableCardExpanded]}>
      <View style={styles.expandableCardRow}>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          style={[styles.checkbox, meal.completed && styles.checkboxChecked]}
          hitSlop={8}
        >
          {meal.completed && <Ionicons name="checkmark" size={14} color="#fff" />}
        </Pressable>

        <Pressable
          style={styles.expandableCardBody}
          onPress={() => hasDetails && setExpanded(!expanded)}
        >
          <View style={styles.expandableCardTop}>
            <View style={[styles.typePill, { backgroundColor: typeColor + "20" }]}>
              <Text style={[styles.typePillText, { color: typeColor }]}>
                {getMealTypeLabel(meal.type)}
              </Text>
            </View>
            {hasDetails && (
              <Ionicons
                name={expanded ? "chevron-up" : "chevron-down"}
                size={16}
                color={Colors.textTertiary}
              />
            )}
          </View>
          <Text style={[styles.expandableCardName, meal.completed && styles.itemNameCompleted]}>
            {meal.name}
          </Text>
          {quickInfoParts.length > 0 && (
            <Text style={styles.quickInfoLine} numberOfLines={1}>
              {quickInfoParts.join("  ·  ")}
            </Text>
          )}
        </Pressable>
      </View>

      {expanded && hasDetails && (
        <View style={styles.expandedContent}>
          {(meal.description || meal.note) && (
            <Text style={styles.descriptionText}>
              {meal.description || meal.note}
            </Text>
          )}

          {meal.ingredients && meal.ingredients.length > 0 && (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Ingredients</Text>
              {meal.ingredients.map((ing, i) => (
                <View key={i} style={styles.bulletRow}>
                  <View style={[styles.bulletDot, { backgroundColor: typeColor }]} />
                  <Text style={styles.bulletText}>{ing}</Text>
                </View>
              ))}
            </View>
          )}

          {meal.steps && meal.steps.length > 0 && (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Steps</Text>
              {meal.steps.map((step, i) => (
                <View key={i} style={styles.numberedRow}>
                  <View style={[styles.stepNumber, { backgroundColor: typeColor + "20" }]}>
                    <Text style={[styles.stepNumberText, { color: typeColor }]}>{i + 1}</Text>
                  </View>
                  <Text style={styles.bulletText}>{step}</Text>
                </View>
              ))}
            </View>
          )}

          {meal.nutritionEstimateRange && (
            <View style={styles.macroBar}>
              {meal.nutritionEstimateRange.calories && (
                <View style={styles.macroItem}>
                  <Ionicons name="flame-outline" size={14} color={Colors.warning} />
                  <Text style={styles.macroLabel}>Cal</Text>
                  <Text style={styles.macroValue}>{meal.nutritionEstimateRange.calories}</Text>
                </View>
              )}
              {meal.nutritionEstimateRange.protein && (
                <View style={styles.macroItem}>
                  <View style={[styles.macroDotIndicator, { backgroundColor: "#FF6B6B" }]} />
                  <Text style={styles.macroLabel}>Protein</Text>
                  <Text style={styles.macroValue}>{meal.nutritionEstimateRange.protein}</Text>
                </View>
              )}
              {meal.nutritionEstimateRange.carbs && (
                <View style={styles.macroItem}>
                  <View style={[styles.macroDotIndicator, { backgroundColor: "#4ECDC4" }]} />
                  <Text style={styles.macroLabel}>Carbs</Text>
                  <Text style={styles.macroValue}>{meal.nutritionEstimateRange.carbs}</Text>
                </View>
              )}
              {meal.nutritionEstimateRange.fat && (
                <View style={styles.macroItem}>
                  <View style={[styles.macroDotIndicator, { backgroundColor: "#FFD93D" }]} />
                  <Text style={styles.macroLabel}>Fat</Text>
                  <Text style={styles.macroValue}>{meal.nutritionEstimateRange.fat}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function WorkoutItem({
  workout,
  rawWorkout,
  onToggle,
}: {
  workout: Workout;
  rawWorkout?: any;
  onToggle: () => void;
}) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [expanded, setExpanded] = useState(false);

  const raw = rawWorkout || workout.rawWorkout;
  const warmup = Array.isArray(raw?.warmup) ? raw.warmup : [];
  const mainExercises = Array.isArray(raw?.main) ? raw.main : [];
  const coolDown = Array.isArray(raw?.coolDown) ? raw.coolDown : [];
  const coachingTips = Array.isArray(raw?.coachingTips)
    ? raw.coachingTips
    : typeof raw?.coachingTips === "string"
    ? [raw.coachingTips]
    : [];
  const difficulty = raw?.difficulty;
  const exerciseCount = mainExercises.length;

  const hasDetails = warmup.length > 0 || mainExercises.length > 0 || coolDown.length > 0 || coachingTips.length > 0;

  const getDifficultyColor = (d: string) => {
    const lower = d.toLowerCase();
    if (lower === "beginner" || lower === "easy") return Colors.scoreGreen;
    if (lower === "intermediate" || lower === "moderate") return Colors.warning;
    if (lower === "advanced" || lower === "hard") return Colors.error;
    return Colors.textSecondary;
  };

  return (
    <View style={[styles.expandableCard, expanded && styles.expandableCardExpanded]}>
      <View style={styles.expandableCardRow}>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          style={[styles.checkbox, styles.checkboxWorkout, workout.completed && styles.checkboxCheckedWorkout]}
          hitSlop={8}
        >
          {workout.completed && <Ionicons name="checkmark" size={14} color="#fff" />}
        </Pressable>

        <Pressable
          style={styles.expandableCardBody}
          onPress={() => hasDetails && setExpanded(!expanded)}
        >
          <View style={styles.expandableCardTop}>
            <View style={styles.workoutBadgeRow}>
              {difficulty && (
                <View style={[styles.typePill, { backgroundColor: getDifficultyColor(difficulty) + "20" }]}>
                  <Text style={[styles.typePillText, { color: getDifficultyColor(difficulty) }]}>
                    {difficulty}
                  </Text>
                </View>
              )}
            </View>
            {hasDetails && (
              <Ionicons
                name={expanded ? "chevron-up" : "chevron-down"}
                size={16}
                color={Colors.textTertiary}
              />
            )}
          </View>
          <Text style={[styles.expandableCardName, workout.completed && styles.itemNameCompleted]}>
            {workout.name}
          </Text>
          <View style={styles.workoutMetaRow}>
            {workout.type && (
              <View style={styles.workoutMetaChip}>
                <Ionicons name="barbell-outline" size={12} color={Colors.textSecondary} />
                <Text style={styles.workoutMetaText}>{workout.type}</Text>
              </View>
            )}
            {workout.duration && (
              <View style={styles.workoutMetaChip}>
                <Ionicons name="time-outline" size={12} color={Colors.textSecondary} />
                <Text style={styles.workoutMetaText}>{workout.duration} min</Text>
              </View>
            )}
            {exerciseCount > 0 && (
              <View style={styles.workoutMetaChip}>
                <Ionicons name="list-outline" size={12} color={Colors.textSecondary} />
                <Text style={styles.workoutMetaText}>{exerciseCount} exercise{exerciseCount !== 1 ? "s" : ""}</Text>
              </View>
            )}
          </View>
        </Pressable>
      </View>

      {expanded && hasDetails && (
        <View style={styles.expandedContent}>
          {warmup.length > 0 && (
            <View style={styles.detailSection}>
              <View style={styles.workoutSectionHeader}>
                <Ionicons name="walk-outline" size={14} color={Colors.warning} />
                <Text style={[styles.detailSectionTitle, { color: Colors.warning }]}>WARM-UP</Text>
              </View>
              {warmup.map((item: any, i: number) => {
                const label = typeof item === "string" ? item : item.name || item.exercise || JSON.stringify(item);
                return (
                  <View key={i} style={styles.bulletRow}>
                    <Text style={styles.dashBullet}>-</Text>
                    <Text style={styles.bulletText}>{label}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {mainExercises.length > 0 && (
            <View style={styles.detailSection}>
              <View style={styles.workoutSectionHeader}>
                <Ionicons name="barbell-outline" size={14} color={Colors.primary} />
                <Text style={[styles.detailSectionTitle, { color: Colors.primary }]}>MAIN WORKOUT</Text>
              </View>
              {mainExercises.map((ex: any, i: number) => {
                const name = ex.name || ex.exercise || `Exercise ${i + 1}`;
                const exType = ex.type || "";
                const sets = ex.sets;
                const reps = ex.reps;
                const rest = ex.rest || ex.restBetweenSets;
                const note = ex.note || ex.tip || ex.notes;
                const setsRepsLabel = sets && reps ? `${sets} x ${reps}` : sets ? `${sets} sets` : reps ? `${reps} reps` : "";

                return (
                  <View key={i} style={styles.exerciseItem}>
                    <View style={styles.exerciseHeader}>
                      <View style={[styles.stepNumber, { backgroundColor: Colors.primary + "20" }]}>
                        <Text style={[styles.stepNumberText, { color: Colors.primary }]}>{i + 1}</Text>
                      </View>
                      <View style={styles.exerciseNameArea}>
                        <Text style={styles.exerciseName}>{name}</Text>
                        <View style={styles.exerciseMetaRow}>
                          {exType ? (
                            <View style={[styles.miniPill, { backgroundColor: Colors.primary + "15" }]}>
                              <Text style={[styles.miniPillText, { color: Colors.primary }]}>{exType}</Text>
                            </View>
                          ) : null}
                          {setsRepsLabel ? (
                            <Text style={styles.exerciseDetail}>{setsRepsLabel}</Text>
                          ) : null}
                          {rest ? (
                            <Text style={styles.exerciseDetail}>Rest: {rest}</Text>
                          ) : null}
                        </View>
                      </View>
                    </View>
                    {note && (
                      <Text style={styles.exerciseNote}>{note}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {coolDown.length > 0 && (
            <View style={styles.detailSection}>
              <View style={styles.workoutSectionHeader}>
                <Ionicons name="snow-outline" size={14} color="#4ECDC4" />
                <Text style={[styles.detailSectionTitle, { color: "#4ECDC4" }]}>COOL-DOWN</Text>
              </View>
              {coolDown.map((item: any, i: number) => {
                const label = typeof item === "string" ? item : item.name || item.exercise || JSON.stringify(item);
                return (
                  <View key={i} style={styles.bulletRow}>
                    <Text style={styles.dashBullet}>-</Text>
                    <Text style={styles.bulletText}>{label}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {coachingTips.length > 0 && (
            <View style={styles.detailSection}>
              <View style={styles.workoutSectionHeader}>
                <Ionicons name="bulb-outline" size={14} color={Colors.warning} />
                <Text style={[styles.detailSectionTitle, { color: Colors.warning }]}>COACHING TIPS</Text>
              </View>
              {coachingTips.map((tip: any, i: number) => {
                const label = typeof tip === "string" ? tip : tip.text || tip.tip || JSON.stringify(tip);
                return (
                  <View key={i} style={styles.tipRow}>
                    <Ionicons name="star" size={10} color={Colors.warning} style={{ marginTop: 4 }} />
                    <Text style={styles.tipText}>{label}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}
    </View>
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
                    rawWorkout={dayData?.rawWorkout}
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
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  headerSubdate: {
    fontSize: 11,
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
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  scoreBarValue: {
    fontSize: 18,
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
    fontSize: 11,
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
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    flex: 1,
  },
  sectionCount: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  itemsList: {
    gap: 10,
  },
  expandableCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    overflow: "hidden",
  },
  expandableCardExpanded: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  expandableCardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  expandableCardBody: {
    flex: 1,
    gap: 4,
  },
  expandableCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  expandableCardName: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typePillText: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    textTransform: "capitalize",
  },
  quickInfoLine: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.accent,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
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
  itemNameCompleted: {
    color: Colors.textSecondary,
    textDecorationLine: "line-through",
  },
  workoutBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  workoutMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 2,
  },
  workoutMetaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  workoutMetaText: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  expandedContent: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceElevated,
    gap: 16,
  },
  descriptionText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    fontStyle: "italic",
    lineHeight: 19,
  },
  detailSection: {
    gap: 8,
  },
  detailSectionTitle: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.textSecondary,
    letterSpacing: 0.8,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingLeft: 4,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  dashBullet: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    width: 12,
  },
  bulletText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    flex: 1,
    lineHeight: 19,
  },
  numberedRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingLeft: 4,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumberText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
  },
  macroBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    padding: 12,
  },
  macroItem: {
    alignItems: "center",
    gap: 4,
  },
  macroDotIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroLabel: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    color: Colors.textTertiary,
    textTransform: "uppercase",
  },
  macroValue: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  workoutSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  exerciseItem: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  exerciseHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  exerciseNameArea: {
    flex: 1,
    gap: 4,
  },
  exerciseName: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  exerciseMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  miniPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniPillText: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
  },
  exerciseDetail: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  exerciseNote: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    fontStyle: "italic",
    marginLeft: 32,
    lineHeight: 17,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingLeft: 4,
  },
  tipText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    flex: 1,
    lineHeight: 19,
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
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 12,
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
    fontSize: 14,
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
    fontSize: 13,
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
    fontSize: 12,
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
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    textAlign: "center",
  },
  sheetSubtitle: {
    fontSize: 12,
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
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  sheetOptionDesc: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  sheetEmpty: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 24,
  },
  sheetEmptyText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  mealPickerLabel: {
    fontSize: 14,
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
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  mealPickerBtnLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  mealPickerBack: {
    alignItems: "center",
    paddingVertical: 8,
  },
  mealPickerBackText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
});
