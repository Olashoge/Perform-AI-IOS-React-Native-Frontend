import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors, ThemeColors } from "@/lib/theme-context";
import { useProfile, ProfileData } from "@/lib/api-hooks";
import { useWellness } from "@/lib/wellness-context";

const DIET_STYLE_OPTIONS = [
  "No Preference",
  "Nigerian",
  "Mediterranean",
  "Vegetarian",
  "Vegan",
  "Keto",
  "Paleo",
  "Indian",
  "Chinese",
  "Mexican",
  "Japanese",
  "Korean",
  "Thai",
  "Italian",
  "American",
];

const FOODS_TO_AVOID_OPTIONS = [
  "Pork",
  "Shellfish",
  "Dairy",
  "Gluten",
  "Soy",
  "Eggs",
  "Nuts",
  "Red Meat",
  "Fish",
  "Mushrooms",
  "Chicken",
  "Beans/Legumes",
  "Spicy Foods",
  "Garlic/Onion",
];

const PREP_STYLE_OPTIONS: { value: string; label: string }[] = [
  { value: "cook_daily", label: "Cook Daily" },
  { value: "batch_2day", label: "Meal Prep (2-day)" },
  { value: "batch_3to4day", label: "Meal Prep (3-4 day)" },
];

const BUDGET_OPTIONS: { value: string; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "budget_friendly", label: "Budget Friendly" },
];

const COOKING_TIME_OPTIONS: { value: string; label: string }[] = [
  { value: "quick", label: "Quick (under 30 min)" },
  { value: "normal", label: "Normal" },
];

const SPICE_LEVEL_OPTIONS: { value: string; label: string }[] = [
  { value: "none", label: "None" },
  { value: "mild", label: "Mild" },
  { value: "medium", label: "Medium" },
  { value: "hot", label: "Hot" },
];

const AUTHENTICITY_OPTIONS: { value: string; label: string }[] = [
  { value: "traditional", label: "Traditional" },
  { value: "weeknight", label: "Weeknight Easy" },
  { value: "mixed", label: "Mixed" },
];

const MEAL_SLOT_OPTIONS = ["breakfast", "lunch", "dinner"];

function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462);
}

function formatLabel(value: string): string {
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function getStepCount(planType: string): number {
  return planType === "both" ? 4 : 3;
}

function ProfileSummaryCard({ profile }: { profile: ProfileData }) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const isImperial = profile.unitSystem === "imperial";
  const weightDisplay =
    profile.weightKg != null
      ? isImperial
        ? `${kgToLbs(profile.weightKg)} lbs`
        : `${profile.weightKg} kg`
      : null;

  const items: { label: string; value: string }[] = [];
  if (profile.age != null) items.push({ label: "Age", value: String(profile.age) });
  if (weightDisplay) items.push({ label: "Weight", value: weightDisplay });
  if (profile.primaryGoal) items.push({ label: "Goal", value: formatLabel(profile.primaryGoal) });
  if (profile.trainingExperience) items.push({ label: "Experience", value: formatLabel(profile.trainingExperience) });
  if (profile.trainingDaysOfWeek?.length)
    items.push({ label: "Training days", value: profile.trainingDaysOfWeek.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(", ") });
  if (profile.allergiesIntolerances?.length)
    items.push({ label: "Allergies", value: profile.allergiesIntolerances.join(", ") });
  if (profile.foodsToAvoid?.length)
    items.push({ label: "Foods to avoid", value: profile.foodsToAvoid.join(", ") });
  if (profile.healthConstraints?.length)
    items.push({ label: "Health constraints", value: profile.healthConstraints.join(", ") });
  if (profile.favoriteMealsText)
    items.push({ label: "Favorite meals", value: profile.favoriteMealsText });
  if (profile.bodyContext)
    items.push({ label: "Body notes", value: profile.bodyContext });

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

export default function Step2Screen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const { data: profile } = useProfile();
  const { state, updateMealForm } = useWellness();
  const { mealForm } = state;
  const [showAdvanced, setShowAdvanced] = useState(false);

  const stepCount = getStepCount(state.planType);

  const handleDietStyleToggle = (style: string) => {
    Haptics.selectionAsync();
    if (style === "No Preference") {
      updateMealForm({ dietStyles: ["No Preference"] });
    } else {
      const current = mealForm.dietStyles.filter((s) => s !== "No Preference");
      const idx = current.indexOf(style);
      if (idx >= 0) {
        const next = current.filter((s) => s !== style);
        updateMealForm({ dietStyles: next.length === 0 ? ["No Preference"] : next });
      } else {
        updateMealForm({ dietStyles: [...current, style] });
      }
    }
  };

  const handleFoodToggle = (food: string) => {
    Haptics.selectionAsync();
    const current = mealForm.foodsToAvoid;
    if (current.includes(food)) {
      updateMealForm({ foodsToAvoid: current.filter((f) => f !== food) });
    } else {
      updateMealForm({ foodsToAvoid: [...current, food] });
    }
  };

  const handleMealsPerDay = (val: number) => {
    Haptics.selectionAsync();
    if (val === 3) {
      updateMealForm({ mealsPerDay: 3, mealSlots: undefined });
    } else {
      updateMealForm({ mealsPerDay: 2 });
    }
  };

  const handleMealSlotToggle = (slot: string) => {
    Haptics.selectionAsync();
    const current = mealForm.mealSlots ?? [];
    if (current.includes(slot)) {
      updateMealForm({ mealSlots: current.filter((s) => s !== slot) });
    } else if (current.length < 2) {
      updateMealForm({ mealSlots: [...current, slot] });
    }
  };

  const handleHouseholdChange = (delta: number) => {
    Haptics.selectionAsync();
    const next = Math.max(1, Math.min(8, mealForm.householdSize + delta));
    updateMealForm({ householdSize: next });
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (state.planType === "both") {
      router.push("/wellness/step3");
    } else {
      router.push("/wellness/step4");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
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
        keyboardDismissMode="interactive"
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </Pressable>
          <View style={styles.dotsRow}>
            {Array.from({ length: stepCount }).map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === 1 && styles.dotActive]}
              />
            ))}
          </View>
          <View style={{ width: 44 }} />
        </View>

        <Text style={styles.headerTitle}>Nutrition Setup</Text>
        <Text style={styles.headerSubtitle}>
          Customize your meal plan preferences
        </Text>

        {profile && <ProfileSummaryCard profile={profile} />}

        <Text style={styles.sectionLabel}>Diet / Cuisine Styles</Text>
        <View style={styles.pillGrid}>
          {DIET_STYLE_OPTIONS.map((style) => {
            const selected = mealForm.dietStyles.includes(style);
            return (
              <Pressable
                key={style}
                style={[styles.pill, selected && styles.pillActive]}
                onPress={() => handleDietStyleToggle(style)}
              >
                <Text style={[styles.pillText, selected && styles.pillTextActive]}>
                  {style}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Foods to Avoid</Text>
        <View style={styles.pillGrid}>
          {FOODS_TO_AVOID_OPTIONS.map((food) => {
            const selected = mealForm.foodsToAvoid.includes(food);
            return (
              <Pressable
                key={food}
                style={[styles.pill, selected && styles.pillActive]}
                onPress={() => handleFoodToggle(food)}
              >
                <Text style={[styles.pillText, selected && styles.pillTextActive]}>
                  {food}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Allergies & Intolerances</Text>
        <TextInput
          style={styles.textInput}
          value={mealForm.allergies}
          onChangeText={(t) => updateMealForm({ allergies: t })}
          placeholder="e.g. peanuts, shellfish, lactose, gluten"
          placeholderTextColor={Colors.textTertiary}
          multiline={false}
        />

        <Text style={styles.sectionLabel}>Meals Per Day</Text>
        <View style={styles.toggleRow}>
          <Pressable
            style={[styles.toggleBtn, mealForm.mealsPerDay === 2 && styles.toggleBtnActive]}
            onPress={() => handleMealsPerDay(2)}
          >
            <Text style={[styles.toggleBtnText, mealForm.mealsPerDay === 2 && styles.toggleBtnTextActive]}>
              2 Meals
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggleBtn, mealForm.mealsPerDay === 3 && styles.toggleBtnActive]}
            onPress={() => handleMealsPerDay(3)}
          >
            <Text style={[styles.toggleBtnText, mealForm.mealsPerDay === 3 && styles.toggleBtnTextActive]}>
              3 Meals (Full Day)
            </Text>
          </Pressable>
        </View>

        {mealForm.mealsPerDay === 2 && (
          <>
            <Text style={styles.sectionLabel}>Meal Slots (pick 2)</Text>
            <View style={styles.toggleRow}>
              {MEAL_SLOT_OPTIONS.map((slot) => {
                const selected = (mealForm.mealSlots ?? []).includes(slot);
                const disabled = !selected && (mealForm.mealSlots ?? []).length >= 2;
                return (
                  <Pressable
                    key={slot}
                    style={[
                      styles.checkboxBtn,
                      selected && styles.checkboxBtnActive,
                      disabled && styles.checkboxBtnDisabled,
                    ]}
                    onPress={() => !disabled && handleMealSlotToggle(slot)}
                    disabled={disabled}
                  >
                    <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
                      {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                    <Text
                      style={[
                        styles.checkboxLabel,
                        selected && styles.checkboxLabelActive,
                        disabled && styles.checkboxLabelDisabled,
                      ]}
                    >
                      {slot.charAt(0).toUpperCase() + slot.slice(1)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        <Text style={styles.sectionLabel}>Prep Style</Text>
        <View style={styles.optionColumn}>
          {PREP_STYLE_OPTIONS.map((opt) => {
            const selected = mealForm.prepStyle === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.optionBtn, selected && styles.optionBtnActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  updateMealForm({ prepStyle: opt.value });
                }}
              >
                <Text style={[styles.optionBtnText, selected && styles.optionBtnTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Budget</Text>
        <View style={styles.toggleRow}>
          {BUDGET_OPTIONS.map((opt) => {
            const selected = mealForm.budgetMode === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.toggleBtn, selected && styles.toggleBtnActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  updateMealForm({ budgetMode: opt.value });
                }}
              >
                <Text style={[styles.toggleBtnText, selected && styles.toggleBtnTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Cooking Time</Text>
        <View style={styles.toggleRow}>
          {COOKING_TIME_OPTIONS.map((opt) => {
            const selected = mealForm.cookingTime === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.toggleBtn, selected && styles.toggleBtnActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  updateMealForm({ cookingTime: opt.value });
                }}
              >
                <Text style={[styles.toggleBtnText, selected && styles.toggleBtnTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Spice Level</Text>
        <View style={styles.toggleRow}>
          {SPICE_LEVEL_OPTIONS.map((opt) => {
            const selected = mealForm.spiceLevel === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.toggleBtn, selected && styles.toggleBtnActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  updateMealForm({ spiceLevel: opt.value });
                }}
              >
                <Text style={[styles.toggleBtnText, selected && styles.toggleBtnTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Recipe Style</Text>
        <View style={styles.toggleRow}>
          {AUTHENTICITY_OPTIONS.map((opt) => {
            const selected = mealForm.authenticityMode === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.toggleBtn, selected && styles.toggleBtnActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  updateMealForm({ authenticityMode: opt.value });
                }}
              >
                <Text style={[styles.toggleBtnText, selected && styles.toggleBtnTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={styles.advancedToggle}
          onPress={() => {
            Haptics.selectionAsync();
            setShowAdvanced((v) => !v);
          }}
        >
          <Text style={styles.advancedToggleText}>
            {showAdvanced ? "Hide advanced options" : "Show advanced options"}
          </Text>
          <Ionicons
            name={showAdvanced ? "chevron-up" : "chevron-down"}
            size={16}
            color={Colors.primary}
          />
        </Pressable>

        {showAdvanced && (
          <>
            <Text style={styles.sectionLabel}>Household Size</Text>
            <View style={styles.numberRow}>
              <Pressable
                style={[styles.numberBtn, mealForm.householdSize <= 1 && styles.numberBtnDisabled]}
                onPress={() => handleHouseholdChange(-1)}
                disabled={mealForm.householdSize <= 1}
              >
                <Ionicons name="remove" size={20} color={mealForm.householdSize <= 1 ? Colors.textTertiary : Colors.text} />
              </Pressable>
              <Text style={styles.numberValue}>{mealForm.householdSize}</Text>
              <Pressable
                style={[styles.numberBtn, mealForm.householdSize >= 8 && styles.numberBtnDisabled]}
                onPress={() => handleHouseholdChange(1)}
                disabled={mealForm.householdSize >= 8}
              >
                <Ionicons name="add" size={20} color={mealForm.householdSize >= 8 ? Colors.textTertiary : Colors.text} />
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 16) + (Platform.OS === "web" ? 34 : 0) },
        ]}
      >
        <Pressable
          style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.85 }]}
          onPress={handleNext}
        >
          <Text style={styles.nextBtnText}>Next</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
  pillGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  pillActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "18",
  },
  pillText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  pillTextActive: {
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
  checkboxBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: "transparent",
    gap: 8,
  },
  checkboxBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "18",
  },
  checkboxBtnDisabled: {
    opacity: 0.4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.textTertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  checkboxLabelActive: {
    color: Colors.primary,
  },
  checkboxLabelDisabled: {
    color: Colors.textTertiary,
  },
  optionColumn: {
    gap: 10,
  },
  optionBtn: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  optionBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "18",
  },
  optionBtnText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  optionBtnTextActive: {
    color: Colors.primary,
    fontFamily: "Inter_600SemiBold",
  },
  advancedToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 28,
    paddingVertical: 12,
  },
  advancedToggleText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  numberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    justifyContent: "center",
  },
  numberBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  numberBtnDisabled: {
    opacity: 0.4,
  },
  numberValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    minWidth: 40,
    textAlign: "center",
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
