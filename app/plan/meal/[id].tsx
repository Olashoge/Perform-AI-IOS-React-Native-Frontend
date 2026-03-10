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
import { Ionicons } from "@expo/vector-icons";
import { Icon } from "@/components/Icon";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors, ThemeColors } from "@/lib/theme-context";
import { useMealPlan, useMealFeedback, useResolveIngredientProposal, computeMealFingerprint, useMealPreferences, useGroceryList, useToggleGroceryOwned, useRegenerateGroceryList, useMealSwap, useDayRegen, useAllowance, AllowanceData, GrocerySection, useUpdateMealPlanSchedule, useDeleteMealPlan, useConflictDates } from "@/lib/api-hooks";
import CalendarPickerField from "@/components/CalendarPickerField";

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
                  borderColor: selected[ing] ? Colors.error : Colors.textTertiary,
                  backgroundColor: selected[ing] ? Colors.error : "transparent",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}>
                  {selected[ing] && <Icon name="checkmark" size={16} color="#fff" />}
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
              style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.error, alignItems: "center", opacity: resolveMutation.isPending ? 0.6 : 1 }}
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
            color={state === "liked" ? Colors.accent : Colors.textTertiary}
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
            color={state === "disliked" ? Colors.error : Colors.textTertiary}
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
  prepTimeMinutes?: number;
  cookTime?: string | number;
  servings?: number;
  calories?: number | string;
  macros?: MacroData;
  nutritionEstimateRange?: NutritionRange;
  whyItHelpsGoal?: string;
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
    if (lower === "breakfast") return Colors.warning;
    if (lower === "lunch") return Colors.accent;
    if (lower === "dinner") return Colors.primary;
    if (lower === "snack") return Colors.textSecondary;
    return Colors.textTertiary;
  };

  const typeColor = getMealTypeColor(mealType);

  const nr = meal.nutritionEstimateRange || (meal as any).nutrition_estimate_range;
  const calDisplay = nr?.calories || meal.calories;
  const proteinDisplay = nr?.protein || nr?.protein_g || (meal.macros?.protein_g ? `${meal.macros.protein_g}` : null);
  const carbsDisplay = nr?.carbs || nr?.carbs_g || (meal.macros?.carbs_g ? `${meal.macros.carbs_g}` : null);
  const fatDisplay = nr?.fat || nr?.fat_g || (meal.macros?.fat_g ? `${meal.macros.fat_g}` : null);
  const allInstructions = meal.instructions || meal.steps || [];

  const prepMins = meal.prepTimeMinutes || (typeof meal.prepTime === "number" ? meal.prepTime : null);

  const quickInfoParts: { icon: string; value: string; iconColor?: string }[] = [];
  if (prepMins) quickInfoParts.push({ icon: "time-outline", value: `${prepMins}m` });
  if (meal.servings) quickInfoParts.push({ icon: "people-outline", value: `${meal.servings}` });
  if (calDisplay) quickInfoParts.push({ icon: "flame-outline", value: `${calDisplay} cal`, iconColor: Colors.warning });
  if (proteinDisplay) quickInfoParts.push({ icon: "", value: `P ${proteinDisplay}g` });
  if (carbsDisplay) quickInfoParts.push({ icon: "", value: `C ${carbsDisplay}g` });
  if (fatDisplay) quickInfoParts.push({ icon: "", value: `F ${fatDisplay}g` });

  const macroLine: string[] = [];

  return (
    <View style={styles.mealCard}>
      <View style={styles.mealTopRow}>
        <View style={styles.mealTopLeft}>
          <View style={[styles.completionCircle, completed && styles.completionCircleDone]}>
            {completed && <Icon name="checkmark" size={16} color="#fff" />}
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
                <Icon name="swap" size={20} color={Colors.primary} />
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
              {part.icon ? <Ionicons name={part.icon as any} size={13} color={part.iconColor ?? Colors.textTertiary} /> : null}
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

          {(meal as any).whyItHelpsGoal ? (
            <Text style={styles.mealInsight}>{(meal as any).whyItHelpsGoal}</Text>
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

function BudgetCard({ allowance, Colors }: { allowance: AllowanceData; Colors: ThemeColors }) {
  const swapsRemaining = Math.max(0, allowance.mealSwaps.limit - allowance.mealSwaps.used);
  const regensRemaining = Math.max(0, allowance.dayRegens.limit - allowance.dayRegens.used);
  const planRegensRemaining = Math.max(0, allowance.planRegens.limit - allowance.planRegens.used);

  const items = [
    { label: "Meal Swaps", remaining: swapsRemaining, limit: allowance.mealSwaps.limit, icon: "swap-horizontal-outline" as const },
    { label: "Day Regens", remaining: regensRemaining, limit: allowance.dayRegens.limit, icon: "refresh-outline" as const },
    { label: "Plan Regens", remaining: planRegensRemaining, limit: allowance.planRegens.limit, icon: "reload-outline" as const },
  ];

  return (
    <View style={{
      backgroundColor: Colors.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: Colors.border,
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <Icon name="wallet" size={16} color={Colors.primary} />
        <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.text }}>Today's Budget</Text>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {items.map((item) => (
          <View key={item.label} style={{ alignItems: "center", flex: 1 }}>
            <Ionicons name={item.icon} size={16} color={item.remaining > 0 ? Colors.primary : Colors.textTertiary} style={{ marginBottom: 4 } as any} />
            <Text style={{
              fontSize: 16,
              fontWeight: "700",
              color: item.remaining > 0 ? Colors.text : Colors.textTertiary,
            }}>
              {item.remaining}
            </Text>
            <Text style={{
              fontSize: 10,
              color: Colors.textSecondary,
              marginTop: 2,
            }}>
              of {item.limit}
            </Text>
            <Text style={{
              fontSize: 10,
              color: Colors.textSecondary,
              marginTop: 1,
            }}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function formatDayDate(startDate: string | undefined, dayIndex: number): string {
  if (!startDate) return "";
  try {
    const d = new Date(startDate + "T12:00:00");
    d.setDate(d.getDate() + dayIndex - 1);
    const month = MONTHS_SHORT[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();
    return `${month} ${day}, ${year}`;
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
  const swapMutation = useMealSwap(id ?? null);
  const dayRegenMutation = useDayRegen(id ?? null);
  const { data: allowance, refetch: refetchAllowance } = useAllowance();
  const scheduleMutation = useUpdateMealPlanSchedule();
  const deleteMutation = useDeleteMealPlan();
  const mealConflictDates = useConflictDates("meal", id ?? undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"meals" | "grocery">("meals");
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [pendingScheduleDate, setPendingScheduleDate] = useState("");

  const swapsRemaining = allowance ? Math.max(0, allowance.mealSwaps.limit - allowance.mealSwaps.used) : null;
  const regensRemaining = allowance ? Math.max(0, allowance.dayRegens.limit - allowance.dayRegens.used) : null;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchGrocery(), refetchAllowance()]);
    setRefreshing(false);
  }, [refetch, refetchGrocery, refetchAllowance]);

  const handleMealSwap = useCallback((dayIndex: number, mealType: string, mealName: string) => {
    if (swapsRemaining !== null && swapsRemaining <= 0) {
      Alert.alert("No Swaps Remaining", "You've used all your meal swaps for today. Try again tomorrow.");
      return;
    }
    Alert.alert(
      "Swap Meal",
      `Replace "${mealName}" with a new meal?${swapsRemaining !== null ? `\n${swapsRemaining} swap${swapsRemaining === 1 ? "" : "s"} remaining today.` : ""}`,
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
  }, [swapMutation, swapsRemaining]);

  const handleDayRegen = useCallback((dayIndex: number) => {
    if (regensRemaining !== null && regensRemaining <= 0) {
      Alert.alert("No Regens Remaining", "You've used all your day regenerations for today. Try again tomorrow.");
      return;
    }
    Alert.alert(
      "Regenerate Day",
      `This will replace all meals for this day with new ones.${regensRemaining !== null ? `\n${regensRemaining} regen${regensRemaining === 1 ? "" : "s"} remaining today.` : ""}`,
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
  }, [dayRegenMutation, regensRemaining]);

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
        <Icon name="alertCircle" size={28} color={Colors.error} />
        <Text style={styles.errorTitle}>Failed to load plan</Text>
        <Text style={styles.errorSubtitle}>
          {error instanceof Error ? error.message : "Something went wrong."}
        </Text>
        <Pressable style={styles.retryButton} onPress={() => refetch()}>
          <Icon name="refresh" size={20} color={Colors.text} />
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
          <Icon name="refresh" size={20} color={Colors.text} />
          <Text style={styles.retryText}>Refresh</Text>
        </Pressable>
      </View>
    );
  }

  const title = planJson.title ?? "Meal Plan";
  const summary = planJson.summary;
  const nutritionNotes = planJson.nutritionNotes;
  const days: DayPlanData[] = planJson.days ?? [];
  const startDate = plan.startDate || plan.planStartDate || planJson.startDate || planJson.planStartDate;
  const planId = plan._id || plan.id || id;

  const handleShowMenu = () => {
    const options: { text: string; style?: "destructive" | "cancel"; onPress?: () => void }[] = [];
    if (startDate) {
      options.push({
        text: "Reschedule",
        onPress: () => {
          setPendingScheduleDate(startDate);
          setShowSchedulePicker(true);
        },
      });
      options.push({
        text: "Unschedule",
        style: "destructive",
        onPress: () => {
          Alert.alert("Unschedule Plan", "Remove the start date from this plan?", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Unschedule",
              style: "destructive",
              onPress: () => {
                scheduleMutation.mutate({ id: planId, startDate: null });
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              },
            },
          ]);
        },
      });
    } else {
      options.push({
        text: "Schedule",
        onPress: () => {
          setPendingScheduleDate("");
          setShowSchedulePicker(true);
        },
      });
    }
    options.push({
      text: "Delete Plan",
      style: "destructive",
      onPress: () => {
        Alert.alert("Delete Plan", "Are you sure you want to delete this plan? This cannot be undone.", [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              deleteMutation.mutate(planId, {
                onSuccess: () => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  router.back();
                },
              });
            },
          },
        ]);
      },
    });
    options.push({ text: "Cancel", style: "cancel" });

    Alert.alert(
      "Plan Options",
      undefined,
      options.map((o) => ({ text: o.text, style: o.style, onPress: o.onPress }))
    );
  };

  const handleScheduleDateSelect = (date: string) => {
    if (date) {
      scheduleMutation.mutate({ id: planId, startDate: date });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setShowSchedulePicker(false);
  };

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
          <Icon name="back" size={28} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>Meal Plan</Text>
        <Pressable onPress={handleShowMenu} hitSlop={12}>
          <Ionicons name="ellipsis-horizontal" size={24} color={Colors.text} />
        </Pressable>
      </View>

      {showSchedulePicker && (
        <Modal visible={showSchedulePicker} transparent animationType="fade" onRequestClose={() => setShowSchedulePicker(false)}>
          <Pressable
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" }}
            onPress={() => setShowSchedulePicker(false)}
          >
            <Pressable onPress={(e) => e.stopPropagation()} style={{ width: "90%", maxWidth: 340 }}>
              <View style={{ backgroundColor: Colors.surface, borderRadius: 20, padding: 20 }}>
                <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 16, textAlign: "center" }}>
                  {startDate ? "Reschedule Plan" : "Schedule Plan"}
                </Text>
                <CalendarPickerField
                  value={pendingScheduleDate}
                  onChange={(date) => {
                    setPendingScheduleDate(date);
                  }}
                  Colors={Colors}
                  conflictDates={mealConflictDates}
                  planDuration={days.length || 7}
                />
                <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
                  <Pressable
                    onPress={() => setShowSchedulePicker(false)}
                    style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.background, alignItems: "center" }}
                  >
                    <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary }}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleScheduleDateSelect(pendingScheduleDate)}
                    disabled={!pendingScheduleDate || scheduleMutation.isPending}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 10,
                      backgroundColor: pendingScheduleDate ? Colors.primary : Colors.surfaceElevated,
                      alignItems: "center",
                      opacity: scheduleMutation.isPending ? 0.6 : 1,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: pendingScheduleDate ? "#fff" : Colors.textTertiary }}>
                      {scheduleMutation.isPending ? "Saving..." : "Confirm"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}

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
            <Icon name="sparkles" size={16} color={Colors.primary} />
            <Text style={styles.dailyTargetsText}>
              <Text style={styles.dailyTargetsBold}>Daily targets: </Text>
              {dailyTargetStr}
            </Text>
          </View>
        ) : null}

        {allowance ? <BudgetCard allowance={allowance} Colors={Colors} /> : null}

        <View style={styles.tabBar}>
          <Pressable
            style={[styles.tab, activeTab === "meals" && styles.tabActive]}
            onPress={() => setActiveTab("meals")}
          >
            <Icon name="restaurant" size={16} color={activeTab === "meals" ? Colors.primary : Colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === "meals" && styles.tabTextActive]}>Meals</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === "grocery" && styles.tabActive]}
            onPress={() => setActiveTab("grocery")}
          >
            <Icon name="cart" size={16} color={activeTab === "grocery" ? Colors.primary : Colors.textSecondary} />
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
                      <Text>
                        <Text style={styles.dayTitle}>
                          Day {dayNum}{dayOfWeek ? ` - ${dayOfWeek}` : ""}{dayType ? ` (${dayType})` : ""}
                        </Text>
                        {dateStr ? <Text style={styles.dayDate}>{"  "}{dateStr}</Text> : null}
                      </Text>
                    </View>
                    <Pressable
                      style={({ pressed }) => [
                        styles.regenDayBtn,
                        pressed && { opacity: 0.7 },
                        (dayRegenMutation.isPending || (regensRemaining !== null && regensRemaining <= 0)) && { opacity: 0.4 },
                      ]}
                      onPress={() => handleDayRegen(dayNum)}
                      disabled={dayRegenMutation.isPending || (regensRemaining !== null && regensRemaining <= 0)}
                    >
                      {dayRegenMutation.isPending && dayRegenMutation.variables?.dayIndex === dayNum ? (
                        <ActivityIndicator size={12} color={Colors.textSecondary} />
                      ) : (
                        <Icon name="refresh" size={16} color={Colors.textSecondary} />
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
                      swapDisabled={swapMutation.isPending || (swapsRemaining !== null && swapsRemaining <= 0)}
                      isSwapping={swapMutation.isPending && swapMutation.variables?.mealType === mealType && swapMutation.variables?.dayIndex === dayNum}
                    />
                  ))}
                </View>
              );
            })}
          </>
        ) : (
          <View style={styles.grocerySection}>
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
                  <Icon name="refresh" size={16} color={Colors.primary} />
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
                            {isOwned && <Icon name="checkmark" size={16} color="#fff" />}
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
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyGrocery}>
                <Icon name="cart" size={28} color={Colors.textTertiary} />
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
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "400" as const,
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
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
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
  mealInsight: {
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
