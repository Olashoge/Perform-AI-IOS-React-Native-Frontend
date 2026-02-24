import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors, ThemeColors } from "@/lib/theme-context";
import { usePerformanceData, WeekScore } from "@/lib/api-hooks";

function TrendChart({ weekScores }: { weekScores: WeekScore[] }) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const maxScore = 100;
  const chartHeight = 120;
  const barWidth = 40;

  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartArea}>
        {weekScores.map((week, i) => {
          const height = Math.max((week.score / maxScore) * chartHeight, 4);
          const isLast = i === weekScores.length - 1;
          return (
            <View key={week.weekStart} style={styles.chartBarGroup}>
              <Text style={[styles.chartValue, isLast && { color: Colors.primary }]}>
                {week.score}%
              </Text>
              <View style={[styles.chartBarTrack, { height: chartHeight }]}>
                <View
                  style={[
                    styles.chartBar,
                    {
                      height,
                      backgroundColor: isLast ? Colors.primary : Colors.surfaceTertiary,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.chartLabel, isLast && { color: Colors.text }]}>
                {week.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function AdherenceSplit({ mealPct, workoutPct }: { mealPct: number; workoutPct: number }) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <View style={styles.splitCard}>
      <Text style={styles.sectionTitle}>Adherence Split</Text>
      <View style={styles.splitRow}>
        <View style={styles.splitItem}>
          <View style={styles.splitHeader}>
            <View style={[styles.splitDot, { backgroundColor: Colors.accent }]} />
            <Text style={styles.splitLabel}>Meals</Text>
          </View>
          <Text style={styles.splitValue}>{mealPct}%</Text>
          <View style={styles.splitBarTrack}>
            <View
              style={[
                styles.splitBarFill,
                { width: `${mealPct}%`, backgroundColor: Colors.accent },
              ]}
            />
          </View>
        </View>
        <View style={styles.splitDivider} />
        <View style={styles.splitItem}>
          <View style={styles.splitHeader}>
            <View style={[styles.splitDot, { backgroundColor: Colors.primary }]} />
            <Text style={styles.splitLabel}>Workouts</Text>
          </View>
          <Text style={styles.splitValue}>{workoutPct}%</Text>
          <View style={styles.splitBarTrack}>
            <View
              style={[
                styles.splitBarFill,
                { width: `${workoutPct}%`, backgroundColor: Colors.primary },
              ]}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

function IntelligenceBanner({ score }: { score: number }) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  let message: string;
  let icon: keyof typeof Ionicons.glyphMap;
  let color: string;

  if (score > 80) {
    message = "Progress Week Ready";
    icon = "rocket-outline";
    color = Colors.accent;
  } else if (score >= 60) {
    message = "Maintain and Stabilize";
    icon = "shield-checkmark-outline";
    color = Colors.warning;
  } else {
    message = "Recovery Focus Week Recommended";
    icon = "leaf-outline";
    color = Colors.error;
  }

  return (
    <View style={[styles.bannerCard, { borderLeftColor: color }]}>
      <View style={[styles.bannerIconBg, { backgroundColor: color + "1A" }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={styles.bannerTextGroup}>
        <Text style={styles.bannerLabel}>AI Insight</Text>
        <Text style={[styles.bannerMessage, { color }]}>{message}</Text>
      </View>
    </View>
  );
}

export default function PerformanceScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const { data, isLoading } = usePerformanceData();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  if (isLoading || !data) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top + webTopInset }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const trendIcon: keyof typeof Ionicons.glyphMap =
    data.trend === "up" ? "trending-up" : data.trend === "down" ? "trending-down" : "remove-outline";
  const trendColor =
    data.trend === "up" ? Colors.accent : data.trend === "down" ? Colors.error : Colors.textSecondary;

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
      <Text style={styles.headerTitle}>Performance</Text>

      <View style={styles.scoreCard}>
        <View style={styles.scoreRow}>
          <View>
            <Text style={styles.scoreCardLabel}>This Week</Text>
            <Text style={styles.scoreCardValue}>{data.currentScore}%</Text>
          </View>
          <View style={styles.trendBadge}>
            <Ionicons name={trendIcon} size={18} color={trendColor} />
            <Text style={[styles.trendText, { color: trendColor }]}>
              {data.trendDelta > 0 ? "+" : ""}{data.trendDelta}%
            </Text>
          </View>
        </View>
        <View style={styles.scoreBarTrack}>
          <View
            style={[
              styles.scoreBarFill,
              {
                width: `${data.currentScore}%`,
                backgroundColor:
                  data.currentScore > 80 ? Colors.accent :
                  data.currentScore >= 50 ? Colors.warning : Colors.error,
              },
            ]}
          />
        </View>
      </View>

      <IntelligenceBanner score={data.currentScore} />

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>4-Week Trend</Text>
        <TrendChart weekScores={data.weekScores} />
      </View>

      <AdherenceSplit mealPct={data.mealPct} workoutPct={data.workoutPct} />

      <View style={styles.streakCard}>
        <View style={[styles.streakIconBg]}>
          <Ionicons name="flame" size={28} color={Colors.warning} />
        </View>
        <View>
          <Text style={styles.streakValue}>{data.streak} day{data.streak !== 1 ? "s" : ""}</Text>
          <Text style={styles.streakLabel}>Current streak</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
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
  headerTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 24,
  },
  scoreCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  scoreCardLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  scoreCardValue: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  trendText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  scoreBarTrack: {
    height: 6,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 3,
    overflow: "hidden",
  },
  scoreBarFill: {
    height: 6,
    borderRadius: 3,
  },
  bannerCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderLeftWidth: 3,
  },
  bannerIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  bannerTextGroup: {
    flex: 1,
  },
  bannerLabel: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  bannerMessage: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
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
  chartContainer: {
    alignItems: "center",
  },
  chartArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 20,
    justifyContent: "center",
  },
  chartBarGroup: {
    alignItems: "center",
    gap: 6,
  },
  chartValue: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  chartBarTrack: {
    width: 40,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 6,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  chartBar: {
    width: 40,
    borderRadius: 6,
  },
  chartLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  splitCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  splitRow: {
    flexDirection: "row",
    gap: 0,
  },
  splitItem: {
    flex: 1,
    paddingHorizontal: 4,
  },
  splitHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  splitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  splitLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  splitValue: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 10,
  },
  splitBarTrack: {
    height: 4,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 2,
    overflow: "hidden",
  },
  splitBarFill: {
    height: 4,
    borderRadius: 2,
  },
  splitDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },
  streakCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  streakIconBg: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.warning + "1A",
    justifyContent: "center",
    alignItems: "center",
  },
  streakValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  streakLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
