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
import { useMealPlan, useGroceryList, useAllowance, useUpdateMealPlanSchedule, useDeleteMealPlan, useConflictDates } from "@/lib/api-hooks";
import CalendarPickerField from "@/components/CalendarPickerField";
import MealPlanContent from "@/components/MealPlanContent";

const WEB_TOP_INSET = 67;

export default function MealPlanDetailScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? WEB_TOP_INSET : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: plan, isLoading, refetch } = useMealPlan(id ?? null);
  const { refetch: refetchGrocery } = useGroceryList(id ?? null);
  const { refetch: refetchAllowance } = useAllowance();
  const scheduleMutation = useUpdateMealPlanSchedule();
  const deleteMutation = useDeleteMealPlan();
  const mealConflictDates = useConflictDates("meal", id ?? undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [pendingScheduleDate, setPendingScheduleDate] = useState("");

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchGrocery(), refetchAllowance()]);
    setRefreshing(false);
  }, [refetch, refetchGrocery, refetchAllowance]);

  const planJson = plan?.planJson ?? plan;
  const days = planJson?.days ?? [];
  const startDate = plan?.startDate || plan?.planStartDate || planJson?.startDate || planJson?.planStartDate;
  const planId = plan?._id || plan?.id || id;

  const handleShowMenu = () => {
    const options: { text: string; style?: "destructive" | "cancel"; onPress?: () => void }[] = [];
    if (startDate) {
      options.push({
        text: "Reschedule",
        onPress: () => {
          setPendingScheduleDate(startDate);
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
                scheduleMutation.mutate({ id: planId, startDate: null });
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
              deleteMutation.mutate(planId, {
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
      scheduleMutation.mutate({ id: planId, startDate: date });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setShowSchedulePicker(false);
  };

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Icon name="back" size={28} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>Meal Plan</Text>
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
                  {startDate ? "Reschedule Plan" : "Schedule Plan"}
                </Text>
                <CalendarPickerField
                  value={pendingScheduleDate}
                  onChange={(date) => {
                    setPendingScheduleDate(date);
                  }}
                  Colors={Colors}
                  conflictDates={mealConflictDates}
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        <MealPlanContent planId={id ?? ""} />
      </ScrollView>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerBar: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
    flex: 1,
    textAlign: "center" as const,
    marginHorizontal: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
});
