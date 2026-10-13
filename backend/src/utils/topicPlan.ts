// Assigns each question a topic in round-robin order, so every selected topic gets the same number
// of questions (counts differ by at most one when the total does not divide evenly).
export function buildTopicPlan(topics: string[], questionCount: number): string[] {
  return Array.from({ length: questionCount }, (_, i) => topics[i % topics.length]);
}

// Angles a question can take. Each assessment gets a fresh random order, so two assessments on the
// same topic don't converge on the same scenarios.
const FOCUS_AREAS = [
  'troubleshooting a failure',
  'security or access control',
  'performance or capacity',
  'cost',
  'upgrade or migration',
  'monitoring or alerting',
  'recovery after an outage',
  'a configuration mistake',
  'automation or CI/CD',
  'networking',
  'storage or state',
];

export function buildFocusPlan(questionCount: number): string[] {
  const shuffled = [...FOCUS_AREAS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return Array.from({ length: questionCount }, (_, i) => shuffled[i % shuffled.length]);
}
