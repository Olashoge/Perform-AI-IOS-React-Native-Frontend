export const PRIMARY_GOAL_OPTIONS: { value: string; label: string }[] = [
  { value: "weight_loss", label: "Weight Loss" },
  { value: "muscle_gain", label: "Muscle Gain" },
  { value: "body_recomposition", label: "Body Recomposition" },
  { value: "general_fitness", label: "General Fitness" },
  { value: "athletic_performance", label: "Athletic Performance" },
];

export const SECONDARY_FOCUS_OPTIONS: { value: string; label: string }[] = [
  { value: "strength", label: "Strength" },
  { value: "endurance", label: "Endurance" },
  { value: "mobility", label: "Mobility" },
  { value: "energy_focus", label: "Energy & Focus" },
  { value: "recovery", label: "Recovery" },
];

export const VALID_PRIMARY_GOALS = PRIMARY_GOAL_OPTIONS.map((g) => g.value);

export const LEGACY_GOAL_MAP: Record<string, string> = {
  performance: "athletic_performance",
  maintenance: "general_fitness",
  energy: "general_fitness",
  mobility: "general_fitness",
  endurance: "general_fitness",
  strength: "muscle_gain",
};

export function normalizePrimaryGoal(value: string): string {
  if (!value) return "";
  return LEGACY_GOAL_MAP[value] || value;
}

export function formatGoalLabel(value: string): string {
  if (!value) return "";
  const pg = PRIMARY_GOAL_OPTIONS.find((o) => o.value === value);
  if (pg) return pg.label;
  const sf = SECONDARY_FOCUS_OPTIONS.find((o) => o.value === value);
  if (sf) return sf.label;
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const PREVIEW_MAP: Record<string, Record<string, string>> = {
  weight_loss: {
    "": "Your plan will focus on fat loss in a sustainable, balanced way.",
    strength: "Your plan will prioritize fat loss while preserving and developing strength.",
    endurance: "Your plan will focus on fat loss while building cardiovascular endurance.",
    mobility: "Your plan will focus on fat loss while improving mobility and movement quality.",
    energy_focus: "Your plan will focus on fat loss while keeping your energy and focus high.",
    recovery: "Your plan will focus on fat loss while supporting recovery and reducing fatigue.",
  },
  muscle_gain: {
    "": "Your plan will focus on building muscle and increasing strength.",
    strength: "Your plan will focus on building muscle with a strong emphasis on strength development.",
    endurance: "Your plan will focus on building muscle while developing endurance capacity.",
    mobility: "Your plan will focus on building muscle while improving mobility and joint health.",
    energy_focus: "Your plan will focus on building muscle while maintaining high energy and mental clarity.",
    recovery: "Your plan will focus on building muscle with careful attention to recovery and durability.",
  },
  body_recomposition: {
    "": "Your plan will focus on improving body composition in a balanced, sustainable way.",
    strength: "Your plan will focus on improving body composition while building functional strength.",
    endurance: "Your plan will focus on improving body composition while building endurance capacity.",
    mobility: "Your plan will focus on improving body composition while improving mobility and flexibility.",
    energy_focus: "Your plan will focus on improving body composition while supporting energy and focus.",
    recovery: "Your plan will focus on improving body composition while prioritizing recovery.",
  },
  general_fitness: {
    "": "Your plan will focus on improving overall fitness in a balanced, sustainable way.",
    strength: "Your plan will focus on overall fitness with an emphasis on building strength.",
    endurance: "Your plan will focus on overall fitness with a cardio and endurance emphasis.",
    mobility: "Your plan will focus on overall fitness with an emphasis on mobility and flexibility.",
    energy_focus: "Your plan will focus on overall fitness while supporting daily energy and focus.",
    recovery: "Your plan will focus on overall fitness with an emphasis on recovery and longevity.",
  },
  athletic_performance: {
    "": "Your plan will focus on improving athletic performance across all dimensions.",
    strength: "Your plan will focus on athletic performance with a strong emphasis on power and strength.",
    endurance: "Your plan will focus on athletic performance with a strong emphasis on endurance.",
    mobility: "Your plan will focus on improving athletic performance while supporting mobility and injury prevention.",
    energy_focus: "Your plan will focus on athletic performance while maximizing energy and mental acuity.",
    recovery: "Your plan will focus on improving athletic performance while supporting recovery and durability.",
  },
};

export function buildGoalPreviewSentence(primaryGoal: string, secondaryFocus?: string): string {
  const normalized = normalizePrimaryGoal(primaryGoal);
  const goalMap = PREVIEW_MAP[normalized];
  if (!goalMap) return "";
  return goalMap[secondaryFocus || ""] ?? goalMap[""] ?? "";
}
