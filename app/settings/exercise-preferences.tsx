import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Icon } from "@/components/Icon";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors, ThemeColors } from "@/lib/theme-context";
import {
  useExercisePreferences,
  useDeleteExercisePreference,
  ExercisePreference,
} from "@/lib/api-hooks";

type Tab = "liked" | "disliked" | "avoided";

function ExerciseCard({
  exercise,
  onDelete,
  Colors,
}: {
  exercise: ExercisePreference;
  onDelete: () => void;
  Colors: ThemeColors;
}) {
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const name = exercise.exerciseName || exercise.name || "Exercise";
  const typeLabel = exercise.type || "";

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemIconCircle}>
        <Icon name="barbell" size={16} color={Colors.textSecondary} />
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemName} numberOfLines={2}>{name}</Text>
        {typeLabel ? (
          <Text style={styles.itemSubtext}>{typeLabel}</Text>
        ) : null}
      </View>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          Alert.alert("Remove", `Remove "${name}" from your preferences?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Remove", style: "destructive", onPress: onDelete },
          ]);
        }}
        hitSlop={10}
        style={styles.deleteBtn}
      >
        <Icon name="trash" size={16} color={Colors.textTertiary} />
      </Pressable>
    </View>
  );
}

function EmptyState({ tab, Colors }: { tab: Tab; Colors: ThemeColors }) {
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const config = {
    liked: {
      icon: "thumbs-up-outline" as const,
      text: "No liked exercises yet. Like exercises in your workout plans to improve future suggestions.",
    },
    disliked: {
      icon: "thumbs-down-outline" as const,
      text: "No disliked exercises yet. Dislike exercises in your workout plans to avoid them in the future.",
    },
    avoided: {
      icon: "ban-outline" as const,
      text: "No avoided exercises yet. Exercises are added here when you consistently dislike them.",
    },
  };
  const c = config[tab];

  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name={c.icon} size={28} color={Colors.textTertiary} />
      </View>
      <Text style={styles.emptyText}>{c.text}</Text>
    </View>
  );
}

export default function ExercisePreferencesScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const [activeTab, setActiveTab] = useState<Tab>("liked");
  const { data, isLoading } = useExercisePreferences();
  const deleteExercise = useDeleteExercisePreference();

  const liked = data?.liked ?? [];
  const disliked = data?.disliked ?? [];
  const avoided = data?.avoided ?? [];

  const tabs: { key: Tab; label: string; count: number; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: "liked", label: "Liked", count: liked.length, icon: "thumbs-up-outline" },
    { key: "disliked", label: "Disliked", count: disliked.length, icon: "thumbs-down-outline" },
    { key: "avoided", label: "Avoided", count: avoided.length, icon: "ban-outline" },
  ];

  const currentList = activeTab === "liked" ? liked : activeTab === "disliked" ? disliked : avoided;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Icon name="back" size={28} />
        </Pressable>
        <Text style={styles.headerTitle}>Exercise Preferences</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={styles.subtitle}>
        Manage what you like, dislike, and want to avoid in future workouts.
      </Text>

      <View style={styles.tabRow}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => {
                Haptics.selectionAsync();
                setActiveTab(tab.key);
              }}
            >
              <Ionicons
                name={tab.icon}
                size={14}
                color={isActive ? Colors.primary : Colors.textSecondary}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label} ({tab.count})
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {currentList.length > 0 ? (
            currentList.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                onDelete={() => deleteExercise.mutate(exercise.id)}
                Colors={Colors}
              />
            ))
          ) : (
            <EmptyState tab={activeTab} Colors={Colors} />
          )}
        </ScrollView>
      )}
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
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 40,
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    flex: 1,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 18,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 16,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: {
    backgroundColor: Colors.primary + "18",
    borderColor: Colors.primary + "50",
  },
  tabText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
    fontFamily: "Inter_600SemiBold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  itemIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
  },
  itemContent: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  itemSubtext: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  deleteBtn: {
    padding: 6,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
});
