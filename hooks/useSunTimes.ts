import { useState, useEffect, useMemo } from "react";
import SunCalc from "suncalc";
import { useLocation } from "./useLocation";
import { useSettingsStore } from "@/stores/settingsStore";

type SunEvent = "sunrise" | "sunset";

type UseSunTimesReturn = {
  sunrise: Date | null;
  sunset: Date | null;
  nextEvent: SunEvent | null;
  nextEventTime: Date | null;
  timeUntilNextEvent: string | null;
  isLoading: boolean;
};

function formatTimeUntil(targetDate: Date): string {
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();

  if (diffMs <= 0) return "now";

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} min${minutes !== 1 ? "s" : ""}`;
  }

  if (minutes === 0) {
    return `${hours} hr${hours !== 1 ? "s" : ""}`;
  }

  return `${hours} hr${hours !== 1 ? "s" : ""} ${minutes} min${minutes !== 1 ? "s" : ""}`;
}

export function useSunTimes(): UseSunTimesReturn {
  const disableSunTimes = useSettingsStore((state) => state.disableSunTimes);
  const enabled = !disableSunTimes;
  const { location, isLoading: isLocationLoading } = useLocation(enabled);
  const [now, setNow] = useState(() => new Date());

  // Update current time every minute
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, [enabled]);

  const sunData = useMemo(() => {
    if (!enabled || !location) {
      return {
        sunrise: null,
        sunset: null,
        nextEvent: null,
        nextEventTime: null,
        timeUntilNextEvent: null,
      };
    }

    const today = new Date();
    const todayTimes = SunCalc.getTimes(today, location.lat, location.lng);

    // Check if sun times are valid (polar regions may have invalid dates)
    const isValidDate = (date: Date) => !isNaN(date.getTime());

    if (!isValidDate(todayTimes.sunrise) || !isValidDate(todayTimes.sunset)) {
      return {
        sunrise: null,
        sunset: null,
        nextEvent: null,
        nextEventTime: null,
        timeUntilNextEvent: null,
      };
    }

    let nextEvent: SunEvent;
    let nextEventTime: Date;
    let sunrise = todayTimes.sunrise;
    let sunset = todayTimes.sunset;

    if (now < todayTimes.sunrise) {
      // Before sunrise - next event is sunrise
      nextEvent = "sunrise";
      nextEventTime = todayTimes.sunrise;
    } else if (now < todayTimes.sunset) {
      // After sunrise, before sunset - next event is sunset
      nextEvent = "sunset";
      nextEventTime = todayTimes.sunset;
    } else {
      // After sunset - next event is tomorrow's sunrise
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowTimes = SunCalc.getTimes(tomorrow, location.lat, location.lng);

      nextEvent = "sunrise";
      nextEventTime = tomorrowTimes.sunrise;
      // Update sunrise to tomorrow's for display
      sunrise = tomorrowTimes.sunrise;
      sunset = todayTimes.sunset; // Keep today's sunset for reference
    }

    return {
      sunrise,
      sunset,
      nextEvent,
      nextEventTime,
      timeUntilNextEvent: formatTimeUntil(nextEventTime),
    };
  }, [enabled, location, now]);

  return {
    ...sunData,
    isLoading: isLocationLoading,
  };
}
