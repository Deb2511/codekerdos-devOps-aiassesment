import React, { useState } from 'react';
import { TOPIC_LIST } from '../types';
import './TopicSelector.css';

interface TopicSelectorProps {
  onNext: (topics: string[], difficulty: 'junior' | 'senior', totalQuestions: number) => void;
  onBack: () => void;
}

export const TopicSelector: React.FC<TopicSelectorProps> = ({ onNext, onBack }) => {
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<'junior' | 'senior'>('junior');
  const [totalQuestions, setTotalQuestions] = useState(6);
  const [error, setError] = useState('');

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
    setError('');
  };

  const handleNext = () => {
    if (selectedTopics.length === 0) {
      setError('Please select at least one topic');
      return;
    }
    onNext(selectedTopics, difficulty, totalQuestions);
  };

  return (
    <div className="topic-selector">
      <div className="selector-card">
        <h2>Select Topics & Difficulty</h2>

        <div className="selector-section">
          <h3>Topics (select 1 or more)</h3>
          <div className="topics-grid">
            {TOPIC_LIST.map((topic) => (
              <label key={topic.key} className="topic-checkbox">
                <input
                  type="checkbox"
                  checked={selectedTopics.includes(topic.key)}
                  onChange={() => toggleTopic(topic.key)}
                />
                <span className="checkbox-label">
                  <strong>{topic.label}</strong>
                  <small>{topic.description}</small>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="selector-section">
          <h3>Difficulty Level</h3>
          <div className="difficulty-options">
            <label className="radio-option">
              <input
                type="radio"
                name="difficulty"
                value="junior"
                checked={difficulty === 'junior'}
                onChange={(e) => setDifficulty(e.target.value as 'junior' | 'senior')}
              />
              <span>
                <strong>Junior</strong>
                <small>Fundamentals & core concepts</small>
              </span>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="difficulty"
                value="senior"
                checked={difficulty === 'senior'}
                onChange={(e) => setDifficulty(e.target.value as 'junior' | 'senior')}
              />
              <span>
                <strong>Senior</strong>
                <small>Advanced scenarios & design</small>
              </span>
            </label>
          </div>
        </div>

        <div className="selector-section">
          <h3>Total Number of Questions</h3>
          <div className="question-options">
            <label className="radio-option">
              <input
                type="radio"
                name="totalQuestions"
                value={6}
                checked={totalQuestions === 6}
                onChange={(e) => setTotalQuestions(parseInt(e.target.value))}
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
              />
              <span>
                <strong>10 Questions</strong>
                <small>1000 max points (≈17 min)</small>
              </span>
            </label>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="button-group">
          <button className="btn btn-secondary" onClick={onBack}>
            ← Back
          </button>
          <button className="btn btn-primary" onClick={handleNext}>
            Start Assessment →
          </button>
        </div>
      </div>
    </div>
  );
};
