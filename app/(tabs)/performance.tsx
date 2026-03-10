import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Icon } from "@/components/Icon";
import { useRouter } from "expo-router";
import { useColors, ThemeColors } from "@/lib/theme-context";
import { usePerformanceData, WeekScore, PerformanceState, PerformanceStateKey, useWellnessPlans } from "@/lib/api-hooks";
import { getWeekStartUTC } from "@/lib/week-utils";

const STATE_CONFIG: Record<PerformanceStateKey, {
  icon: keyof typeof Ionicons.glyphMap;
  weekType: string;
}> = {
  on_track: { icon: "rocket-outline", weekType: "Progression Week" },
  building_momentum: { icon: "trending-up-outline", weekType: "Momentum Week" },
  recovering: { icon: "shield-checkmark-outline", weekType: "Stability Week" },
  at_risk: { icon: "leaf-outline", weekType: "Recovery Focus Week" },
  declining: { icon: "alert-circle-outline", weekType: "Recovery Focus Week" },
};

function getStateColor(key: PerformanceStateKey, Colors: ThemeColors): string {
  switch (key) {
    case "on_track": return Colors.accent;
    case "building_momentum": return Colors.accent;
    case "recovering": return Colors.warning;
    case "at_risk": return Colors.error;
    case "declining": return Colors.error;
  }
}

function IdentityBlock({
  score,
  trendDelta,
  performanceState,
}: {
  score: number;
  trendDelta: number;
  performanceState: PerformanceState;
}) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const stateColor = getStateColor(performanceState.key, Colors);
  const deltaStr = trendDelta > 0 ? `+${trendDelta}%` : `${trendDelta}%`;

  return (
    <View style={styles.identityCard}>
      <Text style={styles.identityLabel}>Weekly Performance</Text>
      <View style={styles.identityScoreRow}>
        <Text style={styles.identityScore}>{score}%</Text>
        <View style={[styles.stateBadge, { backgroundColor: stateColor + "1A" }]}>
          <View style={[styles.stateDot, { backgroundColor: stateColor }]} />
          <Text style={[styles.stateBadgeText, { color: stateColor }]}>{performanceState.label}</Text>
        </View>
      </View>
      <View style={styles.identityDeltaRow}>
        <Ionicons
          name={trendDelta > 0 ? "arrow-up-outline" : trendDelta < 0 ? "arrow-down-outline" : "remove-outline"}
          size={14}
          color={trendDelta > 0 ? Colors.accent : trendDelta < 0 ? Colors.error : Colors.textSecondary}
        />
        <Text style={[styles.identityDelta, {
          color: trendDelta > 0 ? Colors.accent : trendDelta < 0 ? Colors.error : Colors.textSecondary,
        }]}>
          {deltaStr} vs last week
        </Text>
      </View>
      {performanceState.explanation.length > 0 && (
        <Text style={styles.identityFraming}>{performanceState.explanation[0]}</Text>
      )}
      <View style={styles.identityBarTrack}>
        <View
          style={[
            styles.identityBarFill,
            { width: `${score}%`, backgroundColor: stateColor },
          ]}
        />
      </View>
    </View>
  );
}

function MomentumEngine({
  weekScores,
  performanceState,
}: {
  weekScores: WeekScore[];
  performanceState: PerformanceState;
}) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const chartHeight = 120;

  const trendLines = performanceState.explanation.filter(
    e => e.toLowerCase().includes("trend") || e.toLowerCase().includes("climbing") || e.toLowerCase().includes("dropped") || e.toLowerCase().includes("streak")
  ).slice(0, 2);
  const summaryText = trendLines.length > 0
    ? trendLines.join(" ")
    : performanceState.explanation.length > 1
      ? performanceState.explanation[1]
      : performanceState.explanation[0] || "";

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Momentum Trend</Text>
      <View style={styles.chartContainer}>
        <View style={styles.chartArea}>
          {weekScores.map((week, i) => {
            const height = Math.max((week.score / 100) * chartHeight, 4);
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
      {summaryText ? (
        <Text style={styles.momentumSummary}>{summaryText}</Text>
      ) : null}
    </View>
  );
}

function PerformanceDrivers({ mealPct, workoutPct }: { mealPct: number; workoutPct: number }) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  const diff = mealPct - workoutPct;
  let bottleneck: string;
  let bottleneckColor: string;
  if (diff <= -5) {
    bottleneck = "Nutrition consistency is the bottleneck";
    bottleneckColor = Colors.warning;
  } else if (diff >= 5) {
    bottleneck = "Training consistency is the bottleneck";
    bottleneckColor = Colors.warning;
  } else {
    bottleneck = "Balanced — focus on consistency across both";
    bottleneckColor = Colors.accent;
  }

  return (
    <View style={styles.splitCard}>
      <Text style={styles.sectionTitle}>What's Driving Your Score</Text>
      <View style={styles.splitRow}>
        <View style={styles.splitItem}>
          <View style={styles.splitHeader}>
            <View style={[styles.splitDot, { backgroundColor: Colors.accent }]} />
            <Text style={styles.splitLabel}>Meals</Text>
          </View>
          <Text style={styles.splitValue}>{mealPct}%</Text>
          <View style={styles.splitBarTrack}>
            <View
              style={[styles.splitBarFill, { width: `${mealPct}%`, backgroundColor: Colors.accent }]}
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
              style={[styles.splitBarFill, { width: `${workoutPct}%`, backgroundColor: Colors.primary }]}
            />
          </View>
        </View>
      </View>
      <View style={[styles.bottleneckRow, { backgroundColor: bottleneckColor + "0F" }]}>
        <Icon name="performance" size={16} color={bottleneckColor} />
        <Text style={[styles.bottleneckText, { color: bottleneckColor }]}>{bottleneck}</Text>
      </View>
    </View>
  );
}

function AdaptiveCoaching({ performanceState, wellnessPlanId }: { performanceState: PerformanceState; wellnessPlanId?: string }) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const router = useRouter();
  const config = STATE_CONFIG[performanceState.key];
  const stateColor = getStateColor(performanceState.key, Colors);
  const reasons = performanceState.explanation.slice(0, 3);
  const weekStart = getWeekStartUTC(0);

  return (
    <View style={[styles.coachingCard, { backgroundColor: stateColor + "0D" }]}>
      <View style={styles.coachingHeader}>
        <View style={[styles.coachingIconBg, { backgroundColor: stateColor + "1A" }]}>
          <Ionicons name={config.icon} size={22} color={stateColor} />
        </View>
        <View style={styles.coachingHeaderText}>
          <Text style={styles.coachingLabel}>Adaptive Recommendation</Text>
          <Text style={[styles.coachingWeekType, { color: stateColor }]}>{config.weekType}</Text>
        </View>
      </View>
      {reasons.length > 0 && (
        <View style={styles.coachingReasons}>
          {reasons.map((reason, i) => (
            <View key={i} style={styles.coachingReasonRow}>
              <View style={[styles.coachingBullet, { backgroundColor: stateColor }]} />
              <Text style={styles.coachingReasonText}>{reason}</Text>
            </View>
          ))}
        </View>
      )}
      <Pressable
        style={({ pressed }) => [styles.coachingCta, { backgroundColor: stateColor }, pressed && { opacity: 0.85 }]}
        onPress={() => router.push({
          pathname: "/adaptive-plan",
          params: {
            weekType: config.weekType,
            stateKey: performanceState.key,
            weekStart,
            wellnessPlanId: wellnessPlanId || "",
            reasons: JSON.stringify(reasons),
          },
        } as any)}
      >
        <Text style={styles.coachingCtaText}>Adjust Next Week Plan</Text>
        <Icon name="arrowForward" size={16} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

function StreakConsistency({
  streak,
  last14DaysRate,
}: {
  streak: number;
  last14DaysRate: number | null;
}) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <View style={styles.streakConsistencyCard}>
      <View style={styles.streakRow}>
        <View style={styles.streakIconBg}>
          <Icon name="flame" size={24} color={Colors.warning} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.streakValue}>{streak} day{streak !== 1 ? "s" : ""}</Text>
          <Text style={styles.streakLabel}>Current streak</Text>
        </View>
        {last14DaysRate !== null && (
          <View style={styles.consistencyBadge}>
            <Text style={styles.consistencyValue}>{last14DaysRate}%</Text>
            <Text style={styles.consistencyLabel}>14-day rate</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function PerformanceScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const { data, isLoading } = usePerformanceData();
  const { data: wellnessPlans } = useWellnessPlans();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const activeWellnessPlanId = useMemo(() => {
    if (!wellnessPlans || wellnessPlans.length === 0) return undefined;
    return wellnessPlans[0]?.id;
  }, [wellnessPlans]);

  if (isLoading || !data) {
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
          paddingTop: insets.top + 8 + webTopInset,
          paddingBottom: 100,
        },
      ]}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="never"
      automaticallyAdjustContentInsets={false}
    >
      <IdentityBlock
        score={data.currentScore}
        trendDelta={data.trendDelta}
        performanceState={data.performanceState}
      />

      <MomentumEngine
        weekScores={data.weekScores}
        performanceState={data.performanceState}
      />

      <PerformanceDrivers mealPct={data.mealPct} workoutPct={data.workoutPct} />

      <AdaptiveCoaching performanceState={data.performanceState} wellnessPlanId={activeWellnessPlanId} />

      <StreakConsistency streak={data.streak} last14DaysRate={data.last14DaysRate} />
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
  identityCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  identityLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  identityScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  identityScore: {
    fontSize: 40,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  stateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  stateDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  stateBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  identityDeltaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  identityDelta: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  identityFraming: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  identityBarTrack: {
    height: 6,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 3,
    overflow: "hidden",
  },
  identityBarFill: {
    height: 6,
    borderRadius: 3,
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
  momentumSummary: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 14,
    textAlign: "center",
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
  bottleneckRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  bottleneckText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  coachingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 3,
  },
  coachingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 14,
  },
  coachingIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  coachingHeaderText: {
    flex: 1,
  },
  coachingLabel: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  coachingWeekType: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  coachingReasons: {
    gap: 8,
    marginBottom: 16,
  },
  coachingReasonRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  coachingBullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 6,
  },
  coachingReasonText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 18,
    flex: 1,
  },
  coachingCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  coachingCtaText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  streakConsistencyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  streakIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.warning + "1A",
    justifyContent: "center",
    alignItems: "center",
  },
  streakValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  streakLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginTop: 1,
  },
  consistencyBadge: {
    alignItems: "center",
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  consistencyValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  consistencyLabel: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginTop: 1,
  },
});
