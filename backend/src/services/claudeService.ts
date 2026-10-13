import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import { generateQuestionPrompt, generateEvaluationPrompt, EvaluationItem } from '../utils/prompts';

const client = new Anthropic({
  apiKey: config.ANTHROPIC_API_KEY,
});

export { client };

interface Question {
  id: number;
  question: string;
  topic: string;
}

export interface EvaluatedQuestion {
  id: number;
  score: number;
  repaired: string;
  changes: Array<{ original: string; corrected: string; type: string; confidence: string }>;
  unclear: string[];
  feedback: string;
}

export interface EvaluationResult {
  questions: EvaluatedQuestion[];
  overall_feedback: string;
  plagiarism_risk: 'none' | 'low' | 'medium' | 'high';
  plagiarism_notes: string;
}

interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

export async function generateQuestions(
  difficulty: 'junior' | 'senior',
  topics: string[],
  assessmentType: 'self' | 'jd',
  numQuestions: number = 5,
  jdText?: string,
  topicPlan?: string[],
  focusPlan?: string[]
): Promise<{ questions: Question[]; tokens: TokenUsage }> {
  try {
    const prompt = generateQuestionPrompt(difficulty, topics, assessmentType, jdText, numQuestions, topicPlan, focusPlan);

    const response = await client.messages.create({
      model: config.CLAUDE_MODEL,
      max_tokens: config.CLAUDE_MAX_TOKENS,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract text content
    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Parse JSON response
    let questions: Question[] = [];
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = textContent.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        questions = JSON.parse(textContent.text);
      }
    } catch (e) {
      console.error('Failed to parse questions JSON:', textContent.text);
      throw new Error('Failed to parse Claude response as JSON');
    }

    // Validate questions structure
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Invalid questions format');
    }

    // Enforce the topic plan in code: question n gets the planned topic, whatever label the model used
    if (topicPlan) {
      questions = [...questions]
        .sort((a, b) => a.id - b.id)
        .map((q, idx) => ({ ...q, id: idx + 1, topic: topicPlan[idx] ?? q.topic }));
    }

    return {
      questions,
      tokens: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        total_tokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  } catch (error) {
    console.error('Error generating questions:', error);
    throw error;
  }
}

export async function evaluateAnswers(
  difficulty: 'junior' | 'senior',
  topics: string[],
  items: EvaluationItem[]
): Promise<{ result: EvaluationResult; tokens: TokenUsage }> {
  try {
    const basePrompt = generateEvaluationPrompt(difficulty, topics, items);
    const usage = { input_tokens: 0, output_tokens: 0, total_tokens: 0 };
    let lastError = '';

    // One retry if the model returns JSON that does not parse. The retry adds an explicit correction.
    for (let attempt = 1; attempt <= 2; attempt++) {
      const prompt = attempt === 1
        ? basePrompt
        : `${basePrompt}\n\nYour previous reply was not valid JSON (${lastError}). Return the same evaluation again as valid JSON only. Do not use double quote characters inside string values.`;

      // Evaluation returns repaired text and per-question feedback, so it needs more room than question generation
      const response = await client.messages.create(
        {
          model: config.CLAUDE_MODEL,
          max_tokens: config.EVALUATION_MAX_TOKENS,
          messages: [{ role: 'user', content: prompt }],
        },
        { timeout: config.EVALUATION_TIMEOUT_SECS * 1000 }
      );

      usage.input_tokens += response.usage.input_tokens;
      usage.output_tokens += response.usage.output_tokens;
      usage.total_tokens += response.usage.input_tokens + response.usage.output_tokens;

      const textContent = response.content.find((block) => block.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text response from Claude');
      }

      let result: EvaluationResult;
      try {
        const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
        result = JSON.parse(jsonMatch ? jsonMatch[0] : textContent.text);
      } catch (e) {
        lastError = e instanceof Error ? e.message : 'parse error';
        console.error(`Evaluation attempt ${attempt} returned invalid JSON:`, lastError);
        continue;
      }

      if (!Array.isArray(result.questions)) {
        throw new Error('Invalid evaluation result format');
      }
      if (!result.plagiarism_risk) {
        result.plagiarism_risk = 'none';
      }
      if (!result.plagiarism_notes) {
        result.plagiarism_notes = '';
      }
      if (!result.overall_feedback) {
        result.overall_feedback = '';
      }

      return { result, tokens: usage };
    }

    throw new Error('Failed to parse Claude response as JSON');
  } catch (error) {
    console.error('Error evaluating answers:', error);
    throw error;
  }
}
