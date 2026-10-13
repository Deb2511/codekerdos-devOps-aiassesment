import { StartAssessmentResponse, SubmitAnswersResponse, Assessment } from '../types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export async function startSelfAssessment(
  name: string,
  email: string,
  topics: string[],
  difficulty: 'junior' | 'senior',
  total_questions: number
): Promise<StartAssessmentResponse> {
  const response = await fetch(`${API_URL}/assessments/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      email,
      topics,
      difficulty,
      total_questions,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to start assessment');
  }

  return response.json();
}

export async function startJDAssessment(
  name: string,
  email: string,
  jd_text: string,
  difficulty: 'junior' | 'senior',
  num_questions?: number
): Promise<StartAssessmentResponse> {
  const response = await fetch(`${API_URL}/assessments/jd-start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      email,
      jd_text,
      difficulty,
      num_questions,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to start assessment');
  }

  return response.json();
}

export async function submitAnswers(
  assessmentId: string,
  answers: Record<string, string>,
  answerSources: Record<string, 'voice' | 'typed'> = {}
): Promise<SubmitAnswersResponse> {
  const response = await fetch(`${API_URL}/assessments/${assessmentId}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers, answer_sources: answerSources }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to submit answers');
  }

  return response.json();
}

export async function getAssessment(assessmentId: string): Promise<Assessment> {
  const response = await fetch(`${API_URL}/results/assessment/${assessmentId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch assessment');
  }

  return response.json();
}

export async function getStudentAssessments(email: string, limit: number = 10): Promise<Assessment[]> {
  const response = await fetch(`${API_URL}/results/student/${email}?limit=${limit}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch assessments');
  }

  const data = await response.json();
  return data.assessments;
}

export async function getLeaderboard(month?: string): Promise<any> {
  const url = month ? `${API_URL}/leaderboard?month=${month}` : `${API_URL}/leaderboard`;
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch leaderboard');
  }

  return response.json();
}
