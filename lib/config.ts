export const UPDATE_INTERVAL_LIMIT = 24 * 60 * 60 * 1000;

export const WILSON_SCORE_Z_INDEX = 1.96;
export const STATIC_PACKS_URL = "https://static.openbirding.org/v1/packs.json.gz";

// Bump when the pack data shape changes and installed packs must be re-downloaded to pick
// it up (v2 added grid cells for Nearby Species). Packs installed with a lower format are
// offered as updates even when their version matches the remote index.
export const PACK_FORMAT_VERSION = 2;
