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

function getStageIcon(status: string): {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
} {
  if (status === "completed")
    return { name: "checkmark-circle", color: Colors.accent };
  if (status === "in_progress")
    return { name: "ellipsis-horizontal-circle", color: Colors.primary };
  return { name: "ellipse-outline", color: Colors.textSecondary };
}

function getStageLabel(status: string): string {
  if (status === "completed") return "Completed";
  if (status === "in_progress") return "In progress";
  return "Pending";
}

export default function GeneratingScreen() {
  const insets = useSafeAreaInsets();
  const { goalPlanId } = useLocalSearchParams<{ goalPlanId: string }>();
  const { resetWizard } = useWellness();
  const [enabled, setEnabled] = useState(true);

  const { data } = useGenerationStatus(goalPlanId ?? null, enabled);

  useEffect(() => {
    if (data?.status === "ready") {
      setEnabled(false);
      resetWizard();
      router.replace(`/wellness/ready?goalPlanId=${goalPlanId}`);
    }
  }, [data?.status]);

  const isFailed = data?.status === "failed";
  const stageStatuses = data?.progress?.stageStatuses;
  const topInset = Platform.OS === "web" ? WEB_TOP_INSET : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topInset + 20 }]}>
      {isFailed ? (
        <View style={styles.centerContent}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="alert-circle" size={64} color={Colors.error} />
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
              const status = stageStatuses?.[stage.key] ?? "pending";
              const icon = getStageIcon(status);
              const label = getStageLabel(status);
              return (
                <View key={stage.key} style={styles.stageRow}>
                  <Ionicons name={icon.name} size={24} color={icon.color} />
                  <Text style={styles.stageLabel}>{stage.label}</Text>
                  <Text
                    style={[
                      styles.stageStatus,
                      status === "completed" && { color: Colors.accent },
                      status === "in_progress" && { color: Colors.primary },
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

const styles = StyleSheet.create({
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
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
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
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  stageStatus: {
    fontSize: 13,
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
    fontSize: 17,
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
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
});
