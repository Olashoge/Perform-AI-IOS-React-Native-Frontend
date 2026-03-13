import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const WELLNESS_DRAFT_KEY = "perform_wellness_wizard_draft";

export interface MealForm {
  goal: string;
  dietStyles: string[];
  foodsToAvoid: string[];
  allergies: string;
  mealsPerDay: number;
  mealSlots: string[] | undefined;
  prepStyle: string;
  budgetMode: string;
  cookingTime: string;
  spiceLevel: string;
  authenticityMode: string;
  householdSize: number;
  workoutDays: string[];
  workoutDaysPerWeek: number;
}

export interface WorkoutForm {
  goal: string;
  location: string;
  trainingMode: string;
  focusAreas: string[];
  daysOfWeek: string[];
  sessionLength: number;
  experienceLevel: string;
  limitations: string;
  equipmentAvailable: string[];
}

export interface WellnessWizardState {
  goalType: string;
  secondaryFocus: string;
  planType: string;
  startDate: string;
  pace: string;
  mealForm: MealForm;
  workoutForm: WorkoutForm;
}

const defaultMealForm: MealForm = {
  goal: "",
  dietStyles: ["No Preference"],
  foodsToAvoid: [],
  allergies: "",
  mealsPerDay: 3,
  mealSlots: undefined,
  prepStyle: "cook_daily",
  budgetMode: "normal",
  cookingTime: "normal",
  spiceLevel: "medium",
  authenticityMode: "mixed",
  householdSize: 1,
  workoutDays: [],
  workoutDaysPerWeek: 0,
};

const defaultWorkoutForm: WorkoutForm = {
  goal: "",
  location: "",
  trainingMode: "both",
  focusAreas: ["Full Body"],
  daysOfWeek: ["Mon", "Wed", "Fri"],
  sessionLength: 45,
  experienceLevel: "intermediate",
  limitations: "",
  equipmentAvailable: [],
};

const defaultState: WellnessWizardState = {
  goalType: "weight_loss",
  secondaryFocus: "",
  planType: "both",
  startDate: "",
  pace: "",
  mealForm: { ...defaultMealForm },
  workoutForm: { ...defaultWorkoutForm },
};

interface WellnessContextType {
  state: WellnessWizardState;
  setState: React.Dispatch<React.SetStateAction<WellnessWizardState>>;
  updateMealForm: (updates: Partial<MealForm>) => void;
  updateWorkoutForm: (updates: Partial<WorkoutForm>) => void;
  resetWizard: () => void;
  clearDraft: () => void;
  prefilled: boolean;
  setPrefilled: (v: boolean) => void;
}

const WellnessContext = createContext<WellnessContextType | null>(null);

export function WellnessProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WellnessWizardState>({ ...defaultState });
  const [prefilled, setPrefilled] = useState(false);
  // Tracks whether the initial AsyncStorage hydration has completed so we
  // don't accidentally overwrite a saved draft with the blank default state.
  const hydrated = useRef(false);

  // Hydrate wizard state from AsyncStorage on mount (single hydration point).
  useEffect(() => {
    AsyncStorage.getItem(WELLNESS_DRAFT_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw) as WellnessWizardState;
          // Basic structural guard: require the top-level shape to be an object
          // with at least mealForm and workoutForm present.
          if (
            parsed &&
            typeof parsed === "object" &&
            typeof parsed.mealForm === "object" &&
            typeof parsed.workoutForm === "object"
          ) {
            setState(parsed);
          }
        }
      })
      .catch(() => {
        // Malformed or unreadable draft — fail safely with default state.
      })
      .finally(() => {
        hydrated.current = true;
      });
  }, []);

  // Persist wizard state to AsyncStorage whenever it changes, but only after
  // the initial hydration is complete to avoid stomping a saved draft.
  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(WELLNESS_DRAFT_KEY, JSON.stringify(state)).catch(() => {
      // Persistence failure is non-fatal — wizard continues in memory.
    });
  }, [state]);

  const updateMealForm = (updates: Partial<MealForm>) => {
    setState((prev) => ({ ...prev, mealForm: { ...prev.mealForm, ...updates } }));
  };

  const updateWorkoutForm = (updates: Partial<WorkoutForm>) => {
    setState((prev) => ({ ...prev, workoutForm: { ...prev.workoutForm, ...updates } }));
  };

  const clearDraft = () => {
    AsyncStorage.removeItem(WELLNESS_DRAFT_KEY).catch(() => {});
  };

  const resetWizard = () => {
    setState({ ...defaultState, mealForm: { ...defaultMealForm }, workoutForm: { ...defaultWorkoutForm } });
    setPrefilled(false);
    clearDraft();
  };

  return (
    <WellnessContext.Provider value={{ state, setState, updateMealForm, updateWorkoutForm, resetWizard, clearDraft, prefilled, setPrefilled }}>
      {children}
    </WellnessContext.Provider>
  );
}

export function useWellness() {
  const ctx = useContext(WellnessContext);
  if (!ctx) throw new Error("useWellness must be used within WellnessProvider");
  return ctx;
}

export function mapGoalForMeal(goal: string): string {
  if (["general_fitness", "mobility"].includes(goal)) return "maintenance";
  if (goal === "energy") return "energy";
  if (goal === "endurance") return "performance";
  if (goal === "strength") return "muscle_gain";
  return goal;
}

export function mapGoalForWorkout(goal: string): string {
  if (["general_fitness", "energy", "mobility"].includes(goal)) return "maintenance";
  if (goal === "endurance") return "performance";
  if (goal === "strength") return "muscle_gain";
  return goal;
}

export const LOCATION_PRESETS: Record<string, string[]> = {
  gym: [
    "Treadmill", "Stationary bike", "Rowing machine", "Elliptical",
    "Dumbbells", "Barbells", "EZ bar", "Kettlebells", "Weight plates",
    "Bench (flat)", "Bench (adjustable)", "Squat rack", "Power rack",
    "Smith machine", "Pull-up bar", "Dip station", "Resistance bands",
    "Cable attachments", "Cable machine / functional trainer",
    "Leg press", "Leg extension", "Leg curl", "Lat pulldown",
    "Seated row", "Chest press machine", "Pec deck",
    "Shoulder press machine", "Calf raise machine",
    "Yoga mat", "Foam roller",
  ],
  home: ["Dumbbells", "Resistance bands", "Yoga mat", "Foam roller", "Jump rope", "Kettlebells", "Pull-up bar"],
  outdoors: ["Track access", "Hills/stairs", "Field", "Jump rope"],
};
