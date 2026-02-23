import React, { useState, useEffect, useRef } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Crypto from "expo-crypto";
import Colors from "@/constants/colors";
import {
  useProfile,
  useOccupiedDates,
  useCreateMealPlan,
  ProfileData,
} from "@/lib/api-hooks";

const WEB_TOP_INSET = 67;

const GOAL_OPTIONS = [
  { value: "weight_loss", label: "Weight Loss" },
  { value: "muscle_gain", label: "Muscle Gain" },
  { value: "energy", label: "Energy & Focus" },
  { value: "maintenance", label: "Maintenance" },
  { value: "performance", label: "Performance" },
];

const DIET_STYLE_OPTIONS = [
  "No Preference", "Nigerian", "Mediterranean", "Vegetarian", "Vegan",
  "Keto", "Paleo", "Indian", "Chinese", "Mexican", "Japanese", "Korean",
  "Thai", "Italian", "American",
];

const FOODS_TO_AVOID_OPTIONS = [
  "Pork", "Shellfish", "Dairy", "Gluten", "Soy", "Eggs", "Nuts",
  "Red Meat", "Fish", "Mushrooms", "Chicken", "Beans/Legumes",
  "Spicy Foods", "Garlic/Onion",
];

const PREP_STYLE_OPTIONS = [
  { value: "cook_daily", label: "Cook Daily" },
  { value: "batch_2day", label: "Meal Prep (2-day)" },
  { value: "batch_3to4day", label: "Meal Prep (3-4 day)" },
];

const BUDGET_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "budget_friendly", label: "Budget Friendly" },
];

const COOKING_TIME_OPTIONS = [
  { value: "quick", label: "Quick (under 30 min)" },
  { value: "normal", label: "Normal" },
];

const SPICE_LEVEL_OPTIONS = [
  { value: "none", label: "None" },
  { value: "mild", label: "Mild" },
  { value: "medium", label: "Medium" },
  { value: "hot", label: "Hot" },
];

const AUTHENTICITY_OPTIONS = [
  { value: "traditional", label: "Traditional" },
  { value: "weeknight", label: "Weeknight Easy" },
  { value: "mixed", label: "Mixed" },
];

const MEAL_SLOT_OPTIONS = ["breakfast", "lunch", "dinner"];

function mapGoalForMeal(goal: string): string {
  if (["general_fitness", "mobility"].includes(goal)) return "maintenance";
  if (goal === "energy") return "energy";
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

function wouldOverlap(startDate: string, occupiedDates: string[]): boolean {
  const occupied = new Set(occupiedDates);
  const start = new Date(startDate + "T12:00:00Z");
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    if (occupied.has(d.toISOString().split("T")[0])) return true;
  }
  return false;
}

function getDateOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const today = new Date();
  for (let i = 0; i < 28; i++) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + i));
    const dayOfWeek = d.getUTCDay();
    if (dayOfWeek === 1) {
      const dateStr = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
      options.push({ value: dateStr, label: `Mon, ${label.split(", ").slice(1).join(", ")}` });
    }
  }
  if (options.length === 0) {
    const d = new Date();
    const diff = d.getUTCDay() === 0 ? 1 : 8 - d.getUTCDay();
    const nextMon = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff));
    options.push({
      value: nextMon.toISOString().split("T")[0],
      label: nextMon.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }),
    });
  }
  return options;
}

function ProfileSummaryCard({ profile }: { profile: ProfileData }) {
  const isImperial = profile.unitSystem === "imperial";
  const weightDisplay = profile.weightKg != null
    ? isImperial ? `${kgToLbs(profile.weightKg)} lbs` : `${profile.weightKg} kg`
    : null;

  const items: { label: string; value: string }[] = [];
  if (profile.age != null) items.push({ label: "Age", value: String(profile.age) });
  if (weightDisplay) items.push({ label: "Weight", value: weightDisplay });
  if (profile.primaryGoal) items.push({ label: "Goal", value: formatLabel(profile.primaryGoal) });
  if (profile.trainingDaysOfWeek?.length)
    items.push({ label: "Training days", value: profile.trainingDaysOfWeek.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(", ") });
  if (profile.allergiesIntolerances?.length)
    items.push({ label: "Allergies", value: profile.allergiesIntolerances.join(", ") });
  if (profile.foodsToAvoid?.length)
    items.push({ label: "Foods to avoid", value: profile.foodsToAvoid.join(", ") });
  if (profile.favoriteMealsText)
    items.push({ label: "Favorites", value: profile.favoriteMealsText });

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

export default function NewMealPlanScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? WEB_TOP_INSET : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: occupiedDates } = useOccupiedDates();
  const createMeal = useCreateMealPlan();
  const prefilled = useRef(false);

  const [goal, setGoal] = useState("weight_loss");
  const [mealsPerDay, setMealsPerDay] = useState(3);
  const [mealSlots, setMealSlots] = useState<string[]>([]);
  const [dietStyles, setDietStyles] = useState<string[]>(["No Preference"]);
  const [foodsToAvoid, setFoodsToAvoid] = useState<string[]>([]);
  const [allergies, setAllergies] = useState("");
  const [favoriteMeals, setFavoriteMeals] = useState("");
  const [spiceLevel, setSpiceLevel] = useState("medium");
  const [prepStyle, setPrepStyle] = useState("cook_daily");
  const [budgetMode, setBudgetMode] = useState("normal");
  const [cookingTime, setCookingTime] = useState("normal");
  const [authenticityMode, setAuthenticityMode] = useState("mixed");
  const [householdSize, setHouseholdSize] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile && !prefilled.current) {
      prefilled.current = true;
      if (profile.primaryGoal) setGoal(mapGoalForMeal(profile.primaryGoal));
      if (profile.foodsToAvoid?.length) setFoodsToAvoid([...profile.foodsToAvoid]);
      if (profile.allergiesIntolerances?.length) setAllergies(profile.allergiesIntolerances.join(", "));
      if (profile.favoriteMealsText) setFavoriteMeals(profile.favoriteMealsText);
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
          <Ionicons name="person-circle-outline" size={64} color={Colors.textSecondary} />
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

  const dateOptions = getDateOptions();
  const selectedDateConflict = startDate && occupiedDates ? wouldOverlap(startDate, occupiedDates) : false;

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

  const handleMealSlotToggle = (slot: string) => {
    Haptics.selectionAsync();
    setMealSlots((prev) => {
      if (prev.includes(slot)) {
        return prev.filter((s) => s !== slot);
      }
      if (prev.length < 2) return [...prev, slot];
      return prev;
    });
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (selectedDateConflict) {
      Alert.alert("Date Conflict", "The selected start date overlaps with an existing meal plan. Please choose another date.");
      return;
    }

    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const workoutDays = profile.trainingDaysOfWeek || [];

    const payload: any = {
      goal,
      mealsPerDay,
      dietStyles: dietStyles.includes("No Preference") ? [] : dietStyles,
      cuisineStyles: dietStyles.includes("No Preference") ? [] : dietStyles,
      foodsToAvoid,
      allergies: allergies ? allergies.split(",").map((s) => s.trim()).filter(Boolean) : [],
      allergiesIntolerances: allergies ? allergies.split(",").map((s) => s.trim()).filter(Boolean) : [],
      favoriteMeals: favoriteMeals || undefined,
      spiceLevel,
      prepStyle,
      budgetMode,
      cookingTime,
      authenticityMode,
      householdSize,
      workoutDays,
      workoutDaysPerWeek: workoutDays.length,
      idempotencyKey: Crypto.randomUUID(),
    };

    if (mealsPerDay === 2 && mealSlots.length === 2) {
      payload.mealSlots = mealSlots;
    }

    if (startDate) {
      payload.startDate = startDate;
    }

    try {
      const result = await createMeal.mutateAsync(payload);
      const planId = result?._id || result?.id || result?.planId;
      if (planId) {
        router.replace(`/meal/generating?planId=${planId}`);
      } else {
        Alert.alert("Error", "Could not start meal plan generation. Please try again.");
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
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>7-Day Meal Plan</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ProfileSummaryCard profile={profile} />

        <Text style={styles.sectionTitle}>Your Goal</Text>
        <View style={styles.pillGrid}>
          {GOAL_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[styles.pill, goal === opt.value && styles.pillActive]}
              onPress={() => { Haptics.selectionAsync(); setGoal(opt.value); }}
            >
              <Text style={[styles.pillText, goal === opt.value && styles.pillTextActive]}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Meals Per Day</Text>
        <View style={styles.pillGrid}>
          {[2, 3].map((n) => (
            <Pressable
              key={n}
              style={[styles.pill, mealsPerDay === n && styles.pillActive]}
              onPress={() => { Haptics.selectionAsync(); setMealsPerDay(n); if (n === 3) setMealSlots([]); }}
            >
              <Text style={[styles.pillText, mealsPerDay === n && styles.pillTextActive]}>{n} meals</Text>
            </Pressable>
          ))}
        </View>

        {mealsPerDay === 2 && (
          <>
            <Text style={styles.sectionSubLabel}>Select 2 meals</Text>
            <View style={styles.pillGrid}>
              {MEAL_SLOT_OPTIONS.map((slot) => (
                <Pressable
                  key={slot}
                  style={[styles.pill, mealSlots.includes(slot) && styles.pillActive]}
                  onPress={() => handleMealSlotToggle(slot)}
                >
                  <Text style={[styles.pillText, mealSlots.includes(slot) && styles.pillTextActive]}>
                    {slot.charAt(0).toUpperCase() + slot.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>Cuisine Style</Text>
        <View style={styles.pillGrid}>
          {DIET_STYLE_OPTIONS.map((style) => (
            <Pressable
              key={style}
              style={[styles.pill, dietStyles.includes(style) && styles.pillActive]}
              onPress={() => handleDietStyleToggle(style)}
            >
              <Text style={[styles.pillText, dietStyles.includes(style) && styles.pillTextActive]}>{style}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Foods to Avoid</Text>
        <View style={styles.pillGrid}>
          {FOODS_TO_AVOID_OPTIONS.map((food) => (
            <Pressable
              key={food}
              style={[styles.pill, foodsToAvoid.includes(food) && styles.pillActive]}
              onPress={() => handleFoodToggle(food)}
            >
              <Text style={[styles.pillText, foodsToAvoid.includes(food) && styles.pillTextActive]}>{food}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Allergies & Intolerances</Text>
        <TextInput
          style={styles.textInput}
          value={allergies}
          onChangeText={setAllergies}
          placeholder="e.g. Dairy, Gluten"
          placeholderTextColor={Colors.textTertiary}
          multiline
        />

        <Text style={styles.sectionTitle}>Favorite Meals</Text>
        <TextInput
          style={styles.textInput}
          value={favoriteMeals}
          onChangeText={setFavoriteMeals}
          placeholder="e.g. Jollof rice, grilled chicken"
          placeholderTextColor={Colors.textTertiary}
          multiline
        />

        <Text style={styles.sectionTitle}>Spice Level</Text>
        <View style={styles.pillGrid}>
          {SPICE_LEVEL_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[styles.pill, spiceLevel === opt.value && styles.pillActive]}
              onPress={() => { Haptics.selectionAsync(); setSpiceLevel(opt.value); }}
            >
              <Text style={[styles.pillText, spiceLevel === opt.value && styles.pillTextActive]}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Prep Style</Text>
        <View style={styles.pillGrid}>
          {PREP_STYLE_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[styles.pill, prepStyle === opt.value && styles.pillActive]}
              onPress={() => { Haptics.selectionAsync(); setPrepStyle(opt.value); }}
            >
              <Text style={[styles.pillText, prepStyle === opt.value && styles.pillTextActive]}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={styles.advancedToggle}
          onPress={() => { Haptics.selectionAsync(); setShowAdvanced(!showAdvanced); }}
        >
          <Text style={styles.advancedToggleText}>Advanced Options</Text>
          <Ionicons name={showAdvanced ? "chevron-up" : "chevron-down"} size={18} color={Colors.textSecondary} />
        </Pressable>

        {showAdvanced && (
          <View style={styles.advancedSection}>
            <Text style={styles.sectionTitle}>Budget</Text>
            <View style={styles.pillGrid}>
              {BUDGET_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[styles.pill, budgetMode === opt.value && styles.pillActive]}
                  onPress={() => { Haptics.selectionAsync(); setBudgetMode(opt.value); }}
                >
                  <Text style={[styles.pillText, budgetMode === opt.value && styles.pillTextActive]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Cooking Time</Text>
            <View style={styles.pillGrid}>
              {COOKING_TIME_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[styles.pill, cookingTime === opt.value && styles.pillActive]}
                  onPress={() => { Haptics.selectionAsync(); setCookingTime(opt.value); }}
                >
                  <Text style={[styles.pillText, cookingTime === opt.value && styles.pillTextActive]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Recipe Style</Text>
            <View style={styles.pillGrid}>
              {AUTHENTICITY_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[styles.pill, authenticityMode === opt.value && styles.pillActive]}
                  onPress={() => { Haptics.selectionAsync(); setAuthenticityMode(opt.value); }}
                >
                  <Text style={[styles.pillText, authenticityMode === opt.value && styles.pillTextActive]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Household Size</Text>
            <View style={styles.pillGrid}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <Pressable
                  key={n}
                  style={[styles.pill, householdSize === n && styles.pillActive, { minWidth: 44 }]}
                  onPress={() => { Haptics.selectionAsync(); setHouseholdSize(n); }}
                >
                  <Text style={[styles.pillText, householdSize === n && styles.pillTextActive]}>{n}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Start Date</Text>
        <Text style={styles.sectionHint}>Optional — leave blank to create without scheduling</Text>
        <View style={styles.pillGrid}>
          <Pressable
            style={[styles.pill, !startDate && styles.pillActive]}
            onPress={() => { Haptics.selectionAsync(); setStartDate(""); }}
          >
            <Text style={[styles.pillText, !startDate && styles.pillTextActive]}>No date</Text>
          </Pressable>
          {dateOptions.map((opt) => {
            const isConflict = occupiedDates ? wouldOverlap(opt.value, occupiedDates) : false;
            return (
              <Pressable
                key={opt.value}
                style={[
                  styles.pill,
                  startDate === opt.value && styles.pillActive,
                  isConflict && styles.pillConflict,
                ]}
                onPress={() => {
                  if (isConflict) {
                    Alert.alert("Date Unavailable", "This week overlaps with an existing scheduled meal plan.");
                    return;
                  }
                  Haptics.selectionAsync();
                  setStartDate(opt.value);
                }}
              >
                <Text
                  style={[
                    styles.pillText,
                    startDate === opt.value && styles.pillTextActive,
                    isConflict && styles.pillTextConflict,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: bottomInset + 12 }]}>
        <Pressable
          style={[styles.generateButton, (submitting || selectedDateConflict) && { opacity: 0.5 }]}
          onPress={handleSubmit}
          disabled={submitting || !!selectedDateConflict}
        >
          {submitting ? (
            <ActivityIndicator color={Colors.text} />
          ) : (
            <>
              <Ionicons name="sparkles" size={20} color={Colors.text} />
              <Text style={styles.generateButtonText}>Generate Meal Plan</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  profileCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    marginBottom: 24, borderWidth: 1, borderColor: Colors.border,
  },
  profileCardHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12,
  },
  profileCardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text },
  profileEditLink: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.primary },
  profileCardGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  profileCardItem: { minWidth: "40%" },
  profileCardLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  profileCardValue: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.text, marginTop: 2 },
  sectionTitle: {
    fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.text, marginBottom: 10, marginTop: 20,
  },
  sectionSubLabel: {
    fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginBottom: 8,
  },
  sectionHint: {
    fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textTertiary, marginBottom: 10,
  },
  pillGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  pillActive: { backgroundColor: Colors.primary + "20", borderColor: Colors.primary },
  pillConflict: { backgroundColor: Colors.error + "10", borderColor: Colors.error + "40" },
  pillText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  pillTextActive: { color: Colors.primary },
  pillTextConflict: { color: Colors.error, textDecorationLine: "line-through" },
  textInput: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14, fontSize: 14,
    fontFamily: "Inter_400Regular", color: Colors.text, borderWidth: 1,
    borderColor: Colors.border, minHeight: 48, textAlignVertical: "top",
  },
  advancedToggle: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 14, marginTop: 12,
  },
  advancedToggleText: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  advancedSection: { marginBottom: 8 },
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.background, paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  generateButton: {
    backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  generateButtonText: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: Colors.text },
  profileRequired: {
    flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32, gap: 12,
  },
  profileRequiredTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.text, marginTop: 8 },
  profileRequiredText: {
    fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.textSecondary,
    textAlign: "center", lineHeight: 22,
  },
  profileRequiredButton: {
    backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14,
    paddingHorizontal: 32, marginTop: 12,
  },
  profileRequiredButtonText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.text },
});
