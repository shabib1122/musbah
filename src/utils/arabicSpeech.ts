/**
 * Normalizes Arabic text by removing diacritics (tashkeel), tatweel,
 * unifying alef/teh marbuta/alef maksura forms, and stripping punctuation.
 */
export function normalizeArabic(input: string): string {
  return input
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '') // Remove tashkeel & Quranic marks
    .replace(/\u0640/g, '') // Remove tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^\u0621-\u064A0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generates normalized speech-matching keywords for custom user Adhkar.
 */
export function buildKeywordsForText(text: string): string[] {
  const norm = normalizeArabic(text);
  if (!norm) return [];
  const words = norm.split(' ').filter(Boolean);
  const keywords = new Set<string>([norm]);
  if (words.length >= 3) {
    keywords.add(words.slice(0, 3).join(' '));
  }
  if (words.length >= 2) {
    keywords.add(words.slice(0, 2).join(' '));
  }
  return Array.from(keywords);
}

/**
 * Counts non-overlapping occurrences of any keyword inside a transcript.
 * Keywords are sorted longest-first so compound phrases (e.g. "استغفر الله العظيم")
 * count once rather than also matching shorter substrings.
 */
export function countPhraseMatches(
  transcript: string,
  keywords: string[]
): { count: number; lastMatched: string | null } {
  const normalizedTranscript = normalizeArabic(transcript);
  if (!normalizedTranscript || keywords.length === 0) {
    return { count: 0, lastMatched: null };
  }

  const normalizedKeywords = Array.from(
    new Set(keywords.map(normalizeArabic).filter((k) => k.length >= 2))
  ).sort((a, b) => b.length - a.length);

  if (normalizedKeywords.length === 0) {
    return { count: 0, lastMatched: null };
  }

  // Allow optional spaces inside glued words like "استغفرالله" / "سبحانالله"
  const pattern = normalizedKeywords
    .map((kw) => escapeRegExp(kw).replace(/\\ /g, '\\s*'))
    .join('|');

  const regex = new RegExp(`(?:${pattern})`, 'g');
  const matches = normalizedTranscript.match(regex);

  if (!matches || matches.length === 0) {
    return { count: 0, lastMatched: null };
  }

  return {
    count: matches.length,
    lastMatched: matches[matches.length - 1],
  };
}

export function formatArabicNumber(num: number): string {
  return num.toLocaleString('ar-EG');
}

export function getTodayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
