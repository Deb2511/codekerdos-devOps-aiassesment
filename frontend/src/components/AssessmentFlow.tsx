import React, { useState, useEffect } from 'react';
import { Question } from '../types';
import { Timer } from './Timer';
import { VoiceRecorder } from './VoiceRecorder';
import './AssessmentFlow.css';

interface AssessmentFlowProps {
  assessmentId: string;
  questions: Question[];
  onSubmit: (answers: Record<string, string>) => void;
  isLoading?: boolean;
}

type AnswerMode = 'text' | 'voice';

export const AssessmentFlow: React.FC<AssessmentFlowProps> = ({
  questions,
  onSubmit,
  isLoading = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [answerMode, setAnswerMode] = useState<AnswerMode>('text');

  useEffect(() => {
    if (answerMode !== 'text') return;

    const answerTextarea = document.getElementById('answer-input') as HTMLTextAreaElement;
    if (!answerTextarea) return;

    const showToast = (message: string) => {
      alert(message);
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (e.target === answerTextarea) {
        e.preventDefault();
        showToast('Pasting is disabled to encourage original thinking');
      }
    };

    const handleCopy = (e: ClipboardEvent) => {
      if (e.target === answerTextarea) {
        e.preventDefault();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (e.target === answerTextarea) {
        e.preventDefault();
      }
    };

    const handleDragOver = (e: DragEvent) => {
      if (e.target === answerTextarea) {
        e.preventDefault();
      }
    };

    const handleDrop = (e: DragEvent) => {
      if (e.target === answerTextarea) {
        e.preventDefault();
      }
    };

    document.addEventListener('paste', handlePaste);
    document.addEventListener('copy', handleCopy);
    answerTextarea.addEventListener('contextmenu', handleContextMenu);
    answerTextarea.addEventListener('dragover', handleDragOver);
    answerTextarea.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('copy', handleCopy);
      answerTextarea.removeEventListener('contextmenu', handleContextMenu);
      answerTextarea.removeEventListener('dragover', handleDragOver);
      answerTextarea.removeEventListener('drop', handleDrop);
    };
  }, [answerMode]);

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = ((answeredCount + 1) / questions.length) * 100;

  const handleNext = () => {
    if (currentAnswer.trim().length === 0) {
      alert('Please provide an answer before proceeding');
      return;
    }

    const newAnswers = { ...answers, [currentQuestion.id]: currentAnswer };
    setAnswers(newAnswers);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setCurrentAnswer('');
    } else {
      setShowConfirm(true);
    }
  };

  const handleTimeUp = () => {
    const newAnswers = { ...answers, [currentQuestion.id]: currentAnswer };
    setAnswers(newAnswers);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setCurrentAnswer('');
    } else {
      setShowConfirm(true);
    }
  };

  const handleSubmit = () => {
    onSubmit(answers);
  };

  const handleSkip = () => {
    const newAnswers = { ...answers, [currentQuestion.id]: currentAnswer };
    setAnswers(newAnswers);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setCurrentAnswer('');
    } else {
      setShowConfirm(true);
    }
  };

  const handleVoiceAnswer = (transcript: string) => {
    setCurrentAnswer(transcript);
  };

  if (showConfirm) {
    return (
      <div className="assessment-confirm">
        <div className="confirm-card">
          <h2>Ready to submit?</h2>
          <p>You have answered {answeredCount} out of {questions.length} questions.</p>
          <div className="confirm-stats">
            <div className="stat">
              <span className="stat-label">Answered:</span>
              <span className="stat-value">{answeredCount}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Total:</span>
              <span className="stat-value">{questions.length}</span>
            </div>
          </div>
          <div className="button-group">
            <button
              className="btn btn-secondary"
              onClick={() => {
                setShowConfirm(false);
                setCurrentIndex(currentIndex - 1);
              }}
            >
              ← Back
            </button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? '⏳ Evaluating...' : 'Submit & Get Results'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="assessment-flow">
      <div className="flow-header">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="progress-text">
          Question {currentIndex + 1} of {questions.length}
        </div>
      </div>

      <div className="flow-container">
        <div className="flow-card">
          <div className="timer-container">
            <Timer
              initialSeconds={300}
              onTimeUp={handleTimeUp}
              isActive={true}
            />
          </div>

          <div className="question-section">
            <div className="question-topic">{currentQuestion.topic.toUpperCase()}</div>
            <h2>{currentQuestion.question}</h2>
          </div>

          <div className="answer-section">
            <div className="answer-header">
              <label>Your Answer:</label>
              <div className="mode-toggle">
                <button
                  className={`mode-btn ${answerMode === 'text' ? 'active' : ''}`}
                  onClick={() => {
                    setAnswerMode('text');
                    setCurrentAnswer('');
                  }}
                  disabled={isLoading}
                >
                  📝 Text
                </button>
                <button
                  className={`mode-btn ${answerMode === 'voice' ? 'active' : ''}`}
                  onClick={() => {
                    setAnswerMode('voice');
                    setCurrentAnswer('');
                  }}
                  disabled={isLoading}
                >
                  🎤 Voice
                </button>
              </div>
            </div>

            {answerMode === 'text' ? (
              <>
                <textarea
                  id="answer-input"
                  className="answer-input"
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  placeholder="Type your answer here... (be specific and practical)"
                  rows={8}
                  disabled={isLoading}
                  autoFocus
                />
                <small className="hint">
                  Provide a practical, scenario-based answer. Typos are okay, focus on demonstrating your understanding.
                </small>
              </>
            ) : (
              <VoiceRecorder
                onAnswerReceived={handleVoiceAnswer}
                isActive={!isLoading}
              />
            )}
          </div>

          <div className="button-group">
            <button
              className="btn btn-secondary"
              onClick={handleSkip}
              disabled={isLoading}
            >
              Skip
            </button>
            <button
              className="btn btn-primary"
              onClick={handleNext}
              disabled={isLoading || currentAnswer.trim().length === 0}
            >
              {currentIndex === questions.length - 1 ? 'Review Answers →' : 'Next Question →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
