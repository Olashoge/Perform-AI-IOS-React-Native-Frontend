import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useProfile, useUpdateProfile, ProfileData } from "@/lib/api-hooks";

const EQUIPMENT_CATEGORIES: { name: string; items: string[] }[] = [
  {
    name: "Cardio",
    items: ["Treadmill", "Stationary bike", "Spin bike", "Rowing machine", "Elliptical", "Stair climber", "Ski erg", "Assault/air bike", "Jump rope"],
  },
  {
    name: "Free weights",
    items: ["Dumbbells", "Adjustable dumbbells", "Barbells", "EZ bar", "Kettlebells", "Weight plates", "Bench (flat)", "Bench (adjustable)"],
  },
  {
    name: "Racks & accessories",
    items: ["Squat rack", "Power rack", "Smith machine", "Pull-up bar", "Dip station", "Resistance bands", "Cable attachments"],
  },
  {
    name: "Machines",
    items: ["Cable machine / functional trainer", "Leg press", "Hack squat", "Leg extension", "Leg curl", "Lat pulldown", "Seated row", "Chest press machine", "Pec deck", "Shoulder press machine", "Calf raise machine", "Hip thrust machine", "Glute bridge machine", "Ab machine"],
  },
  {
    name: "Home / bodyweight / mobility",
    items: ["Yoga mat", "Foam roller", "Medicine ball", "Slam ball", "Stability ball", "TRX / suspension trainer", "Plyo box", "Step platform"],
  },
  {
    name: "Outdoors",
    items: ["Track access", "Hills/stairs", "Field", "Pool access"],
  },
];

const LOCATION_EQUIPMENT_PRESETS: Record<string, string[]> = {
  gym: ["Treadmill", "Stationary bike", "Rowing machine", "Elliptical", "Dumbbells", "Barbells", "EZ bar", "Kettlebells", "Weight plates", "Bench (flat)", "Bench (adjustable)", "Squat rack", "Power rack", "Smith machine", "Pull-up bar", "Dip station", "Resistance bands", "Cable attachments", "Cable machine / functional trainer", "Leg press", "Leg extension", "Leg curl", "Lat pulldown", "Seated row", "Chest press machine", "Pec deck", "Shoulder press machine", "Calf raise machine", "Yoga mat", "Foam roller"],
  home: ["Dumbbells", "Resistance bands", "Yoga mat", "Foam roller", "Jump rope", "Kettlebells", "Pull-up bar"],
  outdoors: ["Track access", "Hills/stairs", "Field", "Jump rope"],
};

function formatLabel(value: string): string {
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function SectionHeader({ icon, title }: { icon: keyof typeof Ionicons.glyphMap; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={18} color={Colors.primary} />
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );
}

function FormField({ label, children, helperText }: { label: string; children: React.ReactNode; helperText?: string }) {
  return (
    <View style={styles.formField}>
      <Text style={styles.formLabel}>{label}</Text>
      {children}
      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
    </View>
  );
}

function PillSelector({
  options,
  labels,
  selected,
  onSelect,
  multi = false,
}: {
  options: string[];
  labels?: string[];
  selected: string | string[];
  onSelect: (val: string | string[]) => void;
  multi?: boolean;
}) {
  const handlePress = (opt: string) => {
    Haptics.selectionAsync();
    if (multi) {
      const arr = Array.isArray(selected) ? selected : [];
      if (arr.includes(opt)) {
        onSelect(arr.filter((v) => v !== opt));
      } else {
        onSelect([...arr, opt]);
      }
    } else {
      onSelect(opt);
    }
  };

  const isSelected = (opt: string) => {
    if (multi) {
      return Array.isArray(selected) && selected.includes(opt);
    }
    return selected === opt;
  };

  return (
    <View style={styles.pillWrap}>
      {options.map((opt, i) => (
        <Pressable
          key={opt}
          style={[styles.pill, isSelected(opt) && styles.pillActive]}
          onPress={() => handlePress(opt)}
        >
          <Text style={[styles.pillText, isSelected(opt) && styles.pillTextActive]}>
            {labels ? labels[i] : formatLabel(opt)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function TagInput({ tags, onChangeTags, placeholder }: { tags: string[]; onChangeTags: (tags: string[]) => void; placeholder?: string }) {
  const [inputValue, setInputValue] = useState("");

  const addTag = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChangeTags([...tags, trimmed]);
    }
    setInputValue("");
  };

  const removeTag = (tag: string) => {
    onChangeTags(tags.filter((t) => t !== tag));
  };

  return (
    <View>
      {tags.length > 0 && (
        <View style={styles.tagWrap}>
          {tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
              <Pressable onPress={() => removeTag(tag)} hitSlop={6}>
                <Ionicons name="close" size={14} color={Colors.text} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
      <TextInput
        style={styles.textInput}
        value={inputValue}
        onChangeText={setInputValue}
        onSubmitEditing={addTag}
        returnKeyType="done"
        placeholderTextColor={Colors.textTertiary}
        placeholder={placeholder || "Type and press Enter to add"}
      />
    </View>
  );
}

function EquipmentAccordion({ selected, onToggle }: { selected: string[]; onToggle: (item: string) => void }) {
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = (name: string) => {
    setOpenCategories((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <View>
      {EQUIPMENT_CATEGORIES.map((cat) => {
        const isOpen = !!openCategories[cat.name];
        const count = cat.items.filter((item) => selected.includes(item)).length;
        return (
          <View key={cat.name} style={styles.accordionSection}>
            <Pressable style={styles.accordionHeader} onPress={() => toggleCategory(cat.name)}>
              <View style={styles.accordionHeaderLeft}>
                <Ionicons
                  name={isOpen ? "chevron-down" : "chevron-forward"}
                  size={16}
                  color={Colors.textSecondary}
                />
                <Text style={styles.accordionHeaderText}>{cat.name}</Text>
              </View>
              {count > 0 && (
                <View style={styles.accordionBadge}>
                  <Text style={styles.accordionBadgeText}>{count}</Text>
                </View>
              )}
            </Pressable>
            {isOpen && (
              <View style={styles.pillWrap}>
                {cat.items.map((item) => {
                  const active = selected.includes(item);
                  return (
                    <Pressable
                      key={item}
                      style={[styles.pill, active && styles.pillActive]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        onToggle(item);
                      }}
                    >
                      <Text style={[styles.pillText, active && styles.pillTextActive]}>{item}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

export default function ExercisePreferencesScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const profile = useProfile();
  const updateProfile = useUpdateProfile();

  const [trainingExperience, setTrainingExperience] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [trainingDaysOfWeek, setTrainingDaysOfWeek] = useState<string[]>([]);
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState<number | null>(null);
  const [healthConstraints, setHealthConstraints] = useState<string[]>([]);
  const [workoutLocationDefault, setWorkoutLocationDefault] = useState("");
  const [equipmentAvailable, setEquipmentAvailable] = useState<string[]>([]);
  const [equipmentOtherNotes, setEquipmentOtherNotes] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (profile.data && !loaded) {
      setTrainingExperience(profile.data.trainingExperience || "");
      setActivityLevel(profile.data.activityLevel || "");
      setTrainingDaysOfWeek(profile.data.trainingDaysOfWeek || []);
      setSessionDurationMinutes(profile.data.sessionDurationMinutes ?? null);
      setHealthConstraints(profile.data.healthConstraints || []);
      setWorkoutLocationDefault(profile.data.workoutLocationDefault || "");
      setEquipmentAvailable(profile.data.equipmentAvailable || []);
      setEquipmentOtherNotes(profile.data.equipmentOtherNotes || "");
      setLoaded(true);
    }
  }, [profile.data, loaded]);

  const handleLocationChange = (location: string) => {
    setWorkoutLocationDefault(location);
    const preset = LOCATION_EQUIPMENT_PRESETS[location];
    if (preset) {
      setEquipmentAvailable(preset);
    }
  };

  const handleEquipmentToggle = (item: string) => {
    if (equipmentAvailable.includes(item)) {
      setEquipmentAvailable(equipmentAvailable.filter((v) => v !== item));
    } else {
      setEquipmentAvailable([...equipmentAvailable, item]);
    }
  };

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile.mutateAsync({
        trainingExperience,
        activityLevel,
        trainingDaysOfWeek,
        sessionDurationMinutes,
        healthConstraints,
        workoutLocationDefault,
        equipmentAvailable,
        equipmentOtherNotes,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  if (profile.isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 16 + webTopInset,
            paddingBottom: insets.bottom + 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Exercise Preferences</Text>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            hitSlop={12}
            style={styles.saveBtn}
          >
            {saving ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Ionicons name="checkmark" size={28} color={Colors.primary} />
            )}
          </Pressable>
        </View>

        <SectionHeader icon="barbell-outline" title="TRAINING CAPACITY" />
        <View style={styles.sectionCard}>
          <FormField label="Training Experience">
            <PillSelector
              options={["beginner", "intermediate", "advanced"]}
              labels={["Beginner", "Intermediate", "Advanced"]}
              selected={trainingExperience}
              onSelect={(v) => setTrainingExperience(v as string)}
            />
          </FormField>

          <FormField label="Activity Level">
            <PillSelector
              options={["sedentary", "moderate", "active"]}
              labels={["Sedentary", "Moderately Active", "Very Active"]}
              selected={activityLevel}
              onSelect={(v) => setActivityLevel(v as string)}
            />
          </FormField>

          <FormField label="Training Days">
            <PillSelector
              options={["mon", "tue", "wed", "thu", "fri", "sat", "sun"]}
              labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
              selected={trainingDaysOfWeek}
              onSelect={(v) => setTrainingDaysOfWeek(v as string[])}
              multi
            />
          </FormField>

          <FormField label="Session Duration (minutes)">
            <TextInput
              style={styles.textInput}
              value={sessionDurationMinutes != null ? String(sessionDurationMinutes) : ""}
              onChangeText={(t) => setSessionDurationMinutes(t === "" ? null : parseInt(t) || null)}
              keyboardType="numeric"
              placeholderTextColor={Colors.textTertiary}
              placeholder="e.g. 60"
            />
          </FormField>
        </View>

        <SectionHeader icon="medkit-outline" title="HEALTH CONSTRAINTS" />
        <View style={styles.sectionCard}>
          <FormField
            label="Injuries, Limitations & Conditions"
            helperText="Add any injuries, mobility limitations, or chronic conditions that affect your training."
          >
            <TagInput
              tags={healthConstraints}
              onChangeTags={setHealthConstraints}
              placeholder="e.g. torn ACL, limited shoulder ROM, asthma"
            />
          </FormField>
        </View>

        <SectionHeader icon="location-outline" title="WORKOUT LOCATION & EQUIPMENT" />
        <View style={styles.sectionCard}>
          <FormField label="Workout Location">
            <PillSelector
              options={["gym", "home", "outdoors"]}
              labels={["Gym", "Home", "Outdoors"]}
              selected={workoutLocationDefault}
              onSelect={(v) => handleLocationChange(v as string)}
            />
          </FormField>

          <FormField label="Equipment Available">
            <EquipmentAccordion
              selected={equipmentAvailable}
              onToggle={handleEquipmentToggle}
            />
          </FormField>

          <FormField label="Equipment Notes">
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={equipmentOtherNotes}
              onChangeText={setEquipmentOtherNotes}
              multiline
              placeholderTextColor={Colors.textTertiary}
              placeholder="Any other equipment or notes not listed above..."
            />
          </FormField>
        </View>

        <Pressable
          style={[styles.saveButton, updateProfile.isPending && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={updateProfile.isPending}
        >
          {updateProfile.isPending ? (
            <ActivityIndicator size="small" color={Colors.text} />
          ) : (
            <Text style={styles.saveButtonText}>Save Preferences</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backButton: {
    padding: 4,
  },
  saveBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    marginTop: 8,
    marginLeft: 4,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  formField: {
    marginBottom: 18,
  },
  formLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    marginTop: 6,
  },
  textInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  pillWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pillText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  pillTextActive: {
    color: Colors.text,
    fontFamily: "Inter_600SemiBold",
  },
  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  accordionSection: {
    marginBottom: 8,
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  accordionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  accordionHeaderText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  accordionBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  accordionBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
});
