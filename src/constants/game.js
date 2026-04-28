export const GAME_STATES = {
  WAITING: "WAITING",
  STARTING: "STARTING",
  SELECTING_LETTER: "SELECTING_LETTER",
  PLAYING: "PLAYING",
  STOPPED: "STOPPED",
  VOTING: "VOTING",
  SCORING: "SCORING",
  NEXT_ROUND: "NEXT_ROUND",
  FINISHED: "FINISHED"
};

export const CATEGORIES = ["name", "plant", "animal", "object", "city"];

export const CATEGORY_LABELS = {
  name: "Name",
  plant: "Plant",
  animal: "Animal",
  object: "Object",
  city: "City"
};

export const LETTER_MODES = {
  BOTH: "both",
  MANUAL_ONLY: "manual",
  RANDOM_ONLY: "random"
};

export const STOP_DELAY_SECONDS = 5;
export const STOP_GRACE_SECONDS = 3;
export const VOTING_DURATION_SECONDS = 15;

export const ENGLISH_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
export const ARABIC_LETTERS = "ابتثجحخدذرزسشصضطظعغفقكلمنهوي".split("");
