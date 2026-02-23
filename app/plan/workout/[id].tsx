import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Platform,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useColors, ThemeColors } from "@/lib/theme-context";
import { useWorkoutPlan } from "@/lib/api-hooks";

const WEB_TOP_INSET = 67;
const WORKOUT_ACCENT = "#FF6B6B";

export default function WorkoutPlanDetailScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? WEB_TOP_INSET : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, error, refetch } = useWorkoutPlan(id ?? null);
  const [expandedSessions, setExpandedSessions] = useState<Record<number, boolean>>({});

  const toggleSession = useCallback((dayIndex: number) => {
    setExpandedSessions((prev) => ({ ...prev, [dayIndex]: !prev[dayIndex] }));
  }, []);

  const plan = data?.planJson ?? data;
  const status = data?.status;

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <Header />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={WORKOUT_ACCENT} />
          <Text style={styles.loadingText}>Loading workout plan...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <Header />
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle" size={48} color={Colors.error} />
          <Text style={styles.errorText}>Failed to load plan</Text>
          <Pressable style={styles.retryButton} onPress={() => refetch()}>
            <Ionicons name="refresh" size={20} color={Colors.text} />
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (status === "generating") {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <Header />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={WORKOUT_ACCENT} />
          <Text style={styles.loadingText}>Plan is still generating...</Text>
          <Text style={styles.loadingSubtext}>Check back in a moment</Text>
          <Pressable style={styles.retryButton} onPress={() => refetch()}>
            <Ionicons name="refresh" size={20} color={Colors.text} />
            <Text style={styles.retryText}>Refresh</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const days = plan?.days ?? [];
  const title = plan?.title ?? "Workout Plan";
  const summary = plan?.summary ?? "";

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <Header />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: bottomInset + 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => refetch()}
            tintColor={WORKOUT_ACCENT}
          />
        }
      >
        <View style={styles.heroSection}>
          <View style={styles.accentBar} />
          <Text style={styles.planTitle}>{title}</Text>
          {summary ? <Text style={styles.planSummary}>{summary}</Text> : null}
          <View style={styles.statsRow}>
            <StatBadge
              icon="calendar-outline"
              label="Days"
              value={String(days.length)}
            />
            <StatBadge
              icon="fitness"
              label="Workouts"
              value={String(days.filter((d: any) => d.isWorkoutDay).length)}
            />
            <StatBadge
              icon="bed-outline"
              label="Rest"
              value={String(days.filter((d: any) => !d.isWorkoutDay).length)}
            />
          </View>
        </View>

        {days.map((day: any, idx: number) => (
          <DayCard
            key={idx}
            day={day}
            dayIndex={idx}
            expanded={!!expandedSessions[idx]}
            onToggle={() => toggleSession(idx)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function Header() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <View style={styles.header}>
      <Pressable onPress={() => router.back()} hitSlop={12}>
        <Ionicons name="chevron-back" size={28} color={Colors.text} />
      </Pressable>
      <Text style={styles.headerTitle}>Workout Plan</Text>
      <View style={{ width: 28 }} />
    </View>
  );
}

function StatBadge({ icon, label, value }: { icon: string; label: string; value: string }) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <View style={styles.statBadge}>
      <Ionicons name={icon as any} size={18} color={WORKOUT_ACCENT} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function DayCard({
  day,
  dayIndex,
  expanded,
  onToggle,
}: {
  day: any;
  dayIndex: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const isWorkout = day.isWorkoutDay;
  const session = day.session;
  const dayLabel = day.dayLabel ?? `Day ${day.dayIndex ?? dayIndex + 1}`;

  if (!isWorkout) {
    return (
      <View style={styles.dayCard}>
        <View style={styles.dayHeaderRow}>
          <View style={styles.dayLabelContainer}>
            <Text style={styles.dayLabel}>{dayLabel}</Text>
            <View style={[styles.dayTypeBadge, { backgroundColor: Colors.surfaceElevated }]}>
              <Text style={styles.dayTypeBadgeText}>Rest Day</Text>
            </View>
          </View>
        </View>
        <View style={styles.restDayContent}>
          <MaterialCommunityIcons name="sleep" size={36} color={Colors.textSecondary} />
          <Text style={styles.restDayText}>Recovery & Rest</Text>
          <Text style={styles.restDaySubtext}>
            Let your muscles recover and rebuild
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.dayCard}>
      <Pressable onPress={onToggle} style={styles.dayHeaderRow}>
        <View style={styles.dayLabelContainer}>
          <Text style={styles.dayLabel}>{dayLabel}</Text>
          <View style={[styles.dayTypeBadge, { backgroundColor: `${WORKOUT_ACCENT}20` }]}>
            <Text style={[styles.dayTypeBadgeText, { color: WORKOUT_ACCENT }]}>
              Workout
            </Text>
          </View>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={22}
          color={Colors.textSecondary}
        />
      </Pressable>

      {session && (
        <View style={styles.sessionPreview}>
          <Text style={styles.sessionTitle}>{session.sessionTitle ?? "Training Session"}</Text>
          <View style={styles.sessionMeta}>
            {session.focus ? (
              <View style={styles.metaTag}>
                <Ionicons name="body" size={14} color={Colors.textSecondary} />
                <Text style={styles.metaText}>{session.focus}</Text>
              </View>
            ) : null}
            {session.durationMinutes ? (
              <View style={styles.metaTag}>
                <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.metaText}>{session.durationMinutes} min</Text>
              </View>
            ) : null}
          </View>
        </View>
      )}

      {expanded && session && (
        <View style={styles.expandedContent}>
          {session.warmup && (
            <SessionSection
              title="Warm-up"
              icon="flame-outline"
              iconColor="#FF9F0A"
              content={session.warmup}
            />
          )}

          {Array.isArray(session.exercises) && session.exercises.length > 0 && (
            <View style={styles.exercisesSection}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="barbell-outline" size={18} color={WORKOUT_ACCENT} />
                <Text style={styles.sectionTitle}>Exercises</Text>
              </View>
              {session.exercises.map((ex: any, idx: number) => (
                <ExerciseCard key={idx} exercise={ex} index={idx} />
              ))}
            </View>
          )}

          {session.cooldown && (
            <SessionSection
              title="Cool-down"
              icon="snow-outline"
              iconColor="#64D2FF"
              content={session.cooldown}
            />
          )}
        </View>
      )}
    </View>
  );
}

function SessionSection({
  title,
  icon,
  iconColor,
  content,
}: {
  title: string;
  icon: string;
  iconColor: string;
  content: any;
}) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const text =
    typeof content === "string"
      ? content
      : Array.isArray(content)
        ? content.map((item: any) => (typeof item === "string" ? item : item.name ?? item.description ?? JSON.stringify(item))).join("\n")
        : content?.description ?? content?.instructions ?? JSON.stringify(content);

  return (
    <View style={styles.sessionSectionCard}>
      <View style={styles.sectionHeaderRow}>
        <Ionicons name={icon as any} size={18} color={iconColor} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Text style={styles.sectionText}>{text}</Text>
    </View>
  );
}

function ExerciseCard({ exercise, index }: { exercise: any; index: number }) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <View style={styles.exerciseCard}>
      <View style={styles.exerciseHeaderRow}>
        <View style={styles.exerciseIndex}>
          <Text style={styles.exerciseIndexText}>{index + 1}</Text>
        </View>
        <Text style={styles.exerciseName}>{exercise.name}</Text>
      </View>
      <View style={styles.exerciseDetails}>
        {exercise.sets != null && (
          <View style={styles.detailChip}>
            <Text style={styles.detailValue}>{exercise.sets}</Text>
            <Text style={styles.detailLabel}>sets</Text>
          </View>
        )}
        {exercise.reps != null && (
          <View style={styles.detailChip}>
            <Text style={styles.detailValue}>{exercise.reps}</Text>
            <Text style={styles.detailLabel}>reps</Text>
          </View>
        )}
        {exercise.restSeconds != null && (
          <View style={styles.detailChip}>
            <Text style={styles.detailValue}>{exercise.restSeconds}s</Text>
            <Text style={styles.detailLabel}>rest</Text>
          </View>
        )}
      </View>
      {exercise.notes ? (
        <Text style={styles.exerciseNotes}>{exercise.notes}</Text>
      ) : null}
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.text,
    textAlign: "center",
  },
  loadingSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.text,
    marginTop: 8,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  retryText: {
    fontSize: 15,
    fontWeight: "500" as const,
    color: Colors.text,
  },
  heroSection: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 20,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    overflow: "hidden",
  },
  accentBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: WORKOUT_ACCENT,
  },
  planTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 8,
    marginTop: 4,
  },
  planSummary: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statBadge: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  dayCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: "hidden",
  },
  dayHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  dayLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  dayTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dayTypeBadgeText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
  },
  restDayContent: {
    alignItems: "center",
    paddingBottom: 24,
    gap: 8,
  },
  restDayText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
  },
  restDaySubtext: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
  sessionPreview: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sessionTitle: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: WORKOUT_ACCENT,
    marginBottom: 8,
  },
  sessionMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metaTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  sessionSectionCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 14,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  sectionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  exercisesSection: {
    gap: 8,
  },
  exerciseCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 14,
  },
  exerciseHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  exerciseIndex: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: `${WORKOUT_ACCENT}25`,
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseIndexText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: WORKOUT_ACCENT,
  },
  exerciseName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  exerciseDetails: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 4,
  },
  detailChip: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  exerciseNotes: {
    fontSize: 13,
    color: Colors.textTertiary,
    marginTop: 6,
    fontStyle: "italic" as const,
  },
});
