import { create } from "zustand";

export type DownloadPhase = "idle" | "downloading" | "installing";

type DownloadState = {
  phase: DownloadPhase;
  packId: number | null;
  packName: string | null;
  progress: number;
  abortController: AbortController | null;
};

type DownloadActions = {
  startDownload: (packId: number, packName: string) => AbortController;
  setProgress: (progress: number) => void;
  setPhase: (phase: DownloadPhase) => void;
  cancel: () => void;
  reset: () => void;
};

export const useDownloadStore = create<DownloadState & DownloadActions>()((set, get) => ({
  phase: "idle",
  packId: null,
  packName: null,
  progress: 0,
  abortController: null,

  startDownload: (packId, packName) => {
    const controller = new AbortController();
    set({
      phase: "downloading",
      packId,
      packName,
      progress: 0,
      abortController: controller,
    });
    return controller;
  },

  setProgress: (progress) => set({ progress }),

  setPhase: (phase) => set({ phase }),

  cancel: () => {
    const { abortController } = get();
    abortController?.abort();
    set({
      phase: "idle",
      packId: null,
      packName: null,
      progress: 0,
      abortController: null,
    });
  },

  reset: () =>
    set({
      phase: "idle",
      packId: null,
      packName: null,
      progress: 0,
      abortController: null,
    }),
}));
