import { Router, Request, Response } from 'express';
import { config } from '../config';
import { generateQuestions, evaluateAnswers, EvaluationResult } from '../services/claudeService';
import { EvaluationItem } from '../utils/prompts';
import { buildTopicPlan, buildFocusPlan } from '../utils/topicPlan';
import { getOrCreateStudent, createAssessment, updateAssessmentWithResults, getAssessmentById, createAuditRecord, completeAuditRecord } from '../services/dbService';
import { validateEmail, validateName, validateDifficulty, validateTopics, validateNumQuestions, validateJDText } from '../utils/validation';

const router = Router();

interface StartAssessmentRequest {
  name: string;
  email: string;
  topics: string[];
  difficulty: string;
  total_questions: number;
}

interface JDAssessmentRequest {
  name: string;
  email: string;
  jd_text: string;
  difficulty: string;
  num_questions?: number;
}

interface SubmitAnswersRequest {
  answers: Record<string, string>;
  answer_sources?: Record<string, 'voice' | 'typed'>;
}

// Start self-assessment
router.post('/start', async (req: Request<{}, {}, StartAssessmentRequest>, res: Response) => {
  try {
    const { name, email, topics, difficulty, total_questions } = req.body;

    // Validate input
    if (!validateName(name)) {
      return res.status(400).json({ error: 'Invalid name' });
    }
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email' });
    }
    if (!validateDifficulty(difficulty)) {
      return res.status(400).json({ error: 'Invalid difficulty level' });
    }
    if (!validateTopics(topics, 'self')) {
      return res.status(400).json({ error: 'Invalid topics' });
    }
    if (!validateNumQuestions(total_questions)) {
      return res.status(400).json({ error: `Number of questions must be one of: ${config.QUESTION_COUNT_OPTIONS.join(', ')}` });
    }

    // Get or create student
    await getOrCreateStudent(name, email);

    // Generate questions
    const topicPlan = buildTopicPlan(topics, total_questions);
    const focusPlan = buildFocusPlan(total_questions);
    const { questions, tokens } = await generateQuestions(difficulty as 'junior' | 'senior', topics, 'self', total_questions, undefined, topicPlan, focusPlan);

    // Create assessment record
    const assessment = await createAssessment({
      student_email: email,
      assessment_type: 'self',
      difficulty: difficulty as 'junior' | 'senior',
      topics,
      questions,
      tokens,
    });

    await createAuditRecord({
      assessment_id: assessment.id,
      student_name: name,
      assessment_type: 'self',
      topics,
      question_count: questions.length,
      total_tokens: tokens.total_tokens,
    });

    res.json({
      assessment_id: assessment.id,
      questions: questions.map((q) => ({ id: q.id, question: q.question, topic: q.topic })),
      total_questions: questions.length,
      tokens_used: tokens,
    });
  } catch (error) {
    console.error('Error starting assessment:', error);
    res.status(500).json({ error: 'Failed to start assessment' });
  }
});

// Start JD-based assessment
router.post('/jd-start', async (req: Request<{}, {}, JDAssessmentRequest>, res: Response) => {
  try {
    const { name, email, jd_text, difficulty, num_questions } = req.body;

    // Validate input
    if (!validateName(name)) {
      return res.status(400).json({ error: 'Invalid name' });
    }
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email' });
    }
    if (!validateDifficulty(difficulty)) {
      return res.status(400).json({ error: 'Invalid difficulty level' });
    }
    if (!validateJDText(jd_text)) {
      return res.status(400).json({ error: 'Job description must be between 50 and 10000 characters' });
    }

    const questionCount = num_questions && validateNumQuestions(num_questions) ? num_questions : config.DEFAULT_QUESTION_COUNT;

    // Get or create student
    await getOrCreateStudent(name, email);

    // Generate questions from JD
    const { questions, tokens } = await generateQuestions(
      difficulty as 'junior' | 'senior',
      [],
      'jd',
      questionCount,
      jd_text
    );

    // Extract topics from questions
    const topics = [...new Set(questions.map((q) => q.topic))];

    // Create assessment record
    const assessment = await createAssessment({
      student_email: email,
      assessment_type: 'jd',
      difficulty: difficulty as 'junior' | 'senior',
      topics,
      questions,
      jd_text,
      tokens,
    });

    await createAuditRecord({
      assessment_id: assessment.id,
      student_name: name,
      assessment_type: 'jd',
      topics: null,
      question_count: questions.length,
      total_tokens: tokens.total_tokens,
    });

    res.json({
      assessment_id: assessment.id,
      questions: questions.map((q) => ({ id: q.id, question: q.question, topic: q.topic })),
      total_questions: questions.length,
      inferred_topics: topics,
      tokens_used: tokens,
    });
  } catch (error) {
    console.error('Error starting JD assessment:', error);
    res.status(500).json({ error: 'Failed to start JD-based assessment' });
  }
});

// Submit answers and evaluate
router.post('/:assessment_id/submit', async (req: Request<{ assessment_id: string }, {}, SubmitAnswersRequest>, res: Response) => {
  try {
    const { assessment_id } = req.params;
    const { answers, answer_sources = {} } = req.body;

    // Get assessment
    const assessment = await getAssessmentById(assessment_id);
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    // An assessment can only be submitted once
    if (assessment.completed_at) {
      return res.status(409).json({ error: 'Assessment has already been submitted' });
    }

    // Validate answers
    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'Invalid answers format' });
    }
    if (typeof answer_sources !== 'object' || answer_sources === null) {
      return res.status(400).json({ error: 'Invalid answer_sources format' });
    }
    for (const [questionId, source] of Object.entries(answer_sources)) {
      if (source !== 'voice' && source !== 'typed') {
        return res.status(400).json({ error: `Invalid answer_sources value for question ${questionId}. Use "voice" or "typed".` });
      }
    }

    // Spoken answers are repaired by the evaluator; typed answers are scored as written
    const sourceOf = (qId: number): 'voice' | 'typed' => (answer_sources[qId.toString()] === 'voice' ? 'voice' : 'typed');
    const items: EvaluationItem[] = assessment.questions.map((q) => ({
      id: q.id,
      question: q.question,
      topic: q.topic,
      answer: answers[q.id.toString()] || '',
      source: sourceOf(q.id),
      repair: sourceOf(q.id) === 'voice' ? 'yes' : 'no',
    }));

    const { result, tokens } = await evaluateAnswers(assessment.difficulty, assessment.topics, items);

    // Per-question scores, clamped to 0-10 whole numbers
    const scoreOf = (qId: number): number => {
      const entry = result.questions.find((q) => q.id === qId);
      const raw = Number(entry?.score);
      if (!Number.isFinite(raw)) return 0;
      return Math.min(10, Math.max(0, Math.round(raw)));
    };
    const feedbackOf = (qId: number): string => {
      const entry = result.questions.find((q) => q.id === qId);
      return entry?.feedback?.trim() || 'No feedback was generated for this answer.';
    };

    const questionScores = assessment.questions.map((q) => scoreOf(q.id));
    const baseScore = questionScores.reduce((a, b) => a + b, 0);
    const maxPossibleScore = assessment.questions.length * 10;

    // Calculate plagiarism deduction
    const plagiarismPenaltyMap: Record<string, number> = {
      'none': 0.00,
      'low': 0.05,
      'medium': 0.10,
      'high': 0.20
    };

    const plagiarismPenalty = plagiarismPenaltyMap[result.plagiarism_risk] || 0;
    const deductionAmount = Math.round(baseScore * plagiarismPenalty);
    const finalScore = baseScore - deductionAmount;
    const scorePercent = Math.round((finalScore / maxPossibleScore) * 100);

    // Per-topic score as a percentage (average of 0-10 scores, times 10)
    const perTopicScores: Record<string, number> = {};
    assessment.topics.forEach((topic) => {
      const topicQuestions = assessment.questions.filter((q) => q.topic === topic);
      const topicScores = topicQuestions.map((q) => scoreOf(q.id));
      perTopicScores[topic] = Math.round((topicScores.reduce((a, b) => a + b, 0) / topicScores.length) * 10);
    });

    const individualScores: Record<string, number> = {};
    const individualFeedback: Record<string, string> = {};
    assessment.questions.forEach((q) => {
      individualScores[`q${q.id}`] = scoreOf(q.id);
      individualFeedback[`q${q.id}`] = feedbackOf(q.id);
    });

    // Audit trail: what the candidate said, what the evaluator changed, and what it could not resolve
    const repairLog = items.map((item) => {
      const entry = result.questions.find((q) => q.id === item.id);
      const repaired = typeof entry?.repaired === 'string' && entry.repaired.trim() !== '' ? entry.repaired : item.answer;
      const usedRepair = item.source === 'voice' && repaired !== item.answer;
      return {
        question_id: item.id,
        source: item.source,
        status: item.source === 'typed' ? 'skipped' : 'applied',
        repaired: item.source === 'voice' ? repaired : item.answer,
        changes: item.source === 'voice' && Array.isArray(entry?.changes) ? entry.changes : [],
        unclear: item.source === 'voice' && Array.isArray(entry?.unclear) ? entry.unclear : [],
        changed: usedRepair,
      };
    });

    // Update assessment with results
    const updatedAssessment = await updateAssessmentWithResults(assessment_id, {
      answers,
      score: finalScore,
      base_score: baseScore,
      final_score: finalScore,
      max_possible_score: maxPossibleScore,
      score_percent: scorePercent,
      plagiarism_deduction_amount: deductionAmount,
      plagiarism_deduction_percent: plagiarismPenalty * 100,
      per_topic_scores: perTopicScores,
      feedback_json: {
        feedback: result.overall_feedback,
        individual_scores: individualScores,
        individual_feedback: individualFeedback,
      },
      repair_log: repairLog,
      plagiarism_risk: result.plagiarism_risk,
      plagiarism_notes: result.plagiarism_notes || '',
      tokens_used: {
        generation: assessment.tokens_used?.generation ?? null,
        evaluation: tokens,
        total: (assessment.tokens_used?.generation?.total_tokens ?? 0) + tokens.total_tokens,
      },
    });

    await completeAuditRecord({
      assessment_id,
      score: finalScore,
      total_tokens: (assessment.tokens_used?.generation?.total_tokens ?? 0) + tokens.total_tokens,
    });

    res.json({
      assessment_id: assessment_id,
      base_score: updatedAssessment.base_score,
      final_score: updatedAssessment.final_score,
      max_possible_score: updatedAssessment.max_possible_score,
      score_percent: updatedAssessment.score_percent,
      plagiarism_deduction_amount: updatedAssessment.plagiarism_deduction_amount,
      plagiarism_deduction_percent: updatedAssessment.plagiarism_deduction_percent,
      per_topic_scores: updatedAssessment.per_topic_scores,
      feedback: updatedAssessment.feedback_json.feedback,
      individual_scores: updatedAssessment.feedback_json.individual_scores,
      individual_feedback: updatedAssessment.feedback_json.individual_feedback,
      plagiarism_risk: updatedAssessment.plagiarism_risk,
      plagiarism_notes: updatedAssessment.plagiarism_notes,
      completed_at: updatedAssessment.completed_at,
    });
  } catch (error) {
    console.error('Error submitting assessment:', error);
    res.status(500).json({ error: 'Failed to evaluate assessment' });
  }
});

export default router;
