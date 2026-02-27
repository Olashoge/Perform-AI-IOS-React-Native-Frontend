import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
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
import apiClient from "@/lib/api-client";

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

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const isEmailUser = !user?.provider || user?.provider === "email";
  const deleteDisabled = deleteConfirmText !== "DELETE" || deletingAccount || (isEmailUser && !deletePassword);

  const handleChangePassword = async () => {
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError("All fields are required.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordError("New password must be different from current password.");
      return;
    }

    setChangingPassword(true);
    try {
      await apiClient.post("/api/auth/change-password", {
        currentPassword,
        newPassword,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPasswordSuccess("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || "Failed to change password.";
      setPasswordError(msg);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    if (isEmailUser && !deletePassword) return;

    setDeletingAccount(true);
    try {
      await apiClient.delete("/api/me", {
        data: isEmailUser ? { password: deletePassword } : undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDeleteModalVisible(false);
      queryClient.clear();
      await logout();
      router.replace("/welcome");
    } catch (err: any) {
      const responseData = err.response?.data;
      const code = responseData?.code;
      const msg = responseData?.message
        || responseData?.error
        || (!err.response ? "Unable to reach the server. Check your connection and try again." : "Failed to delete account.");

      if (code === "AUTH_REQUIRED") {
        setDeleteModalVisible(false);
        if (Platform.OS === "web") {
          alert(msg);
        } else {
          Alert.alert("Session Expired", msg);
        }
        await logout();
        queryClient.clear();
        router.replace("/welcome");
        return;
      }

      if (Platform.OS === "web") {
        alert(msg);
      } else {
        Alert.alert("Error", msg);
      }
    } finally {
      setDeletingAccount(false);
    }
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
        {isEmailUser ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Current password"
              placeholderTextColor={Colors.textTertiary}
              secureTextEntry
              value={currentPassword}
              onChangeText={(t) => { setCurrentPassword(t); setPasswordError(""); setPasswordSuccess(""); }}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="New password"
              placeholderTextColor={Colors.textTertiary}
              secureTextEntry
              value={newPassword}
              onChangeText={(t) => { setNewPassword(t); setPasswordError(""); setPasswordSuccess(""); }}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor={Colors.textTertiary}
              secureTextEntry
              value={confirmNewPassword}
              onChangeText={(t) => { setConfirmNewPassword(t); setPasswordError(""); setPasswordSuccess(""); }}
              autoCapitalize="none"
            />
            {!!passwordError && (
              <Text style={styles.errorText}>{passwordError}</Text>
            )}
            {!!passwordSuccess && (
              <Text style={styles.successText}>{passwordSuccess}</Text>
            )}
            <Pressable
              style={({ pressed }) => [
                styles.changePasswordBtn,
                pressed && { opacity: 0.8 },
                changingPassword && { opacity: 0.6 },
              ]}
              onPress={handleChangePassword}
              disabled={changingPassword}
            >
              {changingPassword ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.changePasswordBtnText}>Change Password</Text>
              )}
            </Pressable>
          </>
        ) : (
          <View style={styles.providerRow}>
            <Icon name="lock" size={20} color={Colors.textSecondary} />
            <Text style={styles.providerText}>
              Password is managed by your sign-in provider.
            </Text>
          </View>
        )}
      </View>

      <Pressable
        style={({ pressed }) => [styles.signOutButton, pressed && { opacity: 0.8 }]}
        onPress={handleLogout}
      >
        <Icon name="logOut" size={20} color={Colors.error} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>

      <Text style={[styles.sectionTitle, { color: Colors.error }]}>DANGER ZONE</Text>
      <View style={[styles.card, { borderWidth: 1, borderColor: Colors.error + "30" }]}>
        <Text style={styles.dangerDescription}>
          Permanently delete your account and all associated data. This action cannot be undone.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.deleteAccountBtn, pressed && { opacity: 0.8 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            setDeleteConfirmText("");
            setDeletePassword("");
            setDeleteModalVisible(true);
          }}
        >
          <Icon name="trash" size={20} color="#FFFFFF" />
          <Text style={styles.deleteAccountBtnText}>Delete Account</Text>
        </Pressable>
      </View>

      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: Colors.surface }]}>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalDescription}>
              This will permanently delete your account, plans, preferences, and all data. This cannot be undone.
            </Text>

            {isEmailUser && (
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor={Colors.textTertiary}
                secureTextEntry
                value={deletePassword}
                onChangeText={setDeletePassword}
                autoCapitalize="none"
              />
            )}

            <Text style={styles.modalLabel}>
              Type <Text style={{ fontFamily: "Inter_700Bold" }}>DELETE</Text> to confirm
            </Text>
            <TextInput
              style={styles.input}
              placeholder="DELETE"
              placeholderTextColor={Colors.textTertiary}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              autoCapitalize="characters"
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [styles.modalCancelBtn, pressed && { opacity: 0.8 }]}
                onPress={() => setDeleteModalVisible(false)}
                disabled={deletingAccount}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalDeleteBtn,
                  pressed && !deleteDisabled && { opacity: 0.8 },
                  deleteDisabled && { opacity: 0.4 },
                ]}
                onPress={handleDeleteAccount}
                disabled={deleteDisabled}
              >
                {deletingAccount ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalDeleteText}>Delete Account</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.error,
    marginBottom: 10,
  },
  successText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.accent,
    marginBottom: 10,
  },
  changePasswordBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  changePasswordBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  providerText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    flex: 1,
  },
  dangerDescription: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginBottom: 14,
    lineHeight: 18,
  },
  deleteAccountBtn: {
    backgroundColor: Colors.error,
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  deleteAccountBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.error,
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginBottom: 20,
    lineHeight: 18,
  },
  modalLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
    marginBottom: 8,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  modalDeleteBtn: {
    flex: 1,
    backgroundColor: Colors.error,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalDeleteText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
});
