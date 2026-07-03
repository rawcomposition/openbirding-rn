import avicommons, { licenses } from "@/avicommons";

export type SpeciesImage = {
  url: string;
  by: string;
  license: string;
};

// AviCommons serves 160px images as webp only; the larger sizes are jpg.
export function getSpeciesImageUrl(code: string, size: 160 | 240 | 320 | 480 | 900): string | null {
  const entry = avicommons[code];
  if (!entry) return null;
  const ext = size === 160 ? "webp" : "jpg";
  return `https://static.avicommons.org/${code}-${entry[0]}-${size}.${ext}`;
}

export function getSpeciesImage(code: string, size: 160 | 240 | 320 | 480 | 900 = 240): SpeciesImage | null {
  const entry = avicommons[code];
  const url = getSpeciesImageUrl(code, size);
  if (!entry || !url) return null;
  return { url, by: entry[1], license: formatLicense(licenses[entry[2]] ?? "") };
}

// Licenses come in two shapes: short codes ("cc-by-nc") and full labels ("CC BY-SA 4.0").
function formatLicense(license: string): string {
  if (!license) return "";
  if (license !== license.toLowerCase()) return license;
  if (license === "cc0") return "CC0";
  return license.toUpperCase().replace(/^CC-/, "CC ");
}
