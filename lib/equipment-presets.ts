export const EQUIPMENT_CATEGORIES: { name: string; items: string[] }[] = [
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

export const LOCATION_EQUIPMENT_PRESETS: Record<string, string[]> = {
  gym: ["Treadmill", "Stationary bike", "Rowing machine", "Elliptical", "Dumbbells", "Barbells", "EZ bar", "Kettlebells", "Weight plates", "Bench (flat)", "Bench (adjustable)", "Squat rack", "Power rack", "Smith machine", "Pull-up bar", "Dip station", "Resistance bands", "Cable attachments", "Cable machine / functional trainer", "Leg press", "Leg extension", "Leg curl", "Lat pulldown", "Seated row", "Chest press machine", "Pec deck", "Shoulder press machine", "Calf raise machine", "Yoga mat", "Foam roller"],
  home: ["Dumbbells", "Resistance bands", "Yoga mat", "Foam roller", "Jump rope", "Kettlebells", "Pull-up bar"],
  outdoors: ["Track access", "Hills/stairs", "Field", "Jump rope"],
};

export function getEquipmentForLocation(location: string): string[] {
  return LOCATION_EQUIPMENT_PRESETS[location] ?? [];
}

export function mergeEquipmentDefaults(current: string[], location: string): string[] {
  const defaults = getEquipmentForLocation(location);
  const merged = new Set(current);
  for (const item of defaults) {
    merged.add(item);
  }
  return Array.from(merged);
}
