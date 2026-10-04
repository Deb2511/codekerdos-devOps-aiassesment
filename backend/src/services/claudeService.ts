import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import { generateQuestionPrompt, generateEvaluationPrompt } from '../utils/prompts';

const client = new Anthropic({
  apiKey: config.ANTHROPIC_API_KEY,
});

interface Question {
  id: number;
  question: string;
  topic: string;
}

interface EvaluationResult {
  scores: Record<string, number>;
  overall: number;
  feedback: string;
  plagiarism_risk: 'none' | 'low' | 'high';
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
  jdText?: string
): Promise<{ questions: Question[]; tokens: TokenUsage }> {
  try {
    const prompt = generateQuestionPrompt(difficulty, topics, assessmentType, jdText, numQuestions);

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
  qaPairs: Array<{ question: string; answer: string }>
): Promise<{ result: EvaluationResult; tokens: TokenUsage }> {
  try {
    const prompt = generateEvaluationPrompt(difficulty, topics, qaPairs);

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
    let result: EvaluationResult;
    try {
      // Try to extract JSON from the response
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = JSON.parse(textContent.text);
      }
    } catch (e) {
      console.error('Failed to parse evaluation JSON:', textContent.text);
      throw new Error('Failed to parse Claude response as JSON');
    }

    // Validate result structure
    if (!result.scores || result.overall === undefined) {
      throw new Error('Invalid evaluation result format');
    }

    // Ensure plagiarism_risk is set
    if (!result.plagiarism_risk) {
      result.plagiarism_risk = 'none';
    }
    if (!result.plagiarism_notes) {
      result.plagiarism_notes = '';
    }

    return {
      result,
      tokens: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        total_tokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  } catch (error) {
    console.error('Error evaluating answers:', error);
    throw error;
  }
}
