// Profanity / insult filter for messages and nicknames.
// Runs on the server before a message is delivered (authoritative) and on the
// client only to give instant feedback. Turkish is agglutinative, so a word is
// caught when it equals a listed form or starts with a listed root.

// Exact forms: short words that would cause false positives as prefixes
// (e.g. "göt" vs "götürmek", "sik" vs "sikke"). Ambiguous everyday words
// such as "mal" (property) are left out on purpose.
const EXACT = new Set([
  "aq", "amk", "amq", "aminakoyim", "mk", "oc", "oç", "sik", "sikik", "sikim", "sikimi", "sikerim",
  "göt", "götü", "götün", "götüne", "götünü", "got", "salak", "aptal", "ahmak", "dangalak",
  "puşt", "pust", "piç", "pic", "gavat", "kaltak", "sürtük", "surtuk", "yavşak", "yavsak",
]);

// Roots: anything starting with these is blocked.
const ROOTS = [
  "amına", "amina", "amcık", "amcik", "orospu", "siktir", "sikeyim", "sikiyim", "sikti", "yarrak", "yarak",
  "götveren", "gotveren", "pezevenk", "kahpe", "şerefsiz", "serefsiz", "gerizekal", "salaklar", "aptallar",
  "avradını", "avradini", "dalyarak", "yavşağ", "yavsag", "ibne", "orosbu",
];

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i" };

function normalize(word: string): string {
  let w = word.toLocaleLowerCase("tr");
  w = w.replace(/[0134578@$!]/g, (c) => LEET[c] ?? c);
  // Collapse stretched letters: "salaaaak" -> "salak"
  w = w.replace(/(.)\1{2,}/g, "$1");
  return w;
}

/**
 * Two ways to cut text into words: letters only ("aptal!" -> "aptal") and
 * letters plus leetspeak characters ("s1kt1r" -> "s1kt1r" -> "siktir").
 */
function words(text: string): string[] {
  const plain = text.split(/[^\p{L}]+/u);
  const leet = text.split(/[^\p{L}0134578@$!]+/u);
  return [...plain, ...leet].filter(Boolean);
}

export function containsProfanity(text: string): boolean {
  // Also check the text with separators removed between single letters: "s.i.k.t.i.r"
  const squashed = text.replace(/(?<=\p{L})[.\-_*\s](?=\p{L}(?:[.\-_*\s]|$))/gu, "");
  for (const source of [text, squashed]) {
    for (const raw of words(source)) {
      const w = normalize(raw);
      if (EXACT.has(w)) return true;
      if (ROOTS.some((r) => w.startsWith(r))) return true;
    }
  }
  return false;
}
