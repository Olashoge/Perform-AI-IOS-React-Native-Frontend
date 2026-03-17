import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Icon } from "@/components/Icon";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors, ThemeColors } from "@/lib/theme-context";
import { useDailyGeneratingPoll } from "@/lib/api-hooks";

const WEB_TOP_INSET = 67;
const TIMEOUT_MS = 90_000;
const STAGE_ADVANCE_MS = 8_000;

const DAILY_TIPS = [
  "Consistency beats intensity — small daily actions compound into big results.",
  "Protein at every meal supports muscle repair and keeps you fuller, longer.",
  "Rest days are when your muscles actually grow. Recovery is part of the plan.",
  "Staying hydrated improves focus, energy, and workout performance.",
  "A good night's sleep is one of the most powerful tools for fat loss and muscle gain.",
  "Even a 10-minute walk after meals can significantly improve blood sugar regulation.",
  "Compound movements like squats and deadlifts burn more calories than isolation exercises.",
  "Eating mindfully — without screens — helps you recognize fullness cues faster.",
];

const STAGES_BY_TYPE: Record<string, string[]> = {
  meal: ["Analyzing your preferences", "Building your meal plan"],
  workout: ["Analyzing your preferences", "Building your workout plan"],
};

function normalizeStageStatus(stageIdx: number, visualStage: number): string {
  if (stageIdx < visualStage) return "completed";
  if (stageIdx === visualStage) return "in_progress";
  return "pending";
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function DailyGeneratingScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? WEB_TOP_INSET : insets.top;

  const { type, date } = useLocalSearchParams<{
    type: "meal" | "workout";
    date: string;
  }>();

  const [pollEnabled, setPollEnabled] = useState(true);
  const [visualStage, setVisualStage] = useState(0);
  const [isFailed, setIsFailed] = useState(false);
  const [tipIndex, setTipIndex] = useState(
    () => Math.floor(Math.random() * DAILY_TIPS.length)
  );
  const startTime = useRef(Date.now());
  const navigatedRef = useRef(false);
  const tipRef = useRef(tipIndex);

  const { data } = useDailyGeneratingPoll(date ?? "", pollEnabled);

  // Visual stage advance + timeout guard
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime.current;
      setVisualStage(Math.min(Math.floor(elapsed / STAGE_ADVANCE_MS), 1));
      if (elapsed >= TIMEOUT_MS) {
        clearInterval(interval);
        setPollEnabled(false);
        if (!navigatedRef.current) setIsFailed(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Rotate tips
  useEffect(() => {
    const interval = setInterval(() => {
      tipRef.current = (tipRef.current + 1) % DAILY_TIPS.length;
      setTipIndex(tipRef.current);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Detect ready
  useEffect(() => {
    if (!data || navigatedRef.current) return;
    const isReady = type === "meal" ? data.hasDailyMeal : data.hasDailyWorkout;
    if (isReady) {
      navigatedRef.current = true;
      setPollEnabled(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({
        pathname: "/daily/ready",
        params: { type: type ?? "meal", date: date ?? "" },
      } as any);
    }
  }, [data, type, date]);

  const typeLabel = type === "meal" ? "Meal" : "Workout";
  const stages = STAGES_BY_TYPE[type ?? "meal"];
  const formattedDate = date ? formatDate(date) : "";

  return (
    <View style={[styles.container, { paddingTop: topInset + 20 }]}>
      {isFailed ? (
        <View style={styles.centerContent}>
          <View style={styles.errorIconWrap}>
            <Icon name="alertCircle" size={28} color={Colors.error} />
          </View>
          <Text style={styles.title}>Generation Failed</Text>
          <Text style={styles.subtitle}>
            We weren't able to generate your daily {typeLabel.toLowerCase()} for{" "}
            {formattedDate}. Please try again.
          </Text>
          <View style={styles.buttonGroup}>
            <Pressable
              style={styles.primaryButton}
              onPress={() => {
                Haptics.impactAsync();
                router.back();
              }}
            >
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => {
                Haptics.impactAsync();
                router.replace("/(tabs)" as any);
              }}
            >
              <Text style={styles.secondaryButtonText}>Go Home</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.centerContent}>
          <ActivityIndicator
            size="large"
            color={Colors.primary}
            style={styles.indicator}
          />
          <Text style={styles.title}>Generating Your Daily {typeLabel}...</Text>
          <Text style={styles.subtitle}>
            Personalizing your {typeLabel.toLowerCase()} for{"\n"}
            {formattedDate}
          </Text>

          <View style={styles.stagesContainer}>
            {stages.map((label, idx) => {
              const status = normalizeStageStatus(idx, visualStage);
              let iconName: keyof typeof Ionicons.glyphMap = "ellipse-outline";
              let iconColor = Colors.textSecondary;
              let statusText = "Pending";
              if (status === "completed") {
                iconName = "checkmark-circle-outline";
                iconColor = Colors.accent;
                statusText = "Completed";
              } else if (status === "in_progress") {
                iconName = "ellipsis-horizontal-circle-outline";
                iconColor = Colors.primary;
                statusText = "In progress";
              }
              return (
                <View key={label} style={styles.stageRow}>
                  <Ionicons name={iconName} size={24} color={iconColor} />
                  <Text style={styles.stageLabel}>{label}</Text>
                  <Text
                    style={[
                      styles.stageStatus,
                      status === "completed" && { color: Colors.accent },
                      status === "in_progress" && { color: Colors.primary },
                    ]}
                  >
                    {statusText}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={styles.tipCard}>
            <Text style={styles.tipLabel}>WELLNESS TIP</Text>
            <Text style={styles.tipText}>{DAILY_TIPS[tipIndex]}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const createStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background,
      paddingHorizontal: 24,
    },
    centerContent: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    indicator: {
      marginBottom: 32,
      transform: [{ scale: 1.5 }],
    },
    title: {
      fontSize: 22,
      fontFamily: "Inter_700Bold",
      color: Colors.text,
      textAlign: "center",
      marginBottom: 12,
    },
    subtitle: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: Colors.textSecondary,
      textAlign: "center",
      lineHeight: 22,
      paddingHorizontal: 16,
      marginBottom: 40,
    },
    stagesContainer: {
      width: "100%",
      backgroundColor: Colors.surface,
      borderRadius: 16,
      padding: 20,
      gap: 16,
    },
    stageRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    stageLabel: {
      flex: 1,
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: Colors.text,
    },
    stageStatus: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      color: Colors.textSecondary,
    },
    tipCard: {
      width: "100%",
      backgroundColor: Colors.surface,
      borderRadius: 14,
      padding: 16,
      marginTop: 16,
      borderLeftWidth: 3,
      borderLeftColor: Colors.primary,
    },
    tipLabel: {
      fontSize: 9,
      fontFamily: "Inter_700Bold",
      color: Colors.primary,
      letterSpacing: 0.8,
      marginBottom: 6,
    },
    tipText: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: Colors.textSecondary,
      lineHeight: 20,
    },
    errorIconWrap: {
      marginBottom: 24,
    },
    buttonGroup: {
      width: "100%",
      gap: 12,
      marginTop: 32,
    },
    primaryButton: {
      backgroundColor: Colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: "center",
    },
    primaryButtonText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: "#fff",
    },
    secondaryButton: {
      backgroundColor: Colors.surface,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: "center",
    },
    secondaryButtonText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: Colors.text,
    },
  });
