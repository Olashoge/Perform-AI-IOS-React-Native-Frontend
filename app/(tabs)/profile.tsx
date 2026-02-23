import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { useProfile, useUpdateProfile, ProfileData } from "@/lib/api-hooks";

function formatLabel(value: string): string {
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function SectionHeader({
  icon,
  title,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={18} color={Colors.primary} />
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.formField}>
      <Text style={styles.formLabel}>{label}</Text>
      {children}
    </View>
  );
}

function SegmentedControl({
  options,
  labels,
  selected,
  onSelect,
}: {
  options: string[];
  labels?: string[];
  selected: string;
  onSelect: (val: string) => void;
}) {
  return (
    <View style={styles.segmentedRow}>
      {options.map((opt, i) => {
        const isSelected = selected === opt;
        return (
          <Pressable
            key={opt}
            style={[styles.segmentedBtn, isSelected && styles.segmentedBtnActive]}
            onPress={() => {
              Haptics.selectionAsync();
              onSelect(opt);
            }}
          >
            <Text
              style={[
                styles.segmentedBtnText,
                isSelected && styles.segmentedBtnTextActive,
              ]}
            >
              {labels ? labels[i] : formatLabel(opt)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function PillSelector({
  options,
  labels,
  selected,
  onSelect,
  multi = false,
}: {
  options: string[];
  labels?: string[];
  selected: string | string[];
  onSelect: (val: string | string[]) => void;
  multi?: boolean;
}) {
  const handlePress = (opt: string) => {
    Haptics.selectionAsync();
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
    if (multi) {
      return Array.isArray(selected) && selected.includes(opt);
    }
    return selected === opt;
  };

  return (
    <View style={styles.pillWrap}>
      {options.map((opt, i) => (
        <Pressable
          key={opt}
          style={[styles.pill, isSelected(opt) && styles.pillActive]}
          onPress={() => handlePress(opt)}
        >
          <Text
            style={[styles.pillText, isSelected(opt) && styles.pillTextActive]}
          >
            {labels ? labels[i] : formatLabel(opt)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const defaultFormData: ProfileData = {
  unitSystem: "imperial",
  age: null,
  sex: "male",
  heightCm: null,
  weightKg: null,
  targetWeightKg: null,
  primaryGoal: "",
  trainingExperience: "",
  injuries: [],
  mobilityLimitations: [],
  chronicConditions: [],
  healthConstraints: [],
  sleepHours: null,
  stressLevel: null,
  activityLevel: "",
  trainingDaysOfWeek: [],
  sessionDurationMinutes: null,
  allergies: [],
  intolerances: [],
  religiousRestrictions: [],
  allergiesIntolerances: [],
  foodsToAvoid: [],
  foodsToAvoidNotes: "",
  appetiteLevel: "",
  spicePreference: "",
  bodyContext: "",
  favoriteMealsText: "",
  workoutLocationDefault: "",
  equipmentAvailable: [],
  equipmentOtherNotes: "",
};

function cmToInches(cm: number): number {
  return Math.round(cm / 2.54 * 10) / 10;
}

function inchesToCm(inches: number): number {
  return Math.round(inches * 2.54 * 10) / 10;
}

function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10;
}

function lbsToKg(lbs: number): number {
  return Math.round(lbs / 2.20462 * 10) / 10;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const profile = useProfile();
  const updateProfile = useUpdateProfile();

  const [formData, setFormData] = useState<ProfileData>({ ...defaultFormData });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (profile.data && !loaded) {
      setFormData({ ...defaultFormData, ...profile.data });
      setLoaded(true);
    }
  }, [profile.data, loaded]);

  const updateField = <K extends keyof ProfileData>(
    key: K,
    value: ProfileData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const isImperial = formData.unitSystem === "imperial";

  const displayHeight = (): string => {
    if (formData.heightCm == null) return "";
    return isImperial
      ? String(cmToInches(formData.heightCm))
      : String(formData.heightCm);
  };

  const displayWeight = (val: number | null): string => {
    if (val == null) return "";
    return isImperial ? String(kgToLbs(val)) : String(val);
  };

  const handleHeightChange = (text: string) => {
    const num = parseFloat(text);
    if (text === "" || isNaN(num)) {
      updateField("heightCm", null);
      return;
    }
    updateField("heightCm", isImperial ? inchesToCm(num) : num);
  };

  const handleWeightChange = (
    key: "weightKg" | "targetWeightKg",
    text: string
  ) => {
    const num = parseFloat(text);
    if (text === "" || isNaN(num)) {
      updateField(key, null);
      return;
    }
    updateField(key, isImperial ? lbsToKg(num) : num);
  };

  const handleArrayFieldChange = (
    key: keyof ProfileData,
    text: string
  ) => {
    const arr = text
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    updateField(key, arr as any);
  };

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync(formData);
      Alert.alert("Success", "Profile updated successfully");
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to update profile");
    }
  };

  async function handleLogout() {
    if (Platform.OS === "web") {
      await logout();
      router.replace("/login");
      return;
    }

    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await logout();
          router.replace("/login");
        },
      },
    ]);
  }

  if (profile.isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 16 + webTopInset,
            paddingBottom: insets.bottom + 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.headerTitle}>Profile</Text>

        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.userName}>
            {user?.name || user?.email || "User"}
          </Text>
          {user?.email && <Text style={styles.userEmail}>{user.email}</Text>}
        </View>

        <SectionHeader icon="body-outline" title="PHYSICAL STATS & GOALS" />
        <View style={styles.sectionCard}>
          <FormField label="Unit System">
            <SegmentedControl
              options={["imperial", "metric"]}
              labels={["Imperial", "Metric"]}
              selected={formData.unitSystem}
              onSelect={(v) => updateField("unitSystem", v)}
            />
          </FormField>

          <FormField label="Age">
            <TextInput
              style={styles.textInput}
              value={formData.age != null ? String(formData.age) : ""}
              onChangeText={(t) =>
                updateField("age", t === "" ? null : parseInt(t) || null)
              }
              keyboardType="numeric"
              placeholderTextColor={Colors.textTertiary}
              placeholder="Enter age"
            />
          </FormField>

          <FormField label="Sex">
            <SegmentedControl
              options={["male", "female"]}
              labels={["Male", "Female"]}
              selected={formData.sex}
              onSelect={(v) => updateField("sex", v)}
            />
          </FormField>

          <FormField label={isImperial ? "Height (inches)" : "Height (cm)"}>
            <TextInput
              style={styles.textInput}
              value={displayHeight()}
              onChangeText={handleHeightChange}
              keyboardType="numeric"
              placeholderTextColor={Colors.textTertiary}
              placeholder={isImperial ? "e.g. 70.9" : "e.g. 180"}
            />
          </FormField>

          <FormField
            label={isImperial ? "Current Weight (lbs)" : "Current Weight (kg)"}
          >
            <TextInput
              style={styles.textInput}
              value={displayWeight(formData.weightKg)}
              onChangeText={(t) => handleWeightChange("weightKg", t)}
              keyboardType="numeric"
              placeholderTextColor={Colors.textTertiary}
              placeholder={isImperial ? "e.g. 155" : "e.g. 70"}
            />
          </FormField>

          <FormField
            label={isImperial ? "Target Weight (lbs)" : "Target Weight (kg)"}
          >
            <TextInput
              style={styles.textInput}
              value={displayWeight(formData.targetWeightKg)}
              onChangeText={(t) => handleWeightChange("targetWeightKg", t)}
              keyboardType="numeric"
              placeholderTextColor={Colors.textTertiary}
              placeholder={isImperial ? "e.g. 165" : "e.g. 75"}
            />
          </FormField>

          <FormField label="Primary Goal">
            <PillSelector
              options={[
                "muscle_gain",
                "fat_loss",
                "maintenance",
                "recomposition",
                "general_health",
              ]}
              labels={[
                "Muscle Gain",
                "Fat Loss",
                "Maintenance",
                "Recomposition",
                "General Health",
              ]}
              selected={formData.primaryGoal}
              onSelect={(v) => updateField("primaryGoal", v as string)}
            />
          </FormField>

          <FormField label="Activity Level">
            <PillSelector
              options={[
                "sedentary",
                "light",
                "moderate",
                "active",
                "very_active",
              ]}
              labels={["Sedentary", "Light", "Moderate", "Active", "Very Active"]}
              selected={formData.activityLevel}
              onSelect={(v) => updateField("activityLevel", v as string)}
            />
          </FormField>

          <FormField label="Body Context / Notes for AI">
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={formData.bodyContext}
              onChangeText={(t) => updateField("bodyContext", t)}
              multiline
              placeholderTextColor={Colors.textTertiary}
              placeholder="Describe your body goals or notes for AI..."
            />
          </FormField>
        </View>

        <SectionHeader icon="medkit-outline" title="HEALTH & MEDICAL" />
        <View style={styles.sectionCard}>
          <FormField label="Sleep Hours">
            <TextInput
              style={styles.textInput}
              value={
                formData.sleepHours != null ? String(formData.sleepHours) : ""
              }
              onChangeText={(t) =>
                updateField(
                  "sleepHours",
                  t === "" ? null : parseFloat(t) || null
                )
              }
              keyboardType="numeric"
              placeholderTextColor={Colors.textTertiary}
              placeholder="e.g. 7"
            />
          </FormField>

          <FormField label="Stress Level">
            <PillSelector
              options={["low", "moderate", "high"]}
              labels={["Low", "Moderate", "High"]}
              selected={formData.stressLevel || ""}
              onSelect={(v) => updateField("stressLevel", v as string)}
            />
          </FormField>

          <FormField label="Injuries">
            <TextInput
              style={styles.textInput}
              value={formData.injuries.join(", ")}
              onChangeText={(t) => handleArrayFieldChange("injuries", t)}
              placeholderTextColor={Colors.textTertiary}
              placeholder="Comma-separated, e.g. knee, shoulder"
            />
          </FormField>

          <FormField label="Mobility Limitations">
            <TextInput
              style={styles.textInput}
              value={formData.mobilityLimitations.join(", ")}
              onChangeText={(t) =>
                handleArrayFieldChange("mobilityLimitations", t)
              }
              placeholderTextColor={Colors.textTertiary}
              placeholder="Comma-separated"
            />
          </FormField>

          <FormField label="Chronic Conditions">
            <TextInput
              style={styles.textInput}
              value={formData.chronicConditions.join(", ")}
              onChangeText={(t) =>
                handleArrayFieldChange("chronicConditions", t)
              }
              placeholderTextColor={Colors.textTertiary}
              placeholder="Comma-separated"
            />
          </FormField>

          <FormField label="Health Constraints">
            <TextInput
              style={styles.textInput}
              value={formData.healthConstraints.join(", ")}
              onChangeText={(t) =>
                handleArrayFieldChange("healthConstraints", t)
              }
              placeholderTextColor={Colors.textTertiary}
              placeholder="Comma-separated"
            />
          </FormField>
        </View>

        <SectionHeader icon="barbell-outline" title="TRAINING CAPACITY" />
        <View style={styles.sectionCard}>
          <FormField label="Training Experience">
            <PillSelector
              options={["beginner", "intermediate", "advanced"]}
              labels={["Beginner", "Intermediate", "Advanced"]}
              selected={formData.trainingExperience}
              onSelect={(v) => updateField("trainingExperience", v as string)}
            />
          </FormField>

          <FormField label="Training Days">
            <PillSelector
              options={["mon", "tue", "wed", "thu", "fri", "sat", "sun"]}
              labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
              selected={formData.trainingDaysOfWeek}
              onSelect={(v) =>
                updateField("trainingDaysOfWeek", v as string[])
              }
              multi
            />
          </FormField>

          <FormField label="Session Duration (minutes)">
            <TextInput
              style={styles.textInput}
              value={
                formData.sessionDurationMinutes != null
                  ? String(formData.sessionDurationMinutes)
                  : ""
              }
              onChangeText={(t) =>
                updateField(
                  "sessionDurationMinutes",
                  t === "" ? null : parseInt(t) || null
                )
              }
              keyboardType="numeric"
              placeholderTextColor={Colors.textTertiary}
              placeholder="e.g. 60"
            />
          </FormField>
        </View>

        <SectionHeader
          icon="location-outline"
          title="WORKOUT LOCATION & EQUIPMENT"
        />
        <View style={styles.sectionCard}>
          <FormField label="Workout Location">
            <PillSelector
              options={["gym", "home", "outdoor", "mixed"]}
              labels={["Gym", "Home", "Outdoor", "Mixed"]}
              selected={formData.workoutLocationDefault}
              onSelect={(v) =>
                updateField("workoutLocationDefault", v as string)
              }
            />
          </FormField>

          <FormField label="Equipment Available">
            <PillSelector
              options={[
                "dumbbells",
                "barbell",
                "cables",
                "machines",
                "kettlebells",
                "bands",
                "pull_up_bar",
                "bench",
                "squat_rack",
              ]}
              labels={[
                "Dumbbells",
                "Barbell",
                "Cables",
                "Machines",
                "Kettlebells",
                "Bands",
                "Pull Up Bar",
                "Bench",
                "Squat Rack",
              ]}
              selected={formData.equipmentAvailable}
              onSelect={(v) =>
                updateField("equipmentAvailable", v as string[])
              }
              multi
            />
          </FormField>

          <FormField label="Equipment Notes">
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={formData.equipmentOtherNotes}
              onChangeText={(t) => updateField("equipmentOtherNotes", t)}
              multiline
              placeholderTextColor={Colors.textTertiary}
              placeholder="Any additional equipment notes..."
            />
          </FormField>
        </View>

        <SectionHeader icon="nutrition-outline" title="NUTRITION & LIFESTYLE" />
        <View style={styles.sectionCard}>
          <FormField label="Appetite Level">
            <PillSelector
              options={["low", "normal", "high"]}
              labels={["Low", "Normal", "High"]}
              selected={formData.appetiteLevel}
              onSelect={(v) => updateField("appetiteLevel", v as string)}
            />
          </FormField>

          <FormField label="Spice Preference">
            <PillSelector
              options={["none", "mild", "medium", "spicy", "extra_spicy"]}
              labels={["None", "Mild", "Medium", "Spicy", "Extra Spicy"]}
              selected={formData.spicePreference}
              onSelect={(v) => updateField("spicePreference", v as string)}
            />
          </FormField>

          <FormField label="Foods to Avoid">
            <PillSelector
              options={[
                "Pork",
                "Red Meat",
                "Chicken",
                "Shellfish",
                "Dairy",
                "Gluten",
                "Soy",
                "Eggs",
                "Nuts",
                "Fish",
              ]}
              selected={formData.foodsToAvoid}
              onSelect={(v) => updateField("foodsToAvoid", v as string[])}
              multi
            />
          </FormField>

          <FormField label="Foods to Avoid Notes">
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={formData.foodsToAvoidNotes}
              onChangeText={(t) => updateField("foodsToAvoidNotes", t)}
              multiline
              placeholderTextColor={Colors.textTertiary}
              placeholder="Additional notes about foods to avoid..."
            />
          </FormField>

          <FormField label="Favorite Meals">
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={formData.favoriteMealsText}
              onChangeText={(t) => updateField("favoriteMealsText", t)}
              multiline
              placeholderTextColor={Colors.textTertiary}
              placeholder="Describe your favorite meals..."
            />
          </FormField>
        </View>

        <Pressable
          style={[
            styles.saveButton,
            updateProfile.isPending && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={updateProfile.isPending}
        >
          {updateProfile.isPending ? (
            <ActivityIndicator size="small" color={Colors.text} />
          ) : (
            <Text style={styles.saveButtonText}>Update Profile</Text>
          )}
        </Pressable>

        <View style={styles.bottomSection}>
          <Pressable
            style={styles.diagnosticsLink}
            onPress={() => router.push("/diagnostics")}
          >
            <Ionicons
              name="bug-outline"
              size={18}
              color={Colors.warning}
            />
            <Text style={styles.diagnosticsText}>Diagnostics</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.signOutButton,
              pressed && { opacity: 0.7 },
            ]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color={Colors.error} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 24,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: Colors.primary + "1A",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  userName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    marginTop: 8,
    marginLeft: 4,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  formField: {
    marginBottom: 18,
  },
  formLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  segmentedRow: {
    flexDirection: "row",
    gap: 8,
  },
  segmentedBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.surfaceElevated,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  segmentedBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  segmentedBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  segmentedBtnTextActive: {
    color: Colors.text,
    fontFamily: "Inter_600SemiBold",
  },
  pillWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pillText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  pillTextActive: {
    color: Colors.text,
    fontFamily: "Inter_600SemiBold",
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  bottomSection: {
    alignItems: "center",
    gap: 16,
    paddingBottom: 20,
  },
  diagnosticsLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
  },
  diagnosticsText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.warning,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
  },
  signOutText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.error,
  },
});
