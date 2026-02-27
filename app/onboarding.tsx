import React, { useState, useMemo, useRef } from "react";
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
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors, ThemeColors } from "@/lib/theme-context";
import { Icon } from "@/components/Icon";
import { Pill, PillGrid } from "@/components/Pill";
import { useUpdateProfile, ProfileData } from "@/lib/api-hooks";
import { useAuth } from "@/lib/auth-context";
import { EQUIPMENT_CATEGORIES, getEquipmentForLocation, mergeEquipmentDefaults } from "@/lib/equipment-presets";

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

function PillGroup({
  options,
  labels,
  selected,
  onSelect,
  multi,
}: {
  options: string[];
  labels?: string[];
  selected: string | string[];
  onSelect: (val: string | string[]) => void;
  multi?: boolean;
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
      onSelect(selected === opt ? "" : opt);
    }
  };

  const isSelected = (opt: string) => {
    if (multi) return Array.isArray(selected) && selected.includes(opt);
    return selected === opt;
  };

  return (
    <PillGrid>
      {options.map((opt, i) => (
        <Pill
          key={opt}
          label={labels ? labels[i] : formatLabel(opt)}
          selected={isSelected(opt)}
          onPress={() => handlePress(opt)}
          variant="rounded"
        />
      ))}
    </PillGrid>
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const scrollViewRef = useRef<ScrollView>(null);

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
  const [equipmentAvailable, setEquipmentAvailable] = useState<string[]>([]);
  const [hasEditedEquipment, setHasEditedEquipment] = useState(false);

  const handleLocationChange = (location: string) => {
    setWorkoutLocation(location);
    if (!hasEditedEquipment) {
      setEquipmentAvailable(getEquipmentForLocation(location));
    } else {
      setEquipmentAvailable((prev) => mergeEquipmentDefaults(prev, location));
    }
  };

  const handleEquipmentToggle = (item: string) => {
    setHasEditedEquipment(true);
    setEquipmentAvailable((prev) =>
      prev.includes(item) ? prev.filter((v) => v !== item) : [...prev, item]
    );
  };

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

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validateFields = (): boolean => {
    const errors: Record<string, string> = {};

    if (ageText) {
      const age = parseInt(ageText, 10);
      if (isNaN(age) || age < 1 || age > 120) {
        errors.age = "Age must be a number between 1 and 120";
      }
    }

    const isImperial = unitSystem === "imperial";

    if (isImperial) {
      if (heightFtText) {
        const ft = parseInt(heightFtText, 10);
        if (isNaN(ft) || ft < 1 || ft > 8) {
          errors.heightFt = "Feet must be between 1 and 8";
        }
      }
      if (heightInText) {
        const inches = parseInt(heightInText, 10);
        if (isNaN(inches) || inches < 0 || inches > 11) {
          errors.heightIn = "Inches must be between 0 and 11";
        }
      }
    } else {
      if (heightCmText) {
        const cm = parseInt(heightCmText, 10);
        if (isNaN(cm) || cm < 50 || cm > 300) {
          errors.heightCm = "Height must be between 50 and 300 cm";
        }
      }
    }

    if (weightText) {
      const w = parseInt(weightText, 10);
      const maxW = isImperial ? 700 : 320;
      const unit = isImperial ? "lbs" : "kg";
      if (isNaN(w) || w < 1 || w > maxW) {
        errors.weight = `Weight must be a number between 1 and ${maxW} ${unit}`;
      }
    }

    if (targetWeightText) {
      const tw = parseInt(targetWeightText, 10);
      const maxTW = isImperial ? 700 : 320;
      const unit = isImperial ? "lbs" : "kg";
      if (isNaN(tw) || tw < 1 || tw > maxTW) {
        errors.targetWeight = `Target weight must be between 1 and ${maxTW} ${unit}`;
      }
    }

    if (sessionDurationText) {
      const sd = parseInt(sessionDurationText, 10);
      if (isNaN(sd) || sd < 5 || sd > 300) {
        errors.sessionDuration = "Session duration must be between 5 and 300 minutes";
      }
    }

    if (sleepText) {
      const sl = parseInt(sleepText, 10);
      if (isNaN(sl) || sl < 1 || sl > 24) {
        errors.sleep = "Sleep must be a number between 1 and 24 hours";
      }
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return false;
    }
    return true;
  };

  const handleFinish = async () => {
    if (!validateFields()) return;

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
        equipmentAvailable: equipmentAvailable.length > 0 ? equipmentAvailable : undefined,
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
      Alert.alert("Something went wrong", apiMsg || "Failed to save your profile. Please try again.");
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
      />

      <Text style={styles.fieldLabel}>Sex</Text>
      <PillGroup
        options={["male", "female", "other"]}
        labels={["Male", "Female", "Other"]}
        selected={sex}
        onSelect={(v) => setSex(v as string)}
      />

      <Text style={styles.fieldLabel}>Age</Text>
      <TextInput
        style={[styles.input, fieldErrors.age && styles.inputError]}
        value={ageText}
        onChangeText={(v) => { setAgeText(intOnly(v)); clearFieldError("age"); }}
        keyboardType="number-pad"
        placeholderTextColor={Colors.textTertiary}
        placeholder="e.g. 28"
        maxLength={3}
      />
      {fieldErrors.age ? <Text style={styles.errorText}>{fieldErrors.age}</Text> : null}

      {unitSystem === "imperial" ? (
        <>
          <Text style={styles.fieldLabel}>Height</Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <TextInput
                style={[styles.input, fieldErrors.heightFt && styles.inputError]}
                value={heightFtText}
                onChangeText={(v) => { setHeightFtText(intOnly(v)); clearFieldError("heightFt"); }}
                keyboardType="number-pad"
                placeholderTextColor={Colors.textTertiary}
                placeholder="ft"
                maxLength={1}
              />
              {fieldErrors.heightFt ? <Text style={styles.errorText}>{fieldErrors.heightFt}</Text> : null}
            </View>
            <View style={{ flex: 1 }}>
              <TextInput
                style={[styles.input, fieldErrors.heightIn && styles.inputError]}
                value={heightInText}
                onChangeText={(v) => { setHeightInText(intOnly(v)); clearFieldError("heightIn"); }}
                keyboardType="number-pad"
                placeholderTextColor={Colors.textTertiary}
                placeholder="in"
                maxLength={2}
              />
              {fieldErrors.heightIn ? <Text style={styles.errorText}>{fieldErrors.heightIn}</Text> : null}
            </View>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.fieldLabel}>Height (cm)</Text>
          <TextInput
            style={[styles.input, fieldErrors.heightCm && styles.inputError]}
            value={heightCmText}
            onChangeText={(v) => { setHeightCmText(intOnly(v)); clearFieldError("heightCm"); }}
            keyboardType="number-pad"
            placeholderTextColor={Colors.textTertiary}
            placeholder="e.g. 178"
            maxLength={3}
          />
          {fieldErrors.heightCm ? <Text style={styles.errorText}>{fieldErrors.heightCm}</Text> : null}
        </>
      )}

      <Text style={styles.fieldLabel}>
        Weight ({unitSystem === "imperial" ? "lbs" : "kg"})
      </Text>
      <TextInput
        style={[styles.input, fieldErrors.weight && styles.inputError]}
        value={weightText}
        onChangeText={(v) => { setWeightText(intOnly(v)); clearFieldError("weight"); }}
        keyboardType="number-pad"
        placeholderTextColor={Colors.textTertiary}
        placeholder={unitSystem === "imperial" ? "e.g. 155" : "e.g. 70"}
        maxLength={3}
      />
      {fieldErrors.weight ? <Text style={styles.errorText}>{fieldErrors.weight}</Text> : null}
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
      />

      <Text style={styles.fieldLabel}>
        Target Weight ({unitSystem === "imperial" ? "lbs" : "kg"}) — optional
      </Text>
      <TextInput
        style={[styles.input, fieldErrors.targetWeight && styles.inputError]}
        value={targetWeightText}
        onChangeText={(v) => { setTargetWeightText(intOnly(v)); clearFieldError("targetWeight"); }}
        keyboardType="number-pad"
        placeholderTextColor={Colors.textTertiary}
        placeholder="Optional"
        maxLength={3}
      />
      {fieldErrors.targetWeight ? <Text style={styles.errorText}>{fieldErrors.targetWeight}</Text> : null}
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
      />

      <Text style={styles.fieldLabel}>Activity Level</Text>
      <PillGroup
        options={["sedentary", "moderate", "active"]}
        labels={["Sedentary", "Moderate", "Active"]}
        selected={activityLevel}
        onSelect={(v) => setActivityLevel(v as string)}
      />

      <Text style={styles.fieldLabel}>Training Days</Text>
      <PillGroup
        options={DAY_VALUES}
        labels={DAY_OPTIONS}
        selected={trainingDays}
        onSelect={(v) => setTrainingDays(v as string[])}
        multi
      />

      <Text style={styles.fieldLabel}>Session Duration (minutes)</Text>
      <TextInput
        style={[styles.input, fieldErrors.sessionDuration && styles.inputError]}
        value={sessionDurationText}
        onChangeText={(v) => { setSessionDurationText(intOnly(v)); clearFieldError("sessionDuration"); }}
        keyboardType="number-pad"
        placeholderTextColor={Colors.textTertiary}
        placeholder="45"
        maxLength={3}
      />
      {fieldErrors.sessionDuration ? <Text style={styles.errorText}>{fieldErrors.sessionDuration}</Text> : null}

      <Text style={styles.fieldLabel}>Workout Location</Text>
      <PillGroup
        options={["gym", "home", "outdoors"]}
        labels={["Gym", "Home", "Outdoors"]}
        selected={workoutLocation}
        onSelect={(v) => handleLocationChange(v as string)}
      />

      {workoutLocation ? (
        <>
          <Text style={styles.fieldLabel}>Equipment Available</Text>
          <Text style={[styles.fieldHint, { color: Colors.textTertiary }]}>
            {equipmentAvailable.length} selected
          </Text>
          {EQUIPMENT_CATEGORIES.map((cat) => {
            const count = cat.items.filter((item) => equipmentAvailable.includes(item)).length;
            return (
              <View key={cat.name} style={{ marginBottom: 8 }}>
                <Text style={[styles.fieldLabel, { fontSize: 12, marginBottom: 4 }]}>
                  {cat.name} ({count}/{cat.items.length})
                </Text>
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
            );
          })}
        </>
      ) : null}
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
      />

      <Text style={styles.fieldLabel}>Foods to Avoid</Text>
      <PillGroup
        options={FOODS_TO_AVOID_OPTIONS}
        selected={foodsToAvoid}
        onSelect={(v) => setFoodsToAvoid(v as string[])}
        multi
      />

      <Text style={styles.fieldLabel}>Spice Preference</Text>
      <PillGroup
        options={["mild", "medium", "spicy"]}
        labels={["Mild", "Medium", "Spicy"]}
        selected={spicePreference}
        onSelect={(v) => setSpicePreference(v as string)}
      />

      <Text style={styles.fieldLabel}>Prep Style</Text>
      <PillGroup
        options={["cook_daily", "batch_prep"]}
        labels={["Cook Daily", "Batch Prep"]}
        selected={prepStyle}
        onSelect={(v) => setPrepStyle(v as string)}
      />
    </View>
  );

  const renderStep5 = () => (
    <View style={styles.card}>
      <Text style={styles.stepTitle}>Lifestyle</Text>
      <Text style={styles.stepSubtitle}>A few more details</Text>

      <Text style={styles.fieldLabel}>Sleep (hours per night)</Text>
      <TextInput
        style={[styles.input, fieldErrors.sleep && styles.inputError]}
        value={sleepText}
        onChangeText={(v) => { setSleepText(intOnly(v)); clearFieldError("sleep"); }}
        keyboardType="number-pad"
        placeholderTextColor={Colors.textTertiary}
        placeholder="e.g. 7"
        maxLength={2}
      />
      {fieldErrors.sleep ? <Text style={styles.errorText}>{fieldErrors.sleep}</Text> : null}

      <Text style={styles.fieldLabel}>Stress Level</Text>
      <PillGroup
        options={["low", "moderate", "high"]}
        labels={["Low", "Moderate", "High"]}
        selected={stressLevel}
        onSelect={(v) => setStressLevel(v as string)}
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
        ref={scrollViewRef}
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
              <Icon name="back" size={24} />
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
    fieldHint: {
      fontSize: 11,
      marginBottom: 8,
      marginTop: -4,
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
    inputError: {
      borderColor: Colors.error,
      borderWidth: 1.5,
    },
    errorText: {
      fontSize: 12,
      color: Colors.error,
      marginTop: 4,
      fontFamily: "Inter_500Medium",
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
