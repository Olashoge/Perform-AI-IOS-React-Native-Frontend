import React, { useState, useEffect, useRef, useMemo } from "react";
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
import { useCreateDailyWorkout, useProfile } from "@/lib/api-hooks";
import { Pill, PillGrid } from "@/components/Pill";


const WEB_TOP_INSET = 67;

const FOCUS_OPTIONS = [
  "Full Body", "Upper Body", "Lower Body", "Core", "Back", "Chest",
  "Arms", "Shoulders", "Glutes", "Legs",
];

const LOCATION_OPTIONS = [
  { value: "gym", label: "Gym" },
  { value: "home", label: "Home" },
  { value: "outdoors", label: "Outdoors" },
];

const DURATION_OPTIONS = [
  { value: 20, label: "20 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "60 min" },
  { value: 90, label: "90 min" },
];

const INTENSITY_OPTIONS = [
  { value: "easy", label: "Easy" },
  { value: "moderate", label: "Moderate" },
  { value: "hard", label: "Hard" },
];

export default function DailyWorkoutFormScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? WEB_TOP_INSET : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const createDailyWorkout = useCreateDailyWorkout();
  const { data: profile } = useProfile();
  const prefilled = useRef(false);

  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [focus, setFocus] = useState("Full Body");
  const [location, setLocation] = useState("gym");
  const [duration, setDuration] = useState(45);
  const [intensity, setIntensity] = useState("moderate");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile && !prefilled.current) {
      prefilled.current = true;
      if (profile.workoutLocationDefault) setLocation(profile.workoutLocationDefault);
      if (profile.sessionDurationMinutes) {
        const closest = DURATION_OPTIONS.reduce((prev, curr) =>
          Math.abs(curr.value - (profile.sessionDurationMinutes || 45)) < Math.abs(prev.value - (profile.sessionDurationMinutes || 45)) ? curr : prev
        );
        setDuration(closest.value);
      }
    }
  }, [profile]);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await createDailyWorkout.mutateAsync({ date });
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
        <Text style={styles.headerTitle}>Daily Workout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Workout Focus</Text>
        <PillGrid>
          {FOCUS_OPTIONS.map((f) => (
            <Pill
              key={f}
              label={f}
              selected={focus === f}
              onPress={() => { Haptics.selectionAsync(); setFocus(f); }}
            />
          ))}
        </PillGrid>

        <Text style={styles.sectionTitle}>Location</Text>
        <PillGrid>
          {LOCATION_OPTIONS.map((opt) => (
            <Pill
              key={opt.value}
              label={opt.label}
              selected={location === opt.value}
              onPress={() => { Haptics.selectionAsync(); setLocation(opt.value); }}
            />
          ))}
        </PillGrid>

        <Text style={styles.sectionTitle}>Duration</Text>
        <PillGrid>
          {DURATION_OPTIONS.map((opt) => (
            <Pill
              key={opt.value}
              label={opt.label}
              selected={duration === opt.value}
              onPress={() => { Haptics.selectionAsync(); setDuration(opt.value); }}
            />
          ))}
        </PillGrid>

        <Text style={styles.sectionTitle}>Intensity</Text>
        <PillGrid>
          {INTENSITY_OPTIONS.map((opt) => (
            <Pill
              key={opt.value}
              label={opt.label}
              selected={intensity === opt.value}
              onPress={() => { Haptics.selectionAsync(); setIntensity(opt.value); }}
            />
          ))}
        </PillGrid>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={Colors.textSecondary} />
          <Text style={styles.infoText}>
            Your daily workout will be generated based on your profile, training experience, and selected preferences.
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
              <Text style={styles.generateButtonText}>Generate Daily Workout</Text>
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
