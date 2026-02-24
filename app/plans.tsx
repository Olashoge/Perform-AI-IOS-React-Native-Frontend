import React, { useCallback, useMemo } from "react";
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
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors, ThemeColors } from "@/lib/theme-context";
import {
  useWellnessPlans,
  useMealPlans,
  useWorkoutPlans,
  useDeleteGoalPlan,
  useDeleteMealPlan,
  useDeleteWorkoutPlan,
  useBudget,
} from "@/lib/api-hooks";

const WEB_TOP_INSET = 67;

function formatDateRange(start: string | undefined, end: string | undefined): string {
  if (!start) return "";
  try {
    const fmtShort = (s: string) => {
      const d = new Date(s + "T12:00:00Z");
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    };
    const fmt = (s: string) => {
      const d = new Date(s + "T12:00:00Z");
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
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

function sortPlansByDate(plans: any[]): any[] {
  return [...plans].sort((a, b) => {
    const dateA = a.startDate || a.start_date || a.planStartDate || "";
    const dateB = b.startDate || b.start_date || b.planStartDate || "";
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    return dateA.localeCompare(dateB);
  });
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
  const linkedMeal = mealPlans.find((mp: any) => mp.id === plan.mealPlanId);
  const linkedWorkout = workoutPlans.find((wp: any) => wp.id === plan.workoutPlanId);
  const mealPlanName = linkedMeal?.name || plan.mealPlan?.name || plan.mealPlanName || "";
  const workoutPlanName = linkedWorkout?.name || plan.workoutPlan?.name || plan.workoutPlanName || "";
  const id = plan._id || plan.id;

  return (
    <View style={styles.wellnessCard}>
      <View style={styles.wellnessCardHeader}>
        <View style={styles.wellnessIconCircle}>
          <Ionicons name="heart" size={20} color="#FF6B6B" />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Text style={styles.wellnessCardTitle} numberOfLines={1}>{name}</Text>
            {goal ? <GoalBadge goal={goal} Colors={Colors} /> : null}
            <StatusBadge status={status} Colors={Colors} />
          </View>
          {startDate && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="calendar-outline" size={11} color={Colors.textSecondary} />
              <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textSecondary }}>
                {formatDateRange(startDate, endDate)}
              </Text>
            </View>
          )}
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

      <View style={styles.linkedPlansSection}>
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <Text style={styles.simplePlanName} numberOfLines={2}>{name}</Text>
          <StatusBadge status={status} Colors={Colors} />
        </View>
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <Text style={styles.simplePlanName} numberOfLines={2}>{name}</Text>
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

function WellnessPage({ Colors, styles }: { Colors: ThemeColors; styles: any }) {
  const wellnessQuery = useWellnessPlans();
  const mealQuery = useMealPlans();
  const workoutQuery = useWorkoutPlans();
  const deleteGoalPlan = useDeleteGoalPlan();
  const plans = sortPlansByDate(wellnessQuery.data || []);
  const isLoading = wellnessQuery.isLoading;

  const onRefresh = useCallback(() => {
    wellnessQuery.refetch();
    mealQuery.refetch();
    workoutQuery.refetch();
  }, []);

  const confirmDelete = (id: string) => {
    Alert.alert("Delete Plan", "Are you sure you want to delete this plan?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          deleteGoalPlan.mutate(id);
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={wellnessQuery.isFetching && !wellnessQuery.isLoading}
          onRefresh={onRefresh}
          tintColor={Colors.primary}
        />
      }
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
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
          <Ionicons name="add" size={14} color="#fff" />
          <Text style={styles.newPlanButtonText}>New</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : plans.length === 0 ? (
        <EmptyState type="Wellness" Colors={Colors} />
      ) : (
        <View style={{ gap: 14 }}>
          {plans.map((plan: any, i: number) => (
            <WellnessPlanCard
              key={plan._id || plan.id || i}
              plan={plan}
              onDelete={() => confirmDelete(plan._id || plan.id)}
              Colors={Colors}
              mealPlans={mealQuery.data || []}
              workoutPlans={workoutQuery.data || []}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function NutritionPage({ Colors, styles }: { Colors: ThemeColors; styles: any }) {
  const mealQuery = useMealPlans();
  const deleteMealPlan = useDeleteMealPlan();
  const plans = sortPlansByDate(mealQuery.data || []);
  const isLoading = mealQuery.isLoading;

  const confirmDelete = (id: string) => {
    Alert.alert("Delete Plan", "Are you sure you want to delete this plan?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          deleteMealPlan.mutate(id);
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={mealQuery.isFetching && !mealQuery.isLoading}
          onRefresh={() => mealQuery.refetch()}
          tintColor={Colors.primary}
        />
      }
    >
      <Text style={styles.pageSubtitle}>Meal plans aligned with your goal</Text>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
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
          <Ionicons name="sparkles" size={14} color="#fff" />
          <Text style={styles.newPlanButtonText}>New Meal Plan</Text>
        </Pressable>
      </View>

      <BudgetCard Colors={Colors} />

      {isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : plans.length === 0 ? (
        <EmptyState type="Meal" Colors={Colors} />
      ) : (
        <>
          <Text style={styles.activePlansLabel}>ACTIVE PLANS</Text>
          <View style={{ gap: 10 }}>
            {plans.map((plan: any, i: number) => (
              <MealPlanCard
                key={plan._id || plan.id || i}
                plan={plan}
                onDelete={() => confirmDelete(plan._id || plan.id)}
                Colors={Colors}
              />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function TrainingPage({ Colors, styles }: { Colors: ThemeColors; styles: any }) {
  const workoutQuery = useWorkoutPlans();
  const deleteWorkoutPlan = useDeleteWorkoutPlan();
  const plans = sortPlansByDate(workoutQuery.data || []);
  const isLoading = workoutQuery.isLoading;

  const confirmDelete = (id: string) => {
    Alert.alert("Delete Plan", "Are you sure you want to delete this plan?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          deleteWorkoutPlan.mutate(id);
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={workoutQuery.isFetching && !workoutQuery.isLoading}
          onRefresh={() => workoutQuery.refetch()}
          tintColor={Colors.primary}
        />
      }
    >
      <Text style={styles.pageSubtitle}>Workout plans for progressive results</Text>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
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
          <Ionicons name="sparkles" size={14} color="#fff" />
          <Text style={styles.newPlanButtonText}>New Workout Plan</Text>
        </Pressable>
      </View>

      <BudgetCard Colors={Colors} />

      {isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : plans.length === 0 ? (
        <EmptyState type="Workout" Colors={Colors} />
      ) : (
        <>
          <Text style={styles.activePlansLabel}>ACTIVE PLANS</Text>
          <View style={{ gap: 10 }}>
            {plans.map((plan: any, i: number) => (
              <WorkoutPlanCard
                key={plan._id || plan.id || i}
                plan={plan}
                onDelete={() => confirmDelete(plan._id || plan.id)}
                Colors={Colors}
              />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

export default function PlansScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? WEB_TOP_INSET : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const params = useLocalSearchParams<{ tab?: string }>();

  const tab = params.tab || "wellness";

  const headerTitles: Record<string, string> = {
    wellness: "Wellness Plans",
    meals: "Nutrition",
    workouts: "Training",
  };

  return (
    <View style={[styles.container, { paddingTop: topInset, paddingBottom: bottomInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{headerTitles[tab] || "Plans"}</Text>
        <View style={{ width: 40 }} />
      </View>

      {tab === "wellness" && <WellnessPage Colors={Colors} styles={styles} />}
      {tab === "meals" && <NutritionPage Colors={Colors} styles={styles} />}
      {tab === "workouts" && <TrainingPage Colors={Colors} styles={styles} />}
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 12,
  },
  pageHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  pageTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  pageSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 4,
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
    marginTop: 8,
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
    marginBottom: 12,
  },
  wellnessIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FF6B6B18",
    alignItems: "center",
    justifyContent: "center",
  },
  wellnessCardTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    flexShrink: 1,
  },
  linkedPlansSection: {
    gap: 10,
    marginBottom: 12,
  },
  linkedPlanBox: {
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
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.primary,
    lineHeight: 18,
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
    flexShrink: 1,
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
