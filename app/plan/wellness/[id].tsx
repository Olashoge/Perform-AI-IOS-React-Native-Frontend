import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors, ThemeColors } from "@/lib/theme-context";
import { useGoalPlan } from "@/lib/api-hooks";

const WEB_TOP_INSET = 67;

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr + "T12:00:00Z");
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return dateStr;
  }
}

function StatusIndicator({ status }: { status: string }) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const color =
    status === "ready" || status === "active"
      ? Colors.accent
      : status === "generating" || status === "pending"
        ? Colors.warning
        : Colors.textSecondary;
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <View style={[styles.statusBadge, { backgroundColor: color + "20" }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusLabel, { color }]}>{label}</Text>
    </View>
  );
}

function LinkedPlanCard({
  title,
  icon,
  iconColor,
  status,
  available,
  onPress,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  status: string;
  available: boolean;
  onPress: () => void;
}) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <Pressable
      style={[styles.linkedCard, !available && styles.linkedCardDisabled]}
      onPress={available ? onPress : undefined}
      disabled={!available}
    >
      <View style={[styles.linkedIconCircle, { backgroundColor: iconColor + "20" }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.linkedContent}>
        <Text style={styles.linkedTitle}>{title}</Text>
        <View style={styles.linkedStatusRow}>
          {status === "generating" || status === "pending" ? (
            <>
              <ActivityIndicator size="small" color={Colors.warning} />
              <Text style={[styles.linkedStatus, { color: Colors.warning }]}>
                Generating...
              </Text>
            </>
          ) : available ? (
            <Text style={[styles.linkedStatus, { color: Colors.accent }]}>
              Ready to view
            </Text>
          ) : (
            <Text style={[styles.linkedStatus, { color: Colors.textTertiary }]}>
              Not available
            </Text>
          )}
        </View>
      </View>
      {available && (
        <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
      )}
    </Pressable>
  );
}

export default function WellnessPlanDetailScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? WEB_TOP_INSET : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: plan, isLoading, isError, refetch } = useGoalPlan(id || null);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Wellness Plan</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  if (isError || !plan) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Wellness Plan</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>Failed to load plan</Text>
          <Pressable style={styles.retryButton} onPress={() => refetch()}>
            <Ionicons name="refresh" size={20} color={Colors.text} />
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const status = plan.status || plan.generationStatus || "active";
  const planName = plan.name || plan.title || "Wellness Plan";
  const primaryGoal = plan.primaryGoal || plan.primary_goal;
  const startDate = plan.startDate || plan.start_date;
  const endDate = plan.endDate || plan.end_date;
  const planType = plan.planType || plan.plan_type || "both";
  const mealPlanId = plan.mealPlanId || plan.meal_plan_id;
  const workoutPlanId = plan.workoutPlanId || plan.workout_plan_id;

  const mealPlanStatus = plan.mealPlan?.status || (mealPlanId ? "ready" : "unavailable");
  const workoutPlanStatus = plan.workoutPlan?.status || (workoutPlanId ? "ready" : "unavailable");

  const showMealSection = planType === "meal" || planType === "both";
  const showWorkoutSection = planType === "workout" || planType === "both";

  const isMealAvailable = !!mealPlanId && mealPlanStatus !== "generating" && mealPlanStatus !== "pending";
  const isWorkoutAvailable = !!workoutPlanId && workoutPlanStatus !== "generating" && workoutPlanStatus !== "pending";

  const isGenerating = status === "generating" || status === "pending";

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>Wellness Plan</Text>
        <Pressable style={styles.refreshButton} onPress={() => refetch()}>
          <Ionicons name="refresh" size={20} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {isGenerating && (
          <View style={styles.generatingBanner}>
            <ActivityIndicator size="small" color={Colors.warning} />
            <Text style={styles.generatingText}>Plan is still generating...</Text>
          </View>
        )}

        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <View style={[styles.overviewIcon, { backgroundColor: Colors.primary + "20" }]}>
              <Ionicons name="sparkles" size={28} color={Colors.primary} />
            </View>
            <View style={styles.overviewHeaderText}>
              <Text style={styles.planName}>{planName}</Text>
              <StatusIndicator status={status} />
            </View>
          </View>

          {primaryGoal && (
            <View style={styles.infoRow}>
              <Ionicons name="flag-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.infoLabel}>Goal</Text>
              <Text style={styles.infoValue}>{primaryGoal}</Text>
            </View>
          )}

          {(startDate || endDate) && (
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.infoLabel}>Duration</Text>
              <Text style={styles.infoValue}>
                {formatDate(startDate)}{endDate ? ` – ${formatDate(endDate)}` : ""}
              </Text>
            </View>
          )}

          {planType && (
            <View style={styles.infoRow}>
              <Ionicons name="layers-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.infoLabel}>Type</Text>
              <Text style={styles.infoValue}>
                {planType === "both"
                  ? "Meal & Workout"
                  : planType === "meal"
                    ? "Meal Only"
                    : "Workout Only"}
              </Text>
            </View>
          )}
        </View>

        {showMealSection && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Meal Plan</Text>
            <LinkedPlanCard
              title="7-Day Meal Plan"
              icon="restaurant"
              iconColor={Colors.accent}
              status={mealPlanStatus}
              available={isMealAvailable}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/plan/meal/${mealPlanId}`);
              }}
            />
          </View>
        )}

        {showWorkoutSection && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Workout Plan</Text>
            <LinkedPlanCard
              title="7-Day Workout Plan"
              icon="fitness"
              iconColor={Colors.error}
              status={workoutPlanStatus}
              available={isWorkoutAvailable}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/plan/workout/${workoutPlanId}`);
              }}
            />
          </View>
        )}
      </ScrollView>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
    flex: 1,
    textAlign: "center" as const,
  },
  headerSpacer: {
    width: 40,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  retryText: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 20,
  },
  generatingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.warning + "15",
    borderWidth: 1,
    borderColor: Colors.warning + "30",
    borderRadius: 12,
    padding: 14,
  },
  generatingText: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: Colors.warning,
  },
  overviewCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
  },
  overviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 4,
  },
  overviewIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  overviewHeaderText: {
    flex: 1,
    gap: 6,
  },
  planName: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start" as const,
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: "500" as const,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 2,
  },
  infoLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    width: 60,
  },
  infoValue: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: Colors.text,
    flex: 1,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    paddingLeft: 4,
  },
  linkedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  linkedCardDisabled: {
    opacity: 0.5,
  },
  linkedIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  linkedContent: {
    flex: 1,
    gap: 4,
  },
  linkedTitle: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  linkedStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  linkedStatus: {
    fontSize: 11,
  },
});
