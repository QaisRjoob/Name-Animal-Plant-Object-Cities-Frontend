// utils/letters.js

const ENGLISH_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const ARABIC_LETTERS = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي'.split('');

/**
 * Get the full set of letters for a given alphabet.
 * @param {string} alphabet - 'en' or 'ar'
 * @returns {string[]}
 */
export const getAlphabetLetters = (alphabet = 'en') => {
  if (alphabet === 'ar') return ARABIC_LETTERS;
  return ENGLISH_LETTERS;
};

/**
 * Normalize a single letter according to the game's alphabet.
 * For English: convert to uppercase.
 * For Arabic: trim/clean direction marks and normalize common variants.
 * @param {string} letter
 * @param {string} alphabet - 'en' or 'ar'
 * @returns {string}
 */
export const normalizeLetter = (letter, alphabet = 'en') => {
  if (!letter) return '';

  const cleaned = String(letter)
    .normalize("NFKC")
    .replace(/[\u200E\u200F\u061C]/g, "")
    .replace(/\u0640/g, "")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .trim();

  if (!cleaned) return '';

  const firstChar = Array.from(cleaned)[0] ?? '';

  if (alphabet === 'ar') {
    // Canonicalize common Arabic variants to base letters.
    return firstChar
      .replace(/[أإآٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ؤ/g, "و")
      .replace(/ئ/g, "ي")
      .replace(/ة/g, "ه");
  }
  // English: uppercase and trim
  return firstChar.toUpperCase();
};

/**
 * Check if a letter belongs to the given alphabet.
 * @param {string} letter
 * @param {string} alphabet
 * @returns {boolean}
 */
export const isValidLetter = (letter, alphabet = 'en') => {
  const normalized = normalizeLetter(letter, alphabet);
  if (!normalized) return false;
  const letters = getAlphabetLetters(alphabet);
  return letters.includes(normalized);
};

/**
 * Pick a random unused letter from the alphabet.
 * @param {string[]} usedLetters - letters already used
 * @param {string} alphabet - 'en' or 'ar'
 * @returns {string|null}
 */
export const pickRandomAvailableLetter = (usedLetters = [], alphabet = 'en') => {
  const all = getAlphabetLetters(alphabet);
  const available = all.filter(l => !usedLetters.includes(l));
  if (!available.length) return null;
  return available[Math.floor(Math.random() * available.length)];
};
