import React, { useState, useMemo, useCallback } from "react";
import { View, Text, Pressable, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemeColors } from "@/lib/theme-context";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function getMonthGrid(year: number, month: number): (number | null)[] {
  const firstDay = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function CalendarPickerField({
  value,
  onChange,
  Colors,
  mondaysOnly,
  conflictDates,
}: {
  value: string;
  onChange: (date: string) => void;
  Colors: ThemeColors;
  mondaysOnly?: boolean;
  conflictDates?: string[];
}) {
  const [showModal, setShowModal] = useState(false);
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const [viewYear, setViewYear] = useState(today.getUTCFullYear());
  const [viewMonth, setViewMonth] = useState(today.getUTCMonth());

  const cells = useMemo(() => getMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const conflictSet = useMemo(() => new Set(conflictDates || []), [conflictDates]);

  const goToPrev = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) { setViewYear((y) => y - 1); return 11; }
      return m - 1;
    });
  }, []);

  const goToNext = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) { setViewYear((y) => y + 1); return 0; }
      return m + 1;
    });
  }, []);

  const displayLabel = value
    ? new Date(value + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    : mondaysOnly ? "Select a Monday (optional)" : "Select a date (optional)";

  return (
    <>
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          if (value) {
            const d = new Date(value + "T12:00:00Z");
            setViewYear(d.getUTCFullYear());
            setViewMonth(d.getUTCMonth());
          }
          setShowModal(true);
        }}
        style={{
          backgroundColor: Colors.surface,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderWidth: 1,
          borderColor: Colors.border,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: value ? Colors.text : Colors.textTertiary }}>
          {displayLabel}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={Colors.textSecondary} />
      </Pressable>

      <Modal visible={showModal} transparent animationType="fade">
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" }}
          onPress={() => setShowModal(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: Colors.surface,
              borderRadius: 20,
              padding: 20,
              width: 320,
              maxWidth: "90%",
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Pressable onPress={goToPrev} hitSlop={12} style={{ padding: 4 }}>
                <Ionicons name="chevron-back" size={22} color={Colors.text} />
              </Pressable>
              <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.text }}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </Text>
              <Pressable onPress={goToNext} hitSlop={12} style={{ padding: 4 }}>
                <Ionicons name="chevron-forward" size={22} color={Colors.text} />
              </Pressable>
            </View>

            <View style={{ flexDirection: "row", marginBottom: 8 }}>
              {DAY_LABELS.map((d) => (
                <View key={d} style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.textTertiary }}>{d}</Text>
                </View>
              ))}
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {cells.map((day, idx) => {
                if (day === null) {
                  return <View key={`e-${idx}`} style={{ width: "14.28%", height: 38 }} />;
                }
                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === value;
                const isPast = dateStr < todayStr;
                const dayOfWeek = new Date(Date.UTC(viewYear, viewMonth, day)).getUTCDay();
                const isMonday = dayOfWeek === 1;
                const disabled = isPast || (mondaysOnly && !isMonday);
                const isConflict = conflictSet.has(dateStr);

                return (
                  <View key={dateStr} style={{ width: "14.28%", height: 38, justifyContent: "center", alignItems: "center" }}>
                    <Pressable
                      disabled={disabled}
                      onPress={() => {
                        Haptics.selectionAsync();
                        onChange(dateStr);
                        setShowModal(false);
                      }}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        justifyContent: "center",
                        alignItems: "center",
                        backgroundColor: isSelected ? Colors.primary : isToday ? Colors.border : "transparent",
                        ...(isConflict && !isSelected ? { borderWidth: 1.5, borderColor: Colors.error } : {}),
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontFamily: isSelected ? "Inter_600SemiBold" : "Inter_400Regular",
                          color: disabled ? Colors.textTertiary : isSelected ? "#fff" : Colors.text,
                        }}
                      >
                        {day}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>

            {mondaysOnly && (
              <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textTertiary, textAlign: "center", marginTop: 8 }}>
                Only Mondays can be selected as start dates
              </Text>
            )}

            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 16, gap: 12 }}>
              {value ? (
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    onChange("");
                    setShowModal(false);
                  }}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.background, alignItems: "center" }}
                >
                  <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary }}>Clear</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => setShowModal(false)}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.primary, alignItems: "center" }}
              >
                <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" }}>Done</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
