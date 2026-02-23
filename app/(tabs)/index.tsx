import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useEffect } from "react";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useWeeklySummary } from "@/lib/api-hooks";
import { useAuth } from "@/lib/auth-context";

function ScoreRing({ score, size = 160 }: { score: number; size?: number }) {
  const progress = useSharedValue(0);
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    progress.value = withTiming(score / 100, {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });
  }, [score]);

  const getScoreColor = (s: number) => {
    if (s >= 80) return Colors.scoreGreen;
    if (s >= 50) return Colors.scoreYellow;
    return Colors.scoreRed;
  };

  const color = getScoreColor(score);

  return (
    <View style={{ width: size, height: size, justifyContent: "center", alignItems: "center" }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: Colors.surfaceElevated,
          position: "absolute",
        }}
      />
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: color,
          borderTopColor: color,
          borderRightColor: score > 25 ? color : Colors.surfaceElevated,
          borderBottomColor: score > 50 ? color : Colors.surfaceElevated,
          borderLeftColor: score > 75 ? color : Colors.surfaceElevated,
          position: "absolute",
          transform: [{ rotate: "-90deg" }],
          opacity: 0.9,
        }}
      />
      <Text style={[styles.scoreValue, { color }]}>{score}</Text>
      <Text style={styles.scoreLabel}>Weekly Score</Text>
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconBg, { backgroundColor: color + "1A" }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { data: summary, isLoading, refetch } = useWeeklySummary();
  const { user } = useAuth();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top + webTopInset }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingTop: insets.top + 16 + webTopInset,
          paddingBottom: 100,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>
            {getGreeting()}
          </Text>
          <Text style={styles.headerTitle}>Your Week</Text>
        </View>
        <Pressable
          onPress={() => router.push("/(tabs)/calendar")}
          style={({ pressed }) => [styles.calendarBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="calendar" size={22} color={Colors.primary} />
        </Pressable>
      </View>

      <View style={styles.scoreSection}>
        <ScoreRing score={summary?.score ?? 0} />
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          icon="restaurant"
          label="Meals"
          value={`${summary?.mealsCompleted ?? 0}/${summary?.mealsTotal ?? 0}`}
          color={Colors.accent}
        />
        <StatCard
          icon="fitness"
          label="Workouts"
          value={`${summary?.workoutsCompleted ?? 0}/${summary?.workoutsTotal ?? 0}`}
          color={Colors.primary}
        />
        <StatCard
          icon="flame"
          label="Streak"
          value={`${summary?.streak ?? 0}d`}
          color={Colors.warning}
        />
      </View>

      <Pressable
        style={({ pressed }) => [styles.createButton, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
        onPress={() => router.push("/(tabs)/create")}
      >
        <View style={styles.createButtonContent}>
          <Ionicons name="add-circle" size={24} color="#FFFFFF" />
          <Text style={styles.createButtonText}>Create Plan</Text>
        </View>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.todayCard, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
        onPress={() => {
          const today = new Date().toISOString().split("T")[0];
          router.push({ pathname: "/daily/[date]", params: { date: today } });
        }}
      >
        <View style={styles.todayCardContent}>
          <View style={styles.todayCardLeft}>
            <View style={styles.todayIconBg}>
              <Ionicons name="today" size={22} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.todayTitle}>Today's Plan</Text>
              <Text style={styles.todaySubtitle}>View meals & workouts</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
        </View>
      </Pressable>
    </ScrollView>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
  },
  greeting: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  calendarBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  scoreValue: {
    fontSize: 42,
    fontFamily: "Inter_700Bold",
  },
  scoreLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  statIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  createButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },
  createButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  createButtonText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  todayCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
  },
  todayCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  todayCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  todayIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.primary + "1A",
    justifyContent: "center",
    alignItems: "center",
  },
  todayTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  todaySubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
