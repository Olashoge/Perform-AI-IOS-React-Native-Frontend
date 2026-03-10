import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Icon } from "@/components/Icon";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors, ThemeColors } from "@/lib/theme-context";

export default function CreateTabScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const PLAN_TYPES = useMemo(() => [
    {
      id: "wellness",
      title: "Wellness Plan",
      subtitle: "Complete meal + workout plan tailored to your goals",
      icon: "sparkles-outline" as const,
      color: Colors.primary,
      recommended: true,
      enabled: true,
    },
    {
      id: "meal_7day",
      title: "Meal Plan (7-day)",
      subtitle: "A full week of personalized meals",
      icon: "restaurant-outline" as const,
      color: Colors.accent,
      recommended: false,
      enabled: true,
    },
    {
      id: "workout_7day",
      title: "Workout Plan (7-day)",
      subtitle: "A full week of structured workouts",
      icon: "fitness-outline" as const,
      color: Colors.error,
      recommended: false,
      enabled: true,
    },
    {
      id: "daily_meal",
      title: "Daily Meal",
      subtitle: "AI-generated meals for today based on your profile",
      icon: "nutrition-outline" as const,
      color: Colors.warning,
      recommended: false,
      enabled: true,
    },
    {
      id: "daily_workout",
      title: "Daily Workout",
      subtitle: "AI-generated workout for today based on your profile",
      icon: "barbell-outline" as const,
      color: Colors.textSecondary,
      recommended: false,
      enabled: true,
    },
  ], [Colors]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 16 + webTopInset,
            paddingBottom: 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headerTitle}>Create</Text>
        <Text style={styles.sectionSubtitle}>
          Choose what you'd like to create
        </Text>

        <View style={styles.cardsContainer}>
          {PLAN_TYPES.map((plan) => (
            <Pressable
              key={plan.id}
              style={({ pressed }) => [
                styles.planCard,
                !plan.enabled && styles.planCardDisabled,
                pressed && plan.enabled && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
              onPress={() => {
                if (!plan.enabled) return;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                if (plan.id === "wellness") {
                  router.push("/wellness/step1");
                } else if (plan.id === "meal_7day") {
                  router.push("/meal/new");
                } else if (plan.id === "workout_7day") {
                  router.push("/workout/new");
                } else if (plan.id === "daily_meal") {
                  router.push("/daily-meal-form");
                } else if (plan.id === "daily_workout") {
                  router.push("/daily-workout-form");
                }
              }}
              disabled={!plan.enabled}
            >
              <View style={[styles.planIconBg, { backgroundColor: plan.color + "1A" }]}>
                <Ionicons name={plan.icon} size={26} color={plan.color} />
              </View>
              <View style={styles.planInfo}>
                <View style={styles.planTitleRow}>
                  <Text style={[styles.planTitle, !plan.enabled && styles.planTitleDisabled]}>
                    {plan.title}
                  </Text>
                  {plan.recommended && (
                    <View style={styles.recommendedBadge}>
                      <Text style={styles.recommendedText}>Recommended</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.planSubtitle, !plan.enabled && styles.planSubtitleDisabled]}>
                  {plan.enabled ? plan.subtitle : "Coming next"}
                </Text>
              </View>
              <Icon
                name="forward"
                size={20}
                color={plan.enabled ? Colors.textSecondary : Colors.textTertiary}
              />
            </Pressable>
          ))}
        </View>
      </ScrollView>
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
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  cardsContainer: {
    gap: 12,
  },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  planCardDisabled: {
    opacity: 0.5,
  },
  planIconBg: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  planInfo: {
    flex: 1,
    gap: 4,
  },
  planTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  planTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  planTitleDisabled: {
    color: Colors.textSecondary,
  },
  planSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  planSubtitleDisabled: {
    color: Colors.textTertiary,
  },
  recommendedBadge: {
    backgroundColor: Colors.primary + "20",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  recommendedText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
});
