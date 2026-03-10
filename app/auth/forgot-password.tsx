import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import { useColors, useTheme, ThemeColors } from "@/lib/theme-context";
import { Icon } from "@/components/Icon";
import apiClient from "@/lib/api-client";

export default function ForgotPasswordScreen() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  async function handleSubmit() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await apiClient.post("/api/auth/forgot-password", {
        email: trimmedEmail.toLowerCase(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccess(true);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const status = err.response?.status;
      if (status === 404) {
        setError(
          "Password reset is not available at this time. Please contact support for assistance."
        );
      } else {
        const message =
          err.response?.data?.message ||
          err.response?.data?.error ||
          "Something went wrong. Please try again or contact support.";
        setError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + webTopInset,
          paddingBottom: insets.bottom + webBottomInset,
        },
      ]}
    >
      <StatusBar style={isDark ? "light" : "dark"} />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View style={styles.content}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={12}
          >
            <Icon name="back" size={24} color={Colors.text} />
          </Pressable>

          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Icon name="lock" size={28} />
            </View>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter your email and we'll send you a link to reset your password
            </Text>
          </View>

          {success ? (
            <View style={styles.successContainer}>
              <Icon name="checkmark" size={24} color={Colors.accent} />
              <Text style={styles.successTitle}>Check your email</Text>
              <Text style={styles.successText}>
                If an account exists with that email, you'll receive a password
                reset link shortly.
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.backToLoginButton,
                  pressed && styles.backToLoginButtonPressed,
                ]}
                onPress={() => router.back()}
              >
                <Text style={styles.backToLoginButtonText}>
                  Back to Sign In
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              {!!error && (
                <View style={styles.errorContainer}>
                  <Icon name="alertCircle" size={20} color={Colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <View style={styles.inputIcon}>
                    <Icon
                      name="mail"
                      size={20}
                      color={Colors.textSecondary}
                    />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor={Colors.textTertiary}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                    autoFocus
                  />
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.submitButton,
                    pressed && styles.submitButtonPressed,
                    isSubmitting && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={Colors.background} size="small" />
                  ) : (
                    <Text style={styles.submitButtonText}>Send Reset Link</Text>
                  )}
                </Pressable>
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Remember your password? </Text>
                <Pressable onPress={() => router.back()}>
                  <Text style={styles.footerLink}>Sign In</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    keyboardView: {
      flex: 1,
    },
    content: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 24,
    },
    backButton: {
      position: "absolute" as const,
      top: 16,
      left: 24,
      zIndex: 10,
    },
    header: {
      alignItems: "center",
      marginBottom: 40,
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 24,
      backgroundColor: Colors.surfaceElevated,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 20,
    },
    title: {
      fontSize: 24,
      fontFamily: "Inter_700Bold",
      color: Colors.text,
      marginBottom: 12,
    },
    subtitle: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: Colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
      paddingHorizontal: 16,
    },
    errorContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Colors.errorSoft,
      borderRadius: 12,
      padding: 14,
      marginBottom: 20,
      gap: 10,
    },
    errorText: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: Colors.error,
      flex: 1,
    },
    successContainer: {
      alignItems: "center",
      gap: 12,
    },
    successTitle: {
      fontSize: 18,
      fontFamily: "Inter_600SemiBold",
      color: Colors.text,
      marginTop: 4,
    },
    successText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: Colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
      paddingHorizontal: 16,
    },
    backToLoginButton: {
      backgroundColor: Colors.text,
      borderRadius: 14,
      paddingVertical: 16,
      paddingHorizontal: 32,
      alignItems: "center",
      marginTop: 20,
      alignSelf: "stretch",
    },
    backToLoginButtonPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.98 }],
    },
    backToLoginButtonText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: Colors.background,
    },
    form: {
      gap: 14,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    inputIcon: {
      paddingLeft: 16,
    },
    input: {
      flex: 1,
      paddingVertical: 16,
      paddingHorizontal: 12,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: Colors.text,
    },
    submitButton: {
      backgroundColor: Colors.text,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: "center",
      marginTop: 8,
    },
    submitButtonPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.98 }],
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
    submitButtonText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: Colors.background,
    },
    footer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: 32,
    },
    footerText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: Colors.textSecondary,
    },
    footerLink: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: Colors.text,
      textDecorationLine: "underline",
    },
  });
