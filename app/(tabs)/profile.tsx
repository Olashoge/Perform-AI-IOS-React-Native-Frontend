import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";

function ProfileMenuItem({
  icon,
  label,
  value,
  onPress,
  color = Colors.text,
  showArrow = true,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  color?: string;
  showArrow?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuItem, pressed && onPress && { opacity: 0.7 }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.menuItemLeft}>
        <View style={[styles.menuIconBg, { backgroundColor: color + "1A" }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={[styles.menuItemLabel, { color }]}>{label}</Text>
      </View>
      <View style={styles.menuItemRight}>
        {!!value && <Text style={styles.menuItemValue}>{value}</Text>}
        {showArrow && <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />}
      </View>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  async function handleLogout() {
    if (Platform.OS === "web") {
      await logout();
      router.replace("/login");
      return;
    }

    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await logout();
          router.replace("/login");
        },
      },
    ]);
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
      <Text style={styles.headerTitle}>Profile</Text>

      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color={Colors.primary} />
        </View>
        <Text style={styles.userName}>{user?.name || user?.email || "User"}</Text>
        {user?.email && <Text style={styles.userEmail}>{user.email}</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.menuGroup}>
          <ProfileMenuItem icon="person-outline" label="Edit Profile" />
          <ProfileMenuItem icon="notifications-outline" label="Notifications" />
          <ProfileMenuItem icon="shield-outline" label="Privacy" />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.menuGroup}>
          <ProfileMenuItem icon="nutrition-outline" label="Dietary Goals" />
          <ProfileMenuItem icon="barbell-outline" label="Workout Settings" />
          <ProfileMenuItem icon="moon-outline" label="Appearance" value="Dark" />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Developer</Text>
        <View style={styles.menuGroup}>
          <ProfileMenuItem
            icon="bug-outline"
            label="Diagnostics"
            onPress={() => router.push("/diagnostics")}
            color={Colors.warning}
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.menuGroup}>
          <ProfileMenuItem
            icon="log-out-outline"
            label="Sign Out"
            color={Colors.error}
            onPress={handleLogout}
            showArrow={false}
          />
        </View>
      </View>

      <Text style={styles.version}>Perform AI v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 24,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: Colors.primary + "1A",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  userName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuGroup: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  menuItemLabel: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  menuItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  menuItemValue: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  version: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    textAlign: "center",
    marginTop: 12,
  },
});
