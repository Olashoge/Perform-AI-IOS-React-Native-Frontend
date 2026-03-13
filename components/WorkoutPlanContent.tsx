import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  TouchableOpacity,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { useColors, ThemeColors } from "@/lib/theme-context";
import { useExerciseFeedback, useDeleteExercisePreferenceByKey, useExercisePreferences } from "@/lib/api-hooks";

function toExerciseKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

interface WorkoutPlanContentProps {
  planId?: string;
  planData?: any;
}

export function WorkoutPlanContent({ planData }: WorkoutPlanContentProps) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const data = planData;
  const [expandedSessions, setExpandedSessions] = useState<Record<number, boolean>>({});

  const toggleSession = useCallback((dayIndex: number) => {
    setExpandedSessions((prev) => ({ ...prev, [dayIndex]: !prev[dayIndex] }));
  }, []);

  const plan = data?.planJson ?? data;
  const status = data?.status;

  if (status === "generating") {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color={Colors.error} />
        <Text style={styles.loadingText}>Plan is still generating...</Text>
        <Text style={styles.loadingSubtext}>Check back in a moment</Text>
      </View>
    );
  }

  const days = plan?.days ?? [];
  const title = plan?.title ?? "Workout Plan";
  const summary = plan?.summary ?? "";
  const workoutStartDate = data?.planStartDate || data?.startDate || plan?.startDate || plan?.planStartDate;
  const rawNotes = plan?.progressionNotes ?? plan?.progression_notes ?? plan?.progressionTips ?? [];
  const progressionNotes: string[] = typeof rawNotes === "string" ? [rawNotes] : (Array.isArray(rawNotes) ? rawNotes.filter((n: any) => typeof n === "string" && n.trim()) : []);

  return (
    <View>
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
          startDate={workoutStartDate}
          expanded={!!expandedSessions[idx]}
          onToggle={() => toggleSession(idx)}
        />
      ))}

      {progressionNotes.length > 0 && (
        <View style={styles.progressionCard}>
          <View style={styles.progressionHeader}>
            <Icon name="trendingUp" size={20} color={Colors.error} />
            <Text style={styles.progressionTitle}>Progression Notes</Text>
          </View>
          {progressionNotes.map((note, i) => (
            <View key={i} style={styles.progressionNoteRow}>
              <Text style={styles.progressionBullet}>{"›"}</Text>
              <Text style={styles.progressionNoteText}>{note}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function StatBadge({ icon, label, value }: { icon: string; label: string; value: string }) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <View style={styles.statBadge}>
      <Ionicons name={icon as any} size={18} color={Colors.error} />
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
  const tips = session.coachingCues ?? session.coachingTips ?? session.coaching_tips ?? session.tips ?? [];
  if (typeof tips === "string") return [tips];
  if (Array.isArray(tips)) return tips.map((t: any) => typeof t === "string" ? t : t.text ?? t.tip ?? t.cue ?? String(t));
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
              backgroundColor: Colors.error + "18",
              marginBottom: 10,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.error }}>Avoid Completely</Text>
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
            color={state === "liked" ? Colors.accent : Colors.textTertiary}
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
            color={state === "disliked" ? Colors.error : Colors.textTertiary}
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

const WEEKDAYS_W = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_SHORT_W = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatWorkoutDayDate(startDate: string | undefined, dayIndex: number): { dayOfWeek: string; dateStr: string } {
  if (!startDate) return { dayOfWeek: "", dateStr: "" };
  try {
    const d = new Date(startDate + "T12:00:00");
    d.setDate(d.getDate() + dayIndex);
    const dayOfWeek = WEEKDAYS_W[d.getDay()];
    const month = MONTHS_SHORT_W[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();
    return { dayOfWeek, dateStr: `${month} ${day}, ${year}` };
  } catch {
    return { dayOfWeek: "", dateStr: "" };
  }
}

function createWorkoutBenefitText(day: any, session: any): string {
  const isRest = !day?.isWorkoutDay;
  if (isRest) return "Allow your body to recover and rebuild for the next session.";

  const mode = (session?.mode ?? "").toLowerCase();
  const intensity = (session?.intensity ?? "").toLowerCase();
  const duration = session?.durationMinutes ?? session?.estimatedDuration ?? null;
  const parts: string[] = [];

  if (intensity) parts.push(`${intensity.charAt(0).toUpperCase() + intensity.slice(1)} intensity`);
  if (mode === "strength") parts.push("strength training");
  else if (mode === "cardio") parts.push("cardio session");
  else if (mode === "mixed") parts.push("strength and cardio");
  else if (mode === "flexibility" || mode === "mobility") parts.push("mobility work");
  else if (mode) parts.push(`${mode} training`);
  if (duration) parts.push(`${duration} min`);

  if (parts.length > 0) return parts.join(" · ");
  return "Targeted training session";
}

function DayCard({
  day,
  dayIndex,
  startDate,
  expanded,
  onToggle,
}: {
  day: any;
  dayIndex: number;
  startDate?: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const isWorkout = day.isWorkoutDay;
  const session = day.session;
  const dayNum = day.dayIndex ?? dayIndex + 1;
  const dayLabel = day.dayLabel ?? `Day ${dayNum}`;
  const { dayOfWeek, dateStr } = formatWorkoutDayDate(startDate, dayIndex);
  const dayType = isWorkout ? "Workout" : "Rest";

  if (!isWorkout) {
    return (
      <View style={[styles.dayCard, styles.restDayCard]}>
        <View style={styles.dayHeaderRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
            <View style={[styles.dayBadge, { backgroundColor: Colors.textSecondary + "18" }]}>
              <Text style={[styles.dayBadgeText, { color: Colors.textSecondary }]}>{dayIndex + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dayLabel} numberOfLines={1}>
                {dayOfWeek || dayLabel} · Rest
              </Text>
              {dateStr ? <Text style={styles.dayDateSub}>{dateStr}</Text> : null}
            </View>
          </View>
          <Icon name="sleep" size={20} color={Colors.textTertiary} />
        </View>
        <View style={styles.restDayContent}>
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
          <View style={[styles.dayBadge, { backgroundColor: Colors.error + "18" }]}>
            <Text style={[styles.dayBadgeText, { color: Colors.error }]}>{dayIndex + 1}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.dayLabel} numberOfLines={1}>
              {dayOfWeek || dayLabel} · Workout
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {dateStr ? <Text style={styles.dayDateSub}>{dateStr}</Text> : null}
              {(session?.durationMinutes || session?.estimatedDuration) ? (
                <Text style={styles.dayMetaDetail}>{session.durationMinutes ?? session.estimatedDuration} min</Text>
              ) : null}
              {mainExercises.length > 0 && (
                <Text style={styles.dayMetaDetail}>{mainExercises.length} exercises</Text>
              )}
            </View>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={20}
            color={Colors.textSecondary}
          />
        </View>
      </Pressable>

      {session && (
        <View style={styles.sessionPreview}>
          <Text style={styles.sessionTitle} numberOfLines={2} ellipsizeMode="tail">{session.sessionTitle ?? session.title ?? session.name ?? session.focus ?? "Training Session"}</Text>
          {(() => {
            const title = session.sessionTitle ?? session.title ?? session.name ?? session.focus ?? "";
            const desc = session.description ?? session.summary ?? session.rationale ?? session.benefit ?? session.purpose ?? "";
            const displayDesc = desc && desc.trim().toLowerCase() !== title.trim().toLowerCase() ? desc : createWorkoutBenefitText(day, session);
            return displayDesc ? (
              <Text style={styles.sessionDescription} numberOfLines={3} ellipsizeMode="tail">{displayDesc}</Text>
            ) : null;
          })()}
          <View style={styles.sessionMeta}>
            {(session.durationMinutes || session.estimatedDuration) ? (
              <View style={styles.metaTag}>
                <Icon name="time" size={16} color={Colors.textSecondary} />
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
                <Icon name="flame" size={20} color={Colors.warning} />
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
                <Icon name="barbell" size={20} color={Colors.error} />
                <Text style={styles.sectionTitle}>MAIN WORKOUT</Text>
              </View>
              {mainExercises.map((ex: any, idx: number) => (
                <ExerciseCard
                  key={idx}
                  exercise={ex}
                  index={idx}
                />
              ))}
            </View>
          )}

          {cooldown && (
            <View style={styles.sessionSectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Icon name="snow" size={20} color="#64D2FF" />
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
                <Icon name="bulb" size={20} color="#FFD60A" />
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

function ExerciseCard({ exercise, index }: { exercise: any; index: number }) {
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
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.exerciseName} numberOfLines={2} ellipsizeMode="tail">{name}</Text>
        </View>
        <LikeDislikeButtons exerciseName={name} />
      </View>
      <View style={styles.exerciseDetails}>
        {type ? (
          <View style={styles.exerciseTypeBadge}>
            <Text style={styles.exerciseTypeText}>{type}</Text>
          </View>
        ) : null}
        {duration != null && (
          <View style={styles.detailChip}>
            <Icon name="time" size={16} color={Colors.textSecondary} />
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
            <Icon name="pause" size={16} color={Colors.textSecondary} />
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
  heroSection: {
    marginBottom: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  accentBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: Colors.error,
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
    marginBottom: 12,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    gap: 8,
  },
  dayBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dayBadgeText: {
    fontSize: 14,
    fontWeight: "700" as const,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  dayDateSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "400" as const,
  },
  dayMetaDetail: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: Colors.textSecondary,
  },
  regenBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surfaceElevated,
  },
  restDayCard: {
    opacity: 0.85,
  },
  restDayContent: {
    alignItems: "center",
    paddingBottom: 20,
    paddingTop: 4,
    gap: 4,
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
    color: Colors.error,
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
  progressionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  progressionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 12,
  },
  progressionTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  progressionNoteRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 8,
    paddingVertical: 4,
  },
  progressionBullet: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  progressionNoteText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    flex: 1,
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
    backgroundColor: Colors.error + "25",
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseIndexText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: Colors.error,
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
