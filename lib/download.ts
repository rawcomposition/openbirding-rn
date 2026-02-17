import { cacheDirectory, createDownloadResumable, deleteAsync } from "expo-file-system/legacy";
import { File } from "expo-file-system";

type DownloadOptions = {
  url: string;
  expectedSize?: number;
  onProgress?: (progress: number) => void;
  onDownloadComplete?: () => void;
  signal?: AbortSignal;
};

export async function downloadWithProgress<T>({
  url,
  expectedSize,
  onProgress,
  onDownloadComplete,
  signal,
}: DownloadOptions): Promise<T> {
  const tempFilePath = `${cacheDirectory}pack-download-${Date.now()}.gz`;

  const downloadResumable = createDownloadResumable(url, tempFilePath, {}, (downloadProgress) => {
    const total = expectedSize || downloadProgress.totalBytesExpectedToWrite;

    if (total > 0) {
      const progress = Math.round((downloadProgress.totalBytesWritten / total) * 100);
      onProgress?.(Math.min(progress, 99));
    }
  });

  let aborted = false;
  if (signal) {
    signal.addEventListener("abort", () => {
      aborted = true;
      downloadResumable.pauseAsync().catch(() => {});
    });
  }

  try {
    const result = await downloadResumable.downloadAsync();

    if (aborted || signal?.aborted) {
      await deleteAsync(tempFilePath, { idempotent: true });
      throw new DOMException("Download aborted", "AbortError");
    }

    if (!result || !result.uri) {
      throw new Error("Download failed - no result");
    }

    // Download complete - signal this before file processing
    onProgress?.(100);
    onDownloadComplete?.();

    if (aborted || signal?.aborted) {
      await deleteAsync(tempFilePath, { idempotent: true });
      throw new DOMException("Download aborted", "AbortError");
    }

    // Use the new File API for efficient reading
    // The CDN serves with Content-Encoding: gzip, so the network layer
    // automatically decompresses - files on disk are already plain JSON
    const parseStart = Date.now();
    const file = new File(result.uri);
    const jsonString = await file.text();
    const parsed = JSON.parse(jsonString) as T;
    console.log(`[Pack] Downloaded in ${((Date.now() - parseStart) / 1000).toFixed(1)}s`);

    // Clean up temp file
    await file.delete();

    return parsed;
  } catch (error) {
    await deleteAsync(tempFilePath, { idempotent: true }).catch(() => {});

    if (aborted || signal?.aborted || (error instanceof Error && error.name === "AbortError")) {
      throw new DOMException("Download aborted", "AbortError");
    }

    throw error;
  }
}

export async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}
