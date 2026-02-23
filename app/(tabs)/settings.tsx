import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { useWellnessPlans } from "@/lib/api-hooks";
import { useWeekStart } from "@/lib/week-start-context";
import { useTheme, ThemeMode } from "@/lib/theme-context";

const WEB_TOP_INSET = 67;

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            style={[styles.segmentedItem, isActive && styles.segmentedItemActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onChange(opt.value);
            }}
          >
            <Text
              style={[
                styles.segmentedText,
                isActive && styles.segmentedTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SettingsRow({
  icon,
  iconColor,
  label,
  sublabel,
  onPress,
  showChevron = true,
}: {
  icon: any;
  iconColor: string;
  label: string;
  sublabel?: string;
  onPress: () => void;
  showChevron?: boolean;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={[styles.rowIconBg, { backgroundColor: iconColor + "1A" }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sublabel && <Text style={styles.rowSublabel}>{sublabel}</Text>}
      </View>
      {showChevron && (
        <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
      )}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? WEB_TOP_INSET : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const { user, logout } = useAuth();
  const wellnessPlansQuery = useWellnessPlans();
  const { weekStartDay, setWeekStartDay } = useWeekStart();
  const { themeMode, setThemeMode } = useTheme();

  const activePlan = (wellnessPlansQuery.data || []).find(
    (p: any) => p.status === "active" || p.status === "ready"
  ) || (wellnessPlansQuery.data || [])[0];

  const handleLogout = () => {
    if (Platform.OS === "web") {
      logout();
      router.replace("/login");
      return;
    }
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          logout();
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>Manage your profile and preferences</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: bottomInset + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={28} color={Colors.primary} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {user?.name || user?.username || "User"}
              </Text>
              <Text style={styles.profileEmail}>
                {user?.email || "No email"}
              </Text>
            </View>
            <Pressable
              style={styles.editProfileButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/(tabs)/profile");
              }}
            >
              <Text style={styles.editProfileText}>Edit</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Active Wellness Plan</Text>
        <View style={styles.card}>
          {activePlan ? (
            <View>
              <View style={styles.planRow}>
                <View style={[styles.rowIconBg, { backgroundColor: Colors.primary + "1A" }]}>
                  <Ionicons name="sparkles" size={20} color={Colors.primary} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.rowLabel}>
                    {activePlan.name || activePlan.title || "Wellness Plan"}
                  </Text>
                  {activePlan.primaryGoal && (
                    <Text style={styles.rowSublabel}>{activePlan.primaryGoal}</Text>
                  )}
                </View>
              </View>
              <Pressable
                style={styles.checkinButton}
                onPress={() => {
                  Haptics.impactAsync();
                  Alert.alert("Coming Soon", "Weekly Check-in will be available in the next update.");
                }}
              >
                <Ionicons name="clipboard-outline" size={18} color={Colors.primary} />
                <Text style={styles.checkinText}>Weekly Check-in</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.noPlanRow}>
              <Text style={styles.noPlanText}>No active wellness plan</Text>
              <Pressable
                style={styles.createPlanButton}
                onPress={() => {
                  Haptics.impactAsync();
                  router.push("/(tabs)/create");
                }}
              >
                <Ionicons name="add" size={18} color={Colors.text} />
                <Text style={styles.createPlanText}>Create Plan</Text>
              </Pressable>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="restaurant-outline"
            iconColor={Colors.accent}
            label="Food Preferences"
            sublabel="Favorites, foods to avoid, allergies"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/settings/food-preferences");
            }}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="fitness-outline"
            iconColor="#FF6B6B"
            label="Exercise Preferences"
            sublabel="Training capacity, equipment, constraints"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/settings/exercise-preferences");
            }}
          />
        </View>

        <Text style={styles.sectionTitle}>Week Starts On</Text>
        <View style={styles.card}>
          <SegmentedControl
            options={[
              { label: "Sunday", value: "sunday" },
              { label: "Monday", value: "monday" },
            ]}
            value={weekStartDay}
            onChange={(val) => setWeekStartDay(val as "sunday" | "monday")}
          />
          <Text style={styles.hintText}>
            Affects calendar and weekly summary views
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.card}>
          <SegmentedControl
            options={[
              { label: "Light", value: "light" },
              { label: "Dark", value: "dark" },
              { label: "System", value: "system" },
            ]}
            value={themeMode}
            onChange={(val) => setThemeMode(val as ThemeMode)}
          />
          <Text style={styles.hintText}>
            {themeMode === "system"
              ? "Following system appearance"
              : themeMode === "dark"
                ? "Dark mode active"
                : "Light mode active"}
          </Text>
        </View>

        <Pressable style={styles.signOutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary + "1A",
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  profileEmail: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  editProfileButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.surfaceElevated,
  },
  editProfileText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  rowIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  rowSublabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
    marginLeft: 48,
  },
  checkinButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary + "15",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary + "30",
  },
  checkinText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  noPlanRow: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  noPlanText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  createPlanButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  createPlanText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    padding: 3,
  },
  segmentedItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  segmentedItemActive: {
    backgroundColor: Colors.surfaceTertiary,
  },
  segmentedText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  segmentedTextActive: {
    color: Colors.text,
    fontFamily: "Inter_600SemiBold",
  },
  hintText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    textAlign: "center",
    marginTop: 10,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 32,
    borderWidth: 1,
    borderColor: Colors.error + "30",
  },
  signOutText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.error,
  },
});
