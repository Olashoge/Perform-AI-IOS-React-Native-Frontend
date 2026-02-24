import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors, ThemeColors } from "@/lib/theme-context";
import {
  useWellnessPlans,
  useMealPlans,
  useWorkoutPlans,
  useDeleteGoalPlan,
  useDeleteMealPlan,
  useDeleteWorkoutPlan,
  useUpdateGoalPlan,
} from "@/lib/api-hooks";

const WEB_TOP_INSET = 67;
const TABS = ["Wellness", "Meals", "Workouts"] as const;
type Tab = (typeof TABS)[number];

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

function StatusBadge({ status }: { status: string }) {
  const Colors = useColors();
  const color =
    status === "ready" || status === "active"
      ? Colors.accent
      : status === "generating" || status === "pending"
        ? Colors.warning
        : Colors.textSecondary;
  return (
    <View style={[statusBadgeStyles.statusBadge, { backgroundColor: color + "20" }]}>
      <View style={[statusBadgeStyles.statusDot, { backgroundColor: color }]} />
      <Text style={[statusBadgeStyles.statusText, { color }]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
    </View>
  );
}

const statusBadgeStyles = StyleSheet.create({
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
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
  statusText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
});

function PlanCard({
  plan,
  type,
  onDelete,
  onMoveDate,
  onPress,
}: {
  plan: any;
  type: "wellness" | "meal" | "workout";
  onDelete: () => void;
  onMoveDate?: () => void;
  onPress: () => void;
}) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [showActions, setShowActions] = useState(false);
  const icon: any =
    type === "wellness"
      ? "sparkles"
      : type === "meal"
        ? "restaurant"
        : "fitness";
  const iconColor =
    type === "wellness"
      ? Colors.primary
      : type === "meal"
        ? Colors.accent
        : "#FF6B6B";

  const title =
    plan.name ||
    plan.title ||
    (type === "wellness"
      ? "Wellness Plan"
      : type === "meal"
        ? "Meal Plan"
        : "Workout Plan");

  const status = plan.status || plan.generationStatus || "active";
  const startDate = plan.startDate || plan.start_date;
  const endDate = plan.endDate || plan.end_date;

  return (
    <Pressable
      style={styles.planCard}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      testID={`plan-card-${plan._id || plan.id}`}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconCircle, { backgroundColor: iconColor + "20" }]}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {title}
          </Text>
          {plan.primaryGoal && (
            <Text style={styles.cardSubtitle} numberOfLines={1}>
              {plan.primaryGoal}
            </Text>
          )}
        </View>
        <Pressable
          style={styles.menuButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowActions(!showActions);
          }}
          testID={`plan-menu-${plan._id || plan.id}`}
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={20}
            color={Colors.textSecondary}
          />
        </Pressable>
      </View>

      <View style={styles.cardMeta}>
        <StatusBadge status={status} />
        {startDate && (
          <View style={styles.dateRow}>
            <Ionicons
              name="calendar-outline"
              size={14}
              color={Colors.textSecondary}
            />
            <Text style={styles.dateText}>
              {formatDate(startDate)}
              {endDate ? ` – ${formatDate(endDate)}` : ""}
            </Text>
          </View>
        )}
      </View>

      {plan.planType && (
        <View style={styles.planTypeRow}>
          <Text style={styles.planTypeLabel}>Type:</Text>
          <Text style={styles.planTypeValue}>
            {plan.planType === "both"
              ? "Meal & Workout"
              : plan.planType === "meal"
                ? "Meal Only"
                : "Workout Only"}
          </Text>
        </View>
      )}

      {showActions && (
        <View style={styles.actionsPanel}>
          {type === "wellness" && onMoveDate && (
            <Pressable
              style={styles.actionRow}
              onPress={() => {
                setShowActions(false);
                onMoveDate();
              }}
            >
              <Ionicons
                name="calendar-outline"
                size={18}
                color={Colors.primary}
              />
              <Text style={styles.actionText}>Change Start Date</Text>
            </Pressable>
          )}
          <Pressable
            style={styles.actionRow}
            onPress={() => {
              setShowActions(false);
              onDelete();
            }}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.error} />
            <Text style={[styles.actionText, { color: Colors.error }]}>
              Delete Plan
            </Text>
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

export default function PlansHubScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? WEB_TOP_INSET : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const [activeTab, setActiveTab] = useState<Tab>("Wellness");

  const wellnessQuery = useWellnessPlans();
  const mealQuery = useMealPlans();
  const workoutQuery = useWorkoutPlans();

  const deleteGoalPlan = useDeleteGoalPlan();
  const deleteMealPlan = useDeleteMealPlan();
  const deleteWorkoutPlan = useDeleteWorkoutPlan();
  const updateGoalPlan = useUpdateGoalPlan();

  const activeQuery =
    activeTab === "Wellness"
      ? wellnessQuery
      : activeTab === "Meals"
        ? mealQuery
        : workoutQuery;

  const plans = activeQuery.data || [];
  const isLoading = activeQuery.isLoading;

  const onRefresh = useCallback(() => {
    wellnessQuery.refetch();
    mealQuery.refetch();
    workoutQuery.refetch();
  }, []);

  const confirmDelete = (id: string, type: "wellness" | "meal" | "workout") => {
    const mutation =
      type === "wellness"
        ? deleteGoalPlan
        : type === "meal"
          ? deleteMealPlan
          : deleteWorkoutPlan;

    Alert.alert("Delete Plan", "Are you sure you want to delete this plan?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          mutation.mutate(id);
        },
      },
    ]);
  };

  const promptMoveDate = (plan: any) => {
    const planId = plan._id || plan.id;
    Alert.alert(
      "Change Start Date",
      "Enter a new start date in YYYY-MM-DD format.\n\nCurrent: " +
        (plan.startDate || plan.start_date || "Not set"),
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Move to Next Monday",
          onPress: () => {
            const today = new Date();
            const day = today.getUTCDay();
            const diff = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
            const nextMon = new Date(
              Date.UTC(
                today.getUTCFullYear(),
                today.getUTCMonth(),
                today.getUTCDate() + diff,
              ),
            );
            const dateStr = nextMon.toISOString().split("T")[0];
            Haptics.impactAsync();
            updateGoalPlan.mutate({ id: planId, data: { startDate: dateStr } });
          },
        },
      ],
    );
  };

  const getTabCount = (tab: Tab) => {
    if (tab === "Wellness") return wellnessQuery.data?.length || 0;
    if (tab === "Meals") return mealQuery.data?.length || 0;
    return workoutQuery.data?.length || 0;
  };

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          testID="plans-back"
        >
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>My Plans</Text>
        <Pressable
          style={styles.createButton}
          onPress={() => {
            Haptics.impactAsync();
            router.push("/(tabs)/create");
          }}
          testID="plans-create"
        >
          <Ionicons name="add" size={24} color={Colors.primary} />
        </Pressable>
      </View>

      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const count = getTabCount(tab);
          const isActive = activeTab === tab;
          return (
            <Pressable
              key={tab}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              testID={`plans-tab-${tab.toLowerCase()}`}
            >
              <Text
                style={[styles.tabText, isActive && styles.tabTextActive]}
              >
                {tab}
              </Text>
              {count > 0 && (
                <View
                  style={[
                    styles.tabBadge,
                    isActive && styles.tabBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabBadgeText,
                      isActive && styles.tabBadgeTextActive,
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: bottomInset + 20 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={activeQuery.isFetching && !activeQuery.isLoading}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {isLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : plans.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="document-text-outline"
              size={48}
              color={Colors.textTertiary}
            />
            <Text style={styles.emptyTitle}>No {activeTab} Plans</Text>
            <Text style={styles.emptySubtitle}>
              Create a new plan to get started with your fitness journey.
            </Text>
            <Pressable
              style={styles.emptyCreateButton}
              onPress={() => {
                Haptics.impactAsync();
                router.push("/(tabs)/create");
              }}
            >
              <Ionicons name="add-circle" size={20} color={Colors.text} />
              <Text style={styles.emptyCreateText}>Create Plan</Text>
            </Pressable>
          </View>
        ) : (
          plans.map((plan: any, index: number) => {
            const id = plan._id || plan.id;
            const planType: "wellness" | "meal" | "workout" =
              activeTab === "Wellness"
                ? "wellness"
                : activeTab === "Meals"
                  ? "meal"
                  : "workout";
            return (
              <PlanCard
                key={id || index}
                plan={plan}
                type={planType}
                onDelete={() => confirmDelete(id, planType)}
                onMoveDate={
                  planType === "wellness"
                    ? () => promptMoveDate(plan)
                    : undefined
                }
                onPress={() => {
                  if (planType === "meal") {
                    router.push(`/plan/meal/${id}`);
                  } else if (planType === "workout") {
                    router.push(`/plan/workout/${id}`);
                  } else {
                    router.push(`/plan/wellness/${id}`);
                  }
                }}
              />
            );
          })
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
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.surface,
  },
  tabActive: {
    backgroundColor: Colors.primary + "20",
    borderWidth: 1,
    borderColor: Colors.primary + "40",
  },
  tabText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
    fontFamily: "Inter_600SemiBold",
  },
  tabBadge: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: "center",
  },
  tabBadgeActive: {
    backgroundColor: Colors.primary + "30",
  },
  tabBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  tabBadgeTextActive: {
    color: Colors.primary,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 12,
    paddingTop: 8,
  },
  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  cardSubtitle: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  menuButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  planTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 4,
  },
  planTypeLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  planTypeValue: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  actionsPanel: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 4,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  actionText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    textAlign: "center",
    paddingHorizontal: 32,
    lineHeight: 18,
  },
  emptyCreateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  emptyCreateText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
});
