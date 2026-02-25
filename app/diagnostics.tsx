import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { useColors, ThemeColors } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";
import { getAccessToken, getRefreshToken, API_BASE_URL } from "@/lib/api-client";
import { getApiCallLog, ApiCallEntry } from "@/lib/api-log";
import { getWeekStartUTC, getWeekEndUTC } from "@/lib/week-utils";
import axios from "axios";

interface MetaInfo {
  environmentName: string;
  dbNameOrIdentifierHash: string;
  serverTimeISO: string;
  serverTimezone: string;
  gitCommitHash: string;
}

function Row({ label, value }: { label: string; value: string }) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} selectable>{value}</Text>
    </View>
  );
}

function CallLogItem({ entry }: { entry: ApiCallEntry }) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
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
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const [hasAccessToken, setHasAccessToken] = useState<string>("checking...");
  const [hasRefreshToken, setHasRefreshToken] = useState<string>("checking...");
  const [callLog, setCallLog] = useState<ApiCallEntry[]>([]);
  const [meta, setMeta] = useState<MetaInfo | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);

  const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const weekStart = getWeekStartUTC();
  const weekEnd = getWeekEndUTC(weekStart);

  const weeklySummaryURL = `${API_BASE_URL}/api/weekly-summary`;
  const weekDataURL = `${API_BASE_URL}/api/week-data?weekStart=${weekStart}`;

  const fetchMeta = useCallback(async () => {
    setMetaLoading(true);
    setMetaError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/meta`);
      setMeta(response.data);
    } catch (err: any) {
      setMetaError(err.message || "Failed to fetch /api/meta");
    } finally {
      setMetaLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    const at = await getAccessToken();
    setHasAccessToken(at ? "yes" : "no");
    const rt = await getRefreshToken();
    setHasRefreshToken(rt ? "yes" : "no");
    setCallLog(getApiCallLog());
    fetchMeta();
  }, [fetchMeta]);

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
          <Icon name="back" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Diagnostics</Text>
        <Pressable
          onPress={refresh}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <Icon name="refresh" size={24} color={Colors.primary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 + (Platform.OS === "web" ? 34 : 0) }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Configuration</Text>
        <View style={styles.card}>
          <Row label="API Base URL" value={API_BASE_URL} />
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

        <Text style={styles.sectionTitle}>Timezone & Week Bounds</Text>
        <View style={styles.card}>
          <Row label="Device Timezone" value={deviceTimezone} />
          <Row label="Week Rule" value="ISO 8601: Monday-based, UTC" />
          <Row label="weekStart" value={weekStart} />
          <Row label="weekEnd" value={weekEnd} />
        </View>

        <Text style={styles.sectionTitle}>Computed Request URLs</Text>
        <View style={styles.card}>
          <Row label="weekly-summary" value={weeklySummaryURL} />
          <Row label="week-data" value={weekDataURL} />
        </View>

        <Text style={styles.sectionTitle}>Server Meta (/api/meta)</Text>
        <View style={styles.card}>
          {metaLoading ? (
            <View style={styles.metaLoading}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.metaLoadingText}>Fetching...</Text>
            </View>
          ) : metaError ? (
            <View style={styles.metaLoading}>
              <Icon name="warning" size={16} color={Colors.error} />
              <Text style={[styles.metaLoadingText, { color: Colors.error }]}>{metaError}</Text>
            </View>
          ) : meta ? (
            <>
              <Row label="Environment" value={meta.environmentName} />
              <Row label="DB Hash" value={meta.dbNameOrIdentifierHash} />
              <Row label="Server Time" value={meta.serverTimeISO} />
              <Row label="Server Timezone" value={meta.serverTimezone} />
              <Row label="Git Commit" value={meta.gitCommitHash} />
            </>
          ) : null}
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
          <Row label="Meta" value="GET /api/meta" />
          <Row label="Week Bounds" value="GET /api/week-bounds" />
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
  metaLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 16,
  },
  metaLoadingText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
});
