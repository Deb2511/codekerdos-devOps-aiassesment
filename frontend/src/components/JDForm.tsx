import React, { useState } from 'react';
import './JDForm.css';

interface JDFormProps {
  onNext: (jdText: string, difficulty: 'junior' | 'senior', totalQuestions: number) => void;
  onBack: () => void;
  isLoading?: boolean;
}

export const JDForm: React.FC<JDFormProps> = ({ onNext, onBack, isLoading = false }) => {
  const [jdText, setJDText] = useState('');
  const [difficulty, setDifficulty] = useState<'junior' | 'senior'>('junior');
  const [totalQuestions, setTotalQuestions] = useState(6);
  const [error, setError] = useState('');

  const handleNext = () => {
    if (jdText.trim().length < 50) {
      setError('Please provide a job description (at least 50 characters)');
      return;
    }
    if (jdText.trim().length > 10000) {
      setError('Job description is too long (max 10,000 characters)');
      return;
    }
    onNext(jdText, difficulty, totalQuestions);
  };

  const charCount = jdText.length;
  const charLimit = 10000;

  return (
    <div className="jd-form">
      <div className="form-card">
        <h2>JD-Based Assessment</h2>
        <p className="form-subtitle">Paste your DevOps job description to get custom assessment questions</p>

        <div className="form-section">
          <label htmlFor="jd-textarea">Job Description</label>
          <div className="textarea-container">
            <textarea
              id="jd-textarea"
              value={jdText}
              onChange={(e) => {
                setJDText(e.target.value);
                setError('');
              }}
              placeholder="Paste the job description here. Include key responsibilities, required skills, tech stack, and any specific experience needed..."
              rows={12}
              className={`jd-textarea ${charCount > charLimit ? 'error' : ''}`}
              disabled={isLoading}
            />
            <div className="char-count">
              {charCount} / {charLimit} characters
            </div>
          </div>
          {error && <div className="error-message">{error}</div>}
        </div>

        <div className="form-section">
          <label>Difficulty Level</label>
          <div className="difficulty-options">
            <label className="radio-option">
              <input
                type="radio"
                name="difficulty"
                value="junior"
                checked={difficulty === 'junior'}
                onChange={(e) => setDifficulty(e.target.value as 'junior' | 'senior')}
                disabled={isLoading}
              />
              <span>
                <strong>Junior</strong>
                <small>For candidates new to the role or less experienced</small>
              </span>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="difficulty"
                value="senior"
                checked={difficulty === 'senior'}
                onChange={(e) => setDifficulty(e.target.value as 'junior' | 'senior')}
                disabled={isLoading}
              />
              <span>
                <strong>Senior</strong>
                <small>For experienced candidates with advanced skills</small>
              </span>
            </label>
          </div>
        </div>

        <div className="form-section">
          <label>Total Number of Questions</label>
          <div className="question-options">
            <label className="radio-option">
              <input
                type="radio"
                name="totalQuestions"
                value={6}
                checked={totalQuestions === 6}
                onChange={(e) => setTotalQuestions(parseInt(e.target.value))}
                disabled={isLoading}
              />
              <span>
                <strong>6 Questions</strong>
                <small>600 max points (≈10 min)</small>
              </span>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="totalQuestions"
                value={8}
                checked={totalQuestions === 8}
                onChange={(e) => setTotalQuestions(parseInt(e.target.value))}
                disabled={isLoading}
              />
              <span>
                <strong>8 Questions</strong>
                <small>800 max points (≈13 min)</small>
              </span>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="totalQuestions"
                value={10}
                checked={totalQuestions === 10}
                onChange={(e) => setTotalQuestions(parseInt(e.target.value))}
                disabled={isLoading}
              />
              <span>
                <strong>10 Questions</strong>
                <small>1000 max points (≈17 min)</small>
              </span>
            </label>
          </div>
        </div>

        <div className="form-tips">
          <h4>💡 Tips for best results:</h4>
          <ul>
            <li>Include key responsibilities and technical requirements</li>
            <li>Mention specific tools, frameworks, and technologies</li>
            <li>Describe the team structure and reporting lines</li>
            <li>Highlight what makes this role unique</li>
          </ul>
        </div>

        <div className="button-group">
          <button className="btn btn-secondary" onClick={onBack} disabled={isLoading}>
            ← Back
          </button>
          <button className="btn btn-primary" onClick={handleNext} disabled={isLoading || charCount < 50}>
            {isLoading ? '⏳ Generating Questions...' : 'Generate Assessment Questions →'}
          </button>
        </div>
      </div>
    </div>
  );
};
