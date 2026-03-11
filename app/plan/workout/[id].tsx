import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Platform,
  RefreshControl,
  Alert,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Icon } from "@/components/Icon";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors, ThemeColors } from "@/lib/theme-context";
import { useWorkoutPlan, useUpdateWorkoutPlanSchedule, useDeleteWorkoutPlan, useConflictDates } from "@/lib/api-hooks";
import { WorkoutPlanContent } from "@/components/WorkoutPlanContent";
import CalendarPickerField from "@/components/CalendarPickerField";

const WEB_TOP_INSET = 67;

export default function WorkoutPlanDetailScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? WEB_TOP_INSET : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, error, refetch } = useWorkoutPlan(id ?? null);
  const scheduleMutation = useUpdateWorkoutPlanSchedule();
  const deletePlanMutation = useDeleteWorkoutPlan();
  const workoutConflictDates = useConflictDates("workout", id ?? undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [pendingScheduleDate, setPendingScheduleDate] = useState("");

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const plan = data?.planJson ?? data;
  const days = plan?.days ?? [];
  const workoutStartDate = data?.planStartDate || data?.startDate || plan?.startDate || plan?.planStartDate;
  const workoutPlanId = data?._id || data?.id || id;

  const handleShowMenu = () => {
    const options: { text: string; style?: "destructive" | "cancel"; onPress?: () => void }[] = [];
    if (workoutStartDate) {
      options.push({
        text: "Reschedule",
        onPress: () => {
          setPendingScheduleDate(workoutStartDate);
          setShowSchedulePicker(true);
        },
      });
      options.push({
        text: "Unschedule",
        style: "destructive",
        onPress: () => {
          Alert.alert("Unschedule Plan", "Remove the start date from this plan?", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Unschedule",
              style: "destructive",
              onPress: () => {
                scheduleMutation.mutate({ id: workoutPlanId, startDate: null });
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              },
            },
          ]);
        },
      });
    } else {
      options.push({
        text: "Schedule",
        onPress: () => {
          setPendingScheduleDate("");
          setShowSchedulePicker(true);
        },
      });
    }
    options.push({
      text: "Delete Plan",
      style: "destructive",
      onPress: () => {
        Alert.alert("Delete Plan", "Are you sure you want to delete this plan? This cannot be undone.", [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              deletePlanMutation.mutate(workoutPlanId, {
                onSuccess: () => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  router.back();
                },
              });
            },
          },
        ]);
      },
    });
    options.push({ text: "Cancel", style: "cancel" });

    Alert.alert(
      "Plan Options",
      undefined,
      options.map((o) => ({ text: o.text, style: o.style, onPress: o.onPress }))
    );
  };

  const handleScheduleDateSelect = (date: string) => {
    if (date) {
      scheduleMutation.mutate({ id: workoutPlanId, startDate: date });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setShowSchedulePicker(false);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <Header />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.error} />
          <Text style={styles.loadingText}>Loading workout plan...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <Header />
        <View style={styles.centerContent}>
          <Icon name="alertCircle" size={28} color={Colors.error} />
          <Text style={styles.errorText}>Failed to load plan</Text>
          <Pressable style={styles.retryButton} onPress={() => refetch()}>
            <Icon name="refresh" size={20} color={Colors.text} />
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (data?.status === "generating") {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <Header />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.error} />
          <Text style={styles.loadingText}>Plan is still generating...</Text>
          <Text style={styles.loadingSubtext}>Check back in a moment</Text>
          <Pressable style={styles.retryButton} onPress={() => refetch()}>
            <Icon name="refresh" size={20} color={Colors.text} />
            <Text style={styles.retryText}>Refresh</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Icon name="back" size={28} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Workout Plan</Text>
        <Pressable onPress={handleShowMenu} hitSlop={12}>
          <Ionicons name="ellipsis-horizontal" size={24} color={Colors.text} />
        </Pressable>
      </View>

      {showSchedulePicker && (
        <Modal visible={showSchedulePicker} transparent animationType="fade" onRequestClose={() => setShowSchedulePicker(false)}>
          <Pressable
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" }}
            onPress={() => setShowSchedulePicker(false)}
          >
            <Pressable onPress={(e) => e.stopPropagation()} style={{ width: "90%", maxWidth: 340 }}>
              <View style={{ backgroundColor: Colors.surface, borderRadius: 20, padding: 20 }}>
                <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 16, textAlign: "center" }}>
                  {workoutStartDate ? "Reschedule Plan" : "Schedule Plan"}
                </Text>
                <CalendarPickerField
                  value={pendingScheduleDate}
                  onChange={(date) => {
                    setPendingScheduleDate(date);
                  }}
                  Colors={Colors}
                  conflictDates={workoutConflictDates}
                  planDuration={days.length || 7}
                />
                <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
                  <Pressable
                    onPress={() => setShowSchedulePicker(false)}
                    style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.background, alignItems: "center" }}
                  >
                    <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary }}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleScheduleDateSelect(pendingScheduleDate)}
                    disabled={!pendingScheduleDate || scheduleMutation.isPending}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 10,
                      backgroundColor: pendingScheduleDate ? Colors.primary : Colors.surfaceElevated,
                      alignItems: "center",
                      opacity: scheduleMutation.isPending ? 0.6 : 1,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: pendingScheduleDate ? "#fff" : Colors.textTertiary }}>
                      {scheduleMutation.isPending ? "Saving..." : "Confirm"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: bottomInset + 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.error}
          />
        }
      >
        <WorkoutPlanContent planId={id!} />
      </ScrollView>
    </View>
  );
}

function Header() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <View style={styles.header}>
      <Pressable onPress={() => router.back()} hitSlop={12}>
        <Icon name="back" size={28} color={Colors.text} />
      </Pressable>
      <Text style={styles.headerTitle}>Workout Plan</Text>
      <View style={{ width: 28 }} />
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
  headerTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
    textAlign: "center",
  },
  loadingSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  errorText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
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
});
