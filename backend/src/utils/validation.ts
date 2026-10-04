import { config } from '../config';

export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validateName(name: string): boolean {
  return name.trim().length > 0 && name.trim().length <= 255;
}

export function validateDifficulty(difficulty: string): difficulty is 'junior' | 'senior' {
  return (config.DIFFICULTY_LEVELS as readonly string[]).includes(difficulty);
}

export function validateAssessmentType(type: string): type is 'self' | 'jd' {
  return (config.ASSESSMENT_TYPES as readonly string[]).includes(type);
}

export function validateTopics(topics: string[], assessmentType: 'self' | 'jd'): boolean {
  if (!Array.isArray(topics) || topics.length === 0) {
    return false;
  }

  const validTopics = Object.keys(config.SELF_ASSESSMENT_TOPICS);
  return topics.every((topic) => validTopics.includes(topic));
}

export function validateNumQuestions(num: number): boolean {
  return (config.QUESTION_COUNT_OPTIONS as readonly number[]).includes(num);
}

export function validateJDText(text: string): boolean {
  return text.trim().length > 50 && text.trim().length <= 10000;
}
