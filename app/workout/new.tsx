import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Icon } from "@/components/Icon";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Crypto from "expo-crypto";
import { useColors, ThemeColors } from "@/lib/theme-context";
import {
  useProfile,
  useAvailability,
  useCreateWorkoutPlan,
  ProfileData,
} from "@/lib/api-hooks";
import CalendarPickerField from "@/components/CalendarPickerField";
import { Pill, PillGrid } from "@/components/Pill";

const WEB_TOP_INSET = 67;

const GOAL_OPTIONS = [
  { value: "weight_loss", label: "Weight Loss" },
  { value: "muscle_gain", label: "Muscle Gain" },
  { value: "performance", label: "Performance" },
  { value: "maintenance", label: "General Fitness" },
];

const LOCATION_OPTIONS = [
  { value: "gym", label: "Gym" },
  { value: "home", label: "Home" },
  { value: "outdoors", label: "Outdoors" },
];

const TRAINING_MODE_OPTIONS = [
  { value: "strength", label: "Strength" },
  { value: "cardio", label: "Cardio" },
  { value: "both", label: "Both" },
];

const EXPERIENCE_OPTIONS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const FOCUS_AREAS = [
  "Full Body", "Upper Body", "Lower Body", "Core", "Back", "Chest",
  "Arms", "Shoulders", "Glutes", "Legs", "Flexibility", "Endurance",
];

const SESSION_LENGTH_OPTIONS = [
  { value: 20, label: "20 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "60 min" },
  { value: 90, label: "90 min" },
];

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const EQUIPMENT_CATEGORIES = [
  { title: "Cardio", items: ["Treadmill", "Stationary bike", "Spin bike", "Rowing machine", "Elliptical", "Stair climber", "Jump rope"] },
  { title: "Free weights", items: ["Dumbbells", "Adjustable dumbbells", "Barbells", "EZ bar", "Kettlebells", "Weight plates", "Bench (flat)", "Bench (adjustable)"] },
  { title: "Racks & accessories", items: ["Squat rack", "Power rack", "Smith machine", "Pull-up bar", "Dip station", "Resistance bands", "Cable attachments"] },
  { title: "Machines", items: ["Cable machine / functional trainer", "Leg press", "Leg extension", "Leg curl", "Lat pulldown", "Seated row", "Chest press machine", "Pec deck", "Shoulder press machine"] },
  { title: "Home / mobility", items: ["Yoga mat", "Foam roller", "Medicine ball", "Stability ball", "TRX / suspension trainer", "Plyo box"] },
];

const LOCATION_PRESETS: Record<string, string[]> = {
  gym: [
    "Treadmill", "Stationary bike", "Rowing machine", "Elliptical",
    "Dumbbells", "Barbells", "EZ bar", "Kettlebells", "Weight plates",
    "Bench (flat)", "Bench (adjustable)", "Squat rack", "Power rack",
    "Smith machine", "Pull-up bar", "Dip station", "Resistance bands",
    "Cable attachments", "Cable machine / functional trainer",
    "Leg press", "Leg extension", "Leg curl", "Lat pulldown",
    "Seated row", "Chest press machine", "Pec deck",
    "Shoulder press machine", "Yoga mat", "Foam roller",
  ],
  home: ["Dumbbells", "Resistance bands", "Yoga mat", "Foam roller", "Jump rope", "Kettlebells", "Pull-up bar"],
  outdoors: ["Jump rope"],
};

function mapGoalForWorkout(goal: string): string {
  if (["general_fitness", "energy", "mobility"].includes(goal)) return "maintenance";
  if (goal === "endurance") return "performance";
  if (goal === "strength") return "muscle_gain";
  return goal;
}

function formatLabel(value: string): string {
  return value.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462);
}

function wouldOverlap(startDate: string, conflictDates: string[]): boolean {
  const conflicts = new Set(conflictDates);
  const start = new Date(startDate + "T12:00:00Z");
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    if (conflicts.has(d.toISOString().split("T")[0])) return true;
  }
  return false;
}


function snapToNearest(val: number): number {
  const snaps = [20, 30, 45, 60, 90];
  let closest = snaps[0];
  let minDiff = Math.abs(val - closest);
  for (const s of snaps) {
    const diff = Math.abs(val - s);
    if (diff < minDiff) { minDiff = diff; closest = s; }
  }
  return closest;
}

function ProfileSummaryCard({ profile }: { profile: ProfileData }) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const isImperial = profile.unitSystem === "imperial";
  const weightDisplay = profile.weightKg != null
    ? isImperial ? `${kgToLbs(profile.weightKg)} lbs` : `${profile.weightKg} kg`
    : null;

  const items: { label: string; value: string }[] = [];
  if (profile.age != null) items.push({ label: "Age", value: String(profile.age) });
  if (weightDisplay) items.push({ label: "Weight", value: weightDisplay });
  if (profile.primaryGoal) items.push({ label: "Goal", value: formatLabel(profile.primaryGoal) });
  if (profile.trainingExperience) items.push({ label: "Experience", value: formatLabel(profile.trainingExperience) });
  if (profile.trainingDaysOfWeek?.length)
    items.push({ label: "Training days", value: profile.trainingDaysOfWeek.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(", ") });
  if (profile.healthConstraints?.length)
    items.push({ label: "Health constraints", value: profile.healthConstraints.join(", ") });

  if (items.length === 0) return null;

  return (
    <View style={styles.profileCard}>
      <View style={styles.profileCardHeader}>
        <Text style={styles.profileCardTitle}>Using your profile</Text>
        <Pressable onPress={() => router.push("/(tabs)/profile")}>
          <Text style={styles.profileEditLink}>Edit Profile</Text>
        </Pressable>
      </View>
      <View style={styles.profileCardGrid}>
        {items.map((item) => (
          <View key={item.label} style={styles.profileCardItem}>
            <Text style={styles.profileCardLabel}>{item.label}</Text>
            <Text style={styles.profileCardValue} numberOfLines={2}>{item.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function NewWorkoutPlanScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? WEB_TOP_INSET : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: availability } = useAvailability();
  const workoutConflictDates = availability?.workoutDates || [];
  const createWorkout = useCreateWorkoutPlan();
  const prefilled = useRef(false);

  const [goal, setGoal] = useState("weight_loss");
  const [location, setLocation] = useState("gym");
  const [trainingMode, setTrainingMode] = useState("both");
  const [experienceLevel, setExperienceLevel] = useState("intermediate");
  const [focusAreas, setFocusAreas] = useState<string[]>(["Full Body"]);
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>(["Mon", "Wed", "Fri"]);
  const [sessionLength, setSessionLength] = useState(45);
  const [limitations, setLimitations] = useState("");
  const [equipmentAvailable, setEquipmentAvailable] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [showEquipment, setShowEquipment] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile && !prefilled.current) {
      prefilled.current = true;
      if (profile.primaryGoal) setGoal(mapGoalForWorkout(profile.primaryGoal));
      if (profile.trainingExperience) setExperienceLevel(profile.trainingExperience);
      if (profile.trainingDaysOfWeek?.length) {
        setDaysOfWeek(profile.trainingDaysOfWeek.map((d) => d.charAt(0).toUpperCase() + d.slice(1).toLowerCase()));
      }
      if (profile.sessionDurationMinutes) setSessionLength(snapToNearest(profile.sessionDurationMinutes));
      if (profile.healthConstraints?.length) setLimitations(profile.healthConstraints.join(", "));
      if (profile.workoutLocationDefault) {
        setLocation(profile.workoutLocationDefault);
        const preset = LOCATION_PRESETS[profile.workoutLocationDefault] || [];
        if (profile.equipmentAvailable?.length) {
          setEquipmentAvailable([...profile.equipmentAvailable]);
        } else {
          setEquipmentAvailable([...preset]);
        }
      } else if (profile.equipmentAvailable?.length) {
        setEquipmentAvailable([...profile.equipmentAvailable]);
      }
    }
  }, [profile]);

  useEffect(() => {
    if (prefilled.current) {
      const preset = LOCATION_PRESETS[location] || [];
      setEquipmentAvailable([...preset]);
    }
  }, [location]);

  if (profileLoading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { paddingTop: topInset + 20 }]}>
        <View style={styles.profileRequired}>
          <Icon name="personCircle" size={28} color={Colors.textSecondary} />
          <Text style={styles.profileRequiredTitle}>Profile Required</Text>
          <Text style={styles.profileRequiredText}>
            Set up your profile first so we can personalize your workout plan.
          </Text>
          <Pressable
            style={styles.profileRequiredButton}
            onPress={() => router.push("/(tabs)/profile")}
          >
            <Text style={styles.profileRequiredButtonText}>Set Up Profile</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const selectedDateConflict = startDate && workoutConflictDates.length > 0 ? wouldOverlap(startDate, workoutConflictDates) : false;

  const handleFocusToggle = (area: string) => {
    Haptics.selectionAsync();
    setFocusAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const handleDayToggle = (day: string) => {
    Haptics.selectionAsync();
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleEquipmentToggle = (item: string) => {
    Haptics.selectionAsync();
    setEquipmentAvailable((prev) =>
      prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item]
    );
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (daysOfWeek.length === 0) {
      Alert.alert("Missing Info", "Please select at least one training day.");
      return;
    }
    if (selectedDateConflict) {
      Alert.alert("Date Conflict", "The selected start date overlaps with an existing workout plan.");
      return;
    }

    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const payload: any = {
      preferences: {
        goal,
        location,
        trainingMode,
        experienceLevel,
        focusAreas,
        daysOfWeek,
        sessionLength,
        limitations: limitations || "",
        equipmentAvailable,
      },
      idempotencyKey: Crypto.randomUUID(),
    };

    if (startDate) {
      payload.startDate = startDate;
    }

    try {
      const result = await createWorkout.mutateAsync(payload);
      const planId = result?._id || result?.id || result?.planId;
      if (planId) {
        router.replace(`/workout/generating?planId=${planId}`);
      } else {
        Alert.alert("Error", "Could not start workout plan generation. Please try again.");
        setSubmitting(false);
      }
    } catch (err: any) {
      setSubmitting(false);
      if (err?.response?.status === 429) {
        Alert.alert("Rate Limit", "You've reached the daily limit for AI-generated plans. Please try again tomorrow.");
      } else if (err?.response?.data?.profileRequired) {
        Alert.alert("Profile Required", "Please complete your profile before creating a plan.");
        router.push("/(tabs)/profile");
      } else if (err?.response?.data?.blocked) {
        const violations = err.response.data.violations?.map((v: any) => v.message || v).join("\n") || "Safety constraint violation.";
        Alert.alert("Cannot Create Plan", violations);
      } else {
        Alert.alert("Error", err?.response?.data?.message || "Something went wrong. Please try again.");
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: topInset }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Icon name="back" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>7-Day Workout Plan</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <ProfileSummaryCard profile={profile} />

        <Text style={styles.sectionTitle}>Your Goal</Text>
        <PillGrid>
          {GOAL_OPTIONS.map((opt) => (
            <Pill
              key={opt.value}
              label={opt.label}
              selected={goal === opt.value}
              onPress={() => { Haptics.selectionAsync(); setGoal(goal === opt.value ? "" : opt.value); }}
            />
          ))}
        </PillGrid>

        <Text style={styles.sectionTitle}>Location</Text>
        <PillGrid>
          {LOCATION_OPTIONS.map((opt) => (
            <Pill
              key={opt.value}
              label={opt.label}
              selected={location === opt.value}
              onPress={() => { Haptics.selectionAsync(); setLocation(location === opt.value ? "" : opt.value); }}
            />
          ))}
        </PillGrid>

        <Text style={styles.sectionTitle}>Training Mode</Text>
        <PillGrid>
          {TRAINING_MODE_OPTIONS.map((opt) => (
            <Pill
              key={opt.value}
              label={opt.label}
              selected={trainingMode === opt.value}
              onPress={() => { Haptics.selectionAsync(); setTrainingMode(trainingMode === opt.value ? "" : opt.value); }}
            />
          ))}
        </PillGrid>

        <Text style={styles.sectionTitle}>Experience Level</Text>
        <PillGrid>
          {EXPERIENCE_OPTIONS.map((opt) => (
            <Pill
              key={opt.value}
              label={opt.label}
              selected={experienceLevel === opt.value}
              onPress={() => { Haptics.selectionAsync(); setExperienceLevel(experienceLevel === opt.value ? "" : opt.value); }}
            />
          ))}
        </PillGrid>

        <Text style={styles.sectionTitle}>Training Days</Text>
        <PillGrid>
          {DAYS_OF_WEEK.map((day) => (
            <Pill
              key={day}
              label={day}
              selected={daysOfWeek.includes(day)}
              onPress={() => handleDayToggle(day)}
            />
          ))}
        </PillGrid>

        <Text style={styles.sectionTitle}>Session Duration</Text>
        <PillGrid>
          {SESSION_LENGTH_OPTIONS.map((opt) => (
            <Pill
              key={opt.value}
              label={opt.label}
              selected={sessionLength === opt.value}
              onPress={() => { Haptics.selectionAsync(); setSessionLength(sessionLength === opt.value ? 0 : opt.value); }}
            />
          ))}
        </PillGrid>

        <Text style={styles.sectionTitle}>Focus Areas</Text>
        <PillGrid>
          {FOCUS_AREAS.map((area) => (
            <Pill
              key={area}
              label={area}
              selected={focusAreas.includes(area)}
              onPress={() => handleFocusToggle(area)}
            />
          ))}
        </PillGrid>

        <Text style={styles.sectionTitle}>Injuries / Limitations</Text>
        <TextInput
          style={styles.textInput}
          value={limitations}
          onChangeText={setLimitations}
          placeholder="e.g. bad knees, lower back pain"
          placeholderTextColor={Colors.textTertiary}
          multiline
        />

        <Pressable
          style={styles.advancedToggle}
          onPress={() => { Haptics.selectionAsync(); setShowEquipment(!showEquipment); }}
        >
          <Text style={styles.advancedToggleText}>
            Equipment ({equipmentAvailable.length} selected)
          </Text>
          <Ionicons name={showEquipment ? "chevron-up-outline" : "chevron-down-outline"} size={18} color={Colors.textSecondary} />
        </Pressable>

        {showEquipment && (
          <View style={styles.equipmentSection}>
            {EQUIPMENT_CATEGORIES.map((cat) => (
              <View key={cat.title} style={styles.equipmentCategory}>
                <Text style={styles.equipmentCategoryTitle}>{cat.title}</Text>
                <PillGrid>
                  {cat.items.map((item) => (
                    <Pill
                      key={item}
                      label={item}
                      selected={equipmentAvailable.includes(item)}
                      onPress={() => handleEquipmentToggle(item)}
                      variant="compact"
                    />
                  ))}
                </PillGrid>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Start Date</Text>
        <Text style={styles.sectionHint}>Optional — plan runs for 7 days from start</Text>
        <CalendarPickerField
          value={startDate}
          onChange={setStartDate}
          Colors={Colors}
          conflictDates={workoutConflictDates}
          planDuration={7}
        />
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: bottomInset + 12 }]}>
        <Pressable
          style={[styles.generateButton, (submitting || !!selectedDateConflict) && { opacity: 0.5 }]}
          onPress={handleSubmit}
          disabled={submitting || !!selectedDateConflict}
        >
          {submitting ? (
            <ActivityIndicator color={Colors.text} />
          ) : (
            <>
              <Icon name="flash" size={20} />
              <Text style={styles.generateButtonText}>Generate Workout Plan</Text>
            </>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.text },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  profileCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    marginBottom: 24, borderWidth: 1, borderColor: Colors.border,
  },
  profileCardHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12,
  },
  profileCardTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text },
  profileEditLink: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.primary },
  profileCardGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  profileCardItem: { minWidth: "40%" },
  profileCardLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  profileCardValue: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.text, marginTop: 2 },
  sectionTitle: {
    fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text, marginBottom: 10, marginTop: 20,
  },
  sectionHint: {
    fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textTertiary, marginBottom: 10,
  },
  textInput: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14, fontSize: 12,
    fontFamily: "Inter_400Regular", color: Colors.text, borderWidth: 1,
    borderColor: Colors.border, minHeight: 48, textAlignVertical: "top",
  },
  advancedToggle: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 14, marginTop: 12,
  },
  advancedToggleText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  equipmentSection: { gap: 16, marginBottom: 8 },
  equipmentCategory: { gap: 8 },
  equipmentCategoryTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.background, paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  generateButton: {
    backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  generateButtonText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  profileRequired: {
    flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32, gap: 12,
  },
  profileRequiredTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text, marginTop: 8 },
  profileRequiredText: {
    fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary,
    textAlign: "center", lineHeight: 22,
  },
  profileRequiredButton: {
    backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14,
    paddingHorizontal: 32, marginTop: 12,
  },
  profileRequiredButtonText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text },
});
