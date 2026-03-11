import React, { useCallback, useMemo, useState } from "react";
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
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, IconName } from "@/components/Icon";
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
  useUpdateMealPlanSchedule,
  useUpdateWorkoutPlanSchedule,
  useUpdateGoalPlan,
  useConflictDates,
} from "@/lib/api-hooks";
import { Ionicons } from "@expo/vector-icons";
import CalendarPickerField from "@/components/CalendarPickerField";

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

function getTodayUTC(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString().split("T")[0];
}

function computePlanLifecycle(startDate?: string, backendStatus?: string): "active" | "scheduled" | "draft" | "completed" | "generating" | "failed" {
  if (backendStatus === "generating" || backendStatus === "pending") return "generating";
  if (backendStatus === "failed") return "failed";
  if (backendStatus && backendStatus !== "ready") return "generating";
  if (!startDate) return "draft";
  const today = getTodayUTC();
  const start = startDate;
  const endDate = new Date(startDate + "T12:00:00Z");
  endDate.setUTCDate(endDate.getUTCDate() + 6);
  const end = endDate.toISOString().split("T")[0];
  if (today < start) return "scheduled";
  if (today >= start && today <= end) return "active";
  return "completed";
}

function StatusBadge({ startDate, backendStatus, Colors }: { startDate?: string; backendStatus?: string; Colors: ThemeColors }) {
  const lifecycle = computePlanLifecycle(startDate, backendStatus);

  let label: string;
  let bgColor: string;
  let textColor: string;
  let icon: IconName;

  if (lifecycle === "active") {
    label = "Active";
    bgColor = Colors.accent + "20";
    textColor = Colors.accent;
    icon = "sparkles";
  } else if (lifecycle === "scheduled") {
    label = "Scheduled";
    bgColor = Colors.primary + "18";
    textColor = Colors.primary;
    icon = "calendar";
  } else if (lifecycle === "completed") {
    label = "Completed";
    bgColor = "#8E8E9318";
    textColor = "#8E8E93";
    icon = "checkmarkCircle";
  } else if (lifecycle === "generating") {
    label = "Generating";
    bgColor = Colors.primary + "18";
    textColor = Colors.primary;
    icon = "hourglass";
  } else if (lifecycle === "failed") {
    label = "Failed";
    bgColor = Colors.error + "18";
    textColor = Colors.error;
    icon = "alertCircle";
  } else {
    label = "Draft";
    bgColor = Colors.surfaceElevated;
    textColor = Colors.textSecondary;
    icon = "document";
  }

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: bgColor, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
      <Icon name={icon} size={16} color={textColor} />
      <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: textColor }}>
        {label}
      </Text>
    </View>
  );
}

function formatGoalLabel(goal: string): string {
  return goal
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function GoalBadge({ goal, Colors }: { goal: string; Colors: ThemeColors }) {
  return (
    <View style={{ backgroundColor: Colors.text, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
      <Text style={{ fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.background }}>
        {formatGoalLabel(goal)}
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

function WellnessPlanCard({ plan, onDelete, onSchedule, Colors }: { plan: any; onDelete: () => void; onSchedule: (id: string, action: "schedule" | "reschedule" | "unschedule", currentDate?: string) => void; Colors: ThemeColors }) {
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const name = plan.name || plan.title || "Wellness Plan";
  const status = plan.status || plan.generationStatus || "active";
  const startDate = plan.startDate || plan.start_date || plan.planStartDate;
  const endDate = plan.endDate || plan.end_date;
  const goal = plan.goalType || plan.primaryGoal || "";
  const id = plan._id || plan.id;

  return (
    <Pressable
      style={styles.wellnessCard}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/plan/wellness/${id}` as any);
      }}
    >
      <View style={styles.wellnessCardHeader}>
        <View style={styles.wellnessIconCircle}>
          <Icon name="heart" size={20} color={Colors.error} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Text style={styles.wellnessCardTitle} numberOfLines={1}>{name}</Text>
            {goal ? <GoalBadge goal={goal} Colors={Colors} /> : null}
            <StatusBadge startDate={startDate} backendStatus={status} Colors={Colors} />
          </View>
          {startDate && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Icon name="calendar" size={16} color={Colors.textSecondary} />
              <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textSecondary }}>
                {formatDateRange(startDate, endDate)}
              </Text>
            </View>
          )}
        </View>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const options: { text: string; style?: "destructive" | "cancel"; onPress?: () => void }[] = [];
            if (startDate) {
              options.push({ text: "Reschedule", onPress: () => onSchedule(id, "reschedule", startDate) });
              options.push({ text: "Unschedule", style: "destructive" as const, onPress: () => onSchedule(id, "unschedule") });
            } else {
              options.push({ text: "Schedule", onPress: () => onSchedule(id, "schedule") });
            }
            options.push({ text: "Delete", style: "destructive", onPress: onDelete });
            options.push({ text: "Cancel", style: "cancel" });
            Alert.alert("Plan Options", undefined, options);
          }}
          hitSlop={10}
          style={{ padding: 6 }}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textTertiary} />
        </Pressable>
      </View>
      <Icon name="forward" size={20} color={Colors.textTertiary} />
    </Pressable>
  );
}

function MealPlanCard({ plan, onDelete, onSchedule, Colors }: { plan: any; onDelete: () => void; onSchedule: (id: string, action: "schedule" | "reschedule" | "unschedule", currentDate?: string) => void; Colors: ThemeColors }) {
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const name = plan.name || plan.title || "Meal Plan";
  const status = plan.status || plan.generationStatus || "active";
  const startDate = plan.startDate || plan.start_date || plan.planStartDate;
  const endDate = plan.endDate || plan.end_date;
  const id = plan._id || plan.id;

  const handleShowMenu = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const options: { text: string; style?: "destructive" | "cancel"; onPress?: () => void }[] = [];
    if (startDate) {
      options.push({ text: "Reschedule", onPress: () => onSchedule(id, "reschedule", startDate) });
      options.push({
        text: "Unschedule",
        style: "destructive",
        onPress: () => onSchedule(id, "unschedule"),
      });
    } else {
      options.push({ text: "Schedule", onPress: () => onSchedule(id, "schedule") });
    }
    options.push({ text: "Delete", style: "destructive", onPress: onDelete });
    options.push({ text: "Cancel", style: "cancel" });
    Alert.alert("Plan Options", undefined, options);
  };

  return (
    <View style={styles.simplePlanCard}>
      <Pressable
        style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/plan/meal/${id}` as any);
        }}
      >
        <View style={[styles.simplePlanIcon, { backgroundColor: Colors.warning + "20" }]}>
          <Icon name="restaurant" size={20} color={Colors.warning} />
        </View>
        <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Text style={styles.simplePlanName} numberOfLines={2}>{name}</Text>
            <StatusBadge startDate={startDate} backendStatus={status} Colors={Colors} />
          </View>
          {startDate && (
            <Text style={styles.simplePlanDate}>{formatDateRange(startDate, endDate)}</Text>
          )}
        </View>
        <Icon name="forward" size={20} color={Colors.textTertiary} />
      </Pressable>
      <Pressable onPress={handleShowMenu} hitSlop={12} style={{ padding: 6 }}>
        <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textTertiary} />
      </Pressable>
    </View>
  );
}

function WorkoutPlanCard({ plan, onDelete, onSchedule, Colors }: { plan: any; onDelete: () => void; onSchedule: (id: string, action: "schedule" | "reschedule" | "unschedule", currentDate?: string) => void; Colors: ThemeColors }) {
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const name = plan.name || plan.title || "Workout Plan";
  const status = plan.status || plan.generationStatus || "active";
  const startDate = plan.startDate || plan.start_date || plan.planStartDate;
  const endDate = plan.endDate || plan.end_date;
  const planType = plan.planType || plan.type || "";
  const id = plan._id || plan.id;

  const handleShowMenu = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const options: { text: string; style?: "destructive" | "cancel"; onPress?: () => void }[] = [];
    if (startDate) {
      options.push({ text: "Reschedule", onPress: () => onSchedule(id, "reschedule", startDate) });
      options.push({
        text: "Unschedule",
        style: "destructive",
        onPress: () => onSchedule(id, "unschedule"),
      });
    } else {
      options.push({ text: "Schedule", onPress: () => onSchedule(id, "schedule") });
    }
    options.push({ text: "Delete", style: "destructive", onPress: onDelete });
    options.push({ text: "Cancel", style: "cancel" });
    Alert.alert("Plan Options", undefined, options);
  };

  return (
    <View style={styles.simplePlanCard}>
      <Pressable
        style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/plan/workout/${id}` as any);
        }}
      >
        <View style={[styles.simplePlanIcon, { backgroundColor: Colors.accent + "20" }]}>
          <Icon name="barbell" size={20} color={Colors.accent} />
        </View>
        <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Text style={styles.simplePlanName} numberOfLines={2}>{name}</Text>
            <StatusBadge startDate={startDate} backendStatus={status} Colors={Colors} />
          </View>
          {startDate && (
            <Text style={styles.simplePlanDate}>
              {formatDateRange(startDate, endDate)}
              {planType ? `  ${planType.charAt(0).toUpperCase() + planType.slice(1)}` : ""}
            </Text>
          )}
        </View>
        <Icon name="forward" size={20} color={Colors.textTertiary} />
      </Pressable>
      <Pressable onPress={handleShowMenu} hitSlop={12} style={{ padding: 6 }}>
        <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textTertiary} />
      </Pressable>
    </View>
  );
}

function EmptyState({ type, Colors }: { type: string; Colors: ThemeColors }) {
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <View style={styles.emptyState}>
      <Icon name="document" size={28} color={Colors.textTertiary} />
      <Text style={styles.emptyTitle}>No {type} Plans</Text>
      <Text style={styles.emptySubtitle}>Create a new plan to get started.</Text>
    </View>
  );
}

function WellnessPage({ Colors, styles }: { Colors: ThemeColors; styles: any }) {
  const wellnessQuery = useWellnessPlans();
  const deleteGoalPlan = useDeleteGoalPlan();
  const updateGoalPlan = useUpdateGoalPlan();
  const plans = sortPlansByDate(wellnessQuery.data || []);
  const isLoading = wellnessQuery.isLoading;
  const [schedulePicker, setSchedulePicker] = useState<{ visible: boolean; planId: string; initialDate: string; title: string }>({
    visible: false,
    planId: "",
    initialDate: "",
    title: "Schedule Plan",
  });
  const mealConflicts = useConflictDates("meal");
  const workoutConflicts = useConflictDates("workout");
  const wellnessConflictDates = useMemo(() => [...new Set([...mealConflicts, ...workoutConflicts])], [mealConflicts, workoutConflicts]);

  const onRefresh = useCallback(() => {
    wellnessQuery.refetch();
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

  const handleSchedule = (id: string, action: "schedule" | "reschedule" | "unschedule", currentDate?: string) => {
    if (action === "unschedule") {
      Alert.alert("Unschedule Plan", "Remove the start date from this plan?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unschedule",
          style: "destructive",
          onPress: () => {
            updateGoalPlan.mutate({ id, data: { startDate: null } });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]);
      return;
    }
    setSchedulePicker({
      visible: true,
      planId: id,
      initialDate: currentDate || "",
      title: action === "reschedule" ? "Reschedule Plan" : "Schedule Plan",
    });
  };

  const handleConfirmSchedule = (date: string) => {
    if (date && schedulePicker.planId) {
      updateGoalPlan.mutate({ id: schedulePicker.planId, data: { startDate: date } });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setSchedulePicker((p) => ({ ...p, visible: false }));
  };

  return (
    <>
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
        <Text style={styles.pageSubtitle}>Holistic plans for your health journey</Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Pressable style={{ padding: 8 }} onPress={() => {}}>
            <Icon name="swapVertical" size={20} color={Colors.textSecondary} />
          </Pressable>
          <Pressable
            style={styles.newPlanButton}
            onPress={() => {
              Haptics.impactAsync();
              router.push("/(tabs)/create" as any);
            }}
          >
            <Icon name="sparkles" size={16} color={Colors.background} />
            <Text style={styles.newPlanButtonText}>New Wellness Plan</Text>
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
                onSchedule={handleSchedule}
                Colors={Colors}
              />
            ))}
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
        conflictDates={wellnessConflictDates}
      />
    </>
  );
}

function SchedulePickerModal({
  visible,
  onClose,
  onConfirm,
  title,
  initialDate,
  isPending,
  Colors,
  conflictDates,
  planDuration = 7,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (date: string) => void;
  title: string;
  initialDate: string;
  isPending: boolean;
  Colors: ThemeColors;
  conflictDates?: string[];
  planDuration?: number;
}) {
  const [date, setDate] = useState(initialDate);
  React.useEffect(() => { setDate(initialDate); }, [initialDate, visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" }}
        onPress={onClose}
      >
        <Pressable onPress={(e) => e.stopPropagation()} style={{ width: "90%", maxWidth: 340 }}>
          <View style={{ backgroundColor: Colors.surface, borderRadius: 20, padding: 20 }}>
            <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 16, textAlign: "center" }}>
              {title}
            </Text>
            <CalendarPickerField
              value={date}
              onChange={setDate}
              Colors={Colors}
              conflictDates={conflictDates}
              planDuration={planDuration}
            />
            <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
              <Pressable
                onPress={onClose}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.background, alignItems: "center" }}
              >
                <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => onConfirm(date)}
                disabled={!date || isPending}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  backgroundColor: date ? Colors.primary : Colors.surfaceElevated,
                  alignItems: "center",
                  opacity: isPending ? 0.6 : 1,
                }}
              >
                <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: date ? "#fff" : Colors.textTertiary }}>
                  {isPending ? "Saving..." : "Confirm"}
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function NutritionPage({ Colors, styles }: { Colors: ThemeColors; styles: any }) {
  const mealQuery = useMealPlans();
  const wellnessQuery = useWellnessPlans();
  const deleteMealPlan = useDeleteMealPlan();
  const scheduleMutation = useUpdateMealPlanSchedule();
  const wellnessOwnedMealIds = useMemo(() => {
    const ids = new Set<string>();
    (wellnessQuery.data || []).forEach((wp: any) => {
      const mid = wp.mealPlanId || wp.meal_plan_id;
      if (mid) ids.add(mid);
    });
    return ids;
  }, [wellnessQuery.data]);
  const plans = sortPlansByDate((mealQuery.data || []).filter((p: any) => !wellnessOwnedMealIds.has(p._id || p.id)));
  const isLoading = mealQuery.isLoading;
  const [schedulePicker, setSchedulePicker] = useState<{ visible: boolean; planId: string; initialDate: string; title: string }>({
    visible: false,
    planId: "",
    initialDate: "",
    title: "Schedule Plan",
  });
  const mealConflictDates = useConflictDates("meal", schedulePicker.planId || undefined);

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

  const handleSchedule = (id: string, action: "schedule" | "reschedule" | "unschedule", currentDate?: string) => {
    if (action === "unschedule") {
      Alert.alert("Unschedule Plan", "Remove the start date from this plan?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unschedule",
          style: "destructive",
          onPress: () => {
            scheduleMutation.mutate({ id, startDate: null });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]);
      return;
    }
    setSchedulePicker({
      visible: true,
      planId: id,
      initialDate: currentDate || "",
      title: action === "reschedule" ? "Reschedule Plan" : "Schedule Plan",
    });
  };

  const handleConfirmSchedule = (date: string) => {
    if (date && schedulePicker.planId) {
      scheduleMutation.mutate({ id: schedulePicker.planId, startDate: date });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setSchedulePicker((p) => ({ ...p, visible: false }));
  };

  return (
    <>
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
            <Icon name="swapVertical" size={20} color={Colors.textSecondary} />
          </Pressable>
          <Pressable
            style={styles.newPlanButton}
            onPress={() => {
              Haptics.impactAsync();
              router.push("/(tabs)/create" as any);
            }}
          >
            <Icon name="sparkles" size={16} color={Colors.background} />
            <Text style={styles.newPlanButtonText}>New Meal Plan</Text>
          </Pressable>
        </View>

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
                  onSchedule={handleSchedule}
                  Colors={Colors}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
      <SchedulePickerModal
        visible={schedulePicker.visible}
        onClose={() => setSchedulePicker((p) => ({ ...p, visible: false }))}
        onConfirm={handleConfirmSchedule}
        title={schedulePicker.title}
        initialDate={schedulePicker.initialDate}
        isPending={scheduleMutation.isPending}
        Colors={Colors}
        conflictDates={mealConflictDates}
      />
    </>
  );
}

function TrainingPage({ Colors, styles }: { Colors: ThemeColors; styles: any }) {
  const workoutQuery = useWorkoutPlans();
  const wellnessQuery = useWellnessPlans();
  const deleteWorkoutPlan = useDeleteWorkoutPlan();
  const scheduleMutation = useUpdateWorkoutPlanSchedule();
  const wellnessOwnedWorkoutIds = useMemo(() => {
    const ids = new Set<string>();
    (wellnessQuery.data || []).forEach((wp: any) => {
      const wid = wp.workoutPlanId || wp.workout_plan_id;
      if (wid) ids.add(wid);
    });
    return ids;
  }, [wellnessQuery.data]);
  const plans = sortPlansByDate((workoutQuery.data || []).filter((p: any) => !wellnessOwnedWorkoutIds.has(p._id || p.id)));
  const isLoading = workoutQuery.isLoading;
  const [schedulePicker, setSchedulePicker] = useState<{ visible: boolean; planId: string; initialDate: string; title: string }>({
    visible: false,
    planId: "",
    initialDate: "",
    title: "Schedule Plan",
  });
  const workoutConflictDates = useConflictDates("workout", schedulePicker.planId || undefined);

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

  const handleSchedule = (id: string, action: "schedule" | "reschedule" | "unschedule", currentDate?: string) => {
    if (action === "unschedule") {
      Alert.alert("Unschedule Plan", "Remove the start date from this plan?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unschedule",
          style: "destructive",
          onPress: () => {
            scheduleMutation.mutate({ id, startDate: null });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]);
      return;
    }
    setSchedulePicker({
      visible: true,
      planId: id,
      initialDate: currentDate || "",
      title: action === "reschedule" ? "Reschedule Plan" : "Schedule Plan",
    });
  };

  const handleConfirmSchedule = (date: string) => {
    if (date && schedulePicker.planId) {
      scheduleMutation.mutate({ id: schedulePicker.planId, startDate: date });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setSchedulePicker((p) => ({ ...p, visible: false }));
  };

  return (
    <>
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
            <Icon name="swapVertical" size={20} color={Colors.textSecondary} />
          </Pressable>
          <Pressable
            style={styles.newPlanButton}
            onPress={() => {
              Haptics.impactAsync();
              router.push("/(tabs)/create" as any);
            }}
          >
            <Icon name="sparkles" size={16} color={Colors.background} />
            <Text style={styles.newPlanButtonText}>New Workout Plan</Text>
          </Pressable>
        </View>

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
                  onSchedule={handleSchedule}
                  Colors={Colors}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
      <SchedulePickerModal
        visible={schedulePicker.visible}
        onClose={() => setSchedulePicker((p) => ({ ...p, visible: false }))}
        onConfirm={handleConfirmSchedule}
        title={schedulePicker.title}
        initialDate={schedulePicker.initialDate}
        isPending={scheduleMutation.isPending}
        Colors={Colors}
        conflictDates={workoutConflictDates}
      />
    </>
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
          <Icon name="back" size={28} />
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
    backgroundColor: Colors.error + "18",
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
