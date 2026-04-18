// Wordlist-based profanity filter. Catches obvious cases instantly with no AI cost.
// Detects substring matches with leetspeak normalization.

const BAD_WORDS = [
  "fuck", "shit", "bitch", "asshole", "cunt", "dick", "pussy", "cock",
  "nigger", "nigga", "faggot", "fag", "retard", "tranny", "kike", "spic",
  "chink", "gook", "slut", "whore", "bastard", "twat", "wank",
  "rape", "rapist", "pedo", "pedophile", "molest",
  "kys", "killyourself",
];

function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[0]/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/[3]/g, "e")
    .replace(/[4@]/g, "a")
    .replace(/[5$]/g, "s")
    .replace(/[7]/g, "t")
    .replace(/[^a-z]/g, "");
}

export function findBadWord(text: string): string | null {
  if (!text) return null;
  const norm = normalize(text);
  for (const w of BAD_WORDS) {
    if (norm.includes(w)) return w;
  }
  return null;
}

export function containsProfanity(text: string): boolean {
  return findBadWord(text) !== null;
}
