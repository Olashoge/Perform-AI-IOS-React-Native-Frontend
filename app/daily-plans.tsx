import React, { useState, useMemo, useCallback } from "react";
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
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import { useColors, ThemeColors } from "@/lib/theme-context";
import { Icon } from "@/components/Icon";
import { Ionicons } from "@expo/vector-icons";
import CalendarPickerField from "@/components/CalendarPickerField";
import {
  useDailyMealsSummary,
  useDailyWorkoutsSummary,
  useDeleteDailyMeal,
  useDeleteDailyWorkout,
  useRescheduleDailyMeal,
  useRescheduleDailyWorkout,
  DailyMealSummary,
  DailyWorkoutSummary,
} from "@/lib/api-hooks";

type FilterTab = "all" | "meals" | "workouts";

type DailyPlanItem =
  | (DailyMealSummary & { type: "meal" })
  | (DailyWorkoutSummary & { type: "workout" });

const WEB_TOP_INSET = 67;

function formatDisplayDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T12:00:00Z");
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return dateStr;
  }
}

function getTodayUTC(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    .toISOString()
    .split("T")[0];
}

function getItemStatus(item: DailyPlanItem): "today" | "upcoming" | "past" | "generating" | "failed" {
  const s = item.status?.toLowerCase() ?? "";
  if (s === "generating" || s === "pending") return "generating";
  if (s === "failed") return "failed";
  const today = getTodayUTC();
  if (item.date === today) return "today";
  if (item.date > today) return "upcoming";
  return "past";
}

function StatusBadge({ item, Colors }: { item: DailyPlanItem; Colors: ThemeColors }) {
  const status = getItemStatus(item);
  let label: string;
  let bgColor: string;
  let textColor: string;

  switch (status) {
    case "today":
      label = "Today";
      bgColor = Colors.accent + "20";
      textColor = Colors.accent;
      break;
    case "upcoming":
      label = "Upcoming";
      bgColor = Colors.primary + "18";
      textColor = Colors.primary;
      break;
    case "generating":
      label = "Generating";
      bgColor = Colors.primary + "18";
      textColor = Colors.primary;
      break;
    case "failed":
      label = "Failed";
      bgColor = Colors.error + "18";
      textColor = Colors.error;
      break;
    default:
      label = "Done";
      bgColor = Colors.surfaceElevated;
      textColor = Colors.textSecondary;
  }

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: bgColor, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 }}>
      <Text style={{ fontSize: 9, fontFamily: "Inter_600SemiBold", color: textColor, letterSpacing: 0.2 }}>
        {label}
      </Text>
    </View>
  );
}

function TypeChip({ type, Colors }: { type: "meal" | "workout"; Colors: ThemeColors }) {
  const isMeal = type === "meal";
  const color = isMeal ? Colors.warning : Colors.primary;
  const label = isMeal ? "Meal" : "Workout";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: color + "15", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 }}>
      <Icon name={isMeal ? "restaurant" : "fitness"} size={11} color={color} />
      <Text style={{ fontSize: 9, fontFamily: "Inter_700Bold", color, letterSpacing: 0.3 }}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

function DailyPlanCard({
  item,
  onDelete,
  onReschedule,
  onRegenerate,
  Colors,
}: {
  item: DailyPlanItem;
  onDelete: () => void;
  onReschedule: (currentDate: string) => void;
  onRegenerate: () => void;
  Colors: ThemeColors;
}) {
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const title =
    item.title ||
    item.name ||
    (item.type === "meal" ? "Daily Meal" : "Daily Workout");

  const handleOptions = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(title, formatDisplayDate(item.date), [
      {
        text: "View Day",
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push({ pathname: "/daily/[date]", params: { date: item.date } });
        },
      },
      {
        text: "Reschedule",
        onPress: () => onReschedule(item.date),
      },
      {
        text: "Regenerate",
        onPress: onRegenerate,
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: onDelete,
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: "/daily/[date]", params: { date: item.date } });
      }}
    >
      <View style={styles.cardLeft}>
        <View style={[styles.cardIconCircle, { backgroundColor: (item.type === "meal" ? Colors.warning : Colors.primary) + "15" }]}>
          <Icon
            name={item.type === "meal" ? "restaurant" : "fitness"}
            size={18}
            color={item.type === "meal" ? Colors.warning : Colors.primary}
          />
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <TypeChip type={item.type} Colors={Colors} />
          <StatusBadge item={item} Colors={Colors} />
          {item.type === "meal" && (item as DailyMealSummary).mealsPerDay ? (
            <View style={{ backgroundColor: Colors.surfaceElevated, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 }}>
              <Text style={{ fontSize: 9, fontFamily: "Inter_500Medium", color: Colors.textSecondary }}>
                {(item as DailyMealSummary).mealsPerDay}×
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
          <Icon name="calendar" size={12} color={Colors.textTertiary} />
          <Text style={styles.cardDate}>{formatDisplayDate(item.date)}</Text>
        </View>
      </View>

      <Pressable
        onPress={(e) => { e.stopPropagation(); handleOptions(); }}
        hitSlop={10}
        style={styles.cardOptions}
      >
        <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textTertiary} />
      </Pressable>
    </Pressable>
  );
}

function EmptyState({ filter, Colors }: { filter: FilterTab; Colors: ThemeColors }) {
  const label =
    filter === "meals" ? "Daily Meals" : filter === "workouts" ? "Daily Workouts" : "Daily Plans";
  const sub =
    filter === "meals"
      ? "Create a Daily Meal to get started."
      : filter === "workouts"
      ? "Create a Daily Workout to get started."
      : "Create a Daily Meal or Workout to get started.";

  return (
    <View style={{ alignItems: "center", paddingTop: 64, gap: 10, paddingHorizontal: 32 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.surface, justifyContent: "center", alignItems: "center", marginBottom: 4 }}>
        <Icon name="calendar" size={26} color={Colors.textTertiary} />
      </View>
      <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary }}>
        No {label}
      </Text>
      <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textTertiary, textAlign: "center", lineHeight: 18 }}>
        {sub}
      </Text>
    </View>
  );
}

function RescheduleDateModal({
  visible,
  onClose,
  onConfirm,
  initialDate,
  isPending,
  Colors,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (newDate: string) => void;
  initialDate: string;
  isPending: boolean;
  Colors: ThemeColors;
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
              Reschedule
            </Text>
            <CalendarPickerField
              value={date}
              onChange={setDate}
              Colors={Colors}
              planDuration={1}
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

export default function DailyPlansScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const topInset = Platform.OS === "web" ? WEB_TOP_INSET : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const [filter, setFilter] = useState<FilterTab>("all");
  const [reschedule, setReschedule] = useState<{ visible: boolean; date: string; type: "meal" | "workout" }>({
    visible: false,
    date: "",
    type: "meal",
  });
  const [refreshing, setRefreshing] = useState(false);

  const mealsQuery = useDailyMealsSummary();
  const workoutsQuery = useDailyWorkoutsSummary();
  const deleteMeal = useDeleteDailyMeal();
  const deleteWorkout = useDeleteDailyWorkout();
  const rescheduleMeal = useRescheduleDailyMeal();
  const rescheduleWorkout = useRescheduleDailyWorkout();

  const isLoading = mealsQuery.isLoading || workoutsQuery.isLoading;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      mealsQuery.refetch(),
      workoutsQuery.refetch(),
    ]);
    setRefreshing(false);
  }, [mealsQuery, workoutsQuery]);

  const allItems = useMemo((): DailyPlanItem[] => {
    const meals: DailyPlanItem[] = (mealsQuery.data ?? []).map((m) => ({ ...m, type: "meal" as const }));
    const workouts: DailyPlanItem[] = (workoutsQuery.data ?? []).map((w) => ({ ...w, type: "workout" as const }));
    const combined = [...meals, ...workouts];
    combined.sort((a, b) => b.date.localeCompare(a.date));
    return combined;
  }, [mealsQuery.data, workoutsQuery.data]);

  const filteredItems = useMemo((): DailyPlanItem[] => {
    if (filter === "meals") return allItems.filter((i) => i.type === "meal");
    if (filter === "workouts") return allItems.filter((i) => i.type === "workout");
    return allItems;
  }, [allItems, filter]);

  const confirmDelete = useCallback((item: DailyPlanItem) => {
    Alert.alert(
      `Delete Daily ${item.type === "meal" ? "Meal" : "Workout"}`,
      `Remove the plan for ${formatDisplayDate(item.date)}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            if (item.type === "meal") {
              deleteMeal.mutate(item.date);
            } else {
              deleteWorkout.mutate(item.date);
            }
          },
        },
      ]
    );
  }, [deleteMeal, deleteWorkout]);

  const openReschedule = useCallback((date: string, type: "meal" | "workout") => {
    setReschedule({ visible: true, date, type });
  }, []);

  const handleRescheduleConfirm = useCallback(async (newDate: string) => {
    if (!newDate || !reschedule.date) return;
    try {
      if (reschedule.type === "meal") {
        await rescheduleMeal.mutateAsync({ date: reschedule.date, newDate });
      } else {
        await rescheduleWorkout.mutateAsync({ date: reschedule.date, newDate });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setReschedule((p) => ({ ...p, visible: false }));
    } catch (err: any) {
      const status = err?.response?.status;
      const msg =
        status === 409
          ? `A ${reschedule.type === "meal" ? "meal" : "workout"} already exists for that date. Choose a different date.`
          : err?.response?.data?.error || err?.message || "Failed to reschedule. Please try again.";
      Alert.alert("Reschedule Failed", msg);
    }
  }, [reschedule, rescheduleMeal, rescheduleWorkout]);

  const handleRegenerate = useCallback((item: DailyPlanItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const pathname = item.type === "meal" ? "/daily-meal-form" : "/daily-workout-form";
    router.push({ pathname, params: { date: item.date } } as any);
  }, []);

  const reschedulePending = rescheduleMeal.isPending || rescheduleWorkout.isPending;

  const FILTER_TABS: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "meals", label: "Meals" },
    { key: "workouts", label: "Workouts" },
  ];

  return (
    <View style={[styles.container, { paddingTop: topInset, paddingBottom: bottomInset }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Icon name="back" size={28} />
        </Pressable>
        <Text style={styles.headerTitle}>Daily Plans</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {FILTER_TABS.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.filterTab, filter === tab.key && styles.filterTabActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFilter(tab.key);
            }}
          >
            <Text style={[styles.filterTabText, filter === tab.key && styles.filterTabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        >
          {filteredItems.length === 0 ? (
            <EmptyState filter={filter} Colors={Colors} />
          ) : (
            filteredItems.map((item) => (
              <DailyPlanCard
                key={`${item.type}-${item.date}`}
                item={item}
                onDelete={() => confirmDelete(item)}
                onReschedule={(date) => openReschedule(date, item.type)}
                onRegenerate={() => handleRegenerate(item)}
                Colors={Colors}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* Reschedule date picker */}
      <RescheduleDateModal
        visible={reschedule.visible}
        onClose={() => setReschedule((p) => ({ ...p, visible: false }))}
        onConfirm={handleRescheduleConfirm}
        initialDate={reschedule.date}
        isPending={reschedulePending}
        Colors={Colors}
      />
    </View>
  );
}

const createStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
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
      alignItems: "flex-start",
    },
    headerTitle: {
      fontSize: 15,
      fontFamily: "Inter_700Bold",
      color: Colors.text,
      flex: 1,
      textAlign: "center",
    },
    filterRow: {
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
      backgroundColor: Colors.background,
    },
    filterTab: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: Colors.surface,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    filterTabActive: {
      backgroundColor: Colors.primary,
      borderColor: Colors.primary,
    },
    filterTabText: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: Colors.textSecondary,
    },
    filterTabTextActive: {
      color: "#fff",
      fontFamily: "Inter_600SemiBold",
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    listContent: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 40,
      gap: 10,
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: Colors.border,
      padding: 14,
      gap: 12,
    },
    cardLeft: {
      alignItems: "center",
    },
    cardIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
    },
    cardBody: {
      flex: 1,
      gap: 4,
    },
    cardTopRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      flexWrap: "wrap",
    },
    cardTitle: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: Colors.text,
    },
    cardDate: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      color: Colors.textTertiary,
    },
    cardOptions: {
      padding: 4,
    },
  });
