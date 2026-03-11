import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors, ThemeColors } from "@/lib/theme-context";
import { useWellness } from "@/lib/wellness-context";
import { formatGoalLabel } from "@/lib/goal-helpers";

export type WizardStep = "step1" | "step2" | "step3";

function formatLabel(value: string): string {
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function WizardContextBar({ step }: { step: WizardStep }) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { state } = useWellness();

  const parts: string[] = [];

  if (step === "step1") {
    if (state.goalType) parts.push(formatGoalLabel(state.goalType));
    if (state.secondaryFocus) parts.push(formatGoalLabel(state.secondaryFocus));
    const planTypeMap: Record<string, string> = {
      both: "Meal + Workout",
      meal: "Meal Only",
      workout: "Workout Only",
    };
    if (state.planType) parts.push(planTypeMap[state.planType] ?? state.planType);
  } else if (step === "step2") {
    const diets = state.mealForm.dietStyles.filter((s) => s !== "No Preference");
    if (diets.length > 0) {
      parts.push(diets.slice(0, 2).join(", "));
    } else {
      parts.push("No Preference");
    }
    if (state.mealForm.foodsToAvoid.length > 0) {
      parts.push(`Avoids ${state.mealForm.foodsToAvoid.slice(0, 2).join(", ")}`);
    }
    parts.push(`${state.mealForm.mealsPerDay} meals/day`);
  } else if (step === "step3") {
    if (state.workoutForm.location) parts.push(formatLabel(state.workoutForm.location));
    const eqCount = state.workoutForm.equipmentAvailable.length;
    if (eqCount > 0) parts.push(`${eqCount} items`);
    const days = state.workoutForm.daysOfWeek.length;
    if (days > 0) parts.push(`${days} days/wk`);
  }

  if (parts.length === 0) return null;

  return (
    <View style={styles.bar}>
      <Text style={styles.label}>Shaping your plan around</Text>
      <Text style={styles.text} numberOfLines={1}>
        {parts.join(" · ")}
      </Text>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    bar: {
      backgroundColor: Colors.surface,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 12,
    },
    label: {
      fontSize: 9,
      fontFamily: "Inter_600SemiBold",
      color: Colors.textTertiary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 3,
    },
    text: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: Colors.textSecondary,
    },
  });
