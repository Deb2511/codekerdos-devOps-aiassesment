import React from 'react';
import { SubmitAnswersResponse } from '../types';
import './ResultsPage.css';

interface ResultsPageProps {
  results: SubmitAnswersResponse;
  assessmentType: 'self' | 'jd';
  onNewAssessment: () => void;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({
  results,
  assessmentType,
  onNewAssessment,
}) => {
  const getScorePercentage = (score: number, maxScore: number): number => {
    return Math.round((score / maxScore) * 100);
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return '#27ae60'; // green
    if (percentage >= 70) return '#f39c12'; // orange
    if (percentage >= 60) return '#e67e22'; // darker orange
    return '#e74c3c'; // red
  };

  const getScoreGrade = (percentage: number) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    return 'D';
  };

  const scorePercentage = results.score_percent ?? getScorePercentage(results.final_score || results.score, results.max_possible_score || 100);
  const hasPlaguarismDeduction = (results.plagiarism_deduction_percent || 0) > 0;

  return (
    <div className="results-page">
      <div className="results-container">
        {/* Overall Score Section */}
        <div className="overall-score-section">
          <div className="score-breakdown">
            {hasPlaguarismDeduction && (
              <div className="score-breakdown-items">
                <div className="breakdown-item">
                  <div className="breakdown-label">Base Score</div>
                  <div className="breakdown-value">{results.base_score}/{results.max_possible_score}</div>
                </div>
                <div className="breakdown-item deduction">
                  <div className="breakdown-label">Plagiarism Deduction</div>
                  <div className="breakdown-value" style={{ color: '#e74c3c' }}>
                    -{results.plagiarism_deduction_percent || 0}% ({-(results.plagiarism_deduction_amount || 0)} pts)
                  </div>
                </div>
              </div>
            )}
            <div className="score-circle" style={{ borderColor: getScoreColor(scorePercentage) }}>
              <div className="score-value" style={{ color: getScoreColor(scorePercentage) }}>
                {results.final_score || results.score}
              </div>
              <div className="score-label">/ {results.max_possible_score || 100}</div>
              <div className="score-grade">{getScoreGrade(scorePercentage)}</div>
            </div>
          </div>
          <div className="score-interpretation">
            <h2>Assessment Complete!</h2>
            <p className="score-message">
              {scorePercentage >= 80
                ? '🎉 Excellent performance! Strong understanding demonstrated.'
                : scorePercentage >= 70
                  ? '👍 Good job! Solid understanding with some areas to improve.'
                  : '📚 Keep learning! Focus on the growth areas below.'}
            </p>
          </div>
        </div>

        {/* Per-Topic Scores */}
        <div className="per-topic-section">
          <h3>Performance by Topic</h3>
          <div className="topic-scores">
            {Object.entries(results.per_topic_scores).map(([topic, score]) => (
              <div key={topic} className="topic-score-card">
                <div className="topic-name">{topic.charAt(0).toUpperCase() + topic.slice(1)}</div>
                <div className="topic-bar">
                  <div
                    className="topic-bar-fill"
                    style={{
                      width: `${score}%`,
                      backgroundColor: getScoreColor(score),
                    }}
                  ></div>
                </div>
                <div className="topic-score">{score}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Feedback Section */}
        <div className="feedback-section">
          <h3>AI Feedback</h3>
          <div className="feedback-box">
            <p>{results.feedback}</p>
          </div>
        </div>

        {/* Individual Scores and Feedback */}
        <div className="individual-scores-section">
          <h3>Question-by-Question Feedback</h3>
          {Object.entries(results.individual_scores)
            .sort(([a], [b]) => Number(a.slice(1)) - Number(b.slice(1)))
            .map(([question, score], idx) => (
              <div key={question} className="question-feedback-card">
                <div className="question-feedback-header">
                  <span className="question-feedback-title">Question {idx + 1}</span>
                  <span className="score-badge" style={{ backgroundColor: getScoreColor((score as number) * 10) }}>
                    {score as number}/10
                  </span>
                </div>
                <p className="question-feedback-text">
                  {results.individual_feedback?.[question] ?? 'No feedback available.'}
                </p>
              </div>
            ))}
        </div>

        {/* Plagiarism Risk */}
        {results.plagiarism_risk !== 'none' && (
          <div className={`plagiarism-section plagiarism-${results.plagiarism_risk}`}>
            <h3>⚠️ Plagiarism Check</h3>
            <p>
              <strong>Risk Level:</strong> {results.plagiarism_risk.toUpperCase()}
            </p>
            {results.plagiarism_notes && (
              <p>
                <strong>Details:</strong> {results.plagiarism_notes}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="results-actions">
          <button className="btn btn-primary" onClick={onNewAssessment}>
            {assessmentType === 'self' ? '📚 Take Another Self Assessment' : '💼 Take Another JD Assessment'}
          </button>
          <button className="btn btn-secondary" onClick={() => window.location.href = '/'}>
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};
