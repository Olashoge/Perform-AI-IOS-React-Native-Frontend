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
  useBudget,
} from "@/lib/api-hooks";

const WEB_TOP_INSET = 67;
const TABS = ["Wellness", "Nutrition", "Training"] as const;
type Tab = (typeof TABS)[number];

function formatDateRange(start: string | undefined, end: string | undefined): string {
  if (!start) return "";
  try {
    const fmt = (s: string) => {
      const d = new Date(s + "T12:00:00Z");
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
    };
    const fmtShort = (s: string) => {
      const d = new Date(s + "T12:00:00Z");
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    };
    if (end) {
      const ds = new Date(start + "T12:00:00Z");
      const de = new Date(end + "T12:00:00Z");
      if (ds.getUTCFullYear() === de.getUTCFullYear()) {
        return `${fmtShort(start)} – ${fmtShort(end)}, ${ds.getUTCFullYear()}`;
      }
      return `${fmt(start)} – ${fmt(end)}`;
    }
    return fmt(start);
  } catch {
    return start || "";
  }
}

function formatShortDate(dateStr: string | undefined): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr + "T12:00:00Z");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  } catch {
    return dateStr;
  }
}

function StatusBadge({ status, Colors }: { status: string; Colors: ThemeColors }) {
  const isActive = status === "ready" || status === "active";
  const isScheduled = status === "scheduled" || status === "generating" || status === "pending";
  const bgColor = isActive ? "#30D15820" : isScheduled ? Colors.primary + "18" : Colors.surfaceElevated;
  const textColor = isActive ? "#30D158" : isScheduled ? Colors.primary : Colors.textSecondary;
  const icon = isActive ? "sparkles" : isScheduled ? "calendar-outline" : "ellipsis-horizontal";

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: bgColor, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
      <Ionicons name={icon as any} size={10} color={textColor} />
      <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: textColor }}>
        {status === "ready" ? "Active" : status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
    </View>
  );
}

function GoalBadge({ goal, Colors }: { goal: string; Colors: ThemeColors }) {
  return (
    <View style={{ backgroundColor: Colors.text, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
      <Text style={{ fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.background }}>
        {goal}
      </Text>
    </View>
  );
}

function BudgetCard({ Colors }: { Colors: ThemeColors }) {
  const { data } = useBudget();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const mealSwaps = data?.mealSwaps ?? { used: 0, total: 0 };
  const dayRegens = data?.dayRegens ?? { used: 0, total: 0 };
  const planRegens = data?.planRegens ?? { used: 0, total: 0 };

  return (
    <View style={styles.budgetCard}>
      <View style={styles.budgetHeader}>
        <Ionicons name="sparkles" size={14} color={Colors.primary} />
        <Text style={styles.budgetTitle}>Today's Budget</Text>
      </View>
      <View style={styles.budgetGrid}>
        <View style={styles.budgetItem}>
          <Ionicons name="swap-horizontal-outline" size={13} color={Colors.textSecondary} />
          <Text style={styles.budgetLabel}>Meal Swaps</Text>
          <Text style={styles.budgetValue}>{mealSwaps.used}/{mealSwaps.total}</Text>
        </View>
        <View style={styles.budgetItem}>
          <Ionicons name="time-outline" size={13} color={Colors.textSecondary} />
          <Text style={styles.budgetLabel}>Day Regens</Text>
          <Text style={styles.budgetValue}>{dayRegens.used}/{dayRegens.total}</Text>
        </View>
      </View>
      <View style={styles.budgetItemFull}>
        <Ionicons name="refresh-outline" size={13} color={Colors.textSecondary} />
        <Text style={styles.budgetLabel}>Plan Regens</Text>
        <Text style={styles.budgetValue}>{planRegens.used}/{planRegens.total}</Text>
      </View>
    </View>
  );
}

function WellnessPlanCard({ plan, onDelete, Colors, mealPlans, workoutPlans }: { plan: any; onDelete: () => void; Colors: ThemeColors; mealPlans: any[]; workoutPlans: any[] }) {
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const name = plan.name || plan.title || "Wellness Plan";
  const status = plan.status || plan.generationStatus || "active";
  const startDate = plan.startDate || plan.start_date;
  const endDate = plan.endDate || plan.end_date;
  const goal = plan.goalType || plan.primaryGoal || "";
  const planType = plan.planType || "both";
  const linkedMeal = mealPlans.find((mp: any) => mp.id === plan.mealPlanId);
  const linkedWorkout = workoutPlans.find((wp: any) => wp.id === plan.workoutPlanId);
  const mealPlanName = linkedMeal?.name || plan.mealPlan?.name || plan.mealPlanName || "";
  const workoutPlanName = linkedWorkout?.name || plan.workoutPlan?.name || plan.workoutPlanName || "";
  const id = plan._id || plan.id;

  return (
    <View style={styles.wellnessCard}>
      <View style={styles.wellnessCardHeader}>
        <View style={styles.wellnessIconCircle}>
          <Ionicons name="sync-circle" size={28} color={Colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.wellnessCardTitle} numberOfLines={2}>{name}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {goal ? <GoalBadge goal={goal} Colors={Colors} /> : null}
            <StatusBadge status={status} Colors={Colors} />
          </View>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onDelete();
          }}
          hitSlop={10}
          style={{ padding: 6 }}
        >
          <Ionicons name="trash-outline" size={18} color={Colors.textTertiary} />
        </Pressable>
      </View>

      {startDate && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 12 }}>
          <Ionicons name="calendar-outline" size={12} color={Colors.textSecondary} />
          <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textSecondary }}>
            {formatDateRange(startDate, endDate)}
          </Text>
        </View>
      )}

      <View style={styles.linkedPlansRow}>
        <Pressable
          style={styles.linkedPlanBox}
          onPress={() => {
            if (plan.mealPlan?.id || plan.mealPlanId) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/plan/meal/${plan.mealPlan?.id || plan.mealPlanId}` as any);
            }
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <Ionicons name="restaurant" size={14} color={Colors.textSecondary} />
            <Text style={styles.linkedPlanLabel}>Meal Plan</Text>
            {(plan.mealPlan?.id || plan.mealPlanId) && (
              <Ionicons name="open-outline" size={12} color={Colors.textTertiary} />
            )}
          </View>
          {mealPlanName ? (
            <Text style={styles.linkedPlanName} numberOfLines={2}>{mealPlanName}</Text>
          ) : (
            <Pressable style={styles.linkButton}>
              <Ionicons name="link-outline" size={14} color={Colors.textTertiary} />
              <Text style={styles.linkButtonText}>Link Meal Plan</Text>
            </Pressable>
          )}
        </Pressable>

        <Pressable
          style={styles.linkedPlanBox}
          onPress={() => {
            if (plan.workoutPlan?.id || plan.workoutPlanId) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/plan/workout/${plan.workoutPlan?.id || plan.workoutPlanId}` as any);
            }
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <Ionicons name="barbell" size={14} color={Colors.textSecondary} />
            <Text style={styles.linkedPlanLabel}>Workout Plan</Text>
            {(plan.workoutPlan?.id || plan.workoutPlanId) && (
              <Ionicons name="open-outline" size={12} color={Colors.textTertiary} />
            )}
          </View>
          {workoutPlanName ? (
            <Text style={styles.linkedPlanName} numberOfLines={2}>{workoutPlanName}</Text>
          ) : (
            <Pressable style={styles.linkButton}>
              <Ionicons name="link-outline" size={14} color={Colors.textTertiary} />
              <Text style={styles.linkButtonText}>Link Workout Plan</Text>
            </Pressable>
          )}
        </Pressable>
      </View>

      <Pressable
        style={styles.checkInsButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/plan/wellness/${id}` as any);
        }}
      >
        <Text style={styles.checkInsText}>Weekly Check-ins</Text>
      </Pressable>
    </View>
  );
}

function MealPlanCard({ plan, onDelete, Colors }: { plan: any; onDelete: () => void; Colors: ThemeColors }) {
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const name = plan.name || plan.title || "Meal Plan";
  const status = plan.status || plan.generationStatus || "active";
  const startDate = plan.startDate || plan.start_date;
  const endDate = plan.endDate || plan.end_date;
  const id = plan._id || plan.id;

  return (
    <Pressable
      style={styles.simplePlanCard}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/plan/meal/${id}` as any);
      }}
    >
      <View style={[styles.simplePlanIcon, { backgroundColor: "#FF9F0A20" }]}>
        <Ionicons name="restaurant" size={20} color="#FF9F0A" />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.simplePlanName} numberOfLines={2}>{name}</Text>
        <StatusBadge status={status} Colors={Colors} />
        {startDate && (
          <Text style={styles.simplePlanDate}>{formatDateRange(startDate, endDate)}</Text>
        )}
      </View>
      <Pressable
        onPress={(e) => {
          e.stopPropagation?.();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onDelete();
        }}
        hitSlop={10}
        style={{ padding: 6 }}
      >
        <Ionicons name="trash-outline" size={18} color={Colors.textTertiary} />
      </Pressable>
      <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
    </Pressable>
  );
}

function WorkoutPlanCard({ plan, onDelete, Colors }: { plan: any; onDelete: () => void; Colors: ThemeColors }) {
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const name = plan.name || plan.title || "Workout Plan";
  const status = plan.status || plan.generationStatus || "active";
  const startDate = plan.startDate || plan.start_date;
  const endDate = plan.endDate || plan.end_date;
  const planType = plan.planType || plan.type || "";
  const id = plan._id || plan.id;

  return (
    <Pressable
      style={styles.simplePlanCard}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/plan/workout/${id}` as any);
      }}
    >
      <View style={[styles.simplePlanIcon, { backgroundColor: "#30D15820" }]}>
        <Ionicons name="barbell" size={20} color="#30D158" />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.simplePlanName} numberOfLines={2}>{name}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <StatusBadge status={status} Colors={Colors} />
        </View>
        {startDate && (
          <Text style={styles.simplePlanDate}>
            {formatDateRange(startDate, endDate)}
            {planType ? `  ${planType.charAt(0).toUpperCase() + planType.slice(1)}` : ""}
          </Text>
        )}
      </View>
      <Pressable
        onPress={(e) => {
          e.stopPropagation?.();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onDelete();
        }}
        hitSlop={10}
        style={{ padding: 6 }}
      >
        <Ionicons name="trash-outline" size={18} color={Colors.textTertiary} />
      </Pressable>
      <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
    </Pressable>
  );
}

function EmptyState({ type, Colors }: { type: string; Colors: ThemeColors }) {
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <View style={styles.emptyState}>
      <Ionicons name="document-text-outline" size={40} color={Colors.textTertiary} />
      <Text style={styles.emptyTitle}>No {type} Plans</Text>
      <Text style={styles.emptySubtitle}>Create a new plan to get started.</Text>
    </View>
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

  const activeQuery = activeTab === "Wellness" ? wellnessQuery : activeTab === "Nutrition" ? mealQuery : workoutQuery;
  const plans = activeQuery.data || [];
  const isLoading = activeQuery.isLoading;

  const onRefresh = useCallback(() => {
    wellnessQuery.refetch();
    mealQuery.refetch();
    workoutQuery.refetch();
  }, []);

  const confirmDelete = (id: string, type: "wellness" | "meal" | "workout") => {
    const mutation = type === "wellness" ? deleteGoalPlan : type === "meal" ? deleteMealPlan : deleteWorkoutPlan;
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

  const activeWellnessPlan = (wellnessQuery.data || []).find((p: any) => {
    const s = p.status || p.generationStatus || "";
    return s === "active" || s === "ready";
  });

  const tabConfig = {
    Wellness: { title: "Wellness Plans", subtitle: "", btnLabel: "New Wellness Plan", btnIcon: "add" as const, createType: "wellness" },
    Nutrition: { title: "Nutrition", subtitle: "Meal plans aligned with your goal", btnLabel: "New Meal Plan", btnIcon: "sparkles" as const, createType: "meal" },
    Training: { title: "Training", subtitle: "Workout plans for progressive results", btnLabel: "New Workout Plan", btnIcon: "sparkles" as const, createType: "workout" },
  };
  const cfg = tabConfig[activeTab];

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Plans</Text>
        <View style={{ width: 40 }} />
      </View>

      {activeWellnessPlan && (
        <View style={styles.activePlanBanner}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
            <Ionicons name="ellipse" size={8} color={Colors.primary} />
            <Text style={styles.activePlanBannerLabel}>ACTIVE PLAN</Text>
            <Text style={styles.activePlanBannerName} numberOfLines={1}>
              {activeWellnessPlan.primaryGoal || activeWellnessPlan.name || "Wellness"}
            </Text>
            {activeWellnessPlan.targetDate && (
              <Text style={styles.activePlanBannerDate}>
                Target: {formatShortDate(activeWellnessPlan.targetDate)}
              </Text>
            )}
          </View>
        </View>
      )}

      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <Pressable
              key={tab}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => {
                Haptics.selectionAsync();
                setActiveTab(tab);
              }}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={activeQuery.isFetching && !activeQuery.isLoading}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>{cfg.title}</Text>
            {cfg.subtitle ? <Text style={styles.sectionSubtitle}>{cfg.subtitle}</Text> : null}
          </View>
          <Pressable style={{ padding: 8 }} onPress={() => {}}>
            <Ionicons name="swap-vertical" size={18} color={Colors.textSecondary} />
          </Pressable>
          <Pressable
            style={styles.newPlanButton}
            onPress={() => {
              Haptics.impactAsync();
              router.push("/(tabs)/create" as any);
            }}
          >
            <Ionicons name={cfg.btnIcon as any} size={14} color="#fff" />
            <Text style={styles.newPlanButtonText}>{cfg.btnLabel}</Text>
          </Pressable>
        </View>

        {(activeTab === "Nutrition" || activeTab === "Training") && (
          <BudgetCard Colors={Colors} />
        )}

        {isLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : plans.length === 0 ? (
          <EmptyState type={activeTab} Colors={Colors} />
        ) : (
          <>
            {(activeTab === "Nutrition" || activeTab === "Training") && (
              <Text style={styles.activePlansLabel}>ACTIVE PLANS</Text>
            )}

            {activeTab === "Wellness" &&
              plans.map((plan: any, i: number) => (
                <WellnessPlanCard
                  key={plan._id || plan.id || i}
                  plan={plan}
                  onDelete={() => confirmDelete(plan._id || plan.id, "wellness")}
                  Colors={Colors}
                  mealPlans={mealQuery.data || []}
                  workoutPlans={workoutQuery.data || []}
                />
              ))}

            {activeTab === "Nutrition" &&
              plans.map((plan: any, i: number) => (
                <MealPlanCard
                  key={plan._id || plan.id || i}
                  plan={plan}
                  onDelete={() => confirmDelete(plan._id || plan.id, "meal")}
                  Colors={Colors}
                />
              ))}

            {activeTab === "Training" &&
              plans.map((plan: any, i: number) => (
                <WorkoutPlanCard
                  key={plan._id || plan.id || i}
                  plan={plan}
                  onDelete={() => confirmDelete(plan._id || plan.id, "workout")}
                  Colors={Colors}
                />
              ))}
          </>
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
    paddingBottom: 12,
    paddingTop: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 40,
    alignItems: "flex-start" as const,
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    flex: 1,
    textAlign: "center" as const,
  },
  activePlanBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  activePlanBannerLabel: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  activePlanBannerName: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    flexShrink: 1,
  },
  activePlanBannerDate: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 4,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: Colors.primary + "18",
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
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
    paddingTop: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  newPlanButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.text,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  newPlanButtonText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.background,
  },
  budgetCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 10,
  },
  budgetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  budgetTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  budgetGrid: {
    flexDirection: "row",
    gap: 16,
  },
  budgetItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  budgetItemFull: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  budgetLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  budgetValue: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginLeft: 2,
  },
  activePlansLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginTop: 4,
  },
  wellnessCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  wellnessCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 8,
  },
  wellnessIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  wellnessCardTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  linkedPlansRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  linkedPlanBox: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
  },
  linkedPlanLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  linkedPlanName: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.surfaceElevated,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  linkButtonText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  checkInsButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  checkInsText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  simplePlanCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  simplePlanIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  simplePlanName: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  simplePlanDate: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  emptySubtitle: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    textAlign: "center",
    paddingHorizontal: 32,
  },
});
