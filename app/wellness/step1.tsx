import React, { useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Icon } from "@/components/Icon";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors, ThemeColors } from "@/lib/theme-context";
import { useProfile, useAvailability, ProfileData } from "@/lib/api-hooks";
import { useWellness, LOCATION_PRESETS } from "@/lib/wellness-context";
import CalendarPickerField from "@/components/CalendarPickerField";
import { WizardContextBar } from "@/components/WizardContextBar";
import {
  PRIMARY_GOAL_OPTIONS,
  SECONDARY_FOCUS_OPTIONS,
  VALID_PRIMARY_GOALS,
  normalizePrimaryGoal,
  buildGoalPreviewSentence,
  formatGoalLabel,
} from "@/lib/goal-helpers";

const PLAN_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "both", label: "Meal + Workout" },
  { value: "meal", label: "Meal Only" },
  { value: "workout", label: "Workout Only" },
];

const PACE_OPTIONS: { value: string; label: string; desc: string }[] = [
  { value: "gentle", label: "Gentle", desc: "Small, sustainable changes" },
  { value: "steady", label: "Steady", desc: "Balanced approach" },
  { value: "aggressive", label: "Aggressive", desc: "Pushes harder, faster results" },
];

const SESSION_SNAPS = [20, 30, 45, 60];

function snapToNearest(val: number): number {
  let closest = SESSION_SNAPS[0];
  let minDiff = Math.abs(val - closest);
  for (const s of SESSION_SNAPS) {
    const diff = Math.abs(val - s);
    if (diff < minDiff) {
      minDiff = diff;
      closest = s;
    }
  }
  return closest;
}

import { kgToLbs, formatWeightDisplay } from "@/lib/weight-utils";

function getStepCount(planType: string): number {
  return planType === "both" ? 4 : 3;
}

function ProfileSummaryCard({ profile }: { profile: ProfileData }) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const isImperial = profile.unitSystem === "imperial";
  const weightDisplay =
    profile.weightKg != null
      ? `${formatWeightDisplay(profile.weightKg, isImperial ? "imperial" : "metric")} ${isImperial ? "lbs" : "kg"}`
      : null;

  const items: { label: string; value: string }[] = [];
  if (profile.age != null) items.push({ label: "Age", value: String(profile.age) });
  if (weightDisplay) items.push({ label: "Weight", value: weightDisplay });
  if (profile.primaryGoal) items.push({ label: "Goal", value: formatGoalLabel(normalizePrimaryGoal(profile.primaryGoal)) });
  if (profile.secondaryFocus) items.push({ label: "Focus", value: formatGoalLabel(profile.secondaryFocus) });
  if (profile.trainingExperience) items.push({ label: "Experience", value: profile.trainingExperience.charAt(0).toUpperCase() + profile.trainingExperience.slice(1) });
  if (profile.trainingDaysOfWeek?.length)
    items.push({ label: "Training days", value: profile.trainingDaysOfWeek.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(", ") });
  if (profile.allergiesIntolerances?.length)
    items.push({ label: "Allergies", value: profile.allergiesIntolerances.join(", ") });
  if (profile.foodsToAvoid?.length)
    items.push({ label: "Foods to avoid", value: profile.foodsToAvoid.join(", ") });

  if (items.length === 0) return null;

  return (
    <View style={styles.profileCard}>
      <View style={styles.profileCardHeader}>
        <Text style={styles.profileCardTitle}>Your Profile</Text>
        <Pressable onPress={() => router.push("/(tabs)/profile")}>
          <Text style={styles.profileEditLink}>Edit</Text>
        </Pressable>
      </View>
      <View style={styles.profileCardGrid}>
        {items.map((item) => (
          <View key={item.label} style={styles.profileCardItem}>
            <Text style={styles.profileCardLabel}>{item.label}</Text>
            <Text style={styles.profileCardValue} numberOfLines={2}>
              {item.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function Step1Screen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: availability } = useAvailability();
  const { state, setState, updateMealForm, updateWorkoutForm, prefilled, setPrefilled } = useWellness();

  useEffect(() => {
    if (profile && !prefilled) {
      const updates: any = {};

      const normalized = normalizePrimaryGoal(profile.primaryGoal || "");
      if (normalized && VALID_PRIMARY_GOALS.includes(normalized)) {
        updates.goalType = normalized;
      }
      if (profile.secondaryFocus) {
        updates.secondaryFocus = profile.secondaryFocus;
      }

      const mealUpdates: any = {};
      if (profile.foodsToAvoid?.length) mealUpdates.foodsToAvoid = profile.foodsToAvoid;
      if (profile.allergiesIntolerances?.length) mealUpdates.allergies = profile.allergiesIntolerances.join(", ");
      if (profile.spicePreference) {
        const spiceMap: Record<string, string> = { spicy: "hot", mild: "mild", medium: "medium" };
        if (spiceMap[profile.spicePreference]) mealUpdates.spiceLevel = spiceMap[profile.spicePreference];
      }

      const workoutUpdates: any = {};
      if (profile.trainingExperience) workoutUpdates.experienceLevel = profile.trainingExperience;
      if (profile.trainingDaysOfWeek?.length) {
        workoutUpdates.daysOfWeek = profile.trainingDaysOfWeek.map(
          (d) => d.charAt(0).toUpperCase() + d.slice(1)
        );
      }
      if (profile.sessionDurationMinutes != null) {
        workoutUpdates.sessionLength = snapToNearest(profile.sessionDurationMinutes);
      }
      if (profile.healthConstraints?.length) {
        workoutUpdates.limitations = profile.healthConstraints.join(", ");
      }
      if (profile.workoutLocationDefault) {
        workoutUpdates.location = profile.workoutLocationDefault;
      }
      if (profile.equipmentAvailable?.length) {
        workoutUpdates.equipmentAvailable = profile.equipmentAvailable;
      } else if (profile.workoutLocationDefault && LOCATION_PRESETS[profile.workoutLocationDefault]) {
        workoutUpdates.equipmentAvailable = LOCATION_PRESETS[profile.workoutLocationDefault];
      }

      setState((prev) => ({
        ...prev,
        ...updates,
        mealForm: { ...prev.mealForm, ...mealUpdates },
        workoutForm: { ...prev.workoutForm, ...workoutUpdates },
      }));
      setPrefilled(true);
    }
  }, [profile, prefilled]);

  const todayStr = new Date().toISOString().split("T")[0];
  const isDateInvalid =
    state.startDate.length === 10 && state.startDate < todayStr;

  if (!profileLoading && !profile) {
    return (
      <View style={styles.container}>
        <View
          style={[
            styles.gateContent,
            { paddingTop: insets.top + 16 + webTopInset },
          ]}
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          >
            <Icon name="back" size={24} />
          </Pressable>
          <View style={styles.gateCenter}>
            <Ionicons name="person-circle-outline" size={64} color={Colors.textSecondary} />
            <Text style={styles.gateTitle}>Profile Required</Text>
            <Text style={styles.gateSubtitle}>
              Set up your profile before creating a plan.
            </Text>
            <Pressable
              style={styles.gateButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push("/(tabs)/profile");
              }}
            >
              <Text style={styles.gateButtonText}>Go to Profile</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  const stepCount = getStepCount(state.planType);

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (state.planType === "workout") {
      router.push("/wellness/step3");
    } else {
      router.push("/wellness/step2");
    }
  };

  const previewSentence = buildGoalPreviewSentence(state.goalType, state.secondaryFocus);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 16 + webTopInset,
            paddingBottom: insets.bottom + 120,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          >
            <Icon name="back" size={24} />
          </Pressable>
          <View style={styles.dotsRow}>
            {Array.from({ length: stepCount }).map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === 0 && styles.dotActive]}
              />
            ))}
          </View>
          <View style={{ width: 44 }} />
        </View>

        <Text style={styles.headerTitle}>Wellness Overview</Text>
        <Text style={styles.headerSubtitle}>
          Configure the basics of your plan
        </Text>

        {profile && <ProfileSummaryCard profile={profile} />}

        <Text style={styles.sectionLabel}>Primary Goal</Text>
        <Text style={styles.sectionHelper}>Select your main objective</Text>
        <View style={styles.goalGrid}>
          {PRIMARY_GOAL_OPTIONS.map((g) => {
            const selected = state.goalType === g.value;
            return (
              <Pressable
                key={g.value}
                style={[styles.goalBtn, selected && styles.goalBtnActive]}
                onPress={() => {
                  if (selected) return;
                  Haptics.selectionAsync();
                  setState((prev) => ({ ...prev, goalType: g.value }));
                }}
              >
                <Text
                  style={[
                    styles.goalBtnText,
                    selected && styles.goalBtnTextActive,
                  ]}
                >
                  {g.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Secondary Focus</Text>
        <Text style={styles.sectionHelper}>Optional training emphasis</Text>
        <View style={styles.goalGrid}>
          {SECONDARY_FOCUS_OPTIONS.map((g) => {
            const selected = state.secondaryFocus === g.value;
            return (
              <Pressable
                key={g.value}
                style={[styles.goalBtn, selected && styles.goalBtnActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setState((prev) => ({
                    ...prev,
                    secondaryFocus: prev.secondaryFocus === g.value ? "" : g.value,
                  }));
                }}
              >
                <Text
                  style={[
                    styles.goalBtnText,
                    selected && styles.goalBtnTextActive,
                  ]}
                >
                  {g.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {previewSentence ? (
          <View style={styles.previewCard}>
            <Text style={styles.previewText}>{previewSentence}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>Plan Type</Text>
        <View style={styles.planTypeRow}>
          {PLAN_TYPE_OPTIONS.map((p) => {
            const selected = state.planType === p.value;
            return (
              <Pressable
                key={p.value}
                style={[styles.planTypeBtn, selected && styles.planTypeBtnActive]}
                onPress={() => {
                  if (selected) return;
                  Haptics.selectionAsync();
                  setState((prev) => ({ ...prev, planType: p.value }));
                }}
              >
                <Text
                  style={[
                    styles.planTypeBtnText,
                    selected && styles.planTypeBtnTextActive,
                  ]}
                >
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.startDateSection}>
          <View style={styles.startDateHeader}>
            <Ionicons name="calendar" size={18} color={Colors.primary} />
            <Text style={styles.startDateLabel}>Start Date</Text>
          </View>
          <Text style={styles.startDateHelper}>Required to schedule your plan</Text>
          <CalendarPickerField
            value={state.startDate}
            onChange={(d) => setState((prev) => ({ ...prev, startDate: d }))}
            Colors={Colors}
            conflictDates={availability?.allDates || []}
            planDuration={7}
          />
          {isDateInvalid && (
            <Text style={styles.warningText}>
              Start date cannot be in the past.
            </Text>
          )}
        </View>

        <Text style={styles.sectionLabel}>Pace</Text>
        <View style={styles.paceRow}>
          {PACE_OPTIONS.map((p) => {
            const selected = state.pace === p.value;
            return (
              <Pressable
                key={p.value}
                style={[styles.paceBtn, selected && styles.paceBtnActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setState((prev) => ({
                    ...prev,
                    pace: prev.pace === p.value ? "" : p.value,
                  }));
                }}
              >
                <Text
                  style={[
                    styles.paceBtnLabel,
                    selected && styles.paceBtnLabelActive,
                  ]}
                >
                  {p.label}
                </Text>
                <Text style={styles.paceBtnDesc}>{p.desc}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 16) + (Platform.OS === "web" ? 34 : 0) },
        ]}
      >
        <WizardContextBar step="step1" />
        <Pressable
          style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.85 }]}
          onPress={handleNext}
        >
          <Text style={styles.nextBtnText}>Next</Text>
          <Icon name="arrowForward" size={20} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceTertiary,
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 24,
    borderRadius: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 4,
  },
  sectionHelper: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    marginBottom: 10,
  },
  goalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  goalBtn: {
    width: "48%" as any,
    flexBasis: "47%",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: "transparent",
    alignItems: "center",
  },
  goalBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "18",
  },
  goalBtnText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  goalBtnTextActive: {
    color: Colors.primary,
    fontFamily: "Inter_600SemiBold",
  },
  previewCard: {
    marginTop: 14,
    backgroundColor: Colors.primary + "12",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary + "60",
  },
  previewText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    lineHeight: 18,
  },
  planTypeRow: {
    flexDirection: "row",
    gap: 10,
  },
  planTypeBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: "transparent",
    alignItems: "center",
  },
  planTypeBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "18",
  },
  planTypeBtnText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  planTypeBtnTextActive: {
    color: Colors.primary,
    fontFamily: "Inter_600SemiBold",
  },
  startDateSection: {
    marginTop: 24,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.primary + "40",
  },
  startDateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  startDateLabel: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  startDateHelper: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.primary,
    marginBottom: 12,
  },
  warningText: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.error,
    marginTop: 6,
  },
  paceRow: {
    gap: 10,
  },
  paceBtn: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  paceBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "18",
  },
  paceBtnLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  paceBtnLabelActive: {
    color: Colors.primary,
  },
  paceBtnDesc: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  nextBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  nextBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  gateContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  gateCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  gateTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginTop: 8,
  },
  gateSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  gateButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  gateButtonText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 4,
  },
  profileCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  profileCardTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  profileEditLink: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  profileCardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  profileCardItem: {
    width: "48%" as any,
    flexBasis: "47%",
  },
  profileCardLabel: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    color: Colors.textTertiary,
    marginBottom: 2,
  },
  profileCardValue: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
});
