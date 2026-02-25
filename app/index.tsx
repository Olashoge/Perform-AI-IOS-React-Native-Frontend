import React, { useMemo, useState, useEffect } from "react";
import { Redirect } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/lib/auth-context";
import { useColors, ThemeColors } from "@/lib/theme-context";

export default function Index() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { isAuthenticated, isLoading } = useAuth();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      AsyncStorage.getItem("perform_onboarding_complete").then((val) => {
        setOnboardingComplete(val === "true");
        setOnboardingChecked(true);
      }).catch(() => {
        setOnboardingChecked(true);
      });
    } else if (!isLoading) {
      setOnboardingChecked(true);
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading || !onboardingChecked) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/welcome" />;
  }

  if (!onboardingComplete) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
});
