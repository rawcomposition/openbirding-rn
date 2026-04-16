import Constants from "expo-constants";
import { BirdPlanTripData } from "./types";

const BIRDPLAN_DOMAIN = (Constants.expoConfig?.extra?.BIRDPLAN_DOMAIN as string | undefined) ?? "https://api.birdplan.app";

export class BirdPlanError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "BirdPlanError";
  }
}

export async function fetchBirdPlanTrip(codeOrToken: string): Promise<BirdPlanTripData> {
  const res = await fetch(`${BIRDPLAN_DOMAIN}/v1/trips/openbirding/${codeOrToken}`);

  if (!res.ok) {
    if (res.status === 404) {
      throw new BirdPlanError("Not found", 404);
    }
    if (res.status === 410) {
      throw new BirdPlanError("This code has expired", 410);
    }
    if (res.status === 429) {
      throw new BirdPlanError("Too many requests — try again in a moment", 429);
    }
    throw new BirdPlanError("Unable to reach BirdPlan. Check your connection and try again.", res.status);
  }

  const data = (await res.json()) as BirdPlanTripData;
  if (!data?.id || !Array.isArray(data.hotspots) || !Array.isArray(data.markers)) {
    throw new BirdPlanError("Unexpected response from BirdPlan", 0);
  }
  return data;
}
