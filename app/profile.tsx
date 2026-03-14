import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, IconName } from "@/components/Icon";
import { Pill, PillGrid } from "@/components/Pill";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors, ThemeColors } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";
import { EQUIPMENT_CATEGORIES, getEquipmentForLocation } from "@/lib/equipment-presets";
import { useProfile, useUpdateProfile, ProfileData } from "@/lib/api-hooks";
import { PRIMARY_GOAL_OPTIONS, SECONDARY_FOCUS_OPTIONS } from "@/lib/goal-helpers";

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
  icon: IconName;
  title: string;
}) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.sectionHeader}>
      <Icon name={icon} size={20} color={Colors.primary} />
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );
}

function FormField({
  label,
  children,
  helperText,
}: {
  label: string;
  children: React.ReactNode;
  helperText?: string;
}) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.formField}>
      <Text style={styles.formLabel}>{label}</Text>
      {children}
      {helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
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
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

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
      onSelect(selected === opt ? "" : opt);
    }
  };

  const isSelected = (opt: string) => {
    if (multi) {
      return Array.isArray(selected) && selected.includes(opt);
    }
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

function TagInput({
  tags,
  onChangeTags,
  placeholder,
}: {
  tags: string[];
  onChangeTags: (tags: string[]) => void;
  placeholder?: string;
}) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [inputValue, setInputValue] = useState("");

  const addTag = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChangeTags([...tags, trimmed]);
    }
    setInputValue("");
  };

  const removeTag = (tag: string) => {
    onChangeTags(tags.filter((t) => t !== tag));
  };

  return (
    <View>
      {tags.length > 0 && (
        <View style={styles.tagWrap}>
          {tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
              <Pressable onPress={() => removeTag(tag)} hitSlop={6}>
                <Icon name="close" size={16} color="#FFFFFF" />
              </Pressable>
            </View>
          ))}
        </View>
      )}
      <TextInput
        style={styles.textInput}
        value={inputValue}
        onChangeText={setInputValue}
        onSubmitEditing={addTag}
        returnKeyType="done"
        placeholderTextColor={Colors.textTertiary}
        placeholder={placeholder || "Type and press Enter to add"}
      />
    </View>
  );
}


const FOODS_TO_AVOID_PRESETS = [
  "Pork", "Shellfish", "Dairy", "Gluten", "Soy", "Eggs", "Nuts",
  "Red Meat", "Fish", "Mushrooms", "Chicken", "Beans/Legumes",
  "Spicy Foods", "Garlic/Onion",
];

function EquipmentAccordion({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (item: string) => void;
}) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = (name: string) => {
    setOpenCategories((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <View>
      {EQUIPMENT_CATEGORIES.map((cat) => {
        const isOpen = !!openCategories[cat.name];
        const count = cat.items.filter((item) => selected.includes(item)).length;
        return (
          <View key={cat.name} style={styles.accordionSection}>
            <Pressable
              style={styles.accordionHeader}
              onPress={() => toggleCategory(cat.name)}
            >
              <View style={styles.accordionHeaderLeft}>
                <Icon
                  name={isOpen ? "chevronDown" : "forward"}
                  size={16}
                  color={Colors.textSecondary}
                />
                <Text style={styles.accordionHeaderText}>{cat.name}</Text>
              </View>
              {count > 0 && (
                <View style={styles.accordionBadge}>
                  <Text style={styles.accordionBadgeText}>{count}</Text>
                </View>
              )}
            </Pressable>
            {isOpen && (
              <PillGrid>
                {cat.items.map((item) => {
                  const active = selected.includes(item);
                  return (
                    <Pill
                      key={item}
                      label={item}
                      selected={active}
                      onPress={() => {
                        Haptics.selectionAsync();
                        onToggle(item);
                      }}
                      variant="rounded"
                    />
                  );
                })}
              </PillGrid>
            )}
          </View>
        );
      })}
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
  secondaryFocus: null,
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
  mealNotes: "",
  appetiteLevel: "",
  spicePreference: "",
  bodyContext: "",
  favoriteMealsText: "",
  workoutLocationDefault: "",
  equipmentAvailable: [],
  equipmentOtherNotes: "",
  workoutNotes: "",
};

function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54;
  let feet = Math.floor(totalInches / 12);
  let inches = Math.round(totalInches % 12);
  if (inches === 12) {
    feet += 1;
    inches = 0;
  }
  return { feet, inches };
}

function feetInchesToCm(feet: number, inches: number): number {
  return Math.round((feet * 12 + inches) * 2.54 * 10) / 10;
}

import { kgToLbs, lbsToKg, formatWeightDisplay, parseWeightInput } from "@/lib/weight-utils";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const profile = useProfile();
  const updateProfile = useUpdateProfile();
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const [formData, setFormData] = useState<ProfileData>({ ...defaultFormData });
  const [loaded, setLoaded] = useState(false);

  const [weightText, setWeightText] = useState("");
  const [targetWeightText, setTargetWeightText] = useState("");
  const [ageText, setAgeText] = useState("");
  const [heightCmText, setHeightCmText] = useState("");
  const [feetText, setFeetText] = useState("");
  const [inchesText, setInchesText] = useState("");
  const [sleepText, setSleepText] = useState("");
  const [sessionDurationText, setSessionDurationText] = useState("");

  useEffect(() => {
    if (profile.data && !loaded) {
      const d = { ...defaultFormData, ...profile.data };
      // Migrate legacy foodsToAvoidNotes → mealNotes
      if (!d.mealNotes && (profile.data as any).foodsToAvoidNotes) {
        d.mealNotes = (profile.data as any).foodsToAvoidNotes;
      }
      setFormData(d);
      setLoaded(true);
      const imp = d.unitSystem === "imperial";
      setWeightText(formatWeightDisplay(d.weightKg, imp ? "imperial" : "metric"));
      setTargetWeightText(formatWeightDisplay(d.targetWeightKg, imp ? "imperial" : "metric"));
      setAgeText(d.age != null ? String(d.age) : "");
      setHeightCmText(d.heightCm != null ? String(d.heightCm) : "");
      if (d.heightCm != null) {
        const fi = cmToFeetInches(d.heightCm);
        setFeetText(String(fi.feet));
        setInchesText(String(fi.inches));
      }
      setSleepText(d.sleepHours != null ? String(d.sleepHours) : "");
      setSessionDurationText(d.sessionDurationMinutes != null ? String(d.sessionDurationMinutes) : "");
    }
  }, [profile.data, loaded]);

  const updateField = <K extends keyof ProfileData>(
    key: K,
    value: ProfileData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const isImperial = formData.unitSystem === "imperial";

  useEffect(() => {
    if (!loaded) return;
    setWeightText(formatWeightDisplay(formData.weightKg, isImperial ? "imperial" : "metric"));
    setTargetWeightText(formatWeightDisplay(formData.targetWeightKg, isImperial ? "imperial" : "metric"));
    if (formData.heightCm != null) {
      if (isImperial) {
        const fi = cmToFeetInches(formData.heightCm);
        setFeetText(String(fi.feet));
        setInchesText(String(fi.inches));
      } else {
        setHeightCmText(String(formData.heightCm));
      }
    }
  }, [formData.unitSystem]);

  const handleWeightChange = (
    key: "weightKg" | "targetWeightKg",
    text: string
  ) => {
    if (key === "weightKg") setWeightText(text);
    else setTargetWeightText(text);
  };

  const commitWeight = (key: "weightKg" | "targetWeightKg") => {
    const text = key === "weightKg" ? weightText : targetWeightText;
    const parsed = parseWeightInput(text);
    if (parsed == null) {
      updateField(key, null);
      if (key === "weightKg") setWeightText("");
      else setTargetWeightText("");
      return;
    }
    const inKg = isImperial ? lbsToKg(parsed) : parsed;
    updateField(key, inKg);
    const displayVal = formatWeightDisplay(inKg, isImperial ? "imperial" : "metric");
    if (key === "weightKg") setWeightText(displayVal);
    else setTargetWeightText(displayVal);
  };

  const handleLocationChange = (location: string) => {
    updateField("workoutLocationDefault", location as any);
    const preset = getEquipmentForLocation(location);
    if (preset.length > 0) {
      updateField("equipmentAvailable", preset as any);
    }
  };

  const handleEquipmentToggle = (item: string) => {
    const arr = formData.equipmentAvailable;
    if (arr.includes(item)) {
      updateField("equipmentAvailable", arr.filter((v) => v !== item) as any);
    } else {
      updateField("equipmentAvailable", [...arr, item] as any);
    }
  };

  const currentFeetInches = formData.heightCm != null
    ? cmToFeetInches(formData.heightCm)
    : { feet: 0, inches: 0 };

  const handleFeetChange = (text: string) => {
    setFeetText(text);
  };
  const commitFeet = () => {
    const feet = parseInt(feetText) || 0;
    const inches = parseInt(inchesText) || 0;
    updateField("heightCm", feetInchesToCm(feet, inches));
  };

  const handleInchesChange = (text: string) => {
    setInchesText(text);
  };
  const commitInches = () => {
    const feet = parseInt(feetText) || 0;
    const inches = parseInt(inchesText) || 0;
    updateField("heightCm", feetInchesToCm(feet, inches));
  };

  const handleCmChange = (text: string) => {
    setHeightCmText(text);
  };
  const commitHeightCm = () => {
    const num = parseFloat(heightCmText);
    if (heightCmText === "" || isNaN(num)) {
      updateField("heightCm", null);
      return;
    }
    updateField("heightCm", num);
  };

  const foodsToAvoidPresetSelected = formData.foodsToAvoid.filter((f) =>
    FOODS_TO_AVOID_PRESETS.includes(f)
  );
  const foodsToAvoidCustom = formData.foodsToAvoid.filter(
    (f) => !FOODS_TO_AVOID_PRESETS.includes(f)
  );

  const handleFoodsToAvoidPresetToggle = (val: string | string[]) => {
    const presetArr = Array.isArray(val) ? val : [val];
    updateField("foodsToAvoid", [...presetArr, ...foodsToAvoidCustom] as any);
  };

  const handleFoodsToAvoidCustomChange = (customTags: string[]) => {
    updateField("foodsToAvoid", [...foodsToAvoidPresetSelected, ...customTags] as any);
  };

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync(formData);
      Alert.alert("Success", "Profile updated successfully");
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to update profile");
    }
  };

  if (profile.isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Icon name="back" size={28} />
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: insets.bottom + 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
        bottomOffset={60}
      >

        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            {user?.firstName ? (
              <Text style={styles.avatarInitial}>{user.firstName.slice(0, 1).toUpperCase()}</Text>
            ) : (
              <Icon name="person" size={28} color={Colors.primary} />
            )}
          </View>
          <Text style={styles.userName}>
            {user?.firstName || user?.name || "Account"}
          </Text>
          {user?.email && <Text style={styles.userEmail}>{user.email}</Text>}
        </View>

        <SectionHeader icon="body" title="PHYSICAL STATS & GOALS" />
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
              value={ageText}
              onChangeText={setAgeText}
              onBlur={() => updateField("age", ageText === "" ? null : parseInt(ageText) || null)}
              keyboardType="numeric"
              placeholderTextColor={Colors.textTertiary}
              placeholder="Enter age"
            />
          </FormField>

          <FormField label="Sex">
            <SegmentedControl
              options={["male", "female", "other"]}
              labels={["Male", "Female", "Other"]}
              selected={formData.sex}
              onSelect={(v) => updateField("sex", v)}
            />
          </FormField>

          {isImperial ? (
            <FormField label="Height (ft / in)">
              <View style={styles.heightRow}>
                <View style={styles.heightInputWrap}>
                  <TextInput
                    style={[styles.textInput, styles.heightTextInput]}
                    value={feetText}
                    onChangeText={handleFeetChange}
                    onBlur={commitFeet}
                    keyboardType="numeric"
                    placeholderTextColor={Colors.textTertiary}
                    placeholder="ft"
                  />
                  <Text style={styles.heightUnit}>ft</Text>
                </View>
                <View style={styles.heightInputWrap}>
                  <TextInput
                    style={[styles.textInput, styles.heightTextInput]}
                    value={inchesText}
                    onChangeText={handleInchesChange}
                    onBlur={commitInches}
                    keyboardType="numeric"
                    placeholderTextColor={Colors.textTertiary}
                    placeholder="in"
                  />
                  <Text style={styles.heightUnit}>in</Text>
                </View>
              </View>
            </FormField>
          ) : (
            <FormField label="Height (cm)">
              <TextInput
                style={styles.textInput}
                value={heightCmText}
                onChangeText={handleCmChange}
                onBlur={commitHeightCm}
                keyboardType="numeric"
                placeholderTextColor={Colors.textTertiary}
                placeholder="e.g. 180"
              />
            </FormField>
          )}

          <FormField
            label={isImperial ? "Current Weight (lbs)" : "Current Weight (kg)"}
          >
            <TextInput
              style={styles.textInput}
              value={weightText}
              onChangeText={(t) => handleWeightChange("weightKg", t)}
              onBlur={() => commitWeight("weightKg")}
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
              value={targetWeightText}
              onChangeText={(t) => handleWeightChange("targetWeightKg", t)}
              onBlur={() => commitWeight("targetWeightKg")}
              keyboardType="numeric"
              placeholderTextColor={Colors.textTertiary}
              placeholder={isImperial ? "e.g. 165" : "e.g. 75"}
            />
          </FormField>

          <FormField label="Primary Goal">
            <PillSelector
              options={PRIMARY_GOAL_OPTIONS.map((g) => g.value)}
              labels={PRIMARY_GOAL_OPTIONS.map((g) => g.label)}
              selected={formData.primaryGoal}
              onSelect={(v) => { if (v) updateField("primaryGoal", v as string); }}
            />
          </FormField>

          <FormField label="Secondary Focus — optional">
            <PillSelector
              options={SECONDARY_FOCUS_OPTIONS.map((g) => g.value)}
              labels={SECONDARY_FOCUS_OPTIONS.map((g) => g.label)}
              selected={formData.secondaryFocus || ""}
              onSelect={(v) => updateField("secondaryFocus", formData.secondaryFocus === v ? null : (v as string))}
            />
          </FormField>

          <FormField label="Body Context / Notes for AI">
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={formData.bodyContext}
              onChangeText={(t) => updateField("bodyContext", t)}
              multiline
              placeholderTextColor={Colors.textTertiary}
              placeholder="Share body goals, body type, challenges, or anything important for your plan."
            />
          </FormField>
        </View>

        <SectionHeader icon="medkit" title="HEALTH & MEDICAL" />
        <View style={styles.sectionCard}>
          <FormField label="Sleep Hours">
            <TextInput
              style={styles.textInput}
              value={sleepText}
              onChangeText={setSleepText}
              onBlur={() => updateField("sleepHours", sleepText === "" ? null : parseFloat(sleepText) || null)}
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

          <FormField label="Health Constraints">
            <TagInput
              tags={formData.healthConstraints}
              onChangeTags={(tags) => updateField("healthConstraints", tags as any)}
              placeholder="e.g. torn ACL, limited shoulder ROM, asthma, diabetes"
            />
          </FormField>
        </View>

        <SectionHeader icon="barbell" title="TRAINING CAPACITY" />
        <View style={styles.sectionCard}>
          <FormField label="Training Experience">
            <PillSelector
              options={["beginner", "intermediate", "advanced"]}
              labels={["Beginner", "Intermediate", "Advanced"]}
              selected={formData.trainingExperience}
              onSelect={(v) => updateField("trainingExperience", v as string)}
            />
          </FormField>

          <FormField label="Activity Level">
            <PillSelector
              options={["sedentary", "moderate", "active"]}
              labels={["Sedentary", "Moderately Active", "Very Active"]}
              selected={formData.activityLevel}
              onSelect={(v) => updateField("activityLevel", v as string)}
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
              value={sessionDurationText}
              onChangeText={setSessionDurationText}
              onBlur={() => updateField("sessionDurationMinutes", sessionDurationText === "" ? null : parseInt(sessionDurationText) || null)}
              keyboardType="numeric"
              placeholderTextColor={Colors.textTertiary}
              placeholder="e.g. 60"
            />
          </FormField>
        </View>

        <SectionHeader
          icon="location"
          title="WORKOUT LOCATION & EQUIPMENT"
        />
        <View style={styles.sectionCard}>
          <FormField label="Workout Location">
            <PillSelector
              options={["gym", "home", "outdoors"]}
              labels={["Gym", "Home", "Outdoors"]}
              selected={formData.workoutLocationDefault}
              onSelect={(v) => handleLocationChange(v as string)}
            />
          </FormField>

          <FormField label="Equipment Available">
            <EquipmentAccordion
              selected={formData.equipmentAvailable}
              onToggle={handleEquipmentToggle}
            />
          </FormField>

          <FormField label="Equipment Notes">
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={formData.equipmentOtherNotes}
              onChangeText={(t) => updateField("equipmentOtherNotes", t)}
              multiline
              placeholderTextColor={Colors.textTertiary}
              placeholder="Any other equipment or notes not listed above..."
            />
          </FormField>

          <FormField label="Workout Notes">
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={formData.workoutNotes}
              onChangeText={(t) => updateField("workoutNotes", t)}
              multiline
              placeholderTextColor={Colors.textTertiary}
              placeholder="Any additional workout preferences or context for the AI..."
            />
          </FormField>
        </View>

        <SectionHeader icon="nutrition" title="NUTRITION & LIFESTYLE" />
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
              options={["mild", "medium", "spicy"]}
              labels={["Mild", "Medium", "Spicy"]}
              selected={formData.spicePreference}
              onSelect={(v) => updateField("spicePreference", v as string)}
            />
          </FormField>

          <FormField label="Allergies & Intolerances">
            <TagInput
              tags={formData.allergiesIntolerances}
              onChangeTags={(tags) => updateField("allergiesIntolerances", tags as any)}
              placeholder="e.g. peanuts, shellfish, lactose, gluten"
            />
          </FormField>

          <FormField label="Foods to Avoid">
            <PillSelector
              options={FOODS_TO_AVOID_PRESETS}
              selected={foodsToAvoidPresetSelected}
              onSelect={handleFoodsToAvoidPresetToggle}
              multi
            />
            <View style={{ marginTop: 10 }}>
              <TagInput
                tags={foodsToAvoidCustom}
                onChangeTags={handleFoodsToAvoidCustomChange}
                placeholder="Add custom items..."
              />
            </View>
          </FormField>

          <FormField label="Meal Notes">
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={formData.mealNotes}
              onChangeText={(t) => updateField("mealNotes", t)}
              multiline
              placeholderTextColor={Colors.textTertiary}
              placeholder="Any additional meal preferences, cultural context, or notes for the AI..."
            />
          </FormField>

          <FormField
            label="Favorite Meals"
            helperText="AI will include healthier versions of your favorites when possible."
          >
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={formData.favoriteMealsText}
              onChangeText={(t) => updateField("favoriteMealsText", t)}
              multiline
              placeholderTextColor={Colors.textTertiary}
              placeholder="e.g. chicken stir-fry, overnight oats, grilled salmon with veggies, Greek yogurt bowls"
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
            <Icon name="bug" size={20} color={Colors.warning} />
            <Text style={styles.diagnosticsText}>Diagnostics</Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
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
  avatarInitial: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  userName: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  userEmail: {
    fontSize: 12,
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
    fontSize: 11,
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
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  helperText: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    marginTop: 6,
  },
  textInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
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
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  segmentedBtnTextActive: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
  },
  heightRow: {
    flexDirection: "row",
    gap: 12,
  },
  heightInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heightTextInput: {
    flex: 1,
  },
  heightUnit: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "#FFFFFF",
  },
  accordionSection: {
    marginBottom: 8,
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  accordionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  accordionHeaderText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  accordionBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  accordionBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
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
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
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
    fontSize: 13,
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
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.error,
  },
});
