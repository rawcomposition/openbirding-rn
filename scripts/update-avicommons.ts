import fs from "node:fs/promises";
import path from "node:path";

const SOURCE_URL = "https://avicommons.org/latest-lite.json";
const OUT_FILE = path.join(__dirname, "..", "avicommons.ts");
const IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

type AviCommonsEntry = [string, string];

function formatKey(key: string) {
  return IDENTIFIER_RE.test(key) ? key : JSON.stringify(key);
}

function assertAviCommonsData(value: unknown): asserts value is Record<string, AviCommonsEntry> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected AviCommons payload to be an object.");
  }

  for (const [key, entry] of Object.entries(value)) {
    if (
      !Array.isArray(entry) ||
      entry.length !== 2 ||
      typeof entry[0] !== "string" ||
      typeof entry[1] !== "string"
    ) {
      throw new Error(`Invalid AviCommons entry for "${key}".`);
    }
  }
}

function formatAviCommonsModule(data: Record<string, AviCommonsEntry>) {
  const lines = Object.entries(data).map(([key, [assetId, author]]) => {
    return `  ${formatKey(key)}: [${JSON.stringify(assetId)}, ${JSON.stringify(author)}],`;
  });

  return `export default {\n${lines.join("\n")}\n};\n`;
}

async function main() {
  const response = await fetch(SOURCE_URL);

  if (!response.ok) {
    throw new Error(`AviCommons request failed: ${response.status} ${response.statusText}`);
  }

  const data: unknown = await response.json();
  assertAviCommonsData(data);

  await fs.writeFile(OUT_FILE, formatAviCommonsModule(data), "utf8");

  console.log(`Updated ${path.basename(OUT_FILE)} with ${Object.keys(data).length} AviCommons entries.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
