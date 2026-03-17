import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Icon } from "@/components/Icon";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors, ThemeColors } from "@/lib/theme-context";
import { useProfile, useCreateDailyMeal, ProfileData } from "@/lib/api-hooks";
import CalendarPickerField from "@/components/CalendarPickerField";
import { ExpandableChipSection } from "@/components/ExpandableChipSection";
import { kgToLbs } from "@/lib/weight-utils";

const WEB_TOP_INSET = 67;

const DIET_STYLE_OPTIONS = [
  "No Preference",
  "American",
  "Mediterranean",
  "Mexican",
  "Italian",
  "Nigerian",
  "Vegetarian",
  "Vegan",
  "Keto",
  "Paleo",
  "Indian",
  "Chinese",
  "Japanese",
  "Korean",
  "Thai",
];

const FOODS_TO_AVOID_OPTIONS = [
  "Gluten",
  "Dairy",
  "Shellfish",
  "Nuts",
  "Eggs",
  "Soy",
  "Pork",
  "Red Meat",
  "Fish",
  "Mushrooms",
  "Chicken",
  "Beans/Legumes",
  "Spicy Foods",
  "Garlic/Onion",
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

const MEAL_SLOT_OPTIONS = ["breakfast", "lunch", "dinner"];

function formatLabel(value: string): string {
  return value.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
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
  if (profile.allergiesIntolerances?.length)
    items.push({ label: "Allergies", value: profile.allergiesIntolerances.join(", ") });
  if (profile.foodsToAvoid?.length)
    items.push({ label: "Avoid", value: profile.foodsToAvoid.join(", ") });

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
            <Text style={styles.profileCardValue} numberOfLines={2}>
              {item.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function DailyMealFormScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? WEB_TOP_INSET : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const { date: paramDate } = useLocalSearchParams<{ date?: string }>();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const createDailyMeal = useCreateDailyMeal();
  const prefilled = useRef(false);

  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(paramDate || today);
  const [mealsPerDay, setMealsPerDay] = useState(3);
  const [mealSlots, setMealSlots] = useState<string[]>([]);
  const [dietStyles, setDietStyles] = useState<string[]>(["No Preference"]);
  const [foodsToAvoid, setFoodsToAvoid] = useState<string[]>([]);
  const [allergies, setAllergies] = useState("");
  const [mealNotes, setMealNotes] = useState("");
  const [budgetMode, setBudgetMode] = useState("normal");
  const [cookingTime, setCookingTime] = useState("normal");
  const [spiceLevel, setSpiceLevel] = useState("medium");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile && !prefilled.current) {
      prefilled.current = true;
      if (profile.foodsToAvoid?.length) setFoodsToAvoid([...profile.foodsToAvoid]);
      if (profile.allergiesIntolerances?.length)
        setAllergies(profile.allergiesIntolerances.join(", "));
      if (profile.spicePreference) {
        const map: Record<string, string> = { mild: "mild", medium: "medium", spicy: "hot" };
        setSpiceLevel(map[profile.spicePreference] || "medium");
      }
    }
  }, [profile]);

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
            Set up your profile first so we can personalize your meal plan.
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

  const handleDietStyleToggle = (style: string) => {
    Haptics.selectionAsync();
    if (style === "No Preference") {
      setDietStyles(["No Preference"]);
    } else {
      const current = dietStyles.filter((s) => s !== "No Preference");
      const idx = current.indexOf(style);
      if (idx >= 0) {
        const next = current.filter((s) => s !== style);
        setDietStyles(next.length === 0 ? ["No Preference"] : next);
      } else {
        setDietStyles([...current, style]);
      }
    }
  };

  const handleFoodToggle = (food: string) => {
    Haptics.selectionAsync();
    setFoodsToAvoid((prev) =>
      prev.includes(food) ? prev.filter((f) => f !== food) : [...prev, food]
    );
  };

  const handleMealsPerDay = (val: number) => {
    Haptics.selectionAsync();
    setMealsPerDay(val);
    if (val === 3) setMealSlots([]);
  };

  const handleMealSlotToggle = (slot: string) => {
    Haptics.selectionAsync();
    setMealSlots((prev) => {
      if (prev.includes(slot)) return prev.filter((s) => s !== slot);
      if (prev.length < 2) return [...prev, slot];
      return prev;
    });
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await createDailyMeal.mutateAsync({
        date,
        mealsPerDay,
        dietStyles,
        cookingTime,
        budgetMode,
        mealNotes: mealNotes.trim() || undefined,
      });
      router.replace({
        pathname: "/daily/generating",
        params: { type: "meal", date },
      } as any);
    } catch (err: any) {
      setSubmitting(false);
      if (err?.response?.status === 429) {
        Alert.alert(
          "Rate Limit",
          "You've reached the daily limit for AI-generated plans. Please try again tomorrow."
        );
      } else {
        Alert.alert(
          "Error",
          err?.response?.data?.message || "Something went wrong. Please try again."
        );
      }
    }
  };

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Icon name="back" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Daily Meal</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 100 }]}
        showsVerticalScrollIndicator={false}
        bottomOffset={60}
        keyboardDismissMode="interactive"
      >
        <ProfileSummaryCard profile={profile} />

        <View style={styles.dateSection}>
          <View style={styles.dateSectionHeader}>
            <Ionicons name="calendar" size={18} color={Colors.primary} />
            <Text style={styles.dateSectionLabel}>Date</Text>
          </View>
          <Text style={styles.dateSectionHelper}>Select the day for your meal plan</Text>
          <CalendarPickerField
            value={date}
            onChange={(d) => setDate(d || today)}
            Colors={Colors}
            planDuration={1}
          />
        </View>

        <Text style={styles.sectionLabel}>Diet / Cuisine Styles</Text>
        <ExpandableChipSection
          items={DIET_STYLE_OPTIONS}
          selectedItems={dietStyles}
          onToggle={handleDietStyleToggle}
          initialVisibleCount={6}
        />

        <Text style={styles.sectionLabel}>Foods to Avoid</Text>
        <ExpandableChipSection
          items={FOODS_TO_AVOID_OPTIONS}
          selectedItems={foodsToAvoid}
          onToggle={handleFoodToggle}
          initialVisibleCount={6}
        />

        <Text style={styles.sectionLabel}>Allergies & Intolerances</Text>
        <TextInput
          style={styles.textInput}
          value={allergies}
          onChangeText={setAllergies}
          placeholder="e.g. peanuts, shellfish, lactose, gluten"
          placeholderTextColor={Colors.textTertiary}
          multiline={false}
        />

        <Text style={styles.sectionLabel}>Meal Notes</Text>
        <TextInput
          style={[styles.textInput, { minHeight: 70 }]}
          value={mealNotes}
          onChangeText={setMealNotes}
          placeholder="Any additional preferences or context for today's meals..."
          placeholderTextColor={Colors.textTertiary}
          multiline
        />

        <Text style={styles.sectionLabel}>Meals Per Day</Text>
        <View style={styles.toggleRow}>
          <Pressable
            style={[styles.toggleBtn, mealsPerDay === 2 && styles.toggleBtnActive]}
            onPress={() => handleMealsPerDay(2)}
          >
            <Text style={[styles.toggleBtnText, mealsPerDay === 2 && styles.toggleBtnTextActive]}>
              2 Meals
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggleBtn, mealsPerDay === 3 && styles.toggleBtnActive]}
            onPress={() => handleMealsPerDay(3)}
          >
            <Text style={[styles.toggleBtnText, mealsPerDay === 3 && styles.toggleBtnTextActive]}>
              3 Meals (Full Day)
            </Text>
          </Pressable>
        </View>

        {mealsPerDay === 2 && (
          <>
            <Text style={styles.sectionLabel}>Meal Slots (pick 2)</Text>
            <View style={styles.toggleRow}>
              {MEAL_SLOT_OPTIONS.map((slot) => {
                const selected = mealSlots.includes(slot);
                const disabled = !selected && mealSlots.length >= 2;
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
                      {selected && <Icon name="checkmark" size={16} color="#fff" />}
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

        <Text style={styles.sectionLabel}>Budget</Text>
        <View style={styles.toggleRow}>
          {BUDGET_OPTIONS.map((opt) => {
            const selected = budgetMode === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.toggleBtn, selected && styles.toggleBtnActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setBudgetMode(opt.value);
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
            const selected = cookingTime === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.toggleBtn, selected && styles.toggleBtnActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setCookingTime(opt.value);
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
            const selected = spiceLevel === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.toggleBtn, selected && styles.toggleBtnActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSpiceLevel(opt.value);
                }}
              >
                <Text style={[styles.toggleBtnText, selected && styles.toggleBtnTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </KeyboardAwareScrollViewCompat>

      <View style={[styles.bottomBar, { paddingBottom: bottomInset + 12 }]}>
        <Pressable
          style={[styles.generateButton, submitting && { opacity: 0.5 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="sparkles" size={20} color="#fff" />
              <Text style={styles.generateButtonText}>Generate Daily Meal</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: Colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.text },
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: 20 },
    profileCard: {
      backgroundColor: Colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    profileCardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    profileCardTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text },
    profileEditLink: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.primary },
    profileCardGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    profileCardItem: { minWidth: "40%" },
    profileCardLabel: {
      fontSize: 10,
      fontFamily: "Inter_400Regular",
      color: Colors.textSecondary,
    },
    profileCardValue: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: Colors.text,
      marginTop: 2,
    },
    dateSection: {
      marginTop: 16,
      backgroundColor: Colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1.5,
      borderColor: Colors.primary + "40",
    },
    dateSectionHeader: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
      marginBottom: 4,
    },
    dateSectionLabel: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.text },
    dateSectionHelper: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      color: Colors.primary,
      marginBottom: 12,
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
    bottomBar: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: Colors.background,
      paddingHorizontal: 20,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: Colors.border,
    },
    generateButton: {
      backgroundColor: Colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    generateButtonText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
    profileRequired: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 32,
      gap: 12,
    },
    profileRequiredTitle: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      color: Colors.text,
      marginTop: 8,
    },
    profileRequiredText: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: Colors.textSecondary,
      textAlign: "center",
      lineHeight: 22,
    },
    profileRequiredButton: {
      backgroundColor: Colors.primary,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 32,
      marginTop: 12,
    },
    profileRequiredButtonText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  });
