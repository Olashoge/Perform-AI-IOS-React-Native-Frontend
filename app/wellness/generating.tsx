import React, { useEffect, useState, useMemo } from "react";
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
import { useGenerationStatus } from "@/lib/api-hooks";
import { useWellness } from "@/lib/wellness-context";

const WEB_TOP_INSET = 67;

const STAGES: { key: keyof GenerationStages; label: string }[] = [
  { key: "TRAINING", label: "Training Plan" },
  { key: "NUTRITION", label: "Nutrition Plan" },
  { key: "SCHEDULING", label: "Scheduling" },
  { key: "FINALIZING", label: "Finalizing" },
];

type GenerationStages = {
  TRAINING: string;
  NUTRITION: string;
  SCHEDULING: string;
  FINALIZING: string;
};

function normalizeStageStatus(status: string): string {
  const s = status.toUpperCase();
  if (s === "DONE" || s === "COMPLETED") return "completed";
  if (s === "RUNNING" || s === "IN_PROGRESS") return "in_progress";
  return "pending";
}

function getStageIcon(rawStatus: string, Colors: ThemeColors): {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
} {
  const status = normalizeStageStatus(rawStatus);
  if (status === "completed")
    return { name: "checkmark-circle-outline", color: Colors.accent };
  if (status === "in_progress")
    return { name: "ellipsis-horizontal-circle-outline", color: Colors.primary };
  return { name: "ellipse-outline", color: Colors.textSecondary };
}

function getStageLabel(rawStatus: string): string {
  const status = normalizeStageStatus(rawStatus);
  if (status === "completed") return "Completed";
  if (status === "in_progress") return "In progress";
  return "Pending";
}

export default function GeneratingScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const { goalPlanId } = useLocalSearchParams<{ goalPlanId: string }>();
  const { resetWizard } = useWellness();
  const [enabled, setEnabled] = useState(true);
  const [visualStage, setVisualStage] = useState(0);
  const [startTime] = useState(Date.now());

  const { data } = useGenerationStatus(goalPlanId ?? null, enabled);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newStage = Math.min(Math.floor(elapsed / 20000), 3);
      setVisualStage(newStage);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  useEffect(() => {
    if (data?.status === "ready") {
      setEnabled(false);
      resetWizard();
      router.replace(`/wellness/ready?goalPlanId=${goalPlanId}`);
    } else if (data?.status === "failed") {
      setEnabled(false);
    }
  }, [data?.status]);

  const isFailed = data?.status === "failed";

  const computedStageStatuses = useMemo(() => {
    const result: Record<string, string> = {};
    STAGES.forEach((stage, idx) => {
      if (idx < visualStage) {
        result[stage.key] = "DONE";
      } else if (idx === visualStage) {
        result[stage.key] = "RUNNING";
      } else {
        result[stage.key] = "PENDING";
      }
    });
    if (data?.status === "ready") {
      STAGES.forEach((stage) => { result[stage.key] = "DONE"; });
    }
    return result;
  }, [visualStage, data?.status]);

  const stageStatuses = computedStageStatuses;
  const topInset = Platform.OS === "web" ? WEB_TOP_INSET : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topInset + 20 }]}>
      {isFailed ? (
        <View style={styles.centerContent}>
          <View style={styles.errorIconWrap}>
            <Icon name="alertCircle" size={28} color={Colors.error} />
          </View>
          <Text style={styles.title}>Generation Failed</Text>
          <Text style={styles.subtitle}>
            {data?.progress?.errorMessage || "Something went wrong"}
          </Text>
          <View style={styles.buttonGroup}>
            <Pressable
              style={styles.primaryButton}
              onPress={() => {
                Haptics.impactAsync();
                router.replace("/wellness/step4");
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
            color={Colors.primary}
            style={styles.indicator}
          />
          <Text style={styles.title}>Creating Your Plan...</Text>
          <Text style={styles.subtitle}>
            Our AI is building your personalized plan. This usually takes 1-2
            minutes.
          </Text>

          <View style={styles.stagesContainer}>
            {STAGES.map((stage) => {
              const rawStatus = stageStatuses?.[stage.key] ?? "pending";
              const normalized = normalizeStageStatus(rawStatus);
              const icon = getStageIcon(rawStatus, Colors);
              const label = getStageLabel(rawStatus);
              return (
                <View key={stage.key} style={styles.stageRow}>
                  <Ionicons name={icon.name as keyof typeof Ionicons.glyphMap} size={24} color={icon.color} />
                  <Text style={styles.stageLabel}>{stage.label}</Text>
                  <Text
                    style={[
                      styles.stageStatus,
                      normalized === "completed" && { color: Colors.accent },
                      normalized === "in_progress" && { color: Colors.primary },
                    ]}
                  >
                    {label}
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

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
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
    color: Colors.text,
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
