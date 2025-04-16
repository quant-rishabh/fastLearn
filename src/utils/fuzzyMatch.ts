import Fuse from 'fuse.js';

export function isFuzzyMatchArray(
  userInputs: string[],
  expectedAnswers: string[],
  threshold = 0.4 // lower = stricter
): boolean {
  const fuse = new Fuse(expectedAnswers, {
    includeScore: true,
    threshold, // range: 0.0 (perfect match) to 1.0 (match anything)
  });

  const matched = new Set();

  for (const input of userInputs) {
    const result = fuse.search(input.trim().toLowerCase());

    if (result.length > 0 && !matched.has(result[0].item)) {
      matched.add(result[0].item);
    }
  }

  return matched.size === expectedAnswers.length;
}
