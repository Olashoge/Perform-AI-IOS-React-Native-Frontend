import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors, ThemeColors } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";
import { useProfile, usePerformanceData } from "@/lib/api-hooks";

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  onPress: () => void;
}

function ProfileHeader({ Colors }: { Colors: ThemeColors }) {
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: perfData } = usePerformanceData();

  const p = profile as any;
  const displayName = p?.name || p?.username || user?.name || user?.username || user?.email?.split("@")[0] || "User";
  const initials = displayName.slice(0, 2).toUpperCase();
  const streak = perfData?.streak ?? 0;

  return (
    <View style={styles.profileHeader}>
      <View style={styles.profileStatCol}>
        <Text style={styles.profileStatValue}>{streak}</Text>
        <Text style={styles.profileStatLabel}>day streak</Text>
      </View>

      <View style={styles.avatarContainer}>
        <View style={styles.avatarCircle}>
          <Ionicons name="person" size={36} color={Colors.primary} />
        </View>
        <Text style={styles.profileName}>{displayName}</Text>
      </View>

      <Pressable
        style={styles.profileStatCol}
        onPress={() => router.push("/(tabs)/performance")}
      >
        <Ionicons name="trending-up" size={20} color={Colors.scoreGreen} />
        <Text style={styles.profileStatLabel}>Progress</Text>
      </Pressable>
    </View>
  );
}

function MenuRow({ item, Colors, isLast }: { item: MenuItem; Colors: ThemeColors; isLast: boolean }) {
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <Pressable
      style={({ pressed }) => [styles.menuRow, pressed && { backgroundColor: Colors.surfaceElevated }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        item.onPress();
      }}
    >
      <View style={[styles.menuIconCircle, { backgroundColor: item.iconColor + "18" }]}>
        <Ionicons name={item.icon} size={20} color={item.iconColor} />
      </View>
      <Text style={styles.menuLabel}>{item.label}</Text>
      <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
      {!isLast && <View style={styles.menuDivider} />}
    </Pressable>
  );
}

export default function MoreScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const menuSections: { title?: string; items: MenuItem[] }[] = [
    {
      items: [
        {
          icon: "person-outline",
          iconColor: Colors.primary,
          label: "My Profile",
          onPress: () => router.push("/profile"),
        },
        {
          icon: "settings-outline",
          iconColor: Colors.textSecondary,
          label: "Settings",
          onPress: () => router.push("/settings"),
        },
      ],
    },
    {
      title: "PLANS",
      items: [
        {
          icon: "heart-outline",
          iconColor: "#FF6B6B",
          label: "Wellness Plans",
          onPress: () => router.push({ pathname: "/plans", params: { tab: "wellness" } }),
        },
        {
          icon: "restaurant-outline",
          iconColor: Colors.warning,
          label: "Nutrition Plans",
          onPress: () => router.push({ pathname: "/plans", params: { tab: "meals" } }),
        },
        {
          icon: "barbell-outline",
          iconColor: Colors.scoreGreen,
          label: "Training Plans",
          onPress: () => router.push({ pathname: "/plans", params: { tab: "workouts" } }),
        },
      ],
    },
    {
      title: "PREFERENCES",
      items: [
        {
          icon: "nutrition-outline",
          iconColor: "#FF9F0A",
          label: "Meal Preferences",
          onPress: () => router.push("/settings/food-preferences"),
        },
        {
          icon: "fitness-outline",
          iconColor: "#30D158",
          label: "Exercise Preferences",
          onPress: () => router.push("/settings/exercise-preferences"),
        },
      ],
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingTop: insets.top + 12 + webTopInset,
          paddingBottom: 120,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.headerTitle}>More</Text>

      <ProfileHeader Colors={Colors} />

      {menuSections.map((section, sIdx) => (
        <View key={sIdx} style={styles.menuSection}>
          {section.title && (
            <Text style={styles.sectionTitle}>{section.title}</Text>
          )}
          <View style={styles.menuCard}>
            {section.items.map((item, iIdx) => (
              <MenuRow
                key={iIdx}
                item={item}
                Colors={Colors}
                isLast={iIdx === section.items.length - 1}
              />
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 20,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
  },
  profileStatCol: {
    alignItems: "center",
    gap: 4,
    minWidth: 60,
  },
  profileStatValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  profileStatLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  avatarContainer: {
    alignItems: "center",
    gap: 8,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: Colors.primary + "40",
  },
  profileName: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  menuSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingLeft: 4,
  },
  menuCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  menuLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    flex: 1,
  },
  menuDivider: {
    position: "absolute",
    bottom: 0,
    left: 66,
    right: 16,
    height: 1,
    backgroundColor: Colors.border + "40",
  },
});
