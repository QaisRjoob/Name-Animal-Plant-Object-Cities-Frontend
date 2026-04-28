import { apiEndpoint } from "../config/env";
import { FALLBACK_WORDS } from "../data/fallbackWords";

function normalizeWordEntry(entry, index) {
  if (typeof entry === "string") {
    return {
      id: `word-${index}`,
      word: entry.trim(),
      category: "unknown",
      language: "en"
    };
  }

  if (!entry || typeof entry !== "object") {
    return null;
  }

  const word = String(entry.word ?? entry.value ?? entry.text ?? entry.name ?? "").trim();
  if (!word) {
    return null;
  }

  return {
    ...entry,
    id: entry.id ?? entry._id ?? `${word.toLowerCase().replace(/\s+/g, "-")}-${index}`,
    word,
    category: entry.category ?? entry.type ?? "unknown",
    language: entry.language ?? "en"
  };
}

function normalizeWordsPayload(payload) {
  const rawWords = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.words)
      ? payload.words
      : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.wordBank)
          ? payload.wordBank
          : [];

  return rawWords
    .map((entry, index) => normalizeWordEntry(entry, index))
    .filter(Boolean);
}

async function fetchWordBankFromApi() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(apiEndpoint("words"), {
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Word API request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const words = normalizeWordsPayload(payload);

    if (!words.length) {
      throw new Error("Word API returned no words.");
    }

    return words;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function loadWordBank() {
  try {
    const words = await fetchWordBankFromApi();
    return {
      words,
      source: "api",
      error: null
    };
  } catch (error) {
    return {
      words: FALLBACK_WORDS,
      source: "fallback",
      error
    };
  }
}