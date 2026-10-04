import { Router, Request, Response } from 'express';
import { getCurrentMonthLeaderboard, getMonthlyLeaderboard } from '../services/leaderboardService';

const router = Router();

interface LeaderboardQuery {
  month?: string;
}

router.get('/', async (req: Request<{}, {}, {}, LeaderboardQuery>, res: Response) => {
  try {
    const { month } = req.query;

    // Parse month parameter (format: YYYY-MM or ISO date string)
    let targetDate: Date;
    if (month) {
      targetDate = new Date(month);
      if (isNaN(targetDate.getTime())) {
        return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM or ISO date string.' });
      }
    } else {
      targetDate = new Date();
    }

    // Get leaderboard for the month
    const leaderboard = await getMonthlyLeaderboard(targetDate);

    const monthYear = targetDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    res.json({
      month: monthYear,
      month_year: targetDate.toISOString().split('T')[0].substring(0, 7), // YYYY-MM
      leaderboard,
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export default router;
