import fs from "node:fs/promises";
import path from "node:path";

// The full dataset (unlike latest-lite.json) includes the photo license,
// which we surface on the species detail page.
const SOURCE_URL = "https://avicommons.org/latest.json";
const OUT_FILE = path.join(__dirname, "..", "avicommons.ts");
const IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

type AviCommonsRecord = {
  code: string;
  key: string;
  by: string;
  license: string;
};

function formatKey(key: string) {
  return IDENTIFIER_RE.test(key) ? key : JSON.stringify(key);
}

function assertAviCommonsData(value: unknown): asserts value is AviCommonsRecord[] {
  if (!Array.isArray(value)) {
    throw new Error("Expected AviCommons payload to be an array.");
  }

  for (const entry of value) {
    if (
      !entry ||
      typeof entry !== "object" ||
      typeof entry.code !== "string" ||
      typeof entry.key !== "string" ||
      typeof entry.by !== "string" ||
      typeof entry.license !== "string"
    ) {
      throw new Error(`Invalid AviCommons entry: ${JSON.stringify(entry)}`);
    }
  }
}

function formatAviCommonsModule(records: AviCommonsRecord[]) {
  // Licenses repeat constantly, so store them once and reference by index.
  const licenses: string[] = [];
  const licenseIndex = new Map<string, number>();

  const lines = records.map((record) => {
    let index = licenseIndex.get(record.license);
    if (index === undefined) {
      index = licenses.length;
      licenses.push(record.license);
      licenseIndex.set(record.license, index);
    }
    return `  ${formatKey(record.code)}: [${JSON.stringify(record.key)}, ${JSON.stringify(record.by)}, ${index}],`;
  });

  return [
    `export const licenses = ${JSON.stringify(licenses)};`,
    "",
    "const data: Record<string, [string, string, number]> = {",
    lines.join("\n"),
    "};",
    "",
    "export default data;",
    "",
  ].join("\n");
}

async function main() {
  const response = await fetch(SOURCE_URL);

  if (!response.ok) {
    throw new Error(`AviCommons request failed: ${response.status} ${response.statusText}`);
  }

  const data: unknown = await response.json();
  assertAviCommonsData(data);

  await fs.writeFile(OUT_FILE, formatAviCommonsModule(data), "utf8");

  console.log(`Updated ${path.basename(OUT_FILE)} with ${data.length} AviCommons entries.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
