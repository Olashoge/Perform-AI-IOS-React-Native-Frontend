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
  Modal,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Icon } from "@/components/Icon";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors, ThemeColors } from "@/lib/theme-context";
import { useGoalPlan, useUpdateGoalPlan, useDeleteGoalPlan, useConflictDates } from "@/lib/api-hooks";
import MealPlanContent from "@/components/MealPlanContent";
import { WorkoutPlanContent } from "@/components/WorkoutPlanContent";
import CalendarPickerField from "@/components/CalendarPickerField";

const WEB_TOP_INSET = 67;

type TabId = "overview" | "meals" | "workouts";

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

function StatusChip({ status, Colors }: { status: string; Colors: ThemeColors }) {
  const color =
    status === "ready" || status === "active"
      ? Colors.accent
      : status === "generating" || status === "pending"
        ? Colors.warning
        : status === "completed"
          ? Colors.textSecondary
          : Colors.textTertiary;
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: color + "18", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color }}>{label}</Text>
    </View>
  );
}

function GoalChip({ goal, Colors }: { goal: string; Colors: ThemeColors }) {
  const label = goal.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <View style={{ backgroundColor: Colors.primary + "15", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
      <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.primary }}>{label}</Text>
    </View>
  );
}

function TabBar({ activeTab, onTabChange, showMeals, showWorkouts, Colors }: { activeTab: TabId; onTabChange: (tab: TabId) => void; showMeals: boolean; showWorkouts: boolean; Colors: ThemeColors }) {
  const tabs: { id: TabId; label: string; icon: import("@/components/Icon").IconName }[] = [
    { id: "overview", label: "Overview", icon: "document" },
  ];
  if (showMeals) tabs.push({ id: "meals", label: "Meals", icon: "restaurant" });
  if (showWorkouts) tabs.push({ id: "workouts", label: "Workouts", icon: "barbell" });

  return (
    <View style={{ flexDirection: "row", marginHorizontal: 16, backgroundColor: Colors.surface, borderRadius: 12, padding: 3, borderWidth: 1, borderColor: Colors.border }}>
      {tabs.map((tab) => (
        <Pressable
          key={tab.id}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onTabChange(tab.id);
          }}
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            paddingVertical: 10,
            borderRadius: 10,
            backgroundColor: activeTab === tab.id ? Colors.primary : "transparent",
          }}
        >
          <Icon name={tab.icon} size={16} color={activeTab === tab.id ? "#fff" : Colors.textSecondary} />
          <Text style={{
            fontSize: 12,
            fontFamily: activeTab === tab.id ? "Inter_600SemiBold" : "Inter_500Medium",
            color: activeTab === tab.id ? "#fff" : Colors.textSecondary,
          }}>
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function OverviewTab({ plan, Colors }: { plan: any; Colors: ThemeColors }) {
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const status = plan.status || plan.generationStatus || "active";
  const planName = plan.name || plan.title || "Wellness Plan";
  const primaryGoal = plan.goalType || plan.primaryGoal || plan.primary_goal;
  const startDate = plan.startDate || plan.start_date;
  const endDate = plan.endDate || plan.end_date;
  const planType = plan.planType || plan.plan_type || "both";
  const pace = plan.pace;
  const showMeals = planType === "meal" || planType === "both";
  const showWorkouts = planType === "workout" || planType === "both";

  const mealPlan = plan.mealPlan;
  const workoutPlan = plan.workoutPlan;
  const mealJson = mealPlan?.planJson ?? mealPlan;
  const workoutJson = workoutPlan?.planJson ?? workoutPlan;
  const mealDays = mealJson?.days ?? [];
  const workoutDays = workoutJson?.days ?? [];
  const totalDays = workoutDays.length || mealDays.length || 7;
  const workoutDayCount = workoutDays.filter((d: any) => d.isWorkoutDay).length;
  const restDayCount = workoutDays.length > 0 ? totalDays - workoutDayCount : 0;

  const nutritionNotes = mealJson?.nutritionNotes;
  const macroTargets = nutritionNotes?.dailyMacroTargetsRange;

  const workoutSessions = workoutDays.filter((d: any) => d.isWorkoutDay && d.session);
  const modes = [...new Set(workoutSessions.map((d: any) => (d.session.mode || d.session.type || "").toLowerCase()).filter(Boolean))];
  const durations = workoutSessions.map((d: any) => d.session.durationMinutes || d.session.estimatedDuration || 0).filter((d: number) => d > 0);
  const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length) : 0;

  return (
    <View style={styles.overviewContainer}>
      <View style={styles.identityCard}>
        <View style={styles.identityHeader}>
          <View style={[styles.identityIcon, { backgroundColor: Colors.primary + "12" }]}>
            <Icon name="sparkles" size={24} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.identityTitle}>{planName}</Text>
            <View style={styles.chipRow}>
              <StatusChip status={status} Colors={Colors} />
              {primaryGoal && <GoalChip goal={primaryGoal} Colors={Colors} />}
            </View>
          </View>
        </View>
        <View style={styles.identityDivider} />
        <View style={styles.identityMeta}>
          <View style={styles.metaRow}>
            <Icon name="layers" size={16} color={Colors.textSecondary} />
            <Text style={styles.metaText}>
              {planType === "both" ? "Meal & Workout" : planType === "meal" ? "Meal Only" : "Workout Only"}
            </Text>
          </View>
          {(startDate || endDate) && (
            <View style={styles.metaRow}>
              <Icon name="calendar" size={16} color={Colors.textSecondary} />
              <Text style={styles.metaText}>
                {formatDate(startDate)}{endDate ? ` – ${formatDate(endDate)}` : ""}
              </Text>
            </View>
          )}
          {pace && (
            <View style={styles.metaRow}>
              <Icon name="speedometer" size={16} color={Colors.textSecondary} />
              <Text style={styles.metaText}>{pace.charAt(0).toUpperCase() + pace.slice(1)} pace</Text>
            </View>
          )}
        </View>
      </View>

      {(workoutDays.length > 0 || mealDays.length > 0) && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Weekly Structure</Text>
          <View style={styles.structureStats}>
            <View style={styles.structureStat}>
              <Text style={styles.structureValue}>{totalDays}</Text>
              <Text style={styles.structureLabel}>Total Days</Text>
            </View>
            {workoutDays.length > 0 && (
              <>
                <View style={styles.structureDividerV} />
                <View style={styles.structureStat}>
                  <Text style={[styles.structureValue, { color: Colors.accent }]}>{workoutDayCount}</Text>
                  <Text style={styles.structureLabel}>Workout</Text>
                </View>
                <View style={styles.structureDividerV} />
                <View style={styles.structureStat}>
                  <Text style={[styles.structureValue, { color: Colors.textSecondary }]}>{restDayCount}</Text>
                  <Text style={styles.structureLabel}>Rest</Text>
                </View>
              </>
            )}
          </View>
          {workoutDays.length > 0 && (
            <View style={styles.dayStrip}>
              {workoutDays.map((d: any, i: number) => (
                <View
                  key={i}
                  style={[
                    styles.dayDot,
                    { backgroundColor: d.isWorkoutDay ? Colors.accent : Colors.border },
                  ]}
                >
                  <Text style={[styles.dayDotText, { color: d.isWorkoutDay ? "#fff" : Colors.textTertiary }]}>
                    {i + 1}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {macroTargets && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Icon name="restaurant" size={20} color={Colors.warning} />
            <Text style={styles.sectionTitle}>Daily Nutrition Targets</Text>
          </View>
          <View style={styles.nutrientGrid}>
            {macroTargets.calories && (
              <View style={[styles.nutrientItem, { backgroundColor: Colors.warning + "10" }]}>
                <Icon name="flame" size={16} color={Colors.warning} />
                <Text style={styles.nutrientValue}>{macroTargets.calories}</Text>
                <Text style={styles.nutrientLabel}>Calories</Text>
              </View>
            )}
            {macroTargets.protein_g && (
              <View style={[styles.nutrientItem, { backgroundColor: Colors.accent + "10" }]}>
                <Text style={[styles.nutrientValue, { color: Colors.accent }]}>{macroTargets.protein_g}g</Text>
                <Text style={styles.nutrientLabel}>Protein</Text>
              </View>
            )}
            {macroTargets.carbs_g && (
              <View style={[styles.nutrientItem, { backgroundColor: Colors.primary + "10" }]}>
                <Text style={[styles.nutrientValue, { color: Colors.primary }]}>{macroTargets.carbs_g}g</Text>
                <Text style={styles.nutrientLabel}>Carbs</Text>
              </View>
            )}
            {macroTargets.fat_g && (
              <View style={[styles.nutrientItem, { backgroundColor: Colors.error + "10" }]}>
                <Text style={[styles.nutrientValue, { color: Colors.error }]}>{macroTargets.fat_g}g</Text>
                <Text style={styles.nutrientLabel}>Fat</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {workoutSessions.length > 0 && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Icon name="barbell" size={20} color={Colors.error} />
            <Text style={styles.sectionTitle}>Training Summary</Text>
          </View>
          <View style={styles.trainingDetails}>
            <View style={styles.trainingRow}>
              <Text style={styles.trainingLabel}>Frequency</Text>
              <Text style={styles.trainingValue}>{workoutDayCount}x per week</Text>
            </View>
            {modes.length > 0 && (
              <View style={styles.trainingRow}>
                <Text style={styles.trainingLabel}>Focus</Text>
                <Text style={styles.trainingValue}>{modes.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(", ")}</Text>
              </View>
            )}
            {avgDuration > 0 && (
              <View style={styles.trainingRow}>
                <Text style={styles.trainingLabel}>Avg. Duration</Text>
                <Text style={styles.trainingValue}>{avgDuration} min</Text>
              </View>
            )}
          </View>
        </View>
      )}

      <View style={styles.guidanceCard}>
        <Icon name="navigate" size={20} color={Colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.guidanceTitle}>Ready to explore</Text>
          <Text style={styles.guidanceText}>
            {showMeals && showWorkouts
              ? "Switch to the Meals or Workouts tab to dive into your plan details."
              : showMeals
                ? "Switch to the Meals tab to view your daily nutrition plan."
                : "Switch to the Workouts tab to view your training schedule."}
          </Text>
        </View>
      </View>
    </View>
  );
}

function SchedulePickerModal({
  visible, onClose, onConfirm, title, initialDate, isPending, Colors, conflictDates, planDuration = 7,
}: {
  visible: boolean; onClose: () => void; onConfirm: (date: string) => void; title: string; initialDate: string; isPending: boolean; Colors: ThemeColors; conflictDates?: string[]; planDuration?: number;
}) {
  const [date, setDate] = useState(initialDate);
  React.useEffect(() => { setDate(initialDate); }, [initialDate, visible]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" }} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()} style={{ width: "90%", maxWidth: 340 }}>
          <View style={{ backgroundColor: Colors.surface, borderRadius: 20, padding: 20 }}>
            <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 16, textAlign: "center" }}>{title}</Text>
            <CalendarPickerField value={date} onChange={setDate} Colors={Colors} conflictDates={conflictDates} planDuration={planDuration} />
            <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
              <Pressable onPress={onClose} style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.background, alignItems: "center" }}>
                <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => onConfirm(date)}
                disabled={!date || isPending}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: date ? Colors.primary : Colors.surfaceElevated, alignItems: "center", opacity: isPending ? 0.6 : 1 }}
              >
                <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: date ? "#fff" : Colors.textTertiary }}>{isPending ? "Saving..." : "Confirm"}</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
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
  const updateGoalPlan = useUpdateGoalPlan();
  const deleteGoalPlan = useDeleteGoalPlan();
  const conflictDates = useConflictDates();

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [schedulePicker, setSchedulePicker] = useState({ visible: false, initialDate: "", title: "Schedule Plan" });

  const planType = plan?.planType || plan?.plan_type || "both";
  const showMeals = planType === "meal" || planType === "both";
  const showWorkouts = planType === "workout" || planType === "both";
  const mealPlanId = plan?.mealPlanId || plan?.meal_plan_id;
  const workoutPlanId = plan?.workoutPlanId || plan?.workout_plan_id;
  const startDate = plan?.startDate || plan?.start_date || plan?.planStartDate;
  const isGenerating = plan && (plan.status === "generating" || plan.status === "pending");

  const handleMenu = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const planId = plan?._id || plan?.id || id;
    const options: { text: string; style?: "destructive" | "cancel"; onPress?: () => void }[] = [];
    if (startDate) {
      options.push({ text: "Reschedule", onPress: () => setSchedulePicker({ visible: true, initialDate: startDate, title: "Reschedule Plan" }) });
      options.push({
        text: "Unschedule", style: "destructive",
        onPress: () => Alert.alert("Unschedule Plan", "Remove the start date from this plan?", [
          { text: "Cancel", style: "cancel" },
          { text: "Unschedule", style: "destructive", onPress: () => { updateGoalPlan.mutate({ id: planId, data: { startDate: null } }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } },
        ]),
      });
    } else {
      options.push({ text: "Schedule", onPress: () => setSchedulePicker({ visible: true, initialDate: "", title: "Schedule Plan" }) });
    }
    options.push({
      text: "Delete", style: "destructive",
      onPress: () => Alert.alert("Delete Plan", "Are you sure you want to delete this plan?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => { deleteGoalPlan.mutate(planId); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); router.back(); } },
      ]),
    });
    options.push({ text: "Cancel", style: "cancel" });
    Alert.alert("Plan Options", undefined, options);
  }, [plan, startDate, id]);

  const handleConfirmSchedule = useCallback((date: string) => {
    const planId = plan?._id || plan?.id || id;
    if (date && planId) {
      updateGoalPlan.mutate({ id: planId, data: { startDate: date } });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setSchedulePicker((p) => ({ ...p, visible: false }));
  }, [plan, id]);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Icon name="back" size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Wellness Plan</Text>
          <View style={{ width: 40 }} />
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
            <Icon name="back" size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Wellness Plan</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <Icon name="alertCircle" size={28} color={Colors.error} />
          <Text style={styles.errorText}>Failed to load plan</Text>
          <Pressable style={styles.retryButton} onPress={() => refetch()}>
            <Icon name="refresh" size={20} color={Colors.text} />
            <Text style={styles.retryLabel}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const planName = plan.name || plan.title || "Wellness Plan";

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Icon name="back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{planName}</Text>
        <Pressable style={styles.menuButton} onPress={handleMenu}>
          <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textSecondary} />
        </Pressable>
      </View>

      {isGenerating && (
        <View style={styles.generatingBanner}>
          <ActivityIndicator size="small" color={Colors.warning} />
          <Text style={styles.generatingText}>Plan is still generating...</Text>
        </View>
      )}

      <TabBar activeTab={activeTab} onTabChange={setActiveTab} showMeals={showMeals} showWorkouts={showWorkouts} Colors={Colors} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={Colors.textSecondary} />}
      >
        {activeTab === "overview" && <OverviewTab plan={plan} Colors={Colors} />}
        {activeTab === "meals" && mealPlanId && (
          <MealPlanContent planId={mealPlanId} planData={plan?.mealPlan} hideTitle hideGroceryTab={false} />
        )}
        {activeTab === "meals" && !mealPlanId && (
          <View style={styles.emptyTab}>
            <Icon name="restaurant" size={28} color={Colors.textTertiary} />
            <Text style={styles.emptyTabText}>No meal plan available</Text>
          </View>
        )}
        {activeTab === "workouts" && workoutPlanId && (
          <WorkoutPlanContent planId={workoutPlanId} planData={plan?.workoutPlan} />
        )}
        {activeTab === "workouts" && !workoutPlanId && (
          <View style={styles.emptyTab}>
            <Icon name="barbell" size={28} color={Colors.textTertiary} />
            <Text style={styles.emptyTabText}>No workout plan available</Text>
          </View>
        )}
      </ScrollView>

      <SchedulePickerModal
        visible={schedulePicker.visible}
        onClose={() => setSchedulePicker((p) => ({ ...p, visible: false }))}
        onConfirm={handleConfirmSchedule}
        title={schedulePicker.title}
        initialDate={schedulePicker.initialDate}
        isPending={updateGoalPlan.isPending}
        Colors={Colors}
        conflictDates={conflictDates}
      />
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
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
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    flex: 1,
    textAlign: "center" as const,
  },
  menuButton: {
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
    fontFamily: "Inter_400Regular",
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
  retryLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
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
    marginHorizontal: 16,
    marginTop: 8,
  },
  generatingText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.warning,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  overviewContainer: {
    gap: 14,
  },
  identityCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  identityHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  identityIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  identityTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  identityDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginTop: 14,
    marginBottom: 12,
  },
  identityMeta: {
    gap: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  structureStats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 12,
  },
  structureStat: {
    flex: 1,
    alignItems: "center",
  },
  structureValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  structureLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  structureDividerV: {
    width: StyleSheet.hairlineWidth,
    height: 32,
    backgroundColor: Colors.border,
  },
  dayStrip: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dayDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  dayDotText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  nutrientGrid: {
    flexDirection: "row",
    gap: 8,
  },
  nutrientItem: {
    flex: 1,
    alignItems: "center",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 4,
  },
  nutrientValue: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  nutrientLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  trainingDetails: {
    gap: 10,
  },
  trainingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  trainingLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  trainingValue: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  guidanceCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: Colors.primary + "08",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.primary + "18",
  },
  guidanceTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
    marginBottom: 4,
  },
  guidanceText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  emptyTab: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyTabText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
});
