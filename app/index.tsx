import React, { useRef, useEffect, useMemo } from "react";
import { Redirect } from "expo-router";
import { View, Text, ActivityIndicator, StyleSheet, Animated, Image } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { useColors, ThemeColors } from "@/lib/theme-context";

export default function Index() {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { isAuthenticated, isLoading, needsOnboarding } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, []);

  if (isLoading) {
    return (
      <Animated.View style={[styles.loading, { opacity: fadeAnim }]}>
        <Image
          source={require("../assets/images/splash-icon.png")}
          style={styles.splashIcon}
          resizeMode="contain"
        />
        <View style={styles.brandLockup}>
          <Text style={styles.brandName}>Perform AI</Text>
        </View>
        <ActivityIndicator size="small" color={Colors.primary} style={styles.spinner} />
      </Animated.View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/welcome" />;
  }

  if (needsOnboarding) {
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
  splashIcon: {
    width: 72,
    height: 72,
    marginBottom: 16,
  },
  brandLockup: {
    alignItems: "center",
  },
  brandName: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  spinner: {
    marginTop: 36,
  },
});
