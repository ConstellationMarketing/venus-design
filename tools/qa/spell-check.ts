import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const misspellingsRaw: Record<string, string> = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data/common-misspellings.json'), 'utf-8')
);

const allowedWords: Set<string> = new Set(
  JSON.parse(fs.readFileSync(path.join(__dirname, 'data/allowed-words.json'), 'utf-8')) as string[]
);

export interface SpellingError {
  /** The misspelling found in the text. */
  word: string;
  /** The suggested correct form. */
  correction: string;
}

/**
 * Checks a string of visible body text for known common misspellings.
 *
 * - Tokenises on whitespace and common punctuation.
 * - Skips words that are in the allowed-words whitelist.
 * - Deduplicates errors per word so the same misspelling is only reported once
 *   per page even if it appears many times.
 *
 * @param text  The raw inner-text of the page body.
 * @returns     An array of unique spelling errors found (may be empty).
 */
export function checkSpelling(text: string): SpellingError[] {
  const words = text
    .toLowerCase()
    .split(/[\s\u00A0.,!?;:()\[\]{}"'`\-–—\/\\|@#$%^&*+=<>~]+/)
    .map((w) => w.replace(/[^a-z']/g, ''))
    .filter((w) => w.length > 2);

  const found = new Map<string, string>();

  for (const word of words) {
    if (allowedWords.has(word)) continue;
    if (found.has(word)) continue;
    const correction = misspellingsRaw[word];
    if (correction) {
      found.set(word, correction);
    }
  }

  return Array.from(found.entries()).map(([word, correction]) => ({
    word,
    correction,
  }));
}
