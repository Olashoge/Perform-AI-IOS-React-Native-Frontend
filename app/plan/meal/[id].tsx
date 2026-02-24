import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Platform,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useColors, ThemeColors } from "@/lib/theme-context";
import { useMealPlan } from "@/lib/api-hooks";

const WEB_TOP_INSET = 67;

interface MacroData {
  protein_g?: string | number;
  carbs_g?: string | number;
  fat_g?: string | number;
  fiber_g?: string | number;
}

interface Ingredient {
  item: string;
  amount: string;
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
  ingredients?: Ingredient[];
  instructions?: string[];
}

interface DayData {
  dayIndex: number;
  meals: Record<string, MealData>;
}

interface GroceryItem {
  item: string;
  quantity: string;
  estimatedPrice?: number | string;
}

function MealCard({ mealType, meal }: { mealType: string; meal: MealData }) {
  const [expanded, setExpanded] = useState(false);
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const mealTypeLabel = mealType.charAt(0).toUpperCase() + mealType.slice(1);

  return (
    <Pressable
      style={styles.mealCard}
      onPress={() => setExpanded(!expanded)}
    >
      <View style={styles.mealHeader}>
        <View style={styles.mealHeaderLeft}>
          <View style={styles.mealTypeBadge}>
            <Text style={styles.mealTypeBadgeText}>{mealTypeLabel}</Text>
          </View>
          <Text style={styles.mealName} numberOfLines={expanded ? undefined : 1}>
            {meal.name}
          </Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={Colors.textSecondary}
        />
      </View>

      <View style={styles.mealQuickInfo}>
        {meal.cuisineTag ? (
          <View style={styles.infoPill}>
            <Ionicons name="restaurant-outline" size={12} color={Colors.textSecondary} />
            <Text style={styles.infoPillText}>{meal.cuisineTag}</Text>
          </View>
        ) : null}
        {meal.calories ? (
          <View style={styles.infoPill}>
            <Ionicons name="flame-outline" size={12} color={Colors.warning} />
            <Text style={styles.infoPillText}>{meal.calories} cal</Text>
          </View>
        ) : null}
        {meal.prepTime ? (
          <View style={styles.infoPill}>
            <Ionicons name="time-outline" size={12} color={Colors.textSecondary} />
            <Text style={styles.infoPillText}>{meal.prepTime}m prep</Text>
          </View>
        ) : null}
        {meal.cookTime ? (
          <View style={styles.infoPill}>
            <MaterialCommunityIcons name="pot-steam-outline" size={12} color={Colors.textSecondary} />
            <Text style={styles.infoPillText}>{meal.cookTime}m cook</Text>
          </View>
        ) : null}
      </View>

      {expanded && (
        <View style={styles.mealExpanded}>
          {meal.description ? (
            <Text style={styles.mealDescription}>{meal.description}</Text>
          ) : null}

          {meal.servings ? (
            <View style={styles.servingsRow}>
              <Ionicons name="people-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.servingsText}>{meal.servings} serving{meal.servings > 1 ? "s" : ""}</Text>
            </View>
          ) : null}

          {meal.macros ? (
            <View style={styles.macrosContainer}>
              <MacroPill label="Protein" value={meal.macros.protein_g} color="#FF6B6B" />
              <MacroPill label="Carbs" value={meal.macros.carbs_g} color={Colors.primary} />
              <MacroPill label="Fat" value={meal.macros.fat_g} color={Colors.warning} />
              {meal.macros.fiber_g ? (
                <MacroPill label="Fiber" value={meal.macros.fiber_g} color={Colors.accent} />
              ) : null}
            </View>
          ) : null}

          {meal.ingredients && meal.ingredients.length > 0 ? (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>Ingredients</Text>
              {meal.ingredients.map((ing, i) => (
                <View key={i} style={styles.ingredientRow}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.ingredientText}>
                    <Text style={styles.ingredientAmount}>{ing.amount}</Text> {ing.item}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {meal.instructions && meal.instructions.length > 0 ? (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>Instructions</Text>
              {meal.instructions.map((step, i) => (
                <View key={i} style={styles.instructionRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.instructionText}>{step}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

function MacroPill({ label, value, color }: { label: string; value?: string | number; color: string }) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  if (!value) return null;
  return (
    <View style={[styles.macroPill, { borderColor: color + "40" }]}>
      <View style={[styles.macroDot, { backgroundColor: color }]} />
      <Text style={styles.macroValue}>{value}g</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

export default function MealPlanDetailScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? WEB_TOP_INSET : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: plan, isLoading, error, refetch } = useMealPlan(id ?? null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

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
  const days: DayData[] = planJson.days ?? [];
  const groceryList: GroceryItem[] = planJson.groceryList ?? [];

  const macroTargets = nutritionNotes?.dailyMacroTargetsRange;

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={28} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
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
        {summary ? (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}>{summary}</Text>
          </View>
        ) : null}

        {macroTargets ? (
          <View style={styles.macroTargetsCard}>
            <Text style={styles.macroTargetsTitle}>Daily Macro Targets</Text>
            <View style={styles.macroTargetsGrid}>
              {macroTargets.calories ? (
                <View style={styles.macroTargetItem}>
                  <Ionicons name="flame" size={18} color={Colors.warning} />
                  <Text style={styles.macroTargetValue}>{macroTargets.calories}</Text>
                  <Text style={styles.macroTargetLabel}>calories</Text>
                </View>
              ) : null}
              {macroTargets.protein_g ? (
                <View style={styles.macroTargetItem}>
                  <View style={[styles.macroIndicator, { backgroundColor: "#FF6B6B" }]} />
                  <Text style={styles.macroTargetValue}>{macroTargets.protein_g}g</Text>
                  <Text style={styles.macroTargetLabel}>protein</Text>
                </View>
              ) : null}
              {macroTargets.carbs_g ? (
                <View style={styles.macroTargetItem}>
                  <View style={[styles.macroIndicator, { backgroundColor: Colors.primary }]} />
                  <Text style={styles.macroTargetValue}>{macroTargets.carbs_g}g</Text>
                  <Text style={styles.macroTargetLabel}>carbs</Text>
                </View>
              ) : null}
              {macroTargets.fat_g ? (
                <View style={styles.macroTargetItem}>
                  <View style={[styles.macroIndicator, { backgroundColor: Colors.warning }]} />
                  <Text style={styles.macroTargetValue}>{macroTargets.fat_g}g</Text>
                  <Text style={styles.macroTargetLabel}>fat</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {days.map((day, dayIdx) => {
          const mealEntries = Object.entries(day.meals || {});
          const mealOrder = ["breakfast", "lunch", "dinner", "snack"];
          mealEntries.sort(
            (a, b) =>
              (mealOrder.indexOf(a[0]) === -1 ? 99 : mealOrder.indexOf(a[0])) -
              (mealOrder.indexOf(b[0]) === -1 ? 99 : mealOrder.indexOf(b[0]))
          );

          return (
            <View key={dayIdx} style={styles.daySection}>
              <View style={styles.dayHeader}>
                <View style={styles.dayBadge}>
                  <Text style={styles.dayBadgeText}>Day {day.dayIndex ?? dayIdx + 1}</Text>
                </View>
              </View>
              {mealEntries.map(([mealType, meal]) => (
                <MealCard key={mealType} mealType={mealType} meal={meal as MealData} />
              ))}
            </View>
          );
        })}

        {groceryList.length > 0 ? (
          <View style={styles.grocerySection}>
            <View style={styles.grocerySectionHeader}>
              <Ionicons name="cart-outline" size={22} color={Colors.accent} />
              <Text style={styles.grocerySectionTitle}>Grocery List</Text>
            </View>
            <View style={styles.groceryCard}>
              {groceryList.map((item, i) => (
                <View
                  key={i}
                  style={[
                    styles.groceryRow,
                    i < groceryList.length - 1 && styles.groceryRowBorder,
                  ]}
                >
                  <View style={styles.groceryRowLeft}>
                    <Text style={styles.groceryItem}>{item.item}</Text>
                    <Text style={styles.groceryQuantity}>{item.quantity}</Text>
                  </View>
                  {item.estimatedPrice != null ? (
                    <Text style={styles.groceryPrice}>
                      ${typeof item.estimatedPrice === "number" ? item.estimatedPrice.toFixed(2) : item.estimatedPrice}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        ) : null}
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
    justifyContent: "center",
    alignItems: "center",
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
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  macroTargetsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  macroTargetsTitle: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 14,
  },
  macroTargetsGrid: {
    flexDirection: "row" as const,
    justifyContent: "space-around" as const,
  },
  macroTargetItem: {
    alignItems: "center" as const,
    gap: 4,
  },
  macroIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  macroTargetValue: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  macroTargetLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  daySection: {
    marginBottom: 24,
  },
  dayHeader: {
    marginBottom: 10,
  },
  dayBadge: {
    backgroundColor: Colors.primary + "20",
    alignSelf: "flex-start" as const,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  dayBadgeText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  mealCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  mealHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  mealHeaderLeft: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    marginRight: 8,
  },
  mealTypeBadge: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mealTypeBadgeText: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
    textTransform: "capitalize" as const,
  },
  mealName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    flex: 1,
  },
  mealQuickInfo: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
    marginTop: 10,
  },
  infoPill: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  infoPillText: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  mealExpanded: {
    marginTop: 14,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    paddingTop: 14,
  },
  mealDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  servingsRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 12,
  },
  servingsText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  macrosContainer: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
    marginBottom: 14,
  },
  macroPill: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroValue: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  macroLabel: {
    fontSize: 9,
    color: Colors.textSecondary,
  },
  sectionBlock: {
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 12,
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
    backgroundColor: Colors.primary,
    marginTop: 7,
  },
  ingredientText: {
    fontSize: 12,
    color: Colors.textSecondary,
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
    gap: 10,
    marginBottom: 10,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary + "25",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  stepNumberText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: Colors.primary,
  },
  instructionText: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  grocerySection: {
    marginBottom: 16,
  },
  grocerySectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 12,
  },
  grocerySectionTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  groceryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
  },
  groceryRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingVertical: 10,
  },
  groceryRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
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
  groceryQuantity: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  groceryPrice: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.accent,
  },
});
