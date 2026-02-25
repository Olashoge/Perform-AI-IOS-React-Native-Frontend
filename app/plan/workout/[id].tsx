import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  TouchableOpacity,
  Platform,
  RefreshControl,
  Alert,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors, ThemeColors } from "@/lib/theme-context";
import { useWorkoutPlan, useExerciseFeedback, useDeleteExercisePreferenceByKey, useExercisePreferences, useAllowance, useWorkoutSwap, useWorkoutDayRegen } from "@/lib/api-hooks";

const WEB_TOP_INSET = 67;
const WORKOUT_ACCENT = "#FF6B6B";

function toExerciseKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export default function WorkoutPlanDetailScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? WEB_TOP_INSET : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, error, refetch } = useWorkoutPlan(id ?? null);
  const { data: allowance, refetch: refetchAllowance } = useAllowance();
  const swapMutation = useWorkoutSwap(id ?? null);
  const dayRegenMutation = useWorkoutDayRegen(id ?? null);
  const [expandedSessions, setExpandedSessions] = useState<Record<number, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);

  const toggleSession = useCallback((dayIndex: number) => {
    setExpandedSessions((prev) => ({ ...prev, [dayIndex]: !prev[dayIndex] }));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchAllowance()]);
    setRefreshing(false);
  }, [refetch, refetchAllowance]);

  const workoutSwapsRemaining = allowance ? allowance.today.workoutSwapsLimit - allowance.today.workoutSwapsUsed : 0;
  const dayRegensRemaining = allowance ? allowance.today.workoutRegensLimit - allowance.today.workoutRegensUsed : 0;
  const planRegensRemaining = allowance ? allowance.plan.regensLimit - allowance.plan.regensUsed : 0;
  const isCooldownActive = allowance?.cooldown?.active ?? false;

  const handleExerciseSwap = useCallback((dayIndex: number, exerciseIndex: number, exerciseName: string) => {
    if (isCooldownActive) {
      Alert.alert("Cooldown Active", `Please wait ${allowance?.cooldown?.minutesRemaining ?? 0} minutes before swapping again.`);
      return;
    }
    if (workoutSwapsRemaining <= 0) {
      Alert.alert("No Swaps Left", "You've used all your workout swaps for today. They reset at midnight.");
      return;
    }
    Alert.alert(
      "Swap Exercise",
      `Replace "${exerciseName}" with a new exercise?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Swap",
          onPress: () => {
            swapMutation.mutate({ dayIndex, exerciseIndex });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          },
        },
      ]
    );
  }, [workoutSwapsRemaining, isCooldownActive, allowance, swapMutation]);

  const handleDayRegen = useCallback((dayIndex: number) => {
    if (isCooldownActive) {
      Alert.alert("Cooldown Active", `Please wait ${allowance?.cooldown?.minutesRemaining ?? 0} minutes before regenerating.`);
      return;
    }
    if (dayRegensRemaining <= 0) {
      Alert.alert("No Regens Left", "You've used your day regeneration for today. It resets at midnight.");
      return;
    }
    if (planRegensRemaining <= 0) {
      Alert.alert("Plan Limit Reached", "You've used all your plan regenerations. This limit does not reset.");
      return;
    }
    Alert.alert(
      "Regenerate Session",
      "This will replace all exercises for this day with new ones.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Regenerate",
          style: "destructive",
          onPress: () => {
            dayRegenMutation.mutate({ dayIndex });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          },
        },
      ]
    );
  }, [dayRegensRemaining, planRegensRemaining, isCooldownActive, allowance, dayRegenMutation]);

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
            refreshing={refreshing}
            onRefresh={onRefresh}
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

        {allowance && (
          <View style={styles.budgetCard}>
            <View style={styles.budgetHeader}>
              <Ionicons name="analytics-outline" size={16} color={Colors.text} />
              <Text style={styles.budgetTitle}>Today's Budget</Text>
            </View>
            <View style={styles.budgetRow}>
              <View style={styles.budgetItem}>
                <Ionicons name="swap-horizontal-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.budgetLabel}>Swaps</Text>
                <Text style={[styles.budgetValue, workoutSwapsRemaining === 0 && styles.budgetExhausted]}>
                  {allowance.today.workoutSwapsUsed}/{allowance.today.workoutSwapsLimit}
                </Text>
              </View>
              <View style={styles.budgetItem}>
                <Ionicons name="refresh-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.budgetLabel}>Day Regens</Text>
                <Text style={[styles.budgetValue, dayRegensRemaining === 0 && styles.budgetExhausted]}>
                  {allowance.today.workoutRegensUsed}/{allowance.today.workoutRegensLimit}
                </Text>
              </View>
              <View style={styles.budgetItem}>
                <Ionicons name="build-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.budgetLabel}>Plan Regens</Text>
                <Text style={[styles.budgetValue, planRegensRemaining === 0 && styles.budgetExhausted]}>
                  {allowance.plan.regensUsed}/{allowance.plan.regensLimit}
                </Text>
              </View>
            </View>
            {isCooldownActive && (
              <View style={styles.cooldownBanner}>
                <Ionicons name="time-outline" size={13} color="#FF9F0A" />
                <Text style={styles.cooldownText}>
                  Cooldown active — {allowance.cooldown.minutesRemaining}m remaining
                </Text>
              </View>
            )}
          </View>
        )}

        {days.map((day: any, idx: number) => (
          <DayCard
            key={idx}
            day={day}
            dayIndex={idx}
            expanded={!!expandedSessions[idx]}
            onToggle={() => toggleSession(idx)}
            onDayRegen={() => handleDayRegen(idx)}
            dayRegenPending={dayRegenMutation.isPending && dayRegenMutation.variables?.dayIndex === idx}
            dayRegenDisabled={dayRegensRemaining <= 0 || isCooldownActive || dayRegenMutation.isPending}
            onExerciseSwap={(exerciseIndex: number, exerciseName: string) => handleExerciseSwap(idx, exerciseIndex, exerciseName)}
            swapDisabled={workoutSwapsRemaining <= 0 || isCooldownActive || swapMutation.isPending}
            swapPendingIndex={swapMutation.isPending && swapMutation.variables?.dayIndex === idx ? swapMutation.variables?.exerciseIndex : undefined}
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

function getSessionWarmup(session: any): any[] | string | null {
  const raw = session.warmUp ?? session.warmup ?? session.warm_up;
  if (!raw) return null;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw;
  return null;
}

function getSessionCooldown(session: any): any[] | string | null {
  const raw = session.coolDown ?? session.cooldown ?? session.cool_down;
  if (!raw) return null;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw;
  return null;
}

function getSessionMain(session: any): any[] {
  return session.main ?? session.exercises ?? session.mainWorkout ?? [];
}

function getSessionCoachingTips(session: any): string[] {
  const tips = session.coachingTips ?? session.coaching_tips ?? session.tips ?? [];
  if (typeof tips === "string") return [tips];
  if (Array.isArray(tips)) return tips.map((t: any) => typeof t === "string" ? t : t.text ?? t.tip ?? String(t));
  return [];
}

function formatBulletContent(content: any[] | string): string[] {
  if (typeof content === "string") return content.split("\n").filter(Boolean);
  return content.map((item: any) => {
    if (typeof item === "string") return item;
    const name = item.name ?? item.exercise ?? item.description ?? "";
    const dur = item.duration ?? item.time ?? "";
    const reps = item.reps ?? "";
    let line = name;
    if (dur) line += ` · ${dur}`;
    if (reps) line += ` · ${reps}`;
    return line;
  });
}

function ExerciseAvoidModal({
  visible,
  onClose,
  exerciseName,
  exerciseKey,
}: {
  visible: boolean;
  onClose: () => void;
  exerciseName: string;
  exerciseKey: string;
}) {
  const Colors = useColors();
  const feedbackMutation = useExerciseFeedback();

  const handleChoice = async (avoid: boolean) => {
    try {
      await feedbackMutation.mutateAsync({
        exerciseKey,
        exerciseName,
        status: avoid ? "avoided" : "disliked",
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch {
      Alert.alert("Error", "Could not save preference");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" }}>
        <View style={{ backgroundColor: Colors.surface, borderRadius: 16, padding: 20, width: "85%" }}>
          <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.text, marginBottom: 4 }}>
            {exerciseName}
          </Text>
          <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginBottom: 20 }}>
            How would you like to handle this exercise?
          </Text>
          <Pressable
            onPress={() => handleChoice(false)}
            disabled={feedbackMutation.isPending}
            style={({ pressed }) => ({
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderRadius: 10,
              backgroundColor: Colors.surfaceElevated,
              marginBottom: 10,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text }}>Just Dislike</Text>
            <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 }}>
              May still appear, but AI will be informed
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleChoice(true)}
            disabled={feedbackMutation.isPending}
            style={({ pressed }) => ({
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderRadius: 10,
              backgroundColor: "#FF6B6B18",
              marginBottom: 10,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FF6B6B" }}>Avoid Completely</Text>
            <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2 }}>
              This exercise will never appear again
            </Text>
          </Pressable>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => ({
              paddingVertical: 12,
              alignItems: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.textSecondary }}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function LikeDislikeButtons({ exerciseName }: { exerciseName: string }) {
  const Colors = useColors();
  const feedbackMutation = useExerciseFeedback();
  const deleteMutation = useDeleteExercisePreferenceByKey();
  const { data: exercisePrefs } = useExercisePreferences();
  const [localOverride, setLocalOverride] = useState<"none" | "liked" | "disliked" | null>(null);
  const [showAvoidModal, setShowAvoidModal] = useState(false);
  const exerciseKey = toExerciseKey(exerciseName);

  const serverState = useMemo<"none" | "liked" | "disliked">(() => {
    if (!exercisePrefs) return "none";
    if (exercisePrefs.liked?.some((e: any) => e.exerciseKey === exerciseKey)) return "liked";
    if (exercisePrefs.disliked?.some((e: any) => e.exerciseKey === exerciseKey)) return "disliked";
    if (exercisePrefs.avoided?.some((e: any) => e.exerciseKey === exerciseKey)) return "disliked";
    return "none";
  }, [exercisePrefs, exerciseKey]);

  const state = localOverride !== null ? localOverride : serverState;

  const handleLike = async () => {
    if (state === "liked") {
      try {
        await deleteMutation.mutateAsync(exerciseKey);
        setLocalOverride("none");
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
      return;
    }
    try {
      await feedbackMutation.mutateAsync({ exerciseKey, exerciseName, status: "liked" });
      setLocalOverride("liked");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      Alert.alert("Error", "Could not save preference");
    }
  };

  const handleDislike = () => {
    if (state === "disliked") {
      deleteMutation.mutateAsync(exerciseKey).then(() => {
        setLocalOverride("none");
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }).catch(() => {});
      return;
    }
    setShowAvoidModal(true);
  };

  const loading = feedbackMutation.isPending || deleteMutation.isPending;

  return (
    <>
      <View style={{ flexDirection: "row" }}>
        <TouchableOpacity
          onPress={handleLike}
          disabled={loading}
          activeOpacity={0.5}
          style={{
            opacity: loading ? 0.4 : 1,
            paddingHorizontal: 10,
            paddingVertical: 10,
          }}
        >
          <Ionicons
            name={state === "liked" ? "thumbs-up" : "thumbs-up-outline"}
            size={18}
            color={state === "liked" ? "#30D158" : Colors.textTertiary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleDislike}
          disabled={loading}
          activeOpacity={0.5}
          style={{
            opacity: loading ? 0.4 : 1,
            paddingHorizontal: 10,
            paddingVertical: 10,
          }}
        >
          <Ionicons
            name={state === "disliked" ? "thumbs-down" : "thumbs-down-outline"}
            size={18}
            color={state === "disliked" ? WORKOUT_ACCENT : Colors.textTertiary}
          />
        </TouchableOpacity>
      </View>
      <ExerciseAvoidModal
        visible={showAvoidModal}
        onClose={() => { setShowAvoidModal(false); setLocalOverride("disliked"); }}
        exerciseName={exerciseName}
        exerciseKey={exerciseKey}
      />
    </>
  );
}

function DayCard({
  day,
  dayIndex,
  expanded,
  onToggle,
  onDayRegen,
  dayRegenPending,
  dayRegenDisabled,
  onExerciseSwap,
  swapDisabled,
  swapPendingIndex,
}: {
  day: any;
  dayIndex: number;
  expanded: boolean;
  onToggle: () => void;
  onDayRegen?: () => void;
  dayRegenPending?: boolean;
  dayRegenDisabled?: boolean;
  onExerciseSwap?: (exerciseIndex: number, exerciseName: string) => void;
  swapDisabled?: boolean;
  swapPendingIndex?: number;
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

  const warmup = session ? getSessionWarmup(session) : null;
  const cooldown = session ? getSessionCooldown(session) : null;
  const mainExercises = session ? getSessionMain(session) : [];
  const coachingTips = session ? getSessionCoachingTips(session) : [];

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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {onDayRegen && (
            <Pressable
              onPress={(e) => { e.stopPropagation(); onDayRegen(); }}
              disabled={dayRegenDisabled}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 8,
                backgroundColor: Colors.surfaceElevated,
                opacity: pressed ? 0.7 : dayRegenDisabled ? 0.4 : 1,
              })}
            >
              {dayRegenPending ? (
                <ActivityIndicator size={12} color={Colors.textSecondary} />
              ) : (
                <Ionicons name="refresh-outline" size={14} color={Colors.textSecondary} />
              )}
              <Text style={{ fontSize: 11, fontWeight: "500" as const, color: Colors.textSecondary }}>Regen</Text>
            </Pressable>
          )}
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={22}
            color={Colors.textSecondary}
          />
        </View>
      </Pressable>

      {session && (
        <View style={styles.sessionPreview}>
          <Text style={styles.sessionTitle}>{session.sessionTitle ?? session.title ?? session.name ?? session.focus ?? "Training Session"}</Text>
          {(session.description || session.summary) ? (
            <Text style={styles.sessionDescription}>{session.description ?? session.summary}</Text>
          ) : null}
          <View style={styles.sessionMeta}>
            {session.focus ? (
              <View style={styles.metaTag}>
                <Ionicons name="body" size={14} color={Colors.textSecondary} />
                <Text style={styles.metaText}>{session.focus}</Text>
              </View>
            ) : null}
            {(session.durationMinutes || session.estimatedDuration) ? (
              <View style={styles.metaTag}>
                <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.metaText}>{session.durationMinutes ?? session.estimatedDuration} min</Text>
              </View>
            ) : null}
          </View>
        </View>
      )}

      {expanded && session && (
        <View style={styles.expandedContent}>
          {warmup && (
            <View style={styles.sessionSectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="flame-outline" size={18} color="#FF9F0A" />
                <Text style={styles.sectionTitle}>WARM-UP</Text>
              </View>
              {formatBulletContent(warmup).map((line, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>·</Text>
                  <Text style={styles.bulletText}>{line}</Text>
                </View>
              ))}
            </View>
          )}

          {mainExercises.length > 0 && (
            <View style={styles.exercisesSection}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="barbell-outline" size={18} color={WORKOUT_ACCENT} />
                <Text style={styles.sectionTitle}>MAIN WORKOUT</Text>
              </View>
              {mainExercises.map((ex: any, idx: number) => (
                <ExerciseCard
                  key={idx}
                  exercise={ex}
                  index={idx}
                  onSwap={onExerciseSwap ? (name: string) => onExerciseSwap(idx, name) : undefined}
                  swapDisabled={swapDisabled}
                  isSwapping={swapPendingIndex === idx}
                />
              ))}
            </View>
          )}

          {cooldown && (
            <View style={styles.sessionSectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="snow-outline" size={18} color="#64D2FF" />
                <Text style={styles.sectionTitle}>COOL-DOWN</Text>
              </View>
              {formatBulletContent(cooldown).map((line, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>·</Text>
                  <Text style={styles.bulletText}>{line}</Text>
                </View>
              ))}
            </View>
          )}

          {coachingTips.length > 0 && (
            <View style={styles.sessionSectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="bulb-outline" size={18} color="#FFD60A" />
                <Text style={styles.sectionTitle}>COACHING TIPS</Text>
              </View>
              {coachingTips.map((tip, i) => (
                <Text key={i} style={styles.coachingTipText}>{tip}</Text>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function ExerciseCard({ exercise, index, onSwap, swapDisabled, isSwapping }: { exercise: any; index: number; onSwap?: (name: string) => void; swapDisabled?: boolean; isSwapping?: boolean }) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const name = exercise.name ?? exercise.exercise ?? `Exercise ${index + 1}`;
  const type = exercise.type ?? exercise.exerciseType ?? "";
  const sets = exercise.sets ?? undefined;
  const reps = exercise.reps ?? undefined;
  const duration = exercise.duration ?? exercise.durationMinutes ?? undefined;
  const rest = exercise.restSeconds ?? exercise.rest ?? undefined;
  const notes = exercise.notes ?? exercise.note ?? exercise.tip ?? "";

  return (
    <View style={styles.exerciseCard}>
      <View style={styles.exerciseHeaderRow}>
        <View style={styles.exerciseIndex}>
          <Text style={styles.exerciseIndexText}>{index + 1}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.exerciseName}>{name}</Text>
        </View>
        <LikeDislikeButtons exerciseName={name} />
        {onSwap && (
          <TouchableOpacity
            onPress={() => onSwap(name)}
            disabled={swapDisabled || isSwapping}
            activeOpacity={0.5}
            style={{
              opacity: swapDisabled ? 0.3 : 1,
              paddingHorizontal: 8,
              paddingVertical: 10,
            }}
          >
            {isSwapping ? (
              <ActivityIndicator size={16} color={WORKOUT_ACCENT} />
            ) : (
              <Ionicons name="swap-horizontal-outline" size={18} color={WORKOUT_ACCENT} />
            )}
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.exerciseDetails}>
        {type ? (
          <View style={styles.exerciseTypeBadge}>
            <Text style={styles.exerciseTypeText}>{type}</Text>
          </View>
        ) : null}
        {duration != null && (
          <View style={styles.detailChip}>
            <Ionicons name="time-outline" size={12} color={Colors.textSecondary} />
            <Text style={styles.detailValue}>{duration}{typeof duration === "number" ? " minutes" : ""}</Text>
          </View>
        )}
        {sets != null && (
          <View style={styles.detailChip}>
            <Text style={styles.detailValue}>{sets}</Text>
            <Text style={styles.detailLabel}>sets</Text>
          </View>
        )}
        {reps != null && (
          <View style={styles.detailChip}>
            <Text style={styles.detailValue}>{reps}</Text>
            <Text style={styles.detailLabel}>reps</Text>
          </View>
        )}
        {rest != null && (
          <View style={styles.detailChip}>
            <Ionicons name="pause-outline" size={12} color={Colors.textSecondary} />
            <Text style={styles.detailLabel}>Rest: {rest}{typeof rest === "number" ? "s" : ""}</Text>
          </View>
        )}
      </View>
      {notes ? (
        <Text style={styles.exerciseNotes}>{notes}</Text>
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
    fontSize: 15,
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
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
    textAlign: "center",
  },
  loadingSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  errorText: {
    fontSize: 15,
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
    fontSize: 13,
    fontWeight: "500" as const,
    color: Colors.text,
  },
  budgetCard: {
    marginHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  budgetHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 10,
  },
  budgetTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  budgetRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
  },
  budgetItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  budgetLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  budgetValue: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.text,
    marginLeft: 2,
  },
  budgetExhausted: {
    color: Colors.error || "#FF3B30",
  },
  cooldownBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
  },
  cooldownText: {
    fontSize: 12,
    color: "#FF9F0A",
    fontWeight: "500" as const,
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
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 8,
    marginTop: 4,
  },
  planSummary: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
    flexShrink: 1,
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
    fontSize: 17,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 9,
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
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  dayTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dayTypeBadgeText: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
  },
  restDayContent: {
    alignItems: "center",
    paddingBottom: 24,
    gap: 8,
  },
  restDayText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
  },
  restDaySubtext: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  sessionPreview: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: WORKOUT_ACCENT,
    marginBottom: 4,
  },
  sessionDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
    flexShrink: 1,
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
    fontSize: 11,
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
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.text,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  bulletRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  bulletDot: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  bulletText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 20,
    flex: 1,
  },
  coachingTipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 20,
    paddingVertical: 2,
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
    fontSize: 11,
    fontWeight: "700" as const,
    color: WORKOUT_ACCENT,
  },
  exerciseName: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.text,
    flexShrink: 1,
  },
  exerciseTypeBadge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  exerciseTypeText: {
    fontSize: 10,
    fontWeight: "500" as const,
    color: Colors.textSecondary,
  },
  exerciseDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
    alignItems: "center",
  },
  detailChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  detailLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  exerciseNotes: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 6,
    fontStyle: "italic" as const,
  },
});
