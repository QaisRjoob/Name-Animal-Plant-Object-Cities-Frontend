import { create } from "zustand";
import { loadWordBank } from "../services/wordsService";

export const useWordsStore = create((set, get) => ({
  words: [],
  status: "idle",
  source: "none",
  error: null,
  bootstrapWords: async () => {
    if (get().status === "loading") {
      return null;
    }

    set({ status: "loading", error: null });
    const result = await loadWordBank();
    set({
      words: result.words,
      source: result.source,
      error: result.error?.message ?? null,
      status: "ready"
    });
    return result;
  },
  resetWords: () => set({ words: [], status: "idle", source: "none", error: null })
}));