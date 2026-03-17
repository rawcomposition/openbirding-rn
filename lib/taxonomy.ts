import { File } from "expo-file-system";
import { documentDirectory } from "expo-file-system/legacy";
import { queryClient } from "./queryClient";
import { get } from "./utils";

export type TaxonomyEntry = {
  name: string;
  sciName: string;
  code: string;
};

const TAXONOMY_FILENAME = "taxonomy-default.json";
const TAXONOMY_QUERY_KEY = ["taxonomy"];

let taxonomyFetchPromise: Promise<TaxonomyEntry[] | null> | null = null;

function getTaxonomyFile(): File | null {
  if (!documentDirectory) return null;
  return new File(documentDirectory, TAXONOMY_FILENAME);
}

function isTaxonomyEntry(value: unknown): value is TaxonomyEntry {
  if (!value || typeof value !== "object") return false;

  const entry = value as Record<string, unknown>;
  return (
    typeof entry.name === "string" &&
    entry.name.length > 0 &&
    typeof entry.sciName === "string" &&
    entry.sciName.length > 0 &&
    typeof entry.code === "string" &&
    entry.code.length > 0
  );
}

function isValidTaxonomy(value: unknown): value is TaxonomyEntry[] {
  return Array.isArray(value) && value.length > 0 && value.every(isTaxonomyEntry);
}

async function removeTaxonomyFile(file: File): Promise<void> {
  try {
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Silent cleanup
  }
}

export async function readLocalTaxonomy(): Promise<TaxonomyEntry[] | null> {
  const file = getTaxonomyFile();
  if (!file) return null;

  try {
    if (!file.exists) return null;

    const text = await file.text();
    const data = JSON.parse(text) as unknown;
    if (!isValidTaxonomy(data)) {
      await removeTaxonomyFile(file);
      return null;
    }

    console.log(`[Taxonomy] Parsed ${data.length} species from local file`);
    return data;
  } catch {
    await removeTaxonomyFile(file);
    return null;
  }
}

async function fetchFromAPI(): Promise<TaxonomyEntry[]> {
  const data = (await get("/taxonomy")) as unknown;
  if (!isValidTaxonomy(data)) throw new Error("Invalid taxonomy response");

  console.log(`[Taxonomy] Downloaded ${data.length} species from API`);
  return data;
}

async function saveTaxonomy(data: TaxonomyEntry[]): Promise<void> {
  const file = getTaxonomyFile();
  if (!file) return;

  const tempFile = new File(file.parentDirectory, `${TAXONOMY_FILENAME}.tmp`);

  try {
    tempFile.write(JSON.stringify(data));
    await removeTaxonomyFile(file);
    tempFile.move(file);
  } catch (error) {
    await removeTaxonomyFile(tempFile);
    throw error;
  }
}

async function fetchAndSaveTaxonomyWithRetry(): Promise<TaxonomyEntry[] | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const data = await fetchFromAPI();
      await saveTaxonomy(data);
      return data;
    } catch {
      // Silent retry/failure
    }
  }

  return null;
}

export async function fetchAndSaveTaxonomy(): Promise<TaxonomyEntry[] | null> {
  if (!taxonomyFetchPromise) {
    taxonomyFetchPromise = (async () => {
      const data = await fetchAndSaveTaxonomyWithRetry();

      if (data) {
        queryClient.setQueryData(TAXONOMY_QUERY_KEY, data);
      }

      return data;
    })().finally(() => {
      taxonomyFetchPromise = null;
    });
  }

  return taxonomyFetchPromise;
}

export async function getTaxonomy(): Promise<TaxonomyEntry[]> {
  const cached = queryClient.getQueryData<TaxonomyEntry[]>(TAXONOMY_QUERY_KEY);
  if (isValidTaxonomy(cached)) return cached;

  const local = await readLocalTaxonomy();
  if (local) {
    queryClient.setQueryData(TAXONOMY_QUERY_KEY, local);
    return local;
  }

  const fetched = await fetchAndSaveTaxonomy();
  if (fetched) return fetched;

  throw new Error("Taxonomy unavailable");
}

export async function ensureTaxonomyLoaded(): Promise<void> {
  try {
    const local = await readLocalTaxonomy();
    if (local) {
      queryClient.setQueryData(TAXONOMY_QUERY_KEY, local);
      return;
    }

    await fetchAndSaveTaxonomy();
  } catch {
    // Silent
  }
}

export async function refreshTaxonomy(): Promise<void> {
  try {
    const refreshed = await fetchAndSaveTaxonomy();
    if (!refreshed) return;

    queryClient.invalidateQueries({ queryKey: TAXONOMY_QUERY_KEY });
  } catch {
    // Silent
  }
}
