import React, { useState, useEffect, useMemo } from "react";
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
import { useColors, ThemeColors } from "@/lib/theme-context";
import { useProfile, useUpdateProfile, ProfileData } from "@/lib/api-hooks";

const FOODS_TO_AVOID_PRESETS = [
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
                <Ionicons name="close" size={14} color={Colors.text} />
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

export default function FoodPreferencesScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const profile = useProfile();
  const updateProfile = useUpdateProfile();

  const [favoriteMealsText, setFavoriteMealsText] = useState("");
  const [foodsToAvoid, setFoodsToAvoid] = useState<string[]>([]);
  const [allergiesIntolerances, setAllergiesIntolerances] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile.data && !loaded) {
      setFavoriteMealsText(profile.data.favoriteMealsText || "");
      setFoodsToAvoid(profile.data.foodsToAvoid || []);
      setAllergiesIntolerances(profile.data.allergiesIntolerances || []);
      setLoaded(true);
    }
  }, [profile.data, loaded]);

  const foodsToAvoidPresetSelected = foodsToAvoid.filter((f) =>
    FOODS_TO_AVOID_PRESETS.includes(f)
  );
  const foodsToAvoidCustom = foodsToAvoid.filter(
    (f) => !FOODS_TO_AVOID_PRESETS.includes(f)
  );

  const handlePresetToggle = (item: string) => {
    Haptics.selectionAsync();
    const isSelected = foodsToAvoidPresetSelected.includes(item);
    if (isSelected) {
      setFoodsToAvoid([
        ...foodsToAvoidPresetSelected.filter((f) => f !== item),
        ...foodsToAvoidCustom,
      ]);
    } else {
      setFoodsToAvoid([
        ...foodsToAvoidPresetSelected,
        item,
        ...foodsToAvoidCustom,
      ]);
    }
  };

  const handleCustomFoodsChange = (customTags: string[]) => {
    setFoodsToAvoid([...foodsToAvoidPresetSelected, ...customTags]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile.mutateAsync({
        favoriteMealsText,
        foodsToAvoid,
        allergiesIntolerances,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to save preferences");
    } finally {
      setSaving(false);
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + webTopInset + 8 },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Food Preferences</Text>
        <Pressable
          onPress={handleSave}
          disabled={saving}
          hitSlop={12}
          style={styles.saveBtn}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Ionicons name="checkmark" size={28} color={Colors.primary} />
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="heart-outline" size={18} color={Colors.primary} />
            <Text style={styles.sectionHeaderText}>FAVORITE MEALS</Text>
          </View>
          <View style={styles.sectionCard}>
            <Text style={styles.fieldDescription}>
              Describe your favorite meals, cuisines, or dishes so the AI can tailor recommendations.
            </Text>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={favoriteMealsText}
              onChangeText={setFavoriteMealsText}
              multiline
              placeholderTextColor={Colors.textTertiary}
              placeholder="e.g. Grilled chicken salads, Mediterranean bowls, stir-fry with rice..."
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="close-circle-outline" size={18} color={Colors.warning} />
            <Text style={styles.sectionHeaderText}>FOODS TO AVOID</Text>
          </View>
          <View style={styles.sectionCard}>
            <Text style={styles.fieldDescription}>
              Select common foods to avoid or add your own below.
            </Text>
            <View style={styles.pillWrap}>
              {FOODS_TO_AVOID_PRESETS.map((item) => {
                const active = foodsToAvoidPresetSelected.includes(item);
                return (
                  <Pressable
                    key={item}
                    style={[styles.pill, active && styles.pillActive]}
                    onPress={() => handlePresetToggle(item)}
                  >
                    <Text
                      style={[styles.pillText, active && styles.pillTextActive]}
                    >
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.customTagSection}>
              <Text style={styles.customTagLabel}>Custom items</Text>
              <TagInput
                tags={foodsToAvoidCustom}
                onChangeTags={handleCustomFoodsChange}
                placeholder="Add custom food to avoid..."
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="warning-outline" size={18} color={Colors.error} />
            <Text style={styles.sectionHeaderText}>ALLERGIES & INTOLERANCES</Text>
          </View>
          <View style={styles.sectionCard}>
            <Text style={styles.fieldDescription}>
              List any food allergies or intolerances to ensure safe meal recommendations.
            </Text>
            <TagInput
              tags={allergiesIntolerances}
              onChangeTags={setAllergiesIntolerances}
              placeholder="e.g. Peanuts, Lactose, Celiac..."
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    fontWeight: "600" as const,
    color: Colors.text,
    flex: 1,
    textAlign: "center" as const,
  },
  saveBtn: {
    width: 40,
    alignItems: "flex-end",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  fieldDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 14,
  },
  textInput: {
    backgroundColor: Colors.inputBg === Colors.surface ? Colors.surfaceElevated : Colors.inputBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: "top" as const,
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
    backgroundColor: Colors.primary + "22",
    borderColor: Colors.primary,
  },
  pillText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  pillTextActive: {
    color: Colors.primary,
    fontWeight: "600" as const,
  },
  customTagSection: {
    marginTop: 16,
  },
  customTagLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
    fontWeight: "500" as const,
  },
  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.primary + "22",
    borderWidth: 1,
    borderColor: Colors.primary + "44",
  },
  tagText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "500" as const,
  },
});
