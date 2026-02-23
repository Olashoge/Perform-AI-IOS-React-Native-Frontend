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
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors, ThemeColors } from "@/lib/theme-context";

export default function CreateScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const PLAN_TYPES = useMemo(() => [
    {
      id: "wellness",
      title: "Wellness Plan",
      subtitle: "Complete meal + workout plan tailored to your goals",
      icon: "sparkles" as const,
      color: Colors.primary,
      recommended: true,
      enabled: true,
    },
    {
      id: "meal_7day",
      title: "Meal Plan (7-day)",
      subtitle: "A full week of personalized meals",
      icon: "restaurant" as const,
      color: Colors.accent,
      recommended: false,
      enabled: false,
    },
    {
      id: "workout_7day",
      title: "Workout Plan (7-day)",
      subtitle: "A full week of structured workouts",
      icon: "fitness" as const,
      color: "#FF6B6B",
      recommended: false,
      enabled: false,
    },
    {
      id: "daily_meal",
      title: "Daily Meal",
      subtitle: "Generate a single day's meals",
      icon: "nutrition" as const,
      color: "#FFB347",
      recommended: false,
      enabled: false,
    },
    {
      id: "daily_workout",
      title: "Daily Workout",
      subtitle: "Generate a single workout session",
      icon: "barbell" as const,
      color: "#9B59B6",
      recommended: false,
      enabled: false,
    },
  ], [Colors]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 16 + webTopInset,
            paddingBottom: insets.bottom + 40,
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
          <Text style={styles.headerTitle}>Create Plan</Text>
          <View style={{ width: 44 }} />
        </View>

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
              <Ionicons
                name="chevron-forward"
                size={18}
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  sectionSubtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginBottom: 24,
    textAlign: "center",
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
