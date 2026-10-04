export const EXPERTISE_GUIDANCE = {
  junior: {
    keywords: 'fundamentals, core concepts, basic operations, troubleshooting basics',
    focus: 'Test understanding of foundational concepts and basic operations',
    examples: [
      'Explain the difference between X and Y',
      'How would you perform X in production?',
      'What are the key components of X?'
    ]
  },
  senior: {
    keywords: 'architecture, optimization, edge cases, best practices, scaling',
    focus: 'Test advanced understanding, design patterns, and production scenarios',
    examples: [
      'Design a solution for X that handles high scale',
      'How would you troubleshoot a complex X issue?',
      'Compare approaches to X and their trade-offs'
    ]
  }
};

export const SCORING_RUBRIC = {
  junior: {
    '7-10': 'Demonstrates solid understanding of core concepts with correct approach',
    '4-6': 'Shows partial understanding with some gaps in knowledge',
    '0-3': 'Missing fundamental concepts or incorrect approach'
  },
  senior: {
    '7-10': 'Demonstrates sophisticated understanding with attention to trade-offs and edge cases',
    '4-6': 'Shows good understanding but missing architectural depth or optimization considerations',
    '0-3': 'Lacks sophistication or misses key architectural considerations'
  }
};

export function generateQuestionPrompt(
  difficulty: 'junior' | 'senior',
  topics: string[],
  assessmentType: 'self' | 'jd',
  jdText?: string,
  numQuestions?: number
): string {
  const guidance = EXPERTISE_GUIDANCE[difficulty];
  const topicsStr = topics.join(', ');
  const questionCount = numQuestions || 5;

  if (assessmentType === 'jd') {
    return `You are an expert DevOps/SRE interviewer generating scenario-based technical questions for a job assessment.

Job Description:
${jdText}

Difficulty Level: ${difficulty}
Expected Competencies: ${guidance.keywords}

Generate EXACTLY ${questionCount} scenario-based interview questions that test if a candidate can perform the role described in this JD.

Requirements:
- Each question should be 1-2 sentences
- Questions must be action-oriented ("How would you...", "Design...", "Troubleshoot...")
- Focus on REAL PRODUCTION SCENARIOS similar to what they'd face in this role
- NO code snippets, scripts, or manifests in questions
- Test practical understanding, not just theory
- Match difficulty level: ${difficulty}

Return as valid JSON array only, no markdown formatting:
[
  {"id": 1, "question": "...", "topic": "kubernetes"},
  {"id": 2, "question": "...", "topic": "terraform"}
]`;
  }

  return `You are an expert DevOps/SRE interviewer generating scenario-based technical questions for assessment.

Topics: ${topicsStr}
Difficulty Level: ${difficulty}
Assessment Type: Self-Assessment (Learning & Evaluation)
Expected Competencies: ${guidance.keywords}

Generate EXACTLY ${questionCount} scenario-based interview questions like those asked at top product-based companies.

Requirements:
- Each question should be 1-2 sentences, maximum
- Questions must be action-oriented: "How would you...", "Design...", "Diagnose...", "Troubleshoot..."
- Focus on REAL PRODUCTION SCENARIOS
- NO code snippets, scripts, manifests, or configuration examples
- NO hints about solutions or causes
- Test practical understanding, not just definitions
- Mix foundational and advanced scenarios
- Questions should vary in topic across the selected list
- Match difficulty level: ${difficulty === 'junior' ? 'junior/intermediate' : 'senior/advanced'}

Example questions for ${difficulty} level:
${guidance.examples.map(ex => `- "${ex}"`).join('\n')}

Return as valid JSON array only (no markdown formatting, no extra text):
[
  {"id": 1, "question": "...", "topic": "kubernetes"},
  {"id": 2, "question": "...", "topic": "linux"}
]`;
}

export function generateEvaluationPrompt(
  difficulty: 'junior' | 'senior',
  topics: string[],
  qa_pairs: Array<{ question: string; answer: string }>
): string {
  const rubric = SCORING_RUBRIC[difficulty];
  const qaText = qa_pairs
    .map((pair, idx) => `Q${idx + 1}: ${pair.question}\nA${idx + 1}: ${pair.answer}`)
    .join('\n\n');

  return `You are evaluating DevOps/SRE technical interview answers.

Difficulty Level: ${difficulty}
Topics: ${topics.join(', ')}

${qaText}

Evaluation Rubric (${difficulty} level):
- 7-10: ${rubric['7-10']}
- 4-6: ${rubric['4-6']}
- 0-3: ${rubric['0-3']}

Additional Guidelines:
- Score each answer 0-10 based on the rubric
- Consider practical understanding over theory
- Minor typos/casual language is acceptable; focus on conceptual correctness
- Check for plagiarism: Flag if answer is suspiciously polished (ChatGPT-like), significantly longer than others, or has identical phrases

Return as valid JSON (no markdown, no extra text):
{
  "scores": {"q1": 8, "q2": 6, "q3": 9},
  "overall": 77,
  "feedback": "2-3 sentences on strengths and areas to improve",
  "plagiarism_risk": "none",
  "plagiarism_notes": ""
}`;
}
