import { query, queryOne } from '../db';

export interface LeaderboardEntry {
  rank: number;
  student_email: string;
  student_name: string;
  total_score: number;
  num_assessments: number;
  month_year: string;
}

export async function calculateMonthlyLeaderboard(date: Date): Promise<LeaderboardEntry[]> {
  // Get first day of the month
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1);

  // Get all assessments for the month, grouped by student
  const results = await query(
    `SELECT
      a.student_email,
      s.name as student_name,
      SUM(a.final_score) as total_score,
      COUNT(*) as num_assessments,
      ROW_NUMBER() OVER (ORDER BY SUM(a.final_score) DESC) as rank
    FROM assessments a
    JOIN students s ON a.student_email = s.email
    WHERE a.created_at >= $1 AND a.created_at < $2 AND a.completed_at IS NOT NULL
    GROUP BY a.student_email, s.name
    ORDER BY total_score DESC`,
    [monthStart, monthEnd]
  );

  return results as LeaderboardEntry[];
}

export async function getMonthlyLeaderboard(date: Date): Promise<LeaderboardEntry[]> {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);

  // Try to get from cache first
  const cached = await query(
    `SELECT rank, student_email, student_name, total_score, num_assessments, month_year
    FROM leaderboard_entries
    WHERE month_year = $1
    ORDER BY rank ASC`,
    [monthStart]
  );

  if (cached.length > 0) {
    return cached as LeaderboardEntry[];
  }

  // If not cached, calculate and store
  const entries = await calculateMonthlyLeaderboard(date);

  // Store in cache
  for (const entry of entries) {
    await queryOne(
      `INSERT INTO leaderboard_entries
      (rank, student_email, student_name, total_score, num_assessments, month_year)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (student_email, month_year)
      DO UPDATE SET
        rank = $1, total_score = $4, num_assessments = $5, created_at = NOW()`,
      [entry.rank, entry.student_email, entry.student_name, entry.total_score, entry.num_assessments, monthStart]
    );
  }

  return entries;
}

export async function refreshLeaderboard(date: Date): Promise<void> {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);

  // Delete old entries for this month
  await query(
    'DELETE FROM leaderboard_entries WHERE month_year = $1',
    [monthStart]
  );

  // Recalculate
  const entries = await calculateMonthlyLeaderboard(date);

  // Store new entries
  for (const entry of entries) {
    await queryOne(
      `INSERT INTO leaderboard_entries
      (rank, student_email, student_name, total_score, num_assessments, month_year)
      VALUES ($1, $2, $3, $4, $5, $6)`,
      [entry.rank, entry.student_email, entry.student_name, entry.total_score, entry.num_assessments, monthStart]
    );
  }
}

export async function getCurrentMonthLeaderboard(): Promise<LeaderboardEntry[]> {
  return getMonthlyLeaderboard(new Date());
}
