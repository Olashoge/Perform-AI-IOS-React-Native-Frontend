import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors, ThemeColors } from "@/lib/theme-context";
import { useWellness, mapGoalForMeal, mapGoalForWorkout } from "@/lib/wellness-context";
import { useGenerateGoalPlan, useProfile } from "@/lib/api-hooks";

const GOAL_LABELS: Record<string, string> = {
  weight_loss: "Weight Loss",
  muscle_gain: "Muscle Gain",
  performance: "Performance",
  general_fitness: "General Fitness",
  mobility: "Mobility",
  endurance: "Endurance",
  strength: "Strength",
  energy: "Energy & Focus",
};

const PLAN_TYPE_LABELS: Record<string, string> = {
  both: "Both",
  meal: "Meal Only",
  workout: "Workout Only",
};

function formatLabel(value: string): string {
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function getStepCount(planType: string): number {
  return planType === "both" ? 4 : 3;
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue} numberOfLines={3}>
        {value}
      </Text>
    </View>
  );
}

export default function Step4Screen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const { state } = useWellness();
  const generateMutation = useGenerateGoalPlan();
  const [submitting, setSubmitting] = useState(false);

  const stepCount = getStepCount(state.planType);
  const currentStep = stepCount;

  const showMeal = state.planType === "both" || state.planType === "meal";
  const showWorkout = state.planType === "both" || state.planType === "workout";

  const handleSubmit = async () => {
    if (submitting) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSubmitting(true);

    const payload: any = {
      goalType: state.goalType,
      startDate: state.startDate || undefined,
      pace: state.pace || undefined,
    };

    if (showMeal) {
      payload.mealPlanConfig = {
        goal: mapGoalForMeal(state.goalType),
        dietStyles: state.mealForm.dietStyles,
        foodsToAvoid: state.mealForm.foodsToAvoid,
        allergies: state.mealForm.allergies,
        mealsPerDay: state.mealForm.mealsPerDay,
        mealSlots: state.mealForm.mealSlots,
        prepStyle: state.mealForm.prepStyle,
        budgetMode: state.mealForm.budgetMode,
        cookingTime: state.mealForm.cookingTime,
        spiceLevel: state.mealForm.spiceLevel,
        authenticityMode: state.mealForm.authenticityMode,
        householdSize: state.mealForm.householdSize,
      };
    }

    if (showWorkout) {
      payload.workoutPlanConfig = {
        goal: mapGoalForWorkout(state.goalType),
        location: state.workoutForm.location,
        trainingMode: state.workoutForm.trainingMode,
        focusAreas: state.workoutForm.focusAreas,
        daysOfWeek: state.workoutForm.daysOfWeek.map((d) => d.toLowerCase()),
        sessionLength: state.workoutForm.sessionLength,
        experienceLevel: state.workoutForm.experienceLevel,
        limitations: state.workoutForm.limitations,
        equipmentAvailable: state.workoutForm.equipmentAvailable,
      };
    }

    try {
      const data = await generateMutation.mutateAsync(payload);
      router.replace(`/wellness/generating?goalPlanId=${data.goalPlanId}` as any);
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.message || err?.message || "Failed to generate plan. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const equipmentDisplay = () => {
    const eq = state.workoutForm.equipmentAvailable;
    if (!eq || eq.length === 0) return "None";
    if (eq.length <= 5) return eq.join(", ");
    return eq.slice(0, 5).join(", ") + ` ...and ${eq.length - 5} more`;
  };

  const mealSlotsDisplay = () => {
    const count = state.mealForm.mealsPerDay;
    const slots = state.mealForm.mealSlots;
    if (slots && slots.length > 0) {
      return `${count} (${slots.join(", ")})`;
    }
    return String(count);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 16 + webTopInset,
            paddingBottom: insets.bottom + 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </Pressable>
          <View style={styles.dotsRow}>
            {Array.from({ length: stepCount }).map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === currentStep - 1 && styles.dotActive]}
              />
            ))}
          </View>
          <View style={{ width: 44 }} />
        </View>

        <Text style={styles.headerTitle}>Review & Submit</Text>
        <Text style={styles.headerSubtitle}>
          Review your selections before generating your plan
        </Text>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <Pressable onPress={() => router.push("/wellness/step1")}>
              <Text style={styles.editLink}>Edit</Text>
            </Pressable>
          </View>
          <ReviewRow label="Goal" value={GOAL_LABELS[state.goalType] || formatLabel(state.goalType)} />
          <ReviewRow label="Plan Type" value={PLAN_TYPE_LABELS[state.planType] || formatLabel(state.planType)} />
          <ReviewRow label="Start Date" value={state.startDate || "Next available"} />
          <ReviewRow label="Pace" value={state.pace ? formatLabel(state.pace) : "Default"} />
        </View>

        {showMeal && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Nutrition</Text>
              <Pressable onPress={() => router.push("/wellness/step2")}>
                <Text style={styles.editLink}>Edit</Text>
              </Pressable>
            </View>
            <ReviewRow
              label="Diet Styles"
              value={state.mealForm.dietStyles.join(", ") || "None"}
            />
            <ReviewRow
              label="Foods to Avoid"
              value={state.mealForm.foodsToAvoid.length > 0 ? state.mealForm.foodsToAvoid.join(", ") : "None"}
            />
            <ReviewRow
              label="Allergies"
              value={state.mealForm.allergies || "None"}
            />
            <ReviewRow label="Meals per Day" value={mealSlotsDisplay()} />
            <ReviewRow label="Prep Style" value={formatLabel(state.mealForm.prepStyle)} />
            <ReviewRow label="Budget" value={formatLabel(state.mealForm.budgetMode)} />
            <ReviewRow label="Cooking Time" value={formatLabel(state.mealForm.cookingTime)} />
            <ReviewRow label="Spice Level" value={formatLabel(state.mealForm.spiceLevel)} />
            <ReviewRow label="Recipe Style" value={formatLabel(state.mealForm.authenticityMode)} />
            {state.mealForm.householdSize > 1 && (
              <ReviewRow label="Household Size" value={String(state.mealForm.householdSize)} />
            )}
          </View>
        )}

        {showWorkout && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Training</Text>
              <Pressable onPress={() => router.push("/wellness/step3")}>
                <Text style={styles.editLink}>Edit</Text>
              </Pressable>
            </View>
            <ReviewRow label="Location" value={formatLabel(state.workoutForm.location || "Not set")} />
            <ReviewRow label="Training Mode" value={formatLabel(state.workoutForm.trainingMode)} />
            <ReviewRow label="Experience Level" value={formatLabel(state.workoutForm.experienceLevel)} />
            <ReviewRow
              label="Focus Areas"
              value={state.workoutForm.focusAreas.join(", ") || "None"}
            />
            <ReviewRow
              label="Workout Days"
              value={state.workoutForm.daysOfWeek.join(", ") || "None"}
            />
            <ReviewRow label="Session Length" value={`${state.workoutForm.sessionLength}min`} />
            <ReviewRow label="Equipment" value={equipmentDisplay()} />
            <ReviewRow
              label="Limitations"
              value={state.workoutForm.limitations || "None"}
            />
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 16) + (Platform.OS === "web" ? 34 : 0) },
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.submitBtn,
            pressed && !submitting && { opacity: 0.85 },
            submitting && { opacity: 0.6 },
          ]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.submitBtnText}>Generate My Plan</Text>
              <Ionicons name="sparkles" size={18} color="#fff" />
            </>
          )}
        </Pressable>
      </View>
    </View>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceTertiary,
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 24,
    borderRadius: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  sectionCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  editLink: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  reviewLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    flex: 1,
  },
  reviewValue: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    flex: 1.2,
    textAlign: "right",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
