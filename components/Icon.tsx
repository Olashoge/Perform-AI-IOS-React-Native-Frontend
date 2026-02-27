import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/lib/theme-context";

const ICON_MAP = {
  dashboard: "stats-chart-outline",
  calendar: "calendar-outline",
  create: "add-circle-outline",
  performance: "analytics-outline",
  more: "ellipsis-horizontal-circle-outline",

  back: "chevron-back-outline",
  forward: "chevron-forward-outline",
  arrowForward: "arrow-forward-outline",
  arrowBack: "arrow-back-outline",
  close: "close-outline",
  add: "add-outline",
  remove: "remove-outline",

  checkmark: "checkmark-outline",
  checkmarkCircle: "checkmark-circle-outline",
  alertCircle: "alert-circle-outline",
  warning: "warning-outline",

  sparkles: "sparkles-outline",
  refresh: "refresh-outline",
  trash: "trash-outline",
  time: "time-outline",
  link: "link-outline",
  openExternal: "open-outline",
  layers: "layers-outline",
  document: "document-text-outline",

  restaurant: "restaurant-outline",
  barbell: "barbell-outline",
  fitness: "fitness-outline",
  flame: "flame-outline",
  flash: "flash-outline",
  heart: "heart-outline",
  body: "body-outline",
  snow: "snow-outline",
  pause: "pause-outline",
  sleep: "moon-outline",

  person: "person-outline",
  personCircle: "person-circle-outline",
  mail: "mail-outline",
  lock: "lock-closed-outline",
  logOut: "log-out-outline",
  wallet: "wallet-outline",
  cart: "cart-outline",
  flag: "flag-outline",
  bulb: "bulb-outline",
  speedometer: "speedometer-outline",
  trendingUp: "trending-up-outline",

  swap: "swap-horizontal-outline",
  swapVertical: "swap-vertical-outline",

  nutrition: "nutrition-outline",
  hourglass: "hourglass-outline",
  chevronDown: "chevron-down-outline",
  chevronUp: "chevron-up-outline",
  bug: "bug-outline",
  medkit: "medkit-outline",
  location: "location-outline",
} as const;

export type IconName = keyof typeof ICON_MAP;
export type IconSize = 16 | 20 | 24 | 28;

interface IconProps {
  name: IconName;
  size?: IconSize;
  color?: string;
}

export function Icon({ name, size = 24, color }: IconProps) {
  const Colors = useColors();
  const ionName = ICON_MAP[name] as keyof typeof Ionicons.glyphMap;
  return <Ionicons name={ionName} size={size} color={color ?? Colors.text} />;
}
