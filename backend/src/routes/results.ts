import { Router, Request, Response } from 'express';
import { getAssessmentById, getStudentAssessments } from '../services/dbService';

const router = Router();

// Get assessment by ID
router.get('/assessment/:assessment_id', async (req: Request<{ assessment_id: string }>, res: Response) => {
  try {
    const { assessment_id } = req.params;

    const assessment = await getAssessmentById(assessment_id);
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    res.json(assessment);
  } catch (error) {
    console.error('Error fetching assessment:', error);
    res.status(500).json({ error: 'Failed to fetch assessment' });
  }
});

// Get all assessments for a student
router.get('/student/:email', async (req: Request<{ email: string }>, res: Response) => {
  try {
    const { email } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    const assessments = await getStudentAssessments(email, limit);

    res.json({
      email,
      assessments,
      total: assessments.length,
    });
  } catch (error) {
    console.error('Error fetching student assessments:', error);
    res.status(500).json({ error: 'Failed to fetch assessments' });
  }
});

export default router;
