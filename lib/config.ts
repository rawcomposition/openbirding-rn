export const UPDATE_INTERVAL_LIMIT = 24 * 60 * 60 * 1000;

export const WILSON_SCORE_Z_INDEX = 1.96;
export const STATIC_PACKS_URL = "https://static.openbirding.org/v1/packs.json.gz";

// Bump when the pack data shape changes; packs installed with a lower format are offered as updates.
export const PACK_FORMAT_VERSION = 2;

// Format that introduced grid cells; packs below this can't power Nearby Species.
export const NEARBY_SPECIES_MIN_PACK_FORMAT = 2;
