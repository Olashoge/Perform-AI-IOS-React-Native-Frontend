import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useColors, ThemeColors } from "@/lib/theme-context";
import { ProfileData } from "@/lib/api-hooks";
import { kgToLbs } from "@/lib/weight-utils";

function formatLabel(value: string): string {
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function PlanWizardSummaryBar({ profile }: { profile: ProfileData }) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const parts: string[] = [];
  if (profile.primaryGoal) parts.push(formatLabel(profile.primaryGoal));
  if (profile.trainingExperience) parts.push(formatLabel(profile.trainingExperience));
  if (profile.workoutLocationDefault) parts.push(formatLabel(profile.workoutLocationDefault));
  if (profile.trainingDaysOfWeek?.length) parts.push(`${profile.trainingDaysOfWeek.length} days/wk`);
  if (profile.weightKg != null) {
    const isImperial = profile.unitSystem === "imperial";
    parts.push(isImperial ? `${kgToLbs(profile.weightKg)} lb` : `${profile.weightKg} kg`);
  }

  if (parts.length === 0) return null;

  return (
    <View style={styles.bar}>
      <Text style={styles.text} numberOfLines={1}>{parts.join(" · ")}</Text>
      <Pressable onPress={() => router.push("/(tabs)/profile")} hitSlop={8}>
        <Text style={styles.editLink}>Edit</Text>
      </Pressable>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    bar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Colors.surface,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 4,
      gap: 8,
    },
    text: {
      flex: 1,
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      color: Colors.textSecondary,
    },
    editLink: {
      fontSize: 11,
      fontFamily: "Inter_500Medium",
      color: Colors.primary,
    },
  });
