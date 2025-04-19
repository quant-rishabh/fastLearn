import Fuse from 'fuse.js';

export function isFuzzyMatchArray(
  userInputs: string[],
  expectedAnswers: string[],
  threshold: number = 0.1 // 0 = strict, 1 = loose
): boolean {
  const fuse = new Fuse(expectedAnswers, {
    includeScore: true,
    threshold, // use directly withoust any conversion
  });

  const matched = new Set();

  for (const input of userInputs) {
    const result = fuse.search(input.trim().toLowerCase());

    if (result.length > 0) {
      const bestMatch = result[0];
      const matchedItem = bestMatch.item;
      const score = bestMatch.score ?? 1;

      console.log(`[Fuzzy] "${input}" vs "${matchedItem}" → Score: ${score.toFixed(4)}, Threshold: ${threshold}`);

      if (score <= threshold && !matched.has(matchedItem)) {
        matched.add(matchedItem);
      }
    }
  }

  return matched.size === expectedAnswers.length;
}
