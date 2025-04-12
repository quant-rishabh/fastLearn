import fuzzysort from 'fuzzysort';

export function isFuzzyMatch(userInput: string, correctAnswer: string): boolean {
  const result = fuzzysort.single(userInput.toLowerCase(), correctAnswer.toLowerCase());
  return !!result && result.score !== null && result.score > -20;
}