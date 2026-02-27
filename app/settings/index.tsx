import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors, ThemeColors, useTheme, ThemeMode } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";
import { useWeekStart } from "@/lib/week-start-context";
import { useProfile } from "@/lib/api-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { getAccessToken } from "@/lib/api-client";
import { getApiUrl } from "@/lib/query-client";

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (val: string) => void;
}) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

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

export default function SettingsIndexScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const { user, logout } = useAuth();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const { weekStartDay, setWeekStartDay } = useWeekStart();
  const { themeMode, setThemeMode } = useTheme();
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const userEmail = user?.email || (profile as any)?.email || "Not set";

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleChangePassword = async () => {
    const errors: Record<string, string> = {};
    if (!currentPassword) errors.currentPassword = "Current password is required";
    if (!newPassword) errors.newPassword = "New password is required";
    else if (newPassword.length < 8) errors.newPassword = "Must be at least 8 characters";
    if (!confirmPassword) errors.confirmPassword = "Please confirm your new password";
    else if (newPassword !== confirmPassword) errors.confirmPassword = "Passwords do not match";
    if (currentPassword && newPassword && currentPassword === newPassword) {
      errors.newPassword = "New password must be different from current";
    }

    setPasswordErrors(errors);
    if (Object.keys(errors).length > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setPasswordSaving(true);
    setPasswordSuccess(false);
    try {
      const token = await getAccessToken();
      const baseUrl = getApiUrl();
      const res = await fetch(
        `${baseUrl}api/auth/change-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ currentPassword, newPassword }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error || "Failed to change password");
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordErrors({});
      setTimeout(() => {
        setShowPasswordForm(false);
        setPasswordSuccess(false);
      }, 2000);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setPasswordErrors({ form: err.message || "Failed to change password" });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    const doDelete = async () => {
      setDeletingAccount(true);
      try {
        const token = await getAccessToken();
        const baseUrl = getApiUrl();
        const res = await fetch(`${baseUrl}api/user`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || data.error || "Failed to delete account");
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await logout();
        queryClient.clear();
        router.replace("/welcome");
      } catch (err: any) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Error", err.message || "Failed to delete account");
      } finally {
        setDeletingAccount(false);
      }
    };

    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all associated data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete Account", style: "destructive", onPress: doDelete },
      ]
    );
  };

  const handleLogout = () => {
    const doLogout = async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await logout();
      queryClient.clear();
      router.replace("/login");
    };

    if (Platform.OS === "web") {
      doLogout();
      return;
    }
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: doLogout,
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Icon name="back" size={28} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: insets.bottom + 120,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >

      <Text style={styles.sectionTitle}>LOGIN INFORMATION</Text>
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <View style={[styles.rowIconBg, { backgroundColor: Colors.primary + "1A" }]}>
            <Icon name="mail" size={20} color={Colors.primary} />
          </View>
          <View style={styles.rowContent}>
            <Text style={styles.rowLabel}>Email</Text>
            <Text style={styles.rowValue}>{userEmail}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>WEEK STARTS ON</Text>
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

      <Text style={styles.sectionTitle}>APPEARANCE</Text>
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

      <Text style={styles.sectionTitle}>SECURITY</Text>
      <View style={styles.card}>
        <Pressable
          style={styles.securityRow}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowPasswordForm(!showPasswordForm);
            setPasswordErrors({});
            setPasswordSuccess(false);
          }}
        >
          <View style={[styles.rowIconBg, { backgroundColor: Colors.primary + "1A" }]}>
            <Icon name="lock" size={20} color={Colors.primary} />
          </View>
          <Text style={styles.securityRowText}>Change Password</Text>
          <Icon name={showPasswordForm ? "chevronUp" : "chevronDown"} size={20} color={Colors.textTertiary} />
        </Pressable>

        {showPasswordForm && (
          <View style={styles.passwordForm}>
            {passwordErrors.form ? (
              <Text style={styles.formError}>{passwordErrors.form}</Text>
            ) : null}
            {passwordSuccess ? (
              <Text style={styles.formSuccess}>Password changed successfully</Text>
            ) : null}

            <Text style={styles.inputLabel}>Current Password</Text>
            <TextInput
              style={[styles.input, passwordErrors.currentPassword ? styles.inputError : null]}
              value={currentPassword}
              onChangeText={(t) => { setCurrentPassword(t); setPasswordErrors((e) => { const { currentPassword: _, ...rest } = e; return rest; }); }}
              secureTextEntry
              placeholder="Enter current password"
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="none"
              testID="current-password-input"
            />
            {passwordErrors.currentPassword ? (
              <Text style={styles.fieldError}>{passwordErrors.currentPassword}</Text>
            ) : null}

            <Text style={styles.inputLabel}>New Password</Text>
            <TextInput
              style={[styles.input, passwordErrors.newPassword ? styles.inputError : null]}
              value={newPassword}
              onChangeText={(t) => { setNewPassword(t); setPasswordErrors((e) => { const { newPassword: _, ...rest } = e; return rest; }); }}
              secureTextEntry
              placeholder="At least 8 characters"
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="none"
              testID="new-password-input"
            />
            {passwordErrors.newPassword ? (
              <Text style={styles.fieldError}>{passwordErrors.newPassword}</Text>
            ) : null}

            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <TextInput
              style={[styles.input, passwordErrors.confirmPassword ? styles.inputError : null]}
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); setPasswordErrors((e) => { const { confirmPassword: _, ...rest } = e; return rest; }); }}
              secureTextEntry
              placeholder="Re-enter new password"
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="none"
              testID="confirm-password-input"
            />
            {passwordErrors.confirmPassword ? (
              <Text style={styles.fieldError}>{passwordErrors.confirmPassword}</Text>
            ) : null}

            <Pressable
              style={({ pressed }) => [styles.savePasswordBtn, pressed && { opacity: 0.8 }, passwordSaving && { opacity: 0.6 }]}
              onPress={handleChangePassword}
              disabled={passwordSaving}
              testID="save-password-button"
            >
              {passwordSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.savePasswordText}>Update Password</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>

      <Text style={[styles.sectionTitle, { color: Colors.error }]}>DANGER ZONE</Text>
      <View style={[styles.card, { borderWidth: 1, borderColor: Colors.error + "20" }]}>
        <Pressable
          style={styles.deleteRow}
          onPress={handleDeleteAccount}
          disabled={deletingAccount}
          testID="delete-account-button"
        >
          <View style={[styles.rowIconBg, { backgroundColor: Colors.error + "1A" }]}>
            {deletingAccount ? (
              <ActivityIndicator size="small" color={Colors.error} />
            ) : (
              <Icon name="trash" size={20} color={Colors.error} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.deleteRowTitle}>Delete Account</Text>
            <Text style={styles.deleteRowSubtitle}>Permanently remove your account and data</Text>
          </View>
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [styles.signOutButton, pressed && { opacity: 0.8 }]}
        onPress={handleLogout}
      >
        <Icon name="logOut" size={20} color={Colors.error} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </ScrollView>
    </View>
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
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginTop: 24,
    marginBottom: 8,
    paddingLeft: 4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
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
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  rowValue: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    marginTop: 2,
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
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  segmentedTextActive: {
    color: Colors.text,
    fontFamily: "Inter_600SemiBold",
  },
  hintText: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    textAlign: "center",
    marginTop: 10,
  },
  securityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  securityRowText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  passwordForm: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  inputLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputError: {
    borderColor: Colors.error,
  },
  fieldError: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.error,
    marginTop: 4,
  },
  formError: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.error,
    backgroundColor: Colors.error + "10",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 4,
    overflow: "hidden",
  },
  formSuccess: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.accent,
    backgroundColor: Colors.accent + "10",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 4,
    overflow: "hidden",
  },
  savePasswordBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 16,
  },
  savePasswordText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  deleteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  deleteRowTitle: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.error,
  },
  deleteRowSubtitle: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    marginTop: 2,
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
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.error,
  },
});
