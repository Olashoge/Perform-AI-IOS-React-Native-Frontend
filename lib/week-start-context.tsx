import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type WeekStartDay = "sunday" | "monday";

interface WeekStartContextValue {
  weekStartDay: WeekStartDay;
  setWeekStartDay: (day: WeekStartDay) => void;
}

const STORAGE_KEY = 'perform_week_start';

const WeekStartContext = createContext<WeekStartContextValue | null>(null);

export function WeekStartProvider({ children }: { children: ReactNode }) {
  const [weekStartDay, setWeekStartDayState] = useState<WeekStartDay>("monday");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value === "sunday" || value === "monday") {
        setWeekStartDayState(value);
      }
    });
  }, []);

  const setWeekStartDay = (day: WeekStartDay) => {
    setWeekStartDayState(day);
    AsyncStorage.setItem(STORAGE_KEY, day);
  };

  const value = useMemo(() => ({
    weekStartDay,
    setWeekStartDay,
  }), [weekStartDay]);

  return (
    <WeekStartContext.Provider value={value}>
      {children}
    </WeekStartContext.Provider>
  );
}

export function useWeekStart() {
  const context = useContext(WeekStartContext);
  if (!context) {
    throw new Error('useWeekStart must be used within a WeekStartProvider');
  }
  return context;
}
