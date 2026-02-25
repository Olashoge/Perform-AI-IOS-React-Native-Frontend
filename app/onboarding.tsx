import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors, ThemeColors } from "@/lib/theme-context";
import { useUpdateProfile, ProfileData } from "@/lib/api-hooks";
import { useAuth } from "@/lib/auth-context";

const TOTAL_STEPS = 5;

const ALLERGY_OPTIONS = ["Dairy", "Gluten", "Nuts", "Eggs", "Soy", "Shellfish", "Fish"];
const FOODS_TO_AVOID_OPTIONS = ["Pork", "Red Meat", "Chicken", "Mushrooms", "Garlic/Onion", "Beans/Legumes", "Spicy Foods"];
const GOAL_OPTIONS = ["weight_loss", "muscle_gain", "performance", "maintenance", "energy", "general_fitness"];
const GOAL_LABELS = ["Weight Loss", "Muscle Gain", "Performance", "Maintenance", "Energy", "General Fitness"];
const DAY_OPTIONS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_VALUES = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function intOnly(value: string): string {
  return value.replace(/[^\d]/g, "");
}

function formatLabel(value: string): string {
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function PillButton({
  label,
  selected,
  onPress,
  Colors,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  Colors: ThemeColors;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: selected ? Colors.text : Colors.border,
        backgroundColor: selected ? Colors.text : Colors.surface,
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: selected ? "600" : "500",
          color: selected ? Colors.background : Colors.text,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function PillGroup({
  options,
  labels,
  selected,
  onSelect,
  multi,
  Colors,
}: {
  options: string[];
  labels?: string[];
  selected: string | string[];
  onSelect: (val: string | string[]) => void;
  multi?: boolean;
  Colors: ThemeColors;
}) {
  const handlePress = (opt: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (multi) {
      const arr = Array.isArray(selected) ? selected : [];
      if (arr.includes(opt)) {
        onSelect(arr.filter((v) => v !== opt));
      } else {
        onSelect([...arr, opt]);
      }
    } else {
      onSelect(opt);
    }
  };

  const isSelected = (opt: string) => {
    if (multi) return Array.isArray(selected) && selected.includes(opt);
    return selected === opt;
  };

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
      {options.map((opt, i) => (
        <PillButton
          key={opt}
          label={labels ? labels[i] : formatLabel(opt)}
          selected={isSelected(opt)}
          onPress={() => handlePress(opt)}
          Colors={Colors}
        />
      ))}
    </View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const updateProfile = useUpdateProfile();
  const { completeOnboarding } = useAuth();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [unitSystem, setUnitSystem] = useState("imperial");
  const [sex, setSex] = useState("");
  const [ageText, setAgeText] = useState("");
  const [heightFtText, setHeightFtText] = useState("");
  const [heightInText, setHeightInText] = useState("");
  const [heightCmText, setHeightCmText] = useState("");
  const [weightText, setWeightText] = useState("");

  const [primaryGoal, setPrimaryGoal] = useState("");
  const [targetWeightText, setTargetWeightText] = useState("");

  const [experience, setExperience] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [trainingDays, setTrainingDays] = useState<string[]>([]);
  const [sessionDurationText, setSessionDurationText] = useState("");
  const [workoutLocation, setWorkoutLocation] = useState("");

  const [allergies, setAllergies] = useState<string[]>([]);
  const [foodsToAvoid, setFoodsToAvoid] = useState<string[]>([]);
  const [spicePreference, setSpicePreference] = useState("");
  const [prepStyle, setPrepStyle] = useState("");

  const [sleepText, setSleepText] = useState("");
  const [stressLevel, setStressLevel] = useState("");

  const progress = step / TOTAL_STEPS;

  const goNext = () => {
    if (step < TOTAL_STEPS) setStep(step + 1);
  };
  const goBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const age = ageText ? parseInt(ageText, 10) : null;
      const sessionDuration = sessionDurationText ? parseInt(sessionDurationText, 10) : null;
      const sleep = sleepText ? parseInt(sleepText, 10) : null;

      const isImperial = unitSystem === "imperial";

      let heightCm: number | null = null;
      if (isImperial) {
        const ft = heightFtText ? parseInt(heightFtText, 10) : 0;
        const inches = heightInText ? parseInt(heightInText, 10) : 0;
        const totalInches = ft * 12 + inches;
        if (totalInches > 0) {
          heightCm = Math.round(totalInches * 2.54);
        }
      } else {
        heightCm = heightCmText ? parseInt(heightCmText, 10) : null;
      }

      let weightKg: number | null = null;
      const weightVal = weightText ? parseInt(weightText, 10) : null;
      if (weightVal != null && weightVal > 0) {
        weightKg = isImperial ? Math.round(weightVal / 2.20462) : weightVal;
      }

      let targetWeightKg: number | null = null;
      const targetVal = targetWeightText ? parseInt(targetWeightText, 10) : null;
      if (targetVal != null && targetVal > 0) {
        targetWeightKg = isImperial ? Math.round(targetVal / 2.20462) : targetVal;
      }

      const raw: Record<string, any> = {
        unitSystem,
        sex,
        age,
        heightCm,
        weightKg,
        targetWeightKg,
        primaryGoal,
        trainingExperience: experience,
        activityLevel,
        trainingDaysOfWeek: trainingDays.length > 0 ? trainingDays : undefined,
        sessionDurationMinutes: sessionDuration,
        workoutLocationDefault: workoutLocation,
        allergiesIntolerances: allergies,
        foodsToAvoid,
        spicePreference,
        sleepHours: sleep,
        stressLevel,
      };

      const data: Partial<ProfileData> = {};
      for (const [key, value] of Object.entries(raw)) {
        if (value === null || value === undefined || value === "") continue;
        if (Array.isArray(value) && value.length === 0) continue;
        (data as any)[key] = value;
      }

      const hasSubstantiveData = Object.keys(data).some(
        (k) => k !== "unitSystem"
      );
      if (hasSubstantiveData) {
        await updateProfile.mutateAsync(data);
      }
      completeOnboarding();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const apiMsg = err?.response?.data?.message || err?.response?.data?.error;
      Alert.alert("Error", apiMsg || err?.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.card}>
      <Text style={styles.stepTitle}>Basics</Text>
      <Text style={styles.stepSubtitle}>Tell us about yourself</Text>

      <Text style={styles.fieldLabel}>Unit System</Text>
      <PillGroup
        options={["imperial", "metric"]}
        labels={["Imperial", "Metric"]}
        selected={unitSystem}
        onSelect={(v) => setUnitSystem(v as string)}
        Colors={Colors}
      />

      <Text style={styles.fieldLabel}>Sex</Text>
      <PillGroup
        options={["male", "female", "other"]}
        labels={["Male", "Female", "Other"]}
        selected={sex}
        onSelect={(v) => setSex(v as string)}
        Colors={Colors}
      />

      <Text style={styles.fieldLabel}>Age</Text>
      <TextInput
        style={styles.input}
        value={ageText}
        onChangeText={(v) => setAgeText(intOnly(v))}
        keyboardType="number-pad"
        placeholderTextColor={Colors.textTertiary}
        placeholder="e.g. 28"
        maxLength={3}
      />

      {unitSystem === "imperial" ? (
        <>
          <Text style={styles.fieldLabel}>Height</Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <TextInput
                style={styles.input}
                value={heightFtText}
                onChangeText={(v) => setHeightFtText(intOnly(v))}
                keyboardType="number-pad"
                placeholderTextColor={Colors.textTertiary}
                placeholder="ft"
                maxLength={1}
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextInput
                style={styles.input}
                value={heightInText}
                onChangeText={(v) => setHeightInText(intOnly(v))}
                keyboardType="number-pad"
                placeholderTextColor={Colors.textTertiary}
                placeholder="in"
                maxLength={2}
              />
            </View>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.fieldLabel}>Height (cm)</Text>
          <TextInput
            style={styles.input}
            value={heightCmText}
            onChangeText={(v) => setHeightCmText(intOnly(v))}
            keyboardType="number-pad"
            placeholderTextColor={Colors.textTertiary}
            placeholder="e.g. 178"
            maxLength={3}
          />
        </>
      )}

      <Text style={styles.fieldLabel}>
        Weight ({unitSystem === "imperial" ? "lbs" : "kg"})
      </Text>
      <TextInput
        style={styles.input}
        value={weightText}
        onChangeText={(v) => setWeightText(intOnly(v))}
        keyboardType="number-pad"
        placeholderTextColor={Colors.textTertiary}
        placeholder={unitSystem === "imperial" ? "e.g. 155" : "e.g. 70"}
        maxLength={3}
      />
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.card}>
      <Text style={styles.stepTitle}>Goal</Text>
      <Text style={styles.stepSubtitle}>What are you working toward?</Text>

      <Text style={styles.fieldLabel}>Primary Goal</Text>
      <PillGroup
        options={GOAL_OPTIONS}
        labels={GOAL_LABELS}
        selected={primaryGoal}
        onSelect={(v) => setPrimaryGoal(v as string)}
        Colors={Colors}
      />

      <Text style={styles.fieldLabel}>
        Target Weight ({unitSystem === "imperial" ? "lbs" : "kg"}) — optional
      </Text>
      <TextInput
        style={styles.input}
        value={targetWeightText}
        onChangeText={(v) => setTargetWeightText(intOnly(v))}
        keyboardType="number-pad"
        placeholderTextColor={Colors.textTertiary}
        placeholder="Optional"
        maxLength={3}
      />
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.card}>
      <Text style={styles.stepTitle}>Training</Text>
      <Text style={styles.stepSubtitle}>How do you like to train?</Text>

      <Text style={styles.fieldLabel}>Experience</Text>
      <PillGroup
        options={["beginner", "intermediate", "advanced"]}
        labels={["Beginner", "Intermediate", "Advanced"]}
        selected={experience}
        onSelect={(v) => setExperience(v as string)}
        Colors={Colors}
      />

      <Text style={styles.fieldLabel}>Activity Level</Text>
      <PillGroup
        options={["sedentary", "moderate", "active"]}
        labels={["Sedentary", "Moderate", "Active"]}
        selected={activityLevel}
        onSelect={(v) => setActivityLevel(v as string)}
        Colors={Colors}
      />

      <Text style={styles.fieldLabel}>Training Days</Text>
      <PillGroup
        options={DAY_VALUES}
        labels={DAY_OPTIONS}
        selected={trainingDays}
        onSelect={(v) => setTrainingDays(v as string[])}
        multi
        Colors={Colors}
      />

      <Text style={styles.fieldLabel}>Session Duration (minutes)</Text>
      <TextInput
        style={styles.input}
        value={sessionDurationText}
        onChangeText={(v) => setSessionDurationText(intOnly(v))}
        keyboardType="number-pad"
        placeholderTextColor={Colors.textTertiary}
        placeholder="45"
        maxLength={3}
      />

      <Text style={styles.fieldLabel}>Workout Location</Text>
      <PillGroup
        options={["gym", "home", "outdoors"]}
        labels={["Gym", "Home", "Outdoors"]}
        selected={workoutLocation}
        onSelect={(v) => setWorkoutLocation(v as string)}
        Colors={Colors}
      />
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.card}>
      <Text style={styles.stepTitle}>Nutrition</Text>
      <Text style={styles.stepSubtitle}>Any dietary preferences?</Text>

      <Text style={styles.fieldLabel}>Allergies & Intolerances</Text>
      <PillGroup
        options={ALLERGY_OPTIONS}
        selected={allergies}
        onSelect={(v) => setAllergies(v as string[])}
        multi
        Colors={Colors}
      />

      <Text style={styles.fieldLabel}>Foods to Avoid</Text>
      <PillGroup
        options={FOODS_TO_AVOID_OPTIONS}
        selected={foodsToAvoid}
        onSelect={(v) => setFoodsToAvoid(v as string[])}
        multi
        Colors={Colors}
      />

      <Text style={styles.fieldLabel}>Spice Preference</Text>
      <PillGroup
        options={["mild", "medium", "spicy"]}
        labels={["Mild", "Medium", "Spicy"]}
        selected={spicePreference}
        onSelect={(v) => setSpicePreference(v as string)}
        Colors={Colors}
      />

      <Text style={styles.fieldLabel}>Prep Style</Text>
      <PillGroup
        options={["cook_daily", "batch_prep"]}
        labels={["Cook Daily", "Batch Prep"]}
        selected={prepStyle}
        onSelect={(v) => setPrepStyle(v as string)}
        Colors={Colors}
      />
    </View>
  );

  const renderStep5 = () => (
    <View style={styles.card}>
      <Text style={styles.stepTitle}>Lifestyle</Text>
      <Text style={styles.stepSubtitle}>A few more details</Text>

      <Text style={styles.fieldLabel}>Sleep (hours per night)</Text>
      <TextInput
        style={styles.input}
        value={sleepText}
        onChangeText={(v) => setSleepText(intOnly(v))}
        keyboardType="number-pad"
        placeholderTextColor={Colors.textTertiary}
        placeholder="e.g. 7"
        maxLength={2}
      />

      <Text style={styles.fieldLabel}>Stress Level</Text>
      <PillGroup
        options={["low", "moderate", "high"]}
        labels={["Low", "Moderate", "High"]}
        selected={stressLevel}
        onSelect={(v) => setStressLevel(v as string)}
        Colors={Colors}
      />
    </View>
  );

  const renderContent = () => {
    switch (step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return null;
    }
  };

  const isLastStep = step === TOTAL_STEPS;
  const showSkip = step === 4 || step === 5;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.topBar, { paddingTop: insets.top + webTopInset + 12 }]}>
        <Text style={styles.progressLabel}>Step {step} of {TOTAL_STEPS}</Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom + webBottomInset }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderContent()}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + webBottomInset + 12 }]}>
        <View style={styles.bottomBarInner}>
          {step > 1 ? (
            <Pressable onPress={goBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={22} color={Colors.text} />
            </Pressable>
          ) : (
            <View style={{ width: 44 }} />
          )}

          <View style={styles.bottomRight}>
            {showSkip && !isLastStep && (
              <Pressable onPress={goNext} style={styles.skipButton}>
                <Text style={styles.skipText}>Skip</Text>
              </Pressable>
            )}
            {isLastStep ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                {showSkip && (
                  <Pressable onPress={handleFinish} style={styles.skipButton}>
                    <Text style={styles.skipText}>Skip</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={handleFinish}
                  style={[styles.nextButton, saving && { opacity: 0.6 }]}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.nextButtonText}>Finish</Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={goNext} style={styles.nextButton}>
                <Text style={styles.nextButtonText}>Next</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(Colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    topBar: {
      paddingHorizontal: 24,
      paddingBottom: 16,
      backgroundColor: Colors.background,
    },
    progressLabel: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: Colors.textSecondary,
      marginBottom: 10,
      textAlign: "center",
      letterSpacing: 0.5,
    },
    progressBarBg: {
      height: 4,
      borderRadius: 2,
      backgroundColor: Colors.trackBackground,
      overflow: "hidden" as const,
    },
    progressBarFill: {
      height: 4,
      borderRadius: 2,
      backgroundColor: Colors.primary,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 8,
    },
    card: {
      backgroundColor: Colors.surface,
      borderRadius: 14,
      padding: 20,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    stepTitle: {
      fontSize: 22,
      fontWeight: "700" as const,
      color: Colors.text,
      marginBottom: 4,
    },
    stepSubtitle: {
      fontSize: 14,
      color: Colors.textSecondary,
      marginBottom: 20,
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: Colors.textSecondary,
      marginBottom: 8,
      marginTop: 16,
      textTransform: "uppercase" as const,
      letterSpacing: 0.5,
    },
    input: {
      backgroundColor: Colors.inputBg,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: Colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: Colors.text,
    },
    bottomBar: {
      position: "absolute" as const,
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: Colors.background,
      borderTopWidth: 1,
      borderTopColor: Colors.border,
      paddingTop: 12,
      paddingHorizontal: 20,
    },
    bottomBarInner: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: Colors.surfaceElevated,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    bottomRight: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
    },
    skipButton: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    skipText: {
      fontSize: 15,
      fontWeight: "500" as const,
      color: Colors.textSecondary,
    },
    nextButton: {
      backgroundColor: Colors.text,
      paddingHorizontal: 28,
      paddingVertical: 14,
      borderRadius: 12,
      minWidth: 100,
      alignItems: "center" as const,
    },
    nextButtonText: {
      fontSize: 16,
      fontWeight: "600" as const,
      color: Colors.background,
    },
  });
}
