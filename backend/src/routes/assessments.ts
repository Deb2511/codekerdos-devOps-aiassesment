import { Router, Request, Response } from 'express';
import { config } from '../config';
import { generateQuestions, evaluateAnswers } from '../services/claudeService';
import { getOrCreateStudent, createAssessment, updateAssessmentWithResults, getAssessmentById } from '../services/dbService';
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
    const { questions, tokens } = await generateQuestions(difficulty as 'junior' | 'senior', topics, 'self', total_questions);

    // Create assessment record
    const assessment = await createAssessment({
      student_email: email,
      assessment_type: 'self',
      difficulty: difficulty as 'junior' | 'senior',
      topics,
      questions,
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
    const { answers } = req.body;

    // Get assessment
    const assessment = await getAssessmentById(assessment_id);
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    // Validate answers
    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'Invalid answers format' });
    }

    // Build Q&A pairs
    const qaPairs = assessment.questions.map((q) => ({
      question: q.question,
      answer: answers[q.id.toString()] || '',
    }));

    // Evaluate answers
    const { result, tokens } = await evaluateAnswers(assessment.difficulty, assessment.topics, qaPairs);

    // Calculate base score as sum of all question scores (0-100 each)
    const questionScores = assessment.questions.map((q) => result.scores[`q${q.id}`] || 0);
    const baseScore = questionScores.reduce((a, b) => a + b, 0);
    const maxPossibleScore = assessment.questions.length * 100;

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

    // Calculate per-topic scores
    const perTopicScores: Record<string, number> = {};
    assessment.topics.forEach((topic) => {
      const topicQuestions = assessment.questions.filter((q) => q.topic === topic);
      const topicScores = topicQuestions.map((q) => result.scores[`q${q.id}`] || 0);
      perTopicScores[topic] = Math.round(topicScores.reduce((a, b) => a + b, 0) / topicScores.length);
    });

    // Update assessment with results
    const updatedAssessment = await updateAssessmentWithResults(assessment_id, {
      answers,
      score: finalScore,
      base_score: baseScore,
      final_score: finalScore,
      max_possible_score: maxPossibleScore,
      plagiarism_deduction_amount: deductionAmount,
      plagiarism_deduction_percent: plagiarismPenalty * 100,
      per_topic_scores: perTopicScores,
      feedback_json: {
        feedback: result.feedback,
        individual_scores: result.scores,
      },
      plagiarism_risk: result.plagiarism_risk,
      plagiarism_notes: result.plagiarism_notes || '',
      tokens_used: {
        generation: assessment.questions.length * 100, // Approximate
        evaluation: tokens,
        total: tokens,
      },
    });

    res.json({
      assessment_id: assessment_id,
      base_score: updatedAssessment.base_score,
      final_score: updatedAssessment.final_score,
      max_possible_score: updatedAssessment.max_possible_score,
      plagiarism_deduction_amount: updatedAssessment.plagiarism_deduction_amount,
      plagiarism_deduction_percent: updatedAssessment.plagiarism_deduction_percent,
      per_topic_scores: updatedAssessment.per_topic_scores,
      feedback: updatedAssessment.feedback_json.feedback,
      individual_scores: updatedAssessment.feedback_json.individual_scores,
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
