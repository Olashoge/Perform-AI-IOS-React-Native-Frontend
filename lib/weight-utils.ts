const KG_TO_LBS = 2.20462;

export function kgToLbs(kg: number): number {
  const lbs = kg * KG_TO_LBS;
  return Number.isInteger(lbs) ? lbs : Math.round(lbs * 10) / 10;
}

export function lbsToKg(lbs: number): number {
  const kg = lbs / KG_TO_LBS;
  return Math.round(kg * 100) / 100;
}

export function parseWeightInput(str: string): number | null {
  const trimmed = str.trim();
  if (trimmed === "") return null;
  const num = parseFloat(trimmed);
  if (isNaN(num) || num < 0) return null;
  return Math.round(num * 10) / 10;
}

export function formatWeightDisplay(value: number | null | undefined, unitSystem: "imperial" | "metric"): string {
  if (value == null) return "";
  const display = unitSystem === "imperial" ? kgToLbs(value) : value;
  if (unitSystem === "imperial") {
    return String(Math.round(display));
  }
  return Number.isInteger(display) ? String(display) : display.toFixed(1);
}
