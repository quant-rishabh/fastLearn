import fuzzysort from 'fuzzysort';

export function isFuzzyMatch(userInput: string, correctAnswer: string, threshold = 80): boolean {
    const result = fuzzysort.single(userInput.toLowerCase(), correctAnswer.toLowerCase());
  
    if (!result || result.score == null) {
      console.log(`[Fuzzy ❌] "${userInput}" vs "${correctAnswer}" → No match`);
      return false;
    }
  
    const percent = Math.max(0, 100 + result.score * 2);
    console.log(`[Fuzzy 🔍] "${userInput}" vs "${correctAnswer}" → Score: ${percent.toFixed(1)}% (Threshold: ${threshold}%)`);
  
    return percent >= threshold;
  }
  
