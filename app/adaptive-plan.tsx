import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useColors, ThemeColors } from "@/lib/theme-context";
import { PerformanceStateKey, useApplyRecoveryWeek } from "@/lib/api-hooks";

const WEEK_TYPE_CONFIG: Record<string, {
  icon: keyof typeof Ionicons.glyphMap;
  subtitle: string;
  training: { label: string; before: string; after: string }[];
  nutrition: { label: string; before: string; after: string }[];
}> = {
  "Recovery Focus Week": {
    icon: "leaf-outline",
    subtitle: "Reduce intensity to rebuild consistency.",
    training: [
      { label: "Training days", before: "4–5 days", after: "2–3 days" },
      { label: "Session duration", before: "45–60 min", after: "30–40 min" },
      { label: "Focus", before: "Strength", after: "Mobility + Light Strength" },
    ],
    nutrition: [
      { label: "Dinner complexity", before: "Standard", after: "Simplified" },
      { label: "Meal prep load", before: "Normal", after: "Lower" },
    ],
  },
  "Stability Week": {
    icon: "shield-checkmark-outline",
    subtitle: "Maintain current load while solidifying habits.",
    training: [
      { label: "Training days", before: "Current", after: "Same" },
      { label: "Session intensity", before: "Moderate", after: "Moderate (steady)" },
      { label: "Focus", before: "Mixed", after: "Consistency + Form" },
    ],
    nutrition: [
      { label: "Meal variety", before: "Standard", after: "Simplified rotations" },
      { label: "Prep difficulty", before: "Normal", after: "Maintained" },
    ],
  },
  "Momentum Week": {
    icon: "trending-up",
    subtitle: "Build on your upward trend with progressive challenge.",
    training: [
      { label: "Training days", before: "3–4 days", after: "4–5 days" },
      { label: "Session duration", before: "30–45 min", after: "45–55 min" },
      { label: "Focus", before: "General", after: "Progressive overload" },
    ],
    nutrition: [
      { label: "Protein targets", before: "Standard", after: "Slightly increased" },
      { label: "Meal structure", before: "Flexible", after: "Performance-oriented" },
    ],
  },
  "Progression Week": {
    icon: "rocket-outline",
    subtitle: "Push further with advanced programming.",
    training: [
      { label: "Training days", before: "4 days", after: "4–5 days" },
      { label: "Session intensity", before: "Moderate-High", after: "High" },
      { label: "Focus", before: "Strength", after: "Strength + Performance" },
    ],
    nutrition: [
      { label: "Calorie targets", before: "Maintenance", after: "Performance surplus" },
      { label: "Meal timing", before: "Flexible", after: "Training-aligned" },
    ],
  },
};

function getStateColor(key: string, Colors: ThemeColors): string {
  switch (key) {
    case "on_track": return Colors.accent;
    case "building_momentum": return Colors.primary;
    case "recovering": return Colors.warning;
    case "at_risk": return Colors.error;
    case "declining": return Colors.error;
    default: return Colors.primary;
  }
}

export default function AdjustWeekScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const params = useLocalSearchParams<{
    weekType: string;
    stateKey: string;
    weekStart: string;
    wellnessPlanId: string;
    reasons: string;
  }>();

  const weekType = params.weekType || "Recovery Focus Week";
  const stateKey = (params.stateKey || "recovering") as PerformanceStateKey;
  const weekStart = params.weekStart || "";
  const wellnessPlanId = params.wellnessPlanId || "";
  const reasons: string[] = useMemo(() => {
    try { return JSON.parse(params.reasons || "[]"); }
    catch { return []; }
  }, [params.reasons]);

  const config = WEEK_TYPE_CONFIG[weekType] || WEEK_TYPE_CONFIG["Recovery Focus Week"];
  const stateColor = getStateColor(stateKey, Colors);
  const applyMutation = useApplyRecoveryWeek();
  const [applied, setApplied] = useState(false);

  const handleApply = () => {
    applyMutation.mutate(
      {
        weekStart,
        wellnessPlanId: wellnessPlanId || undefined,
        weekType,
      },
      {
        onSuccess: () => {
          setApplied(true);
          Alert.alert(
            "Week Adjusted",
            `${weekType} applied successfully.`,
            [{
              text: "View Calendar",
              onPress: () => router.replace("/(tabs)/calendar" as any),
            }],
          );
        },
        onError: (error: any) => {
          const status = error?.response?.status;
          const message = error?.response?.data?.message || error?.response?.data?.error;
          if (status === 409) {
            Alert.alert("Cannot Apply", message || "This adjustment conflicts with your current plan.");
          } else {
            Alert.alert("Error", message || "Couldn't apply adjustment. Try again.");
          }
        },
      },
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: insets.top + 16 + webTopInset, paddingBottom: insets.bottom + 40 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color={Colors.text} />
      </Pressable>

      <View style={styles.heroSection}>
        <View style={[styles.heroIconBg, { backgroundColor: stateColor + "1A" }]}>
          <Ionicons name={config.icon} size={32} color={stateColor} />
        </View>
        <Text style={styles.heroTitle}>{weekType}</Text>
        <Text style={styles.heroSubtitle}>{config.subtitle}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>What will change</Text>

        <Text style={styles.categoryLabel}>Training</Text>
        {config.training.map((item, i) => (
          <View key={i} style={styles.changeRow}>
            <Text style={styles.changeLabel}>{item.label}</Text>
            <View style={styles.changeValues}>
              <Text style={styles.changeBefore}>{item.before}</Text>
              <Ionicons name="arrow-forward" size={12} color={Colors.textTertiary} style={{ marginHorizontal: 6 }} />
              <Text style={[styles.changeAfter, { color: stateColor }]}>{item.after}</Text>
            </View>
          </View>
        ))}

        <View style={styles.categorySeparator} />

        <Text style={styles.categoryLabel}>Nutrition</Text>
        {config.nutrition.map((item, i) => (
          <View key={i} style={styles.changeRow}>
            <Text style={styles.changeLabel}>{item.label}</Text>
            <View style={styles.changeValues}>
              <Text style={styles.changeBefore}>{item.before}</Text>
              <Ionicons name="arrow-forward" size={12} color={Colors.textTertiary} style={{ marginHorizontal: 6 }} />
              <Text style={[styles.changeAfter, { color: stateColor }]}>{item.after}</Text>
            </View>
          </View>
        ))}
      </View>

      {reasons.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Why</Text>
          {reasons.map((reason, i) => (
            <View key={i} style={styles.reasonRow}>
              <View style={[styles.reasonBullet, { backgroundColor: stateColor }]} />
              <Text style={styles.reasonText}>{reason}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.buttonGroup}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: stateColor },
            pressed && { opacity: 0.85 },
            (applyMutation.isPending || applied) && { opacity: 0.6 },
          ]}
          onPress={handleApply}
          disabled={applyMutation.isPending || applied}
        >
          {applyMutation.isPending ? (
            <ActivityIndicator size={18} color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>
                {applied ? "Applied" : `Apply ${weekType}`}
              </Text>
            </>
          )}
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.secondaryButton, pressed && { opacity: 0.7 }]}
          onPress={() => router.back()}
          disabled={applyMutation.isPending}
        >
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </Pressable>
      </View>
    </ScrollView>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  heroSection: {
    alignItems: "center",
    marginBottom: 28,
  },
  heroIconBg: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 16,
  },
  categoryLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  changeRow: {
    marginBottom: 12,
  },
  changeLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    marginBottom: 4,
  },
  changeValues: {
    flexDirection: "row",
    alignItems: "center",
  },
  changeBefore: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  changeAfter: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  categorySeparator: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 14,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  reasonBullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 6,
  },
  reasonText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 18,
    flex: 1,
  },
  buttonGroup: {
    gap: 10,
    marginTop: 8,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryButtonText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  secondaryButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.surface,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
});
