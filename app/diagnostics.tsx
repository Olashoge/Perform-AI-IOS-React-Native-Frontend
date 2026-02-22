import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { getAccessToken, getRefreshToken } from "@/lib/api-client";
import { getApiCallLog, ApiCallEntry } from "@/lib/api-log";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} selectable>{value}</Text>
    </View>
  );
}

function CallLogItem({ entry }: { entry: ApiCallEntry }) {
  const time = new Date(entry.timestamp).toLocaleTimeString();
  const isError = typeof entry.status === "string" || (typeof entry.status === "number" && entry.status >= 400);
  return (
    <View style={styles.logItem}>
      <View style={styles.logHeader}>
        <Text style={[styles.logMethod, isError && { color: Colors.error }]}>
          {entry.method}
        </Text>
        <Text style={[styles.logStatus, isError && { color: Colors.error }]}>
          {entry.status}
        </Text>
      </View>
      <Text style={styles.logUrl} numberOfLines={1}>{entry.url}</Text>
      <Text style={styles.logTime}>{time}</Text>
    </View>
  );
}

export default function DiagnosticsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const [hasAccessToken, setHasAccessToken] = useState<string>("checking...");
  const [hasRefreshToken, setHasRefreshToken] = useState<string>("checking...");
  const [callLog, setCallLog] = useState<ApiCallEntry[]>([]);

  const refresh = useCallback(async () => {
    const at = await getAccessToken();
    setHasAccessToken(at ? "yes" : "no");
    const rt = await getRefreshToken();
    setHasRefreshToken(rt ? "yes" : "no");
    setCallLog(getApiCallLog());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Diagnostics</Text>
        <Pressable
          onPress={refresh}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="refresh" size={22} color={Colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 + (Platform.OS === "web" ? 34 : 0) }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Configuration</Text>
        <View style={styles.card}>
          <Row label="Auth API" value="https://mealplanai.replit.app" />
          <Row label="Data API" value={process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "http://localhost:5000"} />
          <Row label="Auth Mode" value="JWT / Bearer Token" />
          <Row label="withCredentials" value="false (disabled)" />
        </View>

        <Text style={styles.sectionTitle}>Auth State</Text>
        <View style={styles.card}>
          <Row label="User ID" value={user?.id ?? "n/a"} />
          <Row label="User Email" value={user?.email ?? "n/a"} />
          <Row label="User Name" value={user?.name ?? "n/a"} />
          <Row label="Access Token Present" value={hasAccessToken} />
          <Row label="Refresh Token Present" value={hasRefreshToken} />
        </View>

        <Text style={styles.sectionTitle}>Endpoints Wired</Text>
        <View style={styles.card}>
          <Row label="Login" value="POST /api/auth/token-login" />
          <Row label="Refresh" value="POST /api/auth/refresh" />
          <Row label="Weekly Summary" value="GET /api/weekly-summary" />
          <Row label="Week Data" value="GET /api/week-data" />
          <Row label="Day Data" value="GET /api/day-data/:date" />
          <Row label="Toggle Meal" value="PATCH /api/meals/:id" />
          <Row label="Toggle Workout" value="PATCH /api/workouts/:id" />
        </View>

        <View style={styles.logHeaderRow}>
          <Text style={styles.sectionTitle}>Recent API Calls</Text>
          <Text style={styles.logCount}>{callLog.length} / 5</Text>
        </View>
        {callLog.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>No API calls recorded yet</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {callLog.map((entry, i) => (
              <CallLogItem key={`${entry.timestamp}-${i}`} entry={entry} />
            ))}
          </View>
        )}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 20,
    marginLeft: 4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  rowLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    flex: 1,
  },
  rowValue: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    flex: 1.2,
    textAlign: "right",
  },
  logHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginRight: 4,
  },
  logCount: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textTertiary,
    marginTop: 20,
  },
  logItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: 3,
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logMethod: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.accent,
  },
  logStatus: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.accent,
  },
  logUrl: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  logTime: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    padding: 16,
    textAlign: "center",
  },
});
