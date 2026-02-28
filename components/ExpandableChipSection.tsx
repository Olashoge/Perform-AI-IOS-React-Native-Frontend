import React, { useState, useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors, ThemeColors } from "@/lib/theme-context";
import { Pill, PillGrid } from "@/components/Pill";

interface ExpandableChipSectionProps {
  items: string[];
  selectedItems: string[];
  onToggle: (item: string) => void;
  initialVisibleCount?: number;
  variant?: "default" | "rounded" | "compact";
}

export function ExpandableChipSection({
  items,
  selectedItems,
  onToggle,
  initialVisibleCount = 6,
  variant = "default",
}: ExpandableChipSectionProps) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const [expanded, setExpanded] = useState(false);

  const needsExpand = items.length > initialVisibleCount;
  const visibleItems = expanded ? items : items.slice(0, initialVisibleCount);
  const hiddenSelectedCount = !expanded
    ? selectedItems.filter((s) => !items.slice(0, initialVisibleCount).includes(s)).length
    : 0;

  return (
    <View>
      <PillGrid>
        {visibleItems.map((item) => (
          <Pill
            key={item}
            label={item}
            selected={selectedItems.includes(item)}
            onPress={() => onToggle(item)}
            variant={variant}
          />
        ))}
      </PillGrid>
      {needsExpand && (
        <Pressable
          style={styles.toggleBtn}
          onPress={() => setExpanded((v) => !v)}
          hitSlop={8}
        >
          <Text style={styles.toggleText}>
            {expanded
              ? "Show less"
              : `Show ${items.length - initialVisibleCount} more${hiddenSelectedCount > 0 ? ` (${hiddenSelectedCount} selected)` : ""}`}
          </Text>
          <Ionicons
            name={expanded ? "chevron-up-outline" : "chevron-down-outline"}
            size={14}
            color={Colors.primary}
          />
        </Pressable>
      )}
    </View>
  );
}

interface ExpandableEquipmentGroupProps {
  title: string;
  items: string[];
  selectedItems: string[];
  onToggle: (item: string) => void;
  initialVisibleCount?: number;
}

export function ExpandableEquipmentGroup({
  title,
  items,
  selectedItems,
  onToggle,
  initialVisibleCount = 4,
}: ExpandableEquipmentGroupProps) {
  const Colors = useColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const selectedInGroup = items.filter((i) => selectedItems.includes(i));
  const [open, setOpen] = useState(selectedInGroup.length > 0);
  const [showAll, setShowAll] = useState(false);

  const needsExpand = items.length > initialVisibleCount;
  const visibleItems = showAll ? items : items.slice(0, initialVisibleCount);

  return (
    <View style={styles.groupContainer}>
      <Pressable
        style={styles.groupHeader}
        onPress={() => setOpen((v) => !v)}
        hitSlop={4}
      >
        <Text style={styles.groupTitle}>{title}</Text>
        <View style={styles.groupHeaderRight}>
          {selectedInGroup.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{selectedInGroup.length}</Text>
            </View>
          )}
          <Ionicons
            name={open ? "chevron-up-outline" : "chevron-down-outline"}
            size={16}
            color={Colors.textTertiary}
          />
        </View>
      </Pressable>
      {open && (
        <>
          <PillGrid>
            {visibleItems.map((item) => (
              <Pill
                key={item}
                label={item}
                selected={selectedItems.includes(item)}
                onPress={() => onToggle(item)}
                variant="compact"
              />
            ))}
          </PillGrid>
          {needsExpand && (
            <Pressable
              style={styles.toggleBtn}
              onPress={() => setShowAll((v) => !v)}
              hitSlop={8}
            >
              <Text style={[styles.toggleText, { fontSize: 11 }]}>
                {showAll ? "Show less" : `+${items.length - initialVisibleCount} more`}
              </Text>
              <Ionicons
                name={showAll ? "chevron-up-outline" : "chevron-down-outline"}
                size={12}
                color={Colors.primary}
              />
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

const createStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    toggleBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      paddingVertical: 10,
    },
    toggleText: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: Colors.primary,
    },
    groupContainer: {
      marginBottom: 8,
    },
    groupHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 10,
      paddingHorizontal: 4,
    },
    groupTitle: {
      fontSize: 11,
      fontFamily: "Inter_500Medium",
      color: Colors.textSecondary,
    },
    groupHeaderRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    countBadge: {
      backgroundColor: Colors.primary + "20",
      borderRadius: 10,
      paddingHorizontal: 7,
      paddingVertical: 1,
    },
    countBadgeText: {
      fontSize: 10,
      fontFamily: "Inter_600SemiBold",
      color: Colors.primary,
    },
  });
