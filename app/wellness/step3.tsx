import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  TextInput,
} from "react-native";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors, ThemeColors } from "@/lib/theme-context";
import { useProfile } from "@/lib/api-hooks";
import { useWellness, LOCATION_PRESETS } from "@/lib/wellness-context";
import { Pill, PillGrid } from "@/components/Pill";
import { ExpandableEquipmentGroup } from "@/components/ExpandableChipSection";
import { PlanWizardSummaryBar } from "@/components/PlanWizardSummaryBar";
import { WizardContextBar } from "@/components/WizardContextBar";

const LOCATION_OPTIONS: { value: string; label: string }[] = [
  { value: "gym", label: "Gym" },
  { value: "home", label: "Home" },
  { value: "outdoors", label: "Outdoors" },
];

const EQUIPMENT_CATEGORIES: { title: string; items: string[] }[] = [
  {
    title: "Cardio",
    items: ["Treadmill", "Stationary bike", "Spin bike", "Rowing machine", "Elliptical", "Stair climber", "Ski erg", "Assault/air bike", "Jump rope"],
  },
  {
    title: "Free weights",
    items: ["Dumbbells", "Adjustable dumbbells", "Barbells", "EZ bar", "Kettlebells", "Weight plates", "Bench (flat)", "Bench (adjustable)"],
  },
  {
    title: "Racks & accessories",
    items: ["Squat rack", "Power rack", "Smith machine", "Pull-up bar", "Dip station", "Resistance bands", "Cable attachments"],
  },
  {
    title: "Machines",
    items: ["Cable machine / functional trainer", "Leg press", "Hack squat", "Leg extension", "Leg curl", "Lat pulldown", "Seated row", "Chest press machine", "Pec deck", "Shoulder press machine", "Calf raise machine", "Hip thrust machine", "Glute bridge machine", "Ab machine"],
  },
  {
    title: "Home / bodyweight / mobility",
    items: ["Yoga mat", "Foam roller", "Medicine ball", "Slam ball", "Stability ball", "TRX / suspension trainer", "Plyo box", "Step platform"],
  },
  {
    title: "Outdoors",
    items: ["Track access", "Hills/stairs", "Field", "Pool access"],
  },
];

const TRAINING_MODE_OPTIONS: { value: string; label: string }[] = [
  { value: "strength", label: "Strength" },
  { value: "cardio", label: "Cardio" },
  { value: "both", label: "Both" },
];

const EXPERIENCE_OPTIONS: { value: string; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const FOCUS_AREAS_BY_MODE: Record<string, string[]> = {
  strength: ["Full Body", "Upper Body", "Lower Body", "Core", "Back", "Chest", "Arms", "Shoulders", "Glutes", "Legs"],
  cardio: ["Full Body", "Core", "Endurance", "Conditioning", "Mobility", "Lower Body"],
  both: ["Full Body", "Upper Body", "Lower Body", "Core", "Back", "Chest", "Arms", "Shoulders", "Glutes", "Legs", "Flexibility", "Endurance", "Conditioning", "Mobility"],
};

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const SESSION_LENGTH_OPTIONS: { value: number; label: string }[] = [
  { value: 20, label: "20 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "60 min" },
];

function getStepCount(planType: string): number {
  return planType === "both" ? 4 : 3;
}

function getCurrentDotIndex(planType: string): number {
  return planType === "both" ? 2 : 1;
}


export default function Step3Screen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const { data: profile } = useProfile();
  const { state, updateWorkoutForm } = useWellness();
  const { workoutForm } = state;

  const stepCount = getStepCount(state.planType);
  const currentDot = getCurrentDotIndex(state.planType);

  const handleLocationChange = (value: string) => {
    Haptics.selectionAsync();
    if (workoutForm.location === value) {
      // Second click on active location: revert to profile's saved default
      const savedLocation = profile?.workoutLocationDefault ?? "";
      const savedEquipment: string[] = (profile?.equipmentAvailable as string[]) ?? [];
      const fallbackEquipment = savedLocation ? (LOCATION_PRESETS[savedLocation] ?? []) : [];
      updateWorkoutForm({
        location: savedLocation,
        equipmentAvailable: savedEquipment.length > 0 ? savedEquipment : fallbackEquipment,
      });
    } else {
      // Different location: resolve equipment preset
      // Use profile's saved equipment if their saved default matches this location
      const profileLocation = profile?.workoutLocationDefault ?? "";
      const profileEquipment: string[] = (profile?.equipmentAvailable as string[]) ?? [];
      const equipment =
        profileLocation === value && profileEquipment.length > 0
          ? profileEquipment
          : (LOCATION_PRESETS[value] ?? []);
      updateWorkoutForm({ location: value, equipmentAvailable: equipment });
    }
  };

  const handleEquipmentToggle = (item: string) => {
    Haptics.selectionAsync();
    const current = workoutForm.equipmentAvailable;
    if (current.includes(item)) {
      updateWorkoutForm({ equipmentAvailable: current.filter((e) => e !== item) });
    } else {
      updateWorkoutForm({ equipmentAvailable: [...current, item] });
    }
  };

  const handleTrainingModeChange = (mode: string) => {
    if (workoutForm.trainingMode === mode) return; // required segmented control — always has a selection
    Haptics.selectionAsync();
    const validAreas = FOCUS_AREAS_BY_MODE[mode] ?? FOCUS_AREAS_BY_MODE.both;
    const filtered = workoutForm.focusAreas.filter((a) => validAreas.includes(a));
    updateWorkoutForm({
      trainingMode: mode,
      focusAreas: filtered.length > 0 ? filtered : ["Full Body"],
    });
  };

  const handleFocusAreaToggle = (area: string) => {
    Haptics.selectionAsync();
    const current = workoutForm.focusAreas;
    if (current.includes(area)) {
      const next = current.filter((a) => a !== area);
      updateWorkoutForm({ focusAreas: next.length === 0 ? ["Full Body"] : next });
    } else {
      updateWorkoutForm({ focusAreas: [...current, area] });
    }
  };

  const handleDayToggle = (day: string) => {
    Haptics.selectionAsync();
    const current = workoutForm.daysOfWeek;
    if (current.includes(day)) {
      updateWorkoutForm({ daysOfWeek: current.filter((d) => d !== day) });
    } else {
      updateWorkoutForm({ daysOfWeek: [...current, day] });
    }
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/wellness/step4");
  };

  const availableFocusAreas = FOCUS_AREAS_BY_MODE[workoutForm.trainingMode] ?? FOCUS_AREAS_BY_MODE.both;

  return (
    <View style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 16 + webTopInset,
            paddingBottom: insets.bottom + 180,
          },
        ]}
        showsVerticalScrollIndicator={false}
        bottomOffset={60}
        keyboardDismissMode="interactive"
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
                style={[styles.dot, i === currentDot && styles.dotActive]}
              />
            ))}
          </View>
          <View style={{ width: 44 }} />
        </View>

        <Text style={styles.headerTitle}>Training Setup</Text>
        <Text style={styles.headerSubtitle}>
          Configure your workout preferences
        </Text>

        {profile && <PlanWizardSummaryBar profile={profile} />}

        <Text style={styles.sectionLabel}>Workout Location</Text>
        <View style={styles.toggleRow}>
          {LOCATION_OPTIONS.map((opt) => {
            const selected = workoutForm.location === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.toggleBtn, selected && styles.toggleBtnActive]}
                onPress={() => handleLocationChange(opt.value)}
              >
                <Text style={[styles.toggleBtnText, selected && styles.toggleBtnTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Equipment Available</Text>
        {EQUIPMENT_CATEGORIES.map((cat) => (
          <ExpandableEquipmentGroup
            key={cat.title}
            title={cat.title}
            items={cat.items}
            selectedItems={workoutForm.equipmentAvailable}
            onToggle={handleEquipmentToggle}
            initialVisibleCount={4}
          />
        ))}

        <Text style={styles.sectionLabel}>Training Mode</Text>
        <View style={styles.toggleRow}>
          {TRAINING_MODE_OPTIONS.map((opt) => {
            const selected = workoutForm.trainingMode === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.toggleBtn, selected && styles.toggleBtnActive]}
                onPress={() => handleTrainingModeChange(opt.value)}
              >
                <Text style={[styles.toggleBtnText, selected && styles.toggleBtnTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Experience Level</Text>
        <View style={styles.toggleRow}>
          {EXPERIENCE_OPTIONS.map((opt) => {
            const selected = workoutForm.experienceLevel === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.toggleBtn, selected && styles.toggleBtnActive]}
                onPress={() => {
                  if (workoutForm.experienceLevel === opt.value) return;
                  Haptics.selectionAsync();
                  updateWorkoutForm({ experienceLevel: opt.value });
                }}
              >
                <Text style={[styles.toggleBtnText, selected && styles.toggleBtnTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Focus Areas</Text>
        <PillGrid>
          {availableFocusAreas.map((area) => (
            <Pill
              key={area}
              label={area}
              selected={workoutForm.focusAreas.includes(area)}
              onPress={() => handleFocusAreaToggle(area)}
            />
          ))}
        </PillGrid>

        <Text style={styles.sectionLabel}>Workout Days</Text>
        <View style={styles.daysRow}>
          {DAYS_OF_WEEK.map((day) => {
            const selected = workoutForm.daysOfWeek.includes(day);
            return (
              <Pressable
                key={day}
                style={[styles.dayBtn, selected && styles.dayBtnActive]}
                onPress={() => handleDayToggle(day)}
              >
                <Text style={[styles.dayBtnText, selected && styles.dayBtnTextActive]}>
                  {day}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Session Length</Text>
        <View style={styles.toggleRow}>
          {SESSION_LENGTH_OPTIONS.map((opt) => {
            const selected = workoutForm.sessionLength === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.toggleBtn, selected && styles.toggleBtnActive]}
                onPress={() => {
                  if (workoutForm.sessionLength === opt.value) return;
                  Haptics.selectionAsync();
                  updateWorkoutForm({ sessionLength: opt.value });
                }}
              >
                <Text style={[styles.toggleBtnText, selected && styles.toggleBtnTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Limitations</Text>
        <TextInput
          style={styles.textInput}
          value={workoutForm.limitations}
          onChangeText={(t) => updateWorkoutForm({ limitations: t })}
          placeholder="e.g. bad knees, lower back pain, recovering from shoulder surgery..."
          placeholderTextColor={Colors.textTertiary}
          multiline={false}
        />

        <Text style={styles.sectionLabel}>Workout Notes</Text>
        <TextInput
          style={[styles.textInput, { minHeight: 70 }]}
          value={workoutForm.workoutNotes}
          onChangeText={(t) => updateWorkoutForm({ workoutNotes: t })}
          placeholder="Any additional workout preferences or context for the AI..."
          placeholderTextColor={Colors.textTertiary}
          multiline
        />
      </KeyboardAwareScrollViewCompat>

      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 16) + (Platform.OS === "web" ? 34 : 0) },
        ]}
      >
        <WizardContextBar step="step3" />
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
    marginBottom: 10,
  },
  toggleRow: {
    flexDirection: "row",
    gap: 10,
  },
  toggleBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: "transparent",
    alignItems: "center",
  },
  toggleBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "18",
  },
  toggleBtnText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  toggleBtnTextActive: {
    color: Colors.primary,
    fontFamily: "Inter_600SemiBold",
  },
  daysRow: {
    flexDirection: "row",
    gap: 6,
  },
  dayBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: "transparent",
    alignItems: "center",
  },
  dayBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "18",
  },
  dayBtnText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  dayBtnTextActive: {
    color: Colors.primary,
    fontFamily: "Inter_600SemiBold",
  },
  textInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
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
});
