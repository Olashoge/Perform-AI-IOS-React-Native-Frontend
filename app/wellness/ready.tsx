import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Icon } from "@/components/Icon";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors, ThemeColors } from "@/lib/theme-context";
import { useGoalPlan } from "@/lib/api-hooks";

const WEB_TOP_INSET = 67;

export default function ReadyScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const { goalPlanId } = useLocalSearchParams<{ goalPlanId: string }>();
  const { data, isLoading } = useGoalPlan(goalPlanId ?? null);
  const topInset = Platform.OS === "web" ? WEB_TOP_INSET : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topInset + 20 }]}>
      <View style={styles.centerContent}>
        <View style={styles.checkmarkWrap}>
          <Ionicons
            name="checkmark-circle-outline"
            size={80}
            color={Colors.accent}
          />
        </View>

        <Text style={styles.title}>Your Plan is Ready!</Text>
        <Text style={styles.subtitle}>
          Your personalized wellness plan has been created and is ready to go.
        </Text>

        {isLoading && (
          <ActivityIndicator
            size="small"
            color={Colors.primary}
            style={{ marginBottom: 24 }}
          />
        )}

        {data && (
          <View style={styles.summaryCard}>
            {data.planType && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Plan Type</Text>
                <Text style={styles.summaryValue}>
                  {data.planType === "both"
                    ? "Meal & Workout"
                    : data.planType === "meal"
                      ? "Meal Only"
                      : "Workout Only"}
                </Text>
              </View>
            )}
            {data.startDate && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Start Date</Text>
                <Text style={styles.summaryValue}>{data.startDate}</Text>
              </View>
            )}
            {data.mealPlan && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Meal Plan</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {data.mealPlan.status === "ready" ? "Ready" : data.mealPlan.status}
                  </Text>
                </View>
              </View>
            )}
            {data.workoutPlan && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Workout Plan</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {data.workoutPlan.status === "ready"
                      ? "Ready"
                      : data.workoutPlan.status}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        <View style={styles.buttonGroup}>
          <Pressable
            style={styles.primaryButton}
            onPress={() => {
              Haptics.impactAsync();
              if (goalPlanId) {
                router.replace(`/plan/wellness/${goalPlanId}`);
              } else {
                router.replace("/plans");
              }
            }}
          >
            <Text style={styles.primaryButtonText}>View My Plans</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  checkmarkWrap: {
    marginBottom: 28,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  summaryCard: {
    width: "100%",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    gap: 14,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  badge: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.accent,
  },
  buttonGroup: {
    width: "100%",
    gap: 12,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
