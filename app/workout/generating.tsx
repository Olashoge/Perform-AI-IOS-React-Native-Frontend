import React, { useEffect, useState } from "react";
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
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useWorkoutPlanStatus } from "@/lib/api-hooks";
import { useQueryClient } from "@tanstack/react-query";

const WEB_TOP_INSET = 67;

const STAGES = [
  { key: "designing", label: "Designing your training plan" },
  { key: "structuring", label: "Structuring your week" },
  { key: "finalizing", label: "Finalizing" },
];

function getSimulatedStage(elapsed: number): number {
  if (elapsed < 10) return 0;
  if (elapsed < 25) return 1;
  return 2;
}

export default function WorkoutGeneratingScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? WEB_TOP_INSET : insets.top;
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const [enabled, setEnabled] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const queryClient = useQueryClient();

  const { data } = useWorkoutPlanStatus(planId ?? null, enabled);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (data?.status === "ready") {
      setEnabled(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["plans:workout"] });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "week-data" });
      queryClient.invalidateQueries({ queryKey: ["weekly-summary"] });
      queryClient.invalidateQueries({ queryKey: ["occupied-dates"] });
      router.replace(`/plans`);
    }
  }, [data?.status]);

  const isFailed = data?.status === "failed";
  const currentStage = getSimulatedStage(elapsed);

  return (
    <View style={[styles.container, { paddingTop: topInset + 20 }]}>
      {isFailed ? (
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle" size={64} color={Colors.error} />
          <Text style={styles.title}>Generation Failed</Text>
          <Text style={styles.subtitle}>
            {data?.errorMessage || "Something went wrong while creating your workout plan."}
          </Text>
          <View style={styles.buttonGroup}>
            <Pressable
              style={styles.primaryButton}
              onPress={() => {
                Haptics.impactAsync();
                router.replace("/workout/new");
              }}
            >
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => {
                Haptics.impactAsync();
                router.replace("/(tabs)");
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
            color="#FF6B6B"
            style={styles.indicator}
          />
          <Text style={styles.title}>Creating Your Workout Plan...</Text>
          <Text style={styles.subtitle}>
            Our AI is building your personalized 7-day training plan. This usually takes about a minute.
          </Text>

          <View style={styles.stagesContainer}>
            {STAGES.map((stage, idx) => {
              const status = idx < currentStage ? "completed" : idx === currentStage ? "in_progress" : "pending";
              const iconName: any = status === "completed" ? "checkmark-circle" : status === "in_progress" ? "ellipsis-horizontal-circle" : "ellipse-outline";
              const iconColor = status === "completed" ? Colors.accent : status === "in_progress" ? "#FF6B6B" : Colors.textSecondary;
              return (
                <View key={stage.key} style={styles.stageRow}>
                  <Ionicons name={iconName} size={24} color={iconColor} />
                  <Text style={styles.stageLabel}>{stage.label}</Text>
                  <Text style={[styles.stageStatus, status === "completed" && { color: Colors.accent }, status === "in_progress" && { color: "#FF6B6B" }]}>
                    {status === "completed" ? "Done" : status === "in_progress" ? "Working..." : "Pending"}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 24 },
  centerContent: { flex: 1, justifyContent: "center", alignItems: "center" },
  indicator: { marginBottom: 32, transform: [{ scale: 1.5 }] },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", color: Colors.text, textAlign: "center", marginBottom: 12 },
  subtitle: {
    fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.textSecondary,
    textAlign: "center", lineHeight: 22, paddingHorizontal: 16, marginBottom: 40,
  },
  stagesContainer: {
    width: "100%", backgroundColor: Colors.surface, borderRadius: 16, padding: 20, gap: 16,
  },
  stageRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  stageLabel: { flex: 1, fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.text },
  stageStatus: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  buttonGroup: { width: "100%", gap: 12, marginTop: 32 },
  primaryButton: { backgroundColor: "#FF6B6B", borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  primaryButtonText: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: Colors.text },
  secondaryButton: { backgroundColor: Colors.surface, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  secondaryButtonText: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: Colors.text },
});
