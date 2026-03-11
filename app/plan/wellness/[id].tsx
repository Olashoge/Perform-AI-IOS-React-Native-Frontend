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

  const mealPlan = plan.mealPlan;
  const workoutPlan = plan.workoutPlan;

  return (
    <View style={styles.overviewContainer}>
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={[styles.heroIcon, { backgroundColor: Colors.primary + "15" }]}>
            <Icon name="sparkles" size={28} color={Colors.primary} />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.heroTitle}>{planName}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              <StatusChip status={status} Colors={Colors} />
              {primaryGoal && <GoalChip goal={primaryGoal} Colors={Colors} />}
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoGrid}>
          {(startDate || endDate) && (
            <View style={styles.infoItem}>
              <Icon name="calendar" size={16} color={Colors.textSecondary} />
              <Text style={styles.infoLabel}>Schedule</Text>
              <Text style={styles.infoValue}>
                {formatDate(startDate)}{endDate ? ` – ${formatDate(endDate)}` : ""}
              </Text>
            </View>
          )}
          <View style={styles.infoItem}>
            <Icon name="layers" size={16} color={Colors.textSecondary} />
            <Text style={styles.infoLabel}>Type</Text>
            <Text style={styles.infoValue}>
              {planType === "both" ? "Meal & Workout" : planType === "meal" ? "Meal Only" : "Workout Only"}
            </Text>
          </View>
          {pace && (
            <View style={styles.infoItem}>
              <Icon name="speedometer" size={16} color={Colors.textSecondary} />
              <Text style={styles.infoLabel}>Pace</Text>
              <Text style={styles.infoValue}>{pace.charAt(0).toUpperCase() + pace.slice(1)}</Text>
            </View>
          )}
        </View>
      </View>

      {mealPlan && (
        <View style={styles.summaryCard}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Icon name="restaurant" size={20} color={Colors.accent} />
            <Text style={styles.summaryTitle}>Nutrition Summary</Text>
          </View>
          {mealPlan.name && (
            <Text style={styles.summaryDetail}>{mealPlan.name}</Text>
          )}
          <Text style={styles.summarySubtext}>
            {mealPlan.status === "ready" ? "Ready to view in Meals tab" : `Status: ${mealPlan.status || "—"}`}
          </Text>
        </View>
      )}

      {workoutPlan && (
        <View style={styles.summaryCard}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Icon name="barbell" size={20} color={Colors.error} />
            <Text style={styles.summaryTitle}>Training Summary</Text>
          </View>
          {workoutPlan.name && (
            <Text style={styles.summaryDetail}>{workoutPlan.name}</Text>
          )}
          <Text style={styles.summarySubtext}>
            {workoutPlan.status === "ready" ? "Ready to view in Workouts tab" : `Status: ${workoutPlan.status || "—"}`}
          </Text>
        </View>
      )}
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
  const mealConflicts = useConflictDates("meal");
  const workoutConflicts = useConflictDates("workout");
  const conflictDates = useMemo(() => [...new Set([...mealConflicts, ...workoutConflicts])], [mealConflicts, workoutConflicts]);

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
          <MealPlanContent planId={mealPlanId} hideTitle hideBudget={false} hideGroceryTab={false} />
        )}
        {activeTab === "meals" && !mealPlanId && (
          <View style={styles.emptyTab}>
            <Icon name="restaurant" size={28} color={Colors.textTertiary} />
            <Text style={styles.emptyTabText}>No meal plan available</Text>
          </View>
        )}
        {activeTab === "workouts" && workoutPlanId && (
          <WorkoutPlanContent planId={workoutPlanId} />
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
    gap: 16,
  },
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  infoGrid: {
    gap: 10,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    width: 65,
  },
  infoValue: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    flex: 1,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  summaryDetail: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    marginBottom: 4,
  },
  summarySubtext: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
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
