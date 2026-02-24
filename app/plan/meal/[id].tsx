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
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors, ThemeColors } from "@/lib/theme-context";
import { useMealPlan } from "@/lib/api-hooks";
import { getAccessToken } from "@/lib/api-client";

async function sendMealPreference(mealName: string, liked: boolean) {
  const token = await getAccessToken();
  const baseUrl = Platform.OS === "web"
    ? ""
    : process.env.EXPO_PUBLIC_API_BASE_URL || "";
  const res = await fetch(`${baseUrl}/api/preferences/meal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ mealName, liked }),
  });
  if (!res.ok) throw new Error("Failed to save preference");
  return res.json();
}

function MealActionButtons({ mealName }: { mealName: string }) {
  const Colors = useColors();
  const [state, setState] = useState<"none" | "liked" | "disliked">("none");
  const [loading, setLoading] = useState(false);

  const handlePress = async (liked: boolean) => {
    const newState = liked ? "liked" : "disliked";
    if (state === newState) {
      setState("none");
      return;
    }
    setLoading(true);
    try {
      await sendMealPreference(mealName, liked);
      setState(newState);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      Alert.alert("Error", "Could not save preference");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Pressable
        onPress={(e) => { e.stopPropagation(); handlePress(true); }}
        disabled={loading}
        hitSlop={8}
        style={({ pressed }) => ({
          opacity: loading ? 0.4 : pressed ? 0.6 : 1,
          padding: 4,
        })}
      >
        <Ionicons
          name={state === "liked" ? "thumbs-up" : "thumbs-up-outline"}
          size={18}
          color={state === "liked" ? "#30D158" : Colors.textTertiary}
        />
      </Pressable>
      <Pressable
        onPress={(e) => { e.stopPropagation(); handlePress(false); }}
        disabled={loading}
        hitSlop={8}
        style={({ pressed }) => ({
          opacity: loading ? 0.4 : pressed ? 0.6 : 1,
          padding: 4,
        })}
      >
        <Ionicons
          name={state === "disliked" ? "thumbs-down" : "thumbs-down-outline"}
          size={18}
          color={state === "disliked" ? "#FF6B6B" : Colors.textTertiary}
        />
      </Pressable>
      <Pressable
        onPress={(e) => { e.stopPropagation(); }}
        hitSlop={8}
        style={({ pressed }) => ({
          opacity: pressed ? 0.6 : 1,
          padding: 4,
        })}
      >
        <Ionicons name="refresh-outline" size={18} color={Colors.textTertiary} />
      </Pressable>
    </View>
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

interface GroceryItem {
  item: string;
  quantity: string;
  estimatedPrice?: number | string;
}

interface GroceryCategory {
  category: string;
  items: GroceryItem[];
}

function MealCard({ mealType, meal, completed }: { mealType: string; meal: MealData; completed?: boolean }) {
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
  if (meal.prepTime) quickInfoParts.push({ icon: "time-outline", value: `${meal.prepTime}m` });
  if (meal.servings) quickInfoParts.push({ icon: "people-outline", value: `${meal.servings}` });
  if (calDisplay) quickInfoParts.push({ icon: "flame-outline", value: `${calDisplay} cal`, iconColor: Colors.warning });

  const macroLine: string[] = [];
  if (proteinDisplay) macroLine.push(`${proteinDisplay} P`);
  if (carbsDisplay) macroLine.push(`${carbsDisplay} C`);
  if (fatDisplay) macroLine.push(`${fatDisplay} F`);

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
          <MealActionButtons mealName={meal.name} />
          <Pressable
            onPress={() => setExpanded(!expanded)}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 4 })}
          >
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={20}
              color={Colors.textSecondary}
            />
          </Pressable>
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

          {(calDisplay || proteinDisplay || carbsDisplay || fatDisplay) ? (
            <View style={styles.macroBarRow}>
              {calDisplay ? (
                <View style={styles.macroBarItem}>
                  <Text style={styles.macroBarLabel}>Cal</Text>
                  <Text style={styles.macroBarValue}>{calDisplay}</Text>
                </View>
              ) : null}
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
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"meals" | "grocery">("meals");

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
  const days: DayPlanData[] = planJson.days ?? [];
  const startDate = plan.startDate || planJson.startDate;

  let groceryList: GroceryItem[] = [];
  let groceryCategories: GroceryCategory[] = [];
  if (Array.isArray(planJson.groceryList)) {
    if (planJson.groceryList.length > 0 && planJson.groceryList[0].category) {
      groceryCategories = planJson.groceryList as GroceryCategory[];
      groceryCategories.forEach((cat: GroceryCategory) => {
        if (Array.isArray(cat.items)) {
          groceryList.push(...cat.items);
        }
      });
    } else {
      groceryList = planJson.groceryList as GroceryItem[];
    }
  }

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
                      style={({ pressed }) => [styles.regenDayBtn, pressed && { opacity: 0.7 }]}
                      onPress={() => {}}
                    >
                      <Ionicons name="refresh-outline" size={14} color={Colors.textSecondary} />
                      <Text style={styles.regenDayText}>Regenerate Day</Text>
                    </Pressable>
                  </View>
                  {mealEntries.map(([mealType, meal]) => (
                    <MealCard key={mealType} mealType={mealType} meal={meal as MealData} />
                  ))}
                </View>
              );
            })}
          </>
        ) : (
          <View style={styles.grocerySection}>
            {groceryCategories.length > 0 ? (
              groceryCategories.map((cat, catIdx) => (
                <View key={catIdx} style={styles.groceryCategoryBlock}>
                  <Text style={styles.groceryCategoryTitle}>{cat.category}</Text>
                  <View style={styles.groceryCard}>
                    {cat.items.map((item, i) => (
                      <View
                        key={i}
                        style={[
                          styles.groceryRow,
                          i < cat.items.length - 1 && styles.groceryRowBorder,
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
              ))
            ) : groceryList.length > 0 ? (
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
