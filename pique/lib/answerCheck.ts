// Spots answers that can't be real, such as keyboard mashing. A copy of
// functions/src/scoring/answerCheck.ts: keep the two in step. Tuned to
// miss some gibberish rather than flag a real answer.

const VOWELS = /[aeiouy]/;
// Six or more consonants in a row. Real words stop at five ("strengths"
// has n-g-t-h-s); y counts as a vowel, so "rhythm" passes.
const CONSONANT_RUN = /[^aeiouy]{6,}/;
// The same letter three times in a row, as in "aaa" or "kkkk".
const REPEATED_LETTER = /([a-z])\1\1/;
// Runs along a keyboard row, a common mash.
const KEYBOARD_RUNS = [
  'qwer', 'wert', 'erty', 'rtyu', 'tyui', 'yuio', 'uiop',
  'asdf', 'sdfg', 'dfgh', 'fghj', 'ghjk', 'hjkl',
  'zxcv', 'xcvb', 'cvbn', 'vbnm',
];
// Short, very common words. A real answer of a few words almost always
// has at least one.
const COMMON_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'so', 'because', 'if', 'then',
  'i', 'me', 'my', 'we', 'you', 'it', 'its', 'they', 'he', 'she', 'this', 'that', 'these', 'those',
  'is', 'are', 'was', 'were', 'be', 'been', 'am', 'do', 'does', 'did', 'have', 'has', 'had',
  'can', 'could', 'would', 'should', 'will', 'not', 'no', 'yes',
  'to', 'of', 'in', 'on', 'at', 'for', 'with', 'by', 'from', 'about', 'as', 'into', 'than',
  'what', 'why', 'how', 'when', 'who', 'which', 'more', 'most', 'some', 'all', 'just', 'like',
]);
// Below this share of vowels, text isn't language. English runs near 40%.
const MIN_VOWEL_SHARE = 0.2;
const MIN_LETTERS_TO_JUDGE = 10;
// Acronyms such as DNA, NATO or mRNA, which are allowed to lack vowels.
const ACRONYM = /^[a-z]?[A-Z]{2,6}s?$/;

const hasKeyboardRun = (word: string) => KEYBOARD_RUNS.some((run) => word.includes(run));

function isNonsenseWord(word: string): boolean {
  if (word.length >= 3 && !VOWELS.test(word)) return true;
  if (CONSONANT_RUN.test(word) || REPEATED_LETTER.test(word)) return true;
  return hasKeyboardRun(word);
}

export function looksLikeGibberish(text: string): boolean {
  const all = text.match(/[A-Za-z']+/g) ?? [];
  const lowerCase = (word: string) => word.toLowerCase().replace(/'/g, '');
  const allLower = all.map(lowerCase);
  if (allLower.join('').length < MIN_LETTERS_TO_JUDGE) return false;

  // The same word over and over, as in "test test test test".
  if (allLower.length >= 4 && new Set(allLower).size / allLower.length < 0.4) return true;

  // Acronyms are left out of the letter checks, unless they're a mash too.
  const words = all
    .filter((word) => !ACRONYM.test(word) || hasKeyboardRun(word.toLowerCase()))
    .map(lowerCase);
  const letters = words.join('');
  if (letters.length < MIN_LETTERS_TO_JUDGE) return false;

  const vowelCount = letters.replace(/[^aeiouy]/g, '').length;
  if (vowelCount / letters.length < MIN_VOWEL_SHARE) return true;

  const nonsense = words.filter(isNonsenseWord).length;
  if (nonsense / words.length >= 0.5) return true;

  // A few words, none of them common, at least one nonsense: a mash.
  const hasCommonWord = words.some((word) => COMMON_WORDS.has(word));
  return !hasCommonWord && nonsense > 0;
}
