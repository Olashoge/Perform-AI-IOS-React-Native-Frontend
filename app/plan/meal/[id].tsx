import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  TouchableOpacity,
  Platform,
  RefreshControl,
  Alert,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors, ThemeColors } from "@/lib/theme-context";
import { useMealPlan, useMealFeedback, useResolveIngredientProposal, computeMealFingerprint, useMealPreferences, useGroceryList, useToggleGroceryOwned, useRegenerateGroceryList, useAllowance, useMealSwap, useDayRegen, GrocerySection, GroceryPricingItem } from "@/lib/api-hooks";

function IngredientProposalModal({
  visible,
  onClose,
  proposalId,
  ingredients,
}: {
  visible: boolean;
  onClose: () => void;
  proposalId: string;
  ingredients: string[];
}) {
  const Colors = useColors();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const resolveMutation = useResolveIngredientProposal();

  const toggleIngredient = (ing: string) => {
    setSelected((prev) => ({ ...prev, [ing]: !prev[ing] }));
  };

  const handleSubmit = async () => {
    const selectedList = Object.keys(selected).filter((k) => selected[k]);
    try {
      await resolveMutation.mutateAsync({ proposalId, chosenIngredients: selectedList, action: "accepted" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch {
      Alert.alert("Error", "Could not save ingredient preferences");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" }}>
        <View style={{ backgroundColor: Colors.surface, borderRadius: 16, padding: 20, width: "85%", maxHeight: "70%" }}>
          <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 4 }}>
            Which ingredients didn't you like?
          </Text>
          <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginBottom: 16 }}>
            Select ingredients to avoid in future plans
          </Text>
          <ScrollView style={{ maxHeight: 300 }}>
            {ingredients.map((ing) => (
              <Pressable
                key={ing}
                onPress={() => toggleIngredient(ing)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 10,
                  paddingHorizontal: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: Colors.border,
                }}
              >
                <View style={{
                  width: 22,
                  height: 22,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: selected[ing] ? "#FF6B6B" : Colors.textTertiary,
                  backgroundColor: selected[ing] ? "#FF6B6B" : "transparent",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}>
                  {selected[ing] && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.text, flex: 1 }}>
                  {ing.charAt(0).toUpperCase() + ing.slice(1)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <Pressable
              onPress={onClose}
              style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.surfaceElevated, alignItems: "center" }}
            >
              <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={resolveMutation.isPending}
              style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: "#FF6B6B", alignItems: "center", opacity: resolveMutation.isPending ? 0.6 : 1 }}
            >
              <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" }}>
                {resolveMutation.isPending ? "Saving..." : "Avoid Selected"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function MealActionButtons({ mealName, cuisineTag, ingredients }: { mealName: string; cuisineTag?: string; ingredients?: any[] }) {
  const Colors = useColors();
  const feedbackMutation = useMealFeedback();
  const { data: prefs } = useMealPreferences();
  const [localOverride, setLocalOverride] = useState<"none" | "liked" | "disliked" | null>(null);
  const [proposalModal, setProposalModal] = useState<{ visible: boolean; proposalId: string; ingredients: string[] }>({
    visible: false,
    proposalId: "",
    ingredients: [],
  });

  const fingerprint = useMemo(() => computeMealFingerprint(mealName, cuisineTag, ingredients), [mealName, cuisineTag, ingredients]);

  const serverState = useMemo<"none" | "liked" | "disliked">(() => {
    if (!prefs) return "none";
    if (prefs.likedMeals?.some((m: any) => m.mealFingerprint === fingerprint)) return "liked";
    if (prefs.dislikedMeals?.some((m: any) => m.mealFingerprint === fingerprint)) return "disliked";
    return "none";
  }, [prefs, fingerprint]);

  const state = localOverride !== null ? localOverride : serverState;

  const ingredientStrings = useMemo(() => {
    if (!Array.isArray(ingredients)) return [];
    return ingredients.map((ing: any) => typeof ing === "string" ? ing : ing?.item || ing?.name || "").filter(Boolean);
  }, [ingredients]);

  const handlePress = async (feedback: "like" | "dislike") => {
    const newState = feedback === "like" ? "liked" : "disliked";
    if (state === newState) {
      setLocalOverride("none");
      return;
    }

    try {
      const result = await feedbackMutation.mutateAsync({
        mealFingerprint: fingerprint,
        feedback,
        mealName,
        cuisineTag,
        ingredients: ingredientStrings,
      });
      setLocalOverride(newState);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (feedback === "dislike" && result?.proposalId && Array.isArray(result?.proposalIngredients) && result.proposalIngredients.length > 0) {
        setProposalModal({ visible: true, proposalId: result.proposalId, ingredients: result.proposalIngredients });
      }
    } catch {
      Alert.alert("Error", "Could not save preference");
    }
  };

  const handleLikePress = useCallback(() => {
    handlePress("like");
  }, [state, feedbackMutation.isPending]);

  const handleDislikePress = useCallback(() => {
    handlePress("dislike");
  }, [state, feedbackMutation.isPending]);

  return (
    <>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity
          onPress={handleLikePress}
          disabled={feedbackMutation.isPending}
          activeOpacity={0.5}
          style={{
            opacity: feedbackMutation.isPending ? 0.4 : 1,
            paddingHorizontal: 10,
            paddingVertical: 10,
          }}
        >
          <Ionicons
            name={state === "liked" ? "thumbs-up" : "thumbs-up-outline"}
            size={18}
            color={state === "liked" ? "#30D158" : Colors.textTertiary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleDislikePress}
          disabled={feedbackMutation.isPending}
          activeOpacity={0.5}
          style={{
            opacity: feedbackMutation.isPending ? 0.4 : 1,
            paddingHorizontal: 10,
            paddingVertical: 10,
          }}
        >
          <Ionicons
            name={state === "disliked" ? "thumbs-down" : "thumbs-down-outline"}
            size={18}
            color={state === "disliked" ? "#FF6B6B" : Colors.textTertiary}
          />
        </TouchableOpacity>
      </View>
      <IngredientProposalModal
        visible={proposalModal.visible}
        onClose={() => setProposalModal((p) => ({ ...p, visible: false }))}
        proposalId={proposalModal.proposalId}
        ingredients={proposalModal.ingredients}
      />
    </>
  );
}

const WEB_TOP_INSET = 67;
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface MacroData {
  protein_g?: string | number;
  carbs_g?: string | number;
  fat_g?: string | number;
  fiber_g?: string | number;
}

interface Ingredient {
  item?: string;
  amount?: string;
}

interface NutritionRange {
  calories?: string;
  protein?: string;
  carbs?: string;
  fat?: string;
}

interface MealData {
  name: string;
  cuisineTag?: string;
  description?: string;
  prepTime?: string | number;
  cookTime?: string | number;
  servings?: number;
  calories?: number | string;
  macros?: MacroData;
  nutritionEstimateRange?: NutritionRange;
  ingredients?: Ingredient[];
  instructions?: string[];
  steps?: string[];
}

interface DayPlanData {
  dayIndex: number;
  dayType?: string;
  date?: string;
  meals: Record<string, MealData>;
}


function MealCard({ mealType, meal, completed, onSwap, swapDisabled, isSwapping }: { mealType: string; meal: MealData; completed?: boolean; onSwap?: () => void; swapDisabled?: boolean; isSwapping?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const mealTypeLabel = mealType.charAt(0).toUpperCase() + mealType.slice(1);

  const getMealTypeColor = (type: string): string => {
    const lower = type.toLowerCase();
    if (lower === "breakfast") return "#FF9F0A";
    if (lower === "lunch") return "#30D158";
    if (lower === "dinner") return "#0A84FF";
    if (lower === "snack") return "#AF52DE";
    return "#8E8E93";
  };

  const typeColor = getMealTypeColor(mealType);

  const nr = meal.nutritionEstimateRange;
  const calDisplay = nr?.calories || meal.calories;
  const proteinDisplay = nr?.protein || (meal.macros?.protein_g ? `${meal.macros.protein_g}g` : null);
  const carbsDisplay = nr?.carbs || (meal.macros?.carbs_g ? `${meal.macros.carbs_g}g` : null);
  const fatDisplay = nr?.fat || (meal.macros?.fat_g ? `${meal.macros.fat_g}g` : null);
  const allInstructions = meal.instructions || meal.steps || [];

  const quickInfoParts: { icon: string; value: string; iconColor?: string }[] = [];
  if (meal.servings) quickInfoParts.push({ icon: "people-outline", value: `${meal.servings}` });
  if (calDisplay) quickInfoParts.push({ icon: "flame-outline", value: `${calDisplay} cal`, iconColor: Colors.warning });
  if (proteinDisplay) quickInfoParts.push({ icon: "barbell-outline", value: `P ${proteinDisplay}g` });
  if (carbsDisplay) quickInfoParts.push({ icon: "leaf-outline", value: `C ${carbsDisplay}g` });
  if (fatDisplay) quickInfoParts.push({ icon: "water-outline", value: `F ${fatDisplay}g` });

  const macroLine: string[] = [];

  return (
    <View style={styles.mealCard}>
      <View style={styles.mealTopRow}>
        <View style={styles.mealTopLeft}>
          <View style={[styles.completionCircle, completed && styles.completionCircleDone]}>
            {completed && <Ionicons name="checkmark" size={12} color="#fff" />}
          </View>
          <View style={styles.mealBadges}>
            <View style={[styles.mealTypeBadge, { backgroundColor: typeColor + "18" }]}>
              <Text style={[styles.mealTypeBadgeText, { color: typeColor }]}>{mealTypeLabel}</Text>
            </View>
            {meal.cuisineTag ? (
              <View style={[styles.cuisineBadge]}>
                <Text style={styles.cuisineBadgeText}>{meal.cuisineTag}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.mealTopRight}>
          <MealActionButtons mealName={meal.name} cuisineTag={meal.cuisineTag} ingredients={meal.ingredients} />
          {onSwap && (
            <TouchableOpacity
              onPress={onSwap}
              disabled={swapDisabled || isSwapping}
              activeOpacity={0.5}
              style={{
                opacity: swapDisabled ? 0.3 : 1,
                paddingHorizontal: 8,
                paddingVertical: 10,
              }}
            >
              {isSwapping ? (
                <ActivityIndicator size={16} color={Colors.primary} />
              ) : (
                <Ionicons name="swap-horizontal-outline" size={18} color={Colors.primary} />
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => setExpanded(!expanded)}
            activeOpacity={0.5}
            style={{ paddingHorizontal: 6, paddingVertical: 8 }}
          >
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={20}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <Pressable onPress={() => setExpanded(!expanded)}>
        <Text style={styles.mealName}>{meal.name}</Text>

        <View style={styles.mealQuickInfo}>
          {quickInfoParts.map((part, i) => (
            <View key={i} style={styles.quickInfoItem}>
              <Ionicons name={part.icon as any} size={13} color={part.iconColor || Colors.textTertiary} />
              <Text style={styles.quickInfoText}>{part.value}</Text>
              {i < quickInfoParts.length - 1 || macroLine.length > 0 ? (
                <Text style={styles.quickInfoSep}>|</Text>
              ) : null}
            </View>
          ))}
          {macroLine.map((m, i) => (
            <View key={`m-${i}`} style={styles.quickInfoItem}>
              <Text style={styles.quickInfoText}>{m}</Text>
              {i < macroLine.length - 1 ? <Text style={styles.quickInfoSep}>|</Text> : null}
            </View>
          ))}
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.mealExpanded}>
          {meal.description ? (
            <Text style={styles.mealDescription}>{meal.description}</Text>
          ) : null}

          {meal.ingredients && meal.ingredients.length > 0 ? (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>Ingredients</Text>
              {meal.ingredients.map((ing: any, i: number) => {
                const label = typeof ing === "string" ? ing : (ing.amount ? `${ing.amount} ${ing.item || ""}` : (ing.item || ing.name || ""));
                return (
                  <View key={i} style={styles.ingredientRow}>
                    <View style={styles.bulletDot} />
                    <Text style={styles.ingredientText}>{label}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}

          {allInstructions.length > 0 ? (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>Steps</Text>
              {allInstructions.map((step: string, i: number) => (
                <View key={i} style={styles.instructionRow}>
                  <Text style={styles.stepNumberText}>{i + 1}.</Text>
                  <Text style={styles.instructionText}>{step}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {(proteinDisplay || carbsDisplay || fatDisplay) ? (
            <View style={styles.macroBarRow}>
              {proteinDisplay ? (
                <View style={styles.macroBarItem}>
                  <Text style={styles.macroBarLabel}>Protein</Text>
                  <Text style={styles.macroBarValue}>{proteinDisplay}</Text>
                </View>
              ) : null}
              {carbsDisplay ? (
                <View style={styles.macroBarItem}>
                  <Text style={styles.macroBarLabel}>Carbs</Text>
                  <Text style={styles.macroBarValue}>{carbsDisplay}</Text>
                </View>
              ) : null}
              {fatDisplay ? (
                <View style={styles.macroBarItem}>
                  <Text style={styles.macroBarLabel}>Fat</Text>
                  <Text style={styles.macroBarValue}>{fatDisplay}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

function formatDayDate(startDate: string | undefined, dayIndex: number): string {
  if (!startDate) return "";
  try {
    const d = new Date(startDate + "T12:00:00");
    d.setDate(d.getDate() + dayIndex - 1);
    const weekday = WEEKDAYS[d.getDay()];
    const month = MONTHS_SHORT[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();
    return `${weekday}, ${month} ${day}, ${year}`;
  } catch {
    return "";
  }
}

function getDayOfWeek(startDate: string | undefined, dayIndex: number): string {
  if (!startDate) return "";
  try {
    const d = new Date(startDate + "T12:00:00");
    d.setDate(d.getDate() + dayIndex - 1);
    return WEEKDAYS[d.getDay()];
  } catch {
    return "";
  }
}

export default function MealPlanDetailScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? WEB_TOP_INSET : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: plan, isLoading, error, refetch } = useMealPlan(id ?? null);
  const { data: groceryData, isLoading: groceryLoading, refetch: refetchGrocery } = useGroceryList(id ?? null);
  const toggleOwnedMutation = useToggleGroceryOwned(id ?? null);
  const regenerateMutation = useRegenerateGroceryList(id ?? null);
  const { data: allowance, refetch: refetchAllowance } = useAllowance();
  const swapMutation = useMealSwap(id ?? null);
  const dayRegenMutation = useDayRegen(id ?? null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"meals" | "grocery">("meals");

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchGrocery(), refetchAllowance()]);
    setRefreshing(false);
  }, [refetch, refetchGrocery, refetchAllowance]);

  const mealSwapsRemaining = allowance ? allowance.today.mealSwapsLimit - allowance.today.mealSwapsUsed : 0;
  const dayRegensRemaining = allowance ? allowance.today.mealRegensLimit - allowance.today.mealRegensUsed : 0;
  const planRegensRemaining = allowance ? allowance.plan.regensLimit - allowance.plan.regensUsed : 0;
  const isCooldownActive = allowance?.cooldown?.active ?? false;

  const handleMealSwap = useCallback((dayIndex: number, mealType: string, mealName: string) => {
    if (isCooldownActive) {
      Alert.alert("Cooldown Active", `Please wait ${allowance?.cooldown?.minutesRemaining ?? 0} minutes before swapping again.`);
      return;
    }
    if (mealSwapsRemaining <= 0) {
      Alert.alert("No Swaps Left", "You've used all your meal swaps for today. They reset at midnight.");
      return;
    }
    Alert.alert(
      "Swap Meal",
      `Replace "${mealName}" with a new meal?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Swap",
          onPress: () => {
            swapMutation.mutate({ dayIndex, mealType });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          },
        },
      ]
    );
  }, [mealSwapsRemaining, isCooldownActive, allowance, swapMutation]);

  const handleDayRegen = useCallback((dayIndex: number) => {
    if (isCooldownActive) {
      Alert.alert("Cooldown Active", `Please wait ${allowance?.cooldown?.minutesRemaining ?? 0} minutes before regenerating.`);
      return;
    }
    if (dayRegensRemaining <= 0) {
      Alert.alert("No Regens Left", "You've used your day regeneration for today. It resets at midnight.");
      return;
    }
    if (planRegensRemaining <= 0) {
      Alert.alert("Plan Limit Reached", "You've used all your plan regenerations. This limit does not reset.");
      return;
    }
    Alert.alert(
      "Regenerate Day",
      "This will replace all meals for this day with new ones.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Regenerate",
          style: "destructive",
          onPress: () => {
            dayRegenMutation.mutate({ dayIndex });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          },
        },
      ]
    );
  }, [dayRegensRemaining, planRegensRemaining, isCooldownActive, allowance, dayRegenMutation]);

  const pricingMap = useMemo(() => {
    const map = new Map<string, { min: number; max: number }>();
    if (groceryData?.pricing?.items) {
      for (const p of groceryData.pricing.items) {
        map.set(p.itemKey, p.estimatedRange);
      }
    }
    return map;
  }, [groceryData?.pricing]);

  const generateItemKey = useCallback((itemName: string) => {
    return itemName.toLowerCase().replace(/[^a-z0-9]/g, "");
  }, []);

  const handleToggleOwned = useCallback((itemName: string) => {
    const key = generateItemKey(itemName);
    const currentlyOwned = !!groceryData?.ownedItems?.[key];
    toggleOwnedMutation.mutate({ itemKey: key, isOwned: !currentlyOwned });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [groceryData?.ownedItems, toggleOwnedMutation, generateItemKey]);

  const handleRegenerateGrocery = useCallback(async () => {
    try {
      await regenerateMutation.mutateAsync();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Could not rebuild grocery list");
    }
  }, [regenerateMutation]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: topInset }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading meal plan...</Text>
      </View>
    );
  }

  if (error || !plan) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: topInset }]}>
        <Ionicons name="alert-circle" size={48} color={Colors.error} />
        <Text style={styles.errorTitle}>Failed to load plan</Text>
        <Text style={styles.errorSubtitle}>
          {error instanceof Error ? error.message : "Something went wrong."}
        </Text>
        <Pressable style={styles.retryButton} onPress={() => refetch()}>
          <Ionicons name="refresh" size={20} color={Colors.text} />
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const planJson = plan.planJson ?? plan;
  const status = plan.status ?? planJson.status;

  if (status === "generating") {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: topInset }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.generatingTitle}>Plan is still generating...</Text>
        <Text style={styles.generatingSubtitle}>
          Your meal plan is being created. This usually takes 1-2 minutes.
        </Text>
        <Pressable style={styles.retryButton} onPress={() => refetch()}>
          <Ionicons name="refresh" size={20} color={Colors.text} />
          <Text style={styles.retryText}>Refresh</Text>
        </Pressable>
      </View>
    );
  }

  const title = planJson.title ?? "Meal Plan";
  const summary = planJson.summary;
  const nutritionNotes = planJson.nutritionNotes;
  const days: DayPlanData[] = planJson.days ?? [];
  const startDate = plan.startDate || planJson.startDate;

  const macroTargets = nutritionNotes?.dailyMacroTargetsRange;
  const dailyTargetStr = macroTargets ? [
    macroTargets.calories ? `${macroTargets.calories} cal` : null,
    macroTargets.protein_g ? `${macroTargets.protein_g}g protein` : null,
    macroTargets.carbs_g ? `${macroTargets.carbs_g}g carbs` : null,
    macroTargets.fat_g ? `${macroTargets.fat_g}g fat` : null,
  ].filter(Boolean).join(", ") : null;

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={28} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>Meal Plan</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        <Text style={styles.planTitle}>{title}</Text>

        {summary ? (
          <Text style={styles.summaryText}>{summary}</Text>
        ) : null}

        {dailyTargetStr ? (
          <View style={styles.dailyTargetsCard}>
            <Ionicons name="sparkles" size={16} color={Colors.primary} />
            <Text style={styles.dailyTargetsText}>
              <Text style={styles.dailyTargetsBold}>Daily targets: </Text>
              {dailyTargetStr}
            </Text>
          </View>
        ) : null}

        {allowance && (
          <View style={styles.budgetCard}>
            <View style={styles.budgetHeader}>
              <Ionicons name="analytics-outline" size={16} color={Colors.text} />
              <Text style={styles.budgetTitle}>Today's Budget</Text>
            </View>
            <View style={styles.budgetRow}>
              <View style={styles.budgetItem}>
                <Ionicons name="swap-horizontal-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.budgetLabel}>Meal Swaps</Text>
                <Text style={[styles.budgetValue, mealSwapsRemaining === 0 && styles.budgetExhausted]}>
                  {allowance.today.mealSwapsUsed}/{allowance.today.mealSwapsLimit}
                </Text>
              </View>
              <View style={styles.budgetItem}>
                <Ionicons name="refresh-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.budgetLabel}>Day Regens</Text>
                <Text style={[styles.budgetValue, dayRegensRemaining === 0 && styles.budgetExhausted]}>
                  {allowance.today.mealRegensUsed}/{allowance.today.mealRegensLimit}
                </Text>
              </View>
              <View style={styles.budgetItem}>
                <Ionicons name="build-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.budgetLabel}>Plan Regens</Text>
                <Text style={[styles.budgetValue, planRegensRemaining === 0 && styles.budgetExhausted]}>
                  {allowance.plan.regensUsed}/{allowance.plan.regensLimit}
                </Text>
              </View>
            </View>
            {isCooldownActive && (
              <View style={styles.cooldownBanner}>
                <Ionicons name="time-outline" size={13} color="#FF9F0A" />
                <Text style={styles.cooldownText}>
                  Cooldown active — {allowance.cooldown.minutesRemaining}m remaining
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.tabBar}>
          <Pressable
            style={[styles.tab, activeTab === "meals" && styles.tabActive]}
            onPress={() => setActiveTab("meals")}
          >
            <Ionicons name="restaurant-outline" size={16} color={activeTab === "meals" ? Colors.primary : Colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === "meals" && styles.tabTextActive]}>Meals</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === "grocery" && styles.tabActive]}
            onPress={() => setActiveTab("grocery")}
          >
            <Ionicons name="cart-outline" size={16} color={activeTab === "grocery" ? Colors.primary : Colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === "grocery" && styles.tabTextActive]}>Grocery List</Text>
          </Pressable>
        </View>

        {activeTab === "meals" ? (
          <>
            {days.map((day, dayIdx) => {
              const mealEntries = Object.entries(day.meals || {});
              const mealOrder = ["breakfast", "lunch", "dinner", "snack"];
              mealEntries.sort(
                (a, b) =>
                  (mealOrder.indexOf(a[0]) === -1 ? 99 : mealOrder.indexOf(a[0])) -
                  (mealOrder.indexOf(b[0]) === -1 ? 99 : mealOrder.indexOf(b[0]))
              );

              const dayNum = day.dayIndex ?? dayIdx + 1;
              const dayOfWeek = getDayOfWeek(startDate, dayNum);
              const dayType = day.dayType || "";
              const dateStr = formatDayDate(startDate, dayNum);

              return (
                <View key={dayIdx} style={styles.daySection}>
                  <View style={styles.dayHeader}>
                    <View style={styles.dayHeaderLeft}>
                      <Text style={styles.dayTitle}>
                        Day {dayNum}{dayOfWeek ? ` - ${dayOfWeek}` : ""}{dayType ? ` (${dayType})` : ""}
                      </Text>
                      {dateStr ? <Text style={styles.dayDate}>{dateStr}</Text> : null}
                    </View>
                    <Pressable
                      style={({ pressed }) => [
                        styles.regenDayBtn,
                        pressed && { opacity: 0.7 },
                        (dayRegensRemaining <= 0 || isCooldownActive || dayRegenMutation.isPending) && { opacity: 0.4 },
                      ]}
                      onPress={() => handleDayRegen(dayNum)}
                      disabled={dayRegenMutation.isPending}
                    >
                      {dayRegenMutation.isPending && dayRegenMutation.variables?.dayIndex === dayNum ? (
                        <ActivityIndicator size={12} color={Colors.textSecondary} />
                      ) : (
                        <Ionicons name="refresh-outline" size={14} color={Colors.textSecondary} />
                      )}
                      <Text style={styles.regenDayText}>Regenerate Day</Text>
                    </Pressable>
                  </View>
                  {mealEntries.map(([mealType, meal]) => (
                    <MealCard
                      key={mealType}
                      mealType={mealType}
                      meal={meal as MealData}
                      onSwap={() => handleMealSwap(dayNum, mealType, (meal as MealData).name)}
                      swapDisabled={mealSwapsRemaining <= 0 || isCooldownActive || swapMutation.isPending}
                      isSwapping={swapMutation.isPending && swapMutation.variables?.mealType === mealType && swapMutation.variables?.dayIndex === dayNum}
                    />
                  ))}
                </View>
              );
            })}
          </>
        ) : (
          <View style={styles.grocerySection}>
            {groceryData?.totals && (
              <View style={styles.totalsCard}>
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>Estimated Total</Text>
                  <Text style={styles.totalsValue}>
                    ${groceryData.totals.totalMin.toFixed(2)} – ${groceryData.totals.totalMax.toFixed(2)}
                  </Text>
                </View>
                <View style={[styles.totalsRow, { marginTop: 6 }]}>
                  <Text style={styles.totalsLabel}>After Owned Items</Text>
                  <Text style={[styles.totalsValue, { color: Colors.primary }]}>
                    ${groceryData.totals.ownedAdjustedMin.toFixed(2)} – ${groceryData.totals.ownedAdjustedMax.toFixed(2)}
                  </Text>
                </View>
                <Text style={styles.totalsDisclaimer}>
                  Estimates vary by brand, store, and region
                </Text>
              </View>
            )}

            <View style={styles.grocerySectionHeader}>
              <Text style={styles.grocerySectionTitle}>Items</Text>
              <Pressable
                style={({ pressed }) => [styles.rebuildBtn, pressed && { opacity: 0.7 }]}
                onPress={handleRegenerateGrocery}
                disabled={regenerateMutation.isPending}
              >
                {regenerateMutation.isPending ? (
                  <ActivityIndicator size={14} color={Colors.primary} />
                ) : (
                  <Ionicons name="refresh-outline" size={14} color={Colors.primary} />
                )}
                <Text style={styles.rebuildBtnText}>
                  {regenerateMutation.isPending ? "Rebuilding..." : "Rebuild List"}
                </Text>
              </Pressable>
            </View>

            {groceryLoading ? (
              <View style={styles.emptyGrocery}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.emptyGroceryText}>Loading grocery list...</Text>
              </View>
            ) : groceryData?.groceryList?.sections && groceryData.groceryList.sections.length > 0 ? (
              groceryData.groceryList.sections.map((section, sIdx) => (
                <View key={sIdx} style={styles.groceryCategoryBlock}>
                  <Text style={styles.groceryCategoryTitle}>{section.name}</Text>
                  <View style={styles.groceryCard}>
                    {section.items.map((item, i) => {
                      const key = generateItemKey(item.item);
                      const isOwned = !!groceryData.ownedItems?.[key];
                      const price = pricingMap.get(key);
                      return (
                        <Pressable
                          key={i}
                          onPress={() => handleToggleOwned(item.item)}
                          style={[
                            styles.groceryRow,
                            i < section.items.length - 1 && styles.groceryRowBorder,
                          ]}
                        >
                          <View style={[
                            styles.groceryCheckbox,
                            isOwned && { backgroundColor: Colors.primary, borderColor: Colors.primary },
                          ]}>
                            {isOwned && <Ionicons name="checkmark" size={14} color="#fff" />}
                          </View>
                          <View style={styles.groceryRowLeft}>
                            <Text style={[
                              styles.groceryItem,
                              isOwned && styles.groceryItemOwned,
                            ]}>
                              {item.item}
                            </Text>
                            <Text style={[
                              styles.groceryQuantity,
                              isOwned && styles.groceryItemOwned,
                            ]}>
                              {item.quantity}
                            </Text>
                          </View>
                          {price ? (
                            <Text style={styles.groceryPrice}>
                              ${price.min.toFixed(2)}–${price.max.toFixed(2)}
                            </Text>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyGrocery}>
                <Ionicons name="cart-outline" size={40} color={Colors.textTertiary} />
                <Text style={styles.emptyGroceryText}>No grocery list available</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    justifyContent: "center" as const,
    alignItems: "center" as const,
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 16,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: Colors.text,
    marginTop: 16,
  },
  errorSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    marginTop: 8,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    backgroundColor: Colors.surface,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  generatingTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.text,
    marginTop: 24,
    textAlign: "center" as const,
  },
  generatingSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    marginTop: 8,
    lineHeight: 22,
  },
  headerBar: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
    flex: 1,
    textAlign: "center" as const,
    marginHorizontal: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  dailyTargetsCard: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dailyTargetsText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    lineHeight: 20,
  },
  dailyTargetsBold: {
    fontWeight: "600" as const,
  },
  budgetCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  budgetHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 10,
  },
  budgetTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  budgetRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
  },
  budgetItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  budgetLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  budgetValue: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.text,
    marginLeft: 2,
  },
  budgetExhausted: {
    color: Colors.error || "#FF3B30",
  },
  cooldownBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
  },
  cooldownText: {
    fontSize: 12,
    color: "#FF9F0A",
    fontWeight: "500" as const,
  },
  tabBar: {
    flexDirection: "row" as const,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: "600" as const,
  },
  daySection: {
    marginBottom: 24,
  },
  dayHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-end" as const,
    marginBottom: 12,
    flexWrap: "wrap" as const,
    gap: 8,
  },
  dayHeaderLeft: {
    flex: 1,
    minWidth: 180,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  dayDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  regenDayBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  regenDayText: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: Colors.textSecondary,
  },
  mealCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mealTopRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 6,
  },
  mealTopLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  completionCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  completionCircleDone: {
    backgroundColor: "#30D158",
    borderColor: "#30D158",
  },
  mealBadges: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    flexShrink: 1,
    flexWrap: "wrap" as const,
  },
  mealTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  mealTypeBadgeText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  cuisineBadge: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cuisineBadgeText: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: Colors.textSecondary,
  },
  mealTopRight: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  mealName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 6,
    marginLeft: 30,
  },
  mealQuickInfo: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    alignItems: "center" as const,
    gap: 4,
    marginLeft: 30,
  },
  quickInfoItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 3,
  },
  quickInfoText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  quickInfoSep: {
    fontSize: 12,
    color: Colors.border,
    marginHorizontal: 4,
  },
  mealExpanded: {
    marginTop: 14,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    paddingTop: 14,
    marginLeft: 30,
  },
  mealDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: "italic" as const,
    lineHeight: 20,
    marginBottom: 14,
  },
  sectionBlock: {
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 10,
  },
  ingredientRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 8,
    marginBottom: 6,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.textTertiary,
    marginTop: 7,
  },
  ingredientText: {
    fontSize: 13,
    color: Colors.text,
    flex: 1,
    lineHeight: 20,
  },
  ingredientAmount: {
    color: Colors.text,
    fontWeight: "500" as const,
  },
  instructionRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 8,
    marginBottom: 10,
  },
  stepNumberText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
    minWidth: 18,
  },
  instructionText: {
    fontSize: 13,
    color: Colors.text,
    flex: 1,
    lineHeight: 20,
  },
  macroBarRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 4,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
  },
  macroBarItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingRight: 12,
    borderRightWidth: 0.5,
    borderRightColor: Colors.border,
  },
  macroBarLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  macroBarValue: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  grocerySection: {
    marginBottom: 16,
  },
  totalsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  totalsRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  totalsLabel: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.textSecondary,
  },
  totalsValue: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  totalsDisclaimer: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 10,
    textAlign: "center" as const,
  },
  grocerySectionHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 12,
  },
  grocerySectionTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  rebuildBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: Colors.primary + "14",
  },
  rebuildBtnText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  groceryCategoryBlock: {
    marginBottom: 16,
  },
  groceryCategoryTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 8,
  },
  groceryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  groceryRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingVertical: 10,
  },
  groceryRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  groceryCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.textTertiary,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginRight: 12,
  },
  groceryRowLeft: {
    flex: 1,
    marginRight: 12,
  },
  groceryItem: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: "500" as const,
  },
  groceryItemOwned: {
    textDecorationLine: "line-through" as const,
    color: Colors.textTertiary,
  },
  groceryQuantity: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  groceryPrice: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: Colors.textTertiary,
  },
  emptyGrocery: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 40,
    gap: 12,
  },
  emptyGroceryText: {
    fontSize: 14,
    color: Colors.textTertiary,
  },
});
