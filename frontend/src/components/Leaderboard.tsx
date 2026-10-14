import React, { useState, useEffect } from 'react';
import { getLeaderboard } from '../api/client';
import './Leaderboard.css';

interface LeaderboardEntry {
  rank: number;
  student_name: string;
  total_score: number;
  num_assessments: number;
}

export const Leaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [monthYear, setMonthYear] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().substring(0, 7));

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedMonth]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getLeaderboard(selectedMonth);
      setLeaderboard(data.leaderboard);
      setMonthYear(data.month);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard');
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  const getMedalEmoji = (rank: number): string => {
    if (rank === 1) return '';
    if (rank === 2) return '';
    if (rank === 3) return '';
    return '';
  };

  const getScoreColor = (score: number): string => {
    if (score >= 800) return '#27ae60'; // green
    if (score >= 600) return '#f39c12'; // orange
    if (score >= 400) return '#e67e22'; // darker orange
    return '#e74c3c'; // red
  };

  const previousMonth = () => {
    const date = new Date(selectedMonth + '-01');
    date.setMonth(date.getMonth() - 1);
    setSelectedMonth(date.toISOString().substring(0, 7));
  };

  const nextMonth = () => {
    const date = new Date(selectedMonth + '-01');
    date.setMonth(date.getMonth() + 1);
    const today = new Date();
    if (date <= today) {
      setSelectedMonth(date.toISOString().substring(0, 7));
    }
  };

  const canGoNext = () => {
    const date = new Date(selectedMonth + '-01');
    date.setMonth(date.getMonth() + 1);
    const today = new Date();
    return date <= today;
  };

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-container">
        <div className="leaderboard-header">
          <h1>Monthly DevOps Assessment Leaderboard</h1>
          <p className="subtitle">Celebrating top performers and encouraging participation</p>
        </div>

        <div className="leaderboard-controls">
          <button className="nav-button" onClick={previousMonth} title="Previous month">
            ← Previous
          </button>
          <h2 className="month-display">{monthYear}</h2>
          <button className="nav-button" onClick={nextMonth} disabled={!canGoNext()} title="Next month">
            Next →
          </button>
        </div>

        {loading && (
          <div className="loading">
            <p>Loading leaderboard...</p>
          </div>
        )}

        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && leaderboard.length === 0 && (
          <div className="empty-state">
            <p>No assessments completed yet this month.</p>
            <p>Start an assessment to appear on the leaderboard!</p>
          </div>
        )}

        {!loading && !error && leaderboard.length > 0 && (
          <div className="leaderboard-table">
            <div className="table-header">
              <div className="col-rank">Rank</div>
              <div className="col-name">Student</div>
              <div className="col-score">Total Score</div>
              <div className="col-assessments">Assessments</div>
            </div>

            {leaderboard.map((entry) => (
              <div key={entry.rank} className={`table-row rank-${entry.rank}`}>
                <div className="col-rank">
                  {getMedalEmoji(entry.rank)} {entry.rank}
                </div>
                <div className="col-name">{entry.student_name}</div>
                <div className="col-score" style={{ color: getScoreColor(entry.total_score) }}>
                  <strong>{entry.total_score}</strong>
                </div>
                <div className="col-assessments">
                  {entry.num_assessments} {entry.num_assessments === 1 ? 'test' : 'tests'}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="leaderboard-footer">
          <p>Higher scores and more attempts = higher rankings!</p>
          <p>Take another assessment to improve your position.</p>
        </div>

        <div className="leaderboard-actions">
          <button className="btn btn-primary" onClick={() => (window.location.href = '/')}>
            ← Back to Assessments
          </button>
        </div>
      </div>
    </div>
  );
};
