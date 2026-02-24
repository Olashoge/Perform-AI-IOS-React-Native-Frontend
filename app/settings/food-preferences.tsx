import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors, ThemeColors } from "@/lib/theme-context";
import {
  useMealPreferences,
  useDeleteMealPreference,
  useDeleteIngredientPreference,
  MealPreference,
  IngredientPreference,
} from "@/lib/api-hooks";

type Tab = "liked" | "disliked" | "avoided";

function MealCard({
  meal,
  onDelete,
  Colors,
}: {
  meal: MealPreference;
  onDelete: () => void;
  Colors: ThemeColors;
}) {
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemIconCircle}>
        <Ionicons name="restaurant" size={18} color={Colors.textSecondary} />
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemName} numberOfLines={2}>{meal.mealName}</Text>
        {meal.cuisineTag ? (
          <Text style={styles.itemSubtext}>{meal.cuisineTag}</Text>
        ) : null}
      </View>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          Alert.alert("Remove", `Remove "${meal.mealName}" from your preferences?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Remove", style: "destructive", onPress: onDelete },
          ]);
        }}
        hitSlop={10}
        style={styles.deleteBtn}
      >
        <Ionicons name="trash-outline" size={18} color={Colors.textTertiary} />
      </Pressable>
    </View>
  );
}

function IngredientCard({
  ingredient,
  onDelete,
  Colors,
  type,
}: {
  ingredient: IngredientPreference;
  onDelete: () => void;
  Colors: ThemeColors;
  type: "prefer" | "avoid";
}) {
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemIconCircle}>
        <Ionicons
          name={type === "avoid" ? "close-circle-outline" : "leaf-outline"}
          size={18}
          color={type === "avoid" ? Colors.error : Colors.scoreGreen}
        />
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemName}>
          {ingredient.ingredientKey.charAt(0).toUpperCase() + ingredient.ingredientKey.slice(1)}
        </Text>
        {ingredient.source ? (
          <Text style={styles.itemSubtext}>{ingredient.source}</Text>
        ) : null}
      </View>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          Alert.alert("Remove", `Remove "${ingredient.ingredientKey}" from your preferences?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Remove", style: "destructive", onPress: onDelete },
          ]);
        }}
        hitSlop={10}
        style={styles.deleteBtn}
      >
        <Ionicons name="trash-outline" size={18} color={Colors.textTertiary} />
      </Pressable>
    </View>
  );
}

function EmptyState({ tab, Colors }: { tab: Tab; Colors: ThemeColors }) {
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const config = {
    liked: {
      icon: "thumbs-up-outline" as const,
      text: "No liked meals yet. Like meals in your meal plans to improve future suggestions.",
    },
    disliked: {
      icon: "thumbs-down-outline" as const,
      text: "No disliked meals yet. Dislike meals in your meal plans to avoid them in the future.",
    },
    avoided: {
      icon: "ban-outline" as const,
      text: "No avoided ingredients yet. Ingredients are added here when you dislike meals containing them.",
    },
  };
  const c = config[tab];

  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name={c.icon} size={28} color={Colors.textTertiary} />
      </View>
      <Text style={styles.emptyText}>{c.text}</Text>
    </View>
  );
}

export default function MealPreferencesScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const [activeTab, setActiveTab] = useState<Tab>("liked");
  const { data, isLoading } = useMealPreferences();
  const deleteMeal = useDeleteMealPreference();
  const deleteIngredient = useDeleteIngredientPreference();

  const likedMeals = data?.likedMeals ?? [];
  const dislikedMeals = data?.dislikedMeals ?? [];
  const preferIngredients = data?.preferIngredients ?? [];
  const avoidIngredients = data?.avoidIngredients ?? [];

  const likedCount = likedMeals.length + preferIngredients.length;
  const dislikedCount = dislikedMeals.length;
  const avoidedCount = avoidIngredients.length;

  const tabs: { key: Tab; label: string; count: number; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: "liked", label: "Liked", count: likedCount, icon: "thumbs-up-outline" },
    { key: "disliked", label: "Disliked", count: dislikedCount, icon: "thumbs-down-outline" },
    { key: "avoided", label: "Avoided", count: avoidedCount, icon: "ban-outline" },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Meal Preferences</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={styles.subtitle}>
        Manage your liked and disliked meals and ingredient preferences. These are used to personalize your future meal plans.
      </Text>

      <View style={styles.tabRow}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => {
                Haptics.selectionAsync();
                setActiveTab(tab.key);
              }}
            >
              <Ionicons
                name={tab.icon}
                size={14}
                color={isActive ? Colors.primary : Colors.textSecondary}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label} ({tab.count})
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === "liked" && (
            <>
              {likedMeals.length > 0 && likedMeals.map((meal) => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  onDelete={() => deleteMeal.mutate(meal.id)}
                  Colors={Colors}
                />
              ))}
              {preferIngredients.length > 0 && (
                <>
                  {likedMeals.length > 0 && <Text style={styles.sectionLabel}>Preferred Ingredients</Text>}
                  {preferIngredients.map((ing) => (
                    <IngredientCard
                      key={ing.id}
                      ingredient={ing}
                      onDelete={() => deleteIngredient.mutate(ing.id)}
                      Colors={Colors}
                      type="prefer"
                    />
                  ))}
                </>
              )}
              {likedCount === 0 && <EmptyState tab="liked" Colors={Colors} />}
            </>
          )}

          {activeTab === "disliked" && (
            <>
              {dislikedMeals.length > 0 ? (
                dislikedMeals.map((meal) => (
                  <MealCard
                    key={meal.id}
                    meal={meal}
                    onDelete={() => deleteMeal.mutate(meal.id)}
                    Colors={Colors}
                  />
                ))
              ) : (
                <EmptyState tab="disliked" Colors={Colors} />
              )}
            </>
          )}

          {activeTab === "avoided" && (
            <>
              {avoidIngredients.length > 0 ? (
                avoidIngredients.map((ing) => (
                  <IngredientCard
                    key={ing.id}
                    ingredient={ing}
                    onDelete={() => deleteIngredient.mutate(ing.id)}
                    Colors={Colors}
                    type="avoid"
                  />
                ))
              ) : (
                <EmptyState tab="avoided" Colors={Colors} />
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    flex: 1,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 16,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: {
    backgroundColor: Colors.primary + "18",
    borderColor: Colors.primary + "50",
  },
  tabText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
    fontFamily: "Inter_600SemiBold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 8,
    marginBottom: 2,
    paddingLeft: 4,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  itemIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
  },
  itemContent: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  itemSubtext: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  deleteBtn: {
    padding: 6,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
