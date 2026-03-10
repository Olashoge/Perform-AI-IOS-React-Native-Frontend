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
import { Icon } from "@/components/Icon";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors, ThemeColors } from "@/lib/theme-context";
import { useCreateDailyMeal } from "@/lib/api-hooks";
import { Pill, PillGrid } from "@/components/Pill";
import CalendarPickerField from "@/components/CalendarPickerField";

const WEB_TOP_INSET = 67;

export default function DailyMealFormScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? WEB_TOP_INSET : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const createDailyMeal = useCreateDailyMeal();

  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [mealsPerDay, setMealsPerDay] = useState(3);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await createDailyMeal.mutateAsync({ date, mealsPerDay });
      router.replace({ pathname: "/daily/[date]", params: { date } });
    } catch (err: any) {
      setSubmitting(false);
      if (err?.response?.status === 429) {
        Alert.alert("Rate Limit", "You've reached the daily limit for AI-generated plans. Please try again tomorrow.");
      } else {
        Alert.alert("Error", err?.response?.data?.message || "Something went wrong. Please try again.");
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Date</Text>
        <CalendarPickerField
          value={date}
          onChange={(d) => setDate(d || today)}
          Colors={Colors}
          planDuration={1}
        />

        <Text style={styles.sectionTitle}>Meals Per Day</Text>
        <PillGrid>
          {[2, 3, 4].map((n) => (
            <Pill
              key={n}
              label={`${n} meals`}
              selected={mealsPerDay === n}
              onPress={() => { Haptics.selectionAsync(); setMealsPerDay(n); }}
            />
          ))}
        </PillGrid>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={Colors.textSecondary} />
          <Text style={styles.infoText}>
            Your daily meal will be generated based on your profile preferences, dietary restrictions, and selected options.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: bottomInset + 12 }]}>
        <Pressable
          style={[styles.generateButton, submitting && { opacity: 0.5 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={Colors.text} />
          ) : (
            <>
              <Icon name="sparkles" size={20} />
              <Text style={styles.generateButtonText}>Generate Daily Meal</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
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
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.text },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text, marginBottom: 10, marginTop: 20,
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginTop: 24,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.background, paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  generateButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  generateButtonText: {
    fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF",
  },
});
