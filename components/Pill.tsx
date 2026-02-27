import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { useColors, type ThemeColors } from "@/lib/theme-context";

interface PillProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  variant?: "default" | "rounded" | "compact";
  conflict?: boolean;
}

export function Pill({ label, selected, onPress, variant = "default", conflict = false }: PillProps) {
  const Colors = useColors();
  const s = makeStyles(Colors);

  const baseStyle = variant === "rounded" ? s.pillRounded
    : variant === "compact" ? s.pillCompact
    : s.pill;

  const textBase = variant === "compact" ? s.pillTextCompact : s.pillText;

  return (
    <Pressable
      onPress={onPress}
      style={[
        baseStyle,
        selected && s.pillActive,
        conflict && s.pillConflict,
      ]}
    >
      <Text
        style={[
          textBase,
          selected && s.pillTextActive,
          conflict && s.pillTextConflict,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function PillGrid({ children }: { children: React.ReactNode }) {
  return <View style={gridStyle.pillGrid}>{children}</View>;
}

const gridStyle = StyleSheet.create({
  pillGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});

function makeStyles(Colors: ThemeColors) {
  return StyleSheet.create({
    pill: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: Colors.surface,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    pillRounded: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: Colors.border,
      backgroundColor: Colors.surface,
    },
    pillCompact: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: Colors.surface,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    pillActive: {
      backgroundColor: Colors.primary,
      borderColor: Colors.primary,
    },
    pillConflict: {
      backgroundColor: Colors.errorSoft,
      borderColor: Colors.error + "40",
    },
    pillText: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: Colors.textSecondary,
    },
    pillTextCompact: {
      fontSize: 10,
      fontFamily: "Inter_500Medium",
      color: Colors.textSecondary,
    },
    pillTextActive: {
      color: "#FFFFFF",
      fontFamily: "Inter_600SemiBold",
    },
    pillTextConflict: {
      color: Colors.error,
      textDecorationLine: "line-through",
    },
  });
}
