import React, { useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import { useColors, ThemeColors } from "@/lib/theme-context";

const WEB_TOP_INSET = 67;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function DailyReadyScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? WEB_TOP_INSET : insets.top;
  const queryClient = useQueryClient();

  const { type, date } = useLocalSearchParams<{
    type: "meal" | "workout";
    date: string;
  }>();

  // Safety-net: ensure day-data is fresh in case the generating screen's
  // refetch didn't complete before navigation (e.g. very fast tap)
  useEffect(() => {
    if (date) {
      queryClient.refetchQueries({ queryKey: ["day-data", date] });
    }
  }, [date, queryClient]);

  const typeLabel = type === "meal" ? "Meal" : "Workout";
  const formattedDate = date ? formatDate(date) : "";

  return (
    <View style={[styles.container, { paddingTop: topInset + 20 }]}>
      <View style={styles.centerContent}>
        <View style={styles.checkmarkWrap}>
          <Ionicons
            name="checkmark-circle-outline"
            size={80}
            color={Colors.accent}
          />
        </View>

        <Text style={styles.title}>Your Daily {typeLabel} is Ready!</Text>
        <Text style={styles.subtitle}>
          Your personalized {typeLabel.toLowerCase()} for {formattedDate} has
          been created and is ready to go.
        </Text>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Type</Text>
            <Text style={styles.summaryValue}>Daily {typeLabel}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Date</Text>
            <Text style={styles.summaryValue}>{formattedDate}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Status</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Ready</Text>
            </View>
          </View>
        </View>

        <View style={styles.buttonGroup}>
          <Pressable
            style={styles.primaryButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.replace({
                pathname: "/daily/[date]",
                params: { date: date ?? "" },
              } as any);
            }}
          >
            <Text style={styles.primaryButtonText}>View My Day</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => {
              Haptics.impactAsync();
              router.replace("/(tabs)" as any);
            }}
          >
            <Text style={styles.secondaryButtonText}>Go to Dashboard</Text>
          </Pressable>
        </View>
      </View>
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
    checkmarkWrap: {
      marginBottom: 28,
      shadowColor: Colors.accent,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 20,
      elevation: 10,
    },
    title: {
      fontSize: 24,
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
      marginBottom: 32,
    },
    summaryCard: {
      width: "100%",
      backgroundColor: Colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 32,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    summaryLabel: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: Colors.textSecondary,
    },
    summaryValue: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: Colors.text,
    },
    divider: {
      height: 1,
      backgroundColor: Colors.border,
      marginVertical: 12,
    },
    badge: {
      backgroundColor: Colors.accent + "20",
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 8,
    },
    badgeText: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: Colors.accent,
    },
    buttonGroup: {
      width: "100%",
      gap: 12,
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
