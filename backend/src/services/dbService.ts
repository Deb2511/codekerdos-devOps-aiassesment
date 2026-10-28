import { query, queryOne, getClient } from '../db';
import { config } from '../config';

interface Student {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

interface Assessment {
  id: string;
  student_email: string;
  assessment_type: 'self' | 'jd';
  difficulty: 'junior' | 'senior';
  topics: string[];
  questions: any[];
  answers: any;
  score: number;
  base_score?: number;
  final_score?: number;
  max_possible_score?: number;
  score_percent?: number;
  repair_log?: any;
  plagiarism_deduction_amount?: number;
  plagiarism_deduction_percent?: number;
  per_topic_scores: Record<string, number>;
  feedback_json: any;
  plagiarism_risk: string;
  plagiarism_notes: string;
  tokens_used: any;
  jd_text: string | null;
  created_at: string;
  completed_at: string | null;
  expires_at: string | null;
}

export async function getOrCreateStudent(name: string, email: string): Promise<Student> {
  try {
    const existing = await queryOne('SELECT * FROM students WHERE email = $1', [email]);
    if (existing) {
      return existing;
    }

    const result = await queryOne(
      'INSERT INTO students (name, email) VALUES ($1, $2) RETURNING *',
      [name, email]
    );
    return result;
  } catch (error: any) {
    // Handle unique constraint violation
    if (error.code === '23505') {
      return queryOne('SELECT * FROM students WHERE email = $1', [email]);
    }
    throw error;
  }
}

export async function createAssessment(data: {
  student_email: string;
  assessment_type: 'self' | 'jd';
  difficulty: 'junior' | 'senior';
  topics: string[];
  questions: any[];
  jd_text?: string;
  tokens: { input_tokens: number; output_tokens: number; total_tokens: number };
}): Promise<Assessment> {
  const result = await queryOne(
    `INSERT INTO assessments
    (student_email, assessment_type, difficulty, topics, questions, answers, score, per_topic_scores, feedback_json, jd_text, tokens_used, expires_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW() + make_interval(secs => $12::int))
    RETURNING *`,
    [
      data.student_email,
      data.assessment_type,
      data.difficulty,
      JSON.stringify(data.topics),
      JSON.stringify(data.questions),
      JSON.stringify({}), // Empty answers initially
      0, // Initial score
      JSON.stringify({}), // Empty per_topic_scores
      JSON.stringify({}), // Empty feedback
      data.jd_text || null,
      // Generation tokens are recorded now; evaluation tokens are added on submit
      JSON.stringify({ generation: data.tokens, evaluation: null, total: data.tokens.total_tokens }),
      // One question time per question, plus the grace period for submit
      data.questions.length * config.QUESTION_TIME_SECS + config.SUBMIT_GRACE_SECS,
    ]
  );

  // Parse JSON fields
  return parseAssessment(result);
}

export async function updateAssessmentWithResults(
  assessmentId: string,
  data: {
    answers: any;
    score: number;
    base_score?: number;
    final_score?: number;
    max_possible_score?: number;
    score_percent?: number;
    repair_log?: any;
    plagiarism_deduction_amount?: number;
    plagiarism_deduction_percent?: number;
    per_topic_scores: Record<string, number>;
    feedback_json: any;
    plagiarism_risk: string;
    plagiarism_notes: string;
    tokens_used: any;
  }
): Promise<Assessment> {
  const result = await queryOne(
    `UPDATE assessments
    SET answers = $2, score = $3, base_score = $4, final_score = $5,
        max_possible_score = $6, plagiarism_deduction_amount = $7,
        plagiarism_deduction_percent = $8, per_topic_scores = $9,
        feedback_json = $10, plagiarism_risk = $11, plagiarism_notes = $12,
        tokens_used = $13, score_percent = $14, repair_log = $15,
        completed_at = NOW()
    WHERE id = $1
    RETURNING *`,
    [
      assessmentId,
      JSON.stringify(data.answers),
      data.score,
      data.base_score,
      data.final_score,
      data.max_possible_score,
      data.plagiarism_deduction_amount,
      data.plagiarism_deduction_percent,
      JSON.stringify(data.per_topic_scores),
      JSON.stringify(data.feedback_json),
      data.plagiarism_risk,
      data.plagiarism_notes,
      JSON.stringify(data.tokens_used),
      data.score_percent,
      JSON.stringify(data.repair_log ?? []),
    ]
  );

  return parseAssessment(result);
}

export async function getAssessmentById(assessmentId: string): Promise<Assessment | null> {
  const result = await queryOne('SELECT * FROM assessments WHERE id = $1', [assessmentId]);
  return result ? parseAssessment(result) : null;
}

export async function getStudentAssessments(email: string, limit: number = 10): Promise<Assessment[]> {
  const results = await query(
    'SELECT * FROM assessments WHERE student_email = $1 ORDER BY created_at DESC LIMIT $2',
    [email, limit]
  );

  return results.map(parseAssessment);
}

// Audit records: one row per assessment, written at start and completed at submit
export async function createAuditRecord(data: {
  assessment_id: string;
  student_name: string;
  assessment_type: 'self' | 'jd';
  topics: string[] | null;
  question_count: number;
  total_tokens: number;
}): Promise<void> {
  await query(
    `INSERT INTO assessment_audit
    (assessment_id, student_name, assessment_type, topics, question_count, total_tokens)
    VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      data.assessment_id,
      data.student_name,
      data.assessment_type,
      data.topics === null ? null : JSON.stringify(data.topics),
      data.question_count,
      data.total_tokens,
    ]
  );
}

export async function completeAuditRecord(data: {
  assessment_id: string;
  score: number;
  total_tokens: number;
}): Promise<void> {
  await query(
    `UPDATE assessment_audit
    SET score = $2, total_tokens = $3, completed_at = NOW()
    WHERE assessment_id = $1`,
    [data.assessment_id, data.score, data.total_tokens]
  );
}

function parseAssessment(raw: any): Assessment {
  return {
    ...raw,
    topics: typeof raw.topics === 'string' ? JSON.parse(raw.topics) : raw.topics,
    questions: typeof raw.questions === 'string' ? JSON.parse(raw.questions) : raw.questions,
    answers: typeof raw.answers === 'string' ? JSON.parse(raw.answers) : raw.answers,
    per_topic_scores:
      typeof raw.per_topic_scores === 'string' ? JSON.parse(raw.per_topic_scores) : raw.per_topic_scores,
    feedback_json: typeof raw.feedback_json === 'string' ? JSON.parse(raw.feedback_json) : raw.feedback_json,
    tokens_used: typeof raw.tokens_used === 'string' ? JSON.parse(raw.tokens_used) : raw.tokens_used,
    // Postgres returns DECIMAL columns as strings; the API contract uses numbers
    plagiarism_deduction_percent:
      raw.plagiarism_deduction_percent === null || raw.plagiarism_deduction_percent === undefined
        ? raw.plagiarism_deduction_percent
        : Number(raw.plagiarism_deduction_percent),
  };
}
