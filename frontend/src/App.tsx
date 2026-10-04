import React, { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { StudentForm } from './components/StudentForm';
import { TopicSelector } from './components/TopicSelector';
import { JDForm } from './components/JDForm';
import { AssessmentFlow } from './components/AssessmentFlow';
import { ResultsPage } from './components/ResultsPage';
import { Leaderboard } from './components/Leaderboard';
import { startSelfAssessment, startJDAssessment, submitAnswers } from './api/client';
import { Question, SubmitAnswersResponse } from './types';
import './App.css';

type AppState =
  | 'landing'
  | 'student_form_self'
  | 'student_form_jd'
  | 'topic_selector'
  | 'jd_form'
  | 'assessment'
  | 'results'
  | 'leaderboard';

interface AssessmentState {
  type: 'self' | 'jd';
  assessmentId: string;
  questions: Question[];
  name: string;
  email: string;
  difficulty: 'junior' | 'senior';
  topics: string[];
}

interface ResultsState {
  assessmentType: 'self' | 'jd';
  results: SubmitAnswersResponse;
}

export const App: React.FC = () => {
  const [state, setState] = useState<AppState>('landing');
  const [assessmentState, setAssessmentState] = useState<AssessmentState | null>(null);
  const [resultsState, setResultsState] = useState<ResultsState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Landing page handlers
  const handleSelectSelf = () => {
    setState('student_form_self');
  };

  const handleSelectJD = () => {
    setState('student_form_jd');
  };

  const handleSelectLeaderboard = () => {
    setState('leaderboard');
  };

  // Student form handlers
  const handleStudentFormNext = (name: string, email: string) => {
    if (state === 'student_form_self') {
      setState('topic_selector');
      setAssessmentState({
        type: 'self',
        assessmentId: '',
        questions: [],
        name,
        email,
        difficulty: 'junior',
        topics: [],
      });
    } else {
      setState('jd_form');
      setAssessmentState({
        type: 'jd',
        assessmentId: '',
        questions: [],
        name,
        email,
        difficulty: 'junior',
        topics: [],
      });
    }
  };

  // Topic selector handlers
  const handleTopicSelectorNext = async (topics: string[], difficulty: 'junior' | 'senior', numQuestions: number) => {
    if (!assessmentState) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await startSelfAssessment(
        assessmentState.name,
        assessmentState.email,
        topics,
        difficulty,
        numQuestions
      );

      setAssessmentState({
        ...assessmentState,
        assessmentId: response.assessment_id,
        questions: response.questions,
        difficulty,
        topics,
      });

      setState('assessment');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start assessment');
    } finally {
      setIsLoading(false);
    }
  };

  // JD form handlers
  const handleJDFormNext = async (jdText: string, difficulty: 'junior' | 'senior', totalQuestions: number) => {
    if (!assessmentState) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await startJDAssessment(
        assessmentState.name,
        assessmentState.email,
        jdText,
        difficulty,
        totalQuestions
      );

      setAssessmentState({
        ...assessmentState,
        assessmentId: response.assessment_id,
        questions: response.questions,
        difficulty,
        topics: response.inferred_topics || [],
      });

      setState('assessment');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start assessment');
    } finally {
      setIsLoading(false);
    }
  };

  // Assessment submission handler
  const handleAssessmentSubmit = async (answers: Record<string, string>) => {
    if (!assessmentState) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await submitAnswers(assessmentState.assessmentId, answers);

      setResultsState({
        assessmentType: assessmentState.type,
        results: response,
      });

      setState('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit assessment');
    } finally {
      setIsLoading(false);
    }
  };

  // New assessment handler
  const handleNewAssessment = () => {
    setState('landing');
    setAssessmentState(null);
    setResultsState(null);
    setError('');
  };

  // Back handlers
  const handleBack = () => {
    switch (state) {
      case 'student_form_self':
      case 'student_form_jd':
        setState('landing');
        break;
      case 'topic_selector':
        setState('student_form_self');
        break;
      case 'jd_form':
        setState('student_form_jd');
        break;
      default:
        break;
    }
    setError('');
  };

  if (error && state !== 'landing' && state !== 'results') {
    return (
      <div className="error-container">
        <div className="error-box">
          <h2>❌ Error</h2>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => setState('landing')}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {state === 'landing' && (
        <LandingPage onSelectSelf={handleSelectSelf} onSelectJD={handleSelectJD} onSelectLeaderboard={handleSelectLeaderboard} />
      )}

      {state === 'leaderboard' && <Leaderboard />}

      {state === 'student_form_self' && (
        <StudentForm onNext={handleStudentFormNext} onBack={handleBack} assessmentType="self" />
      )}

      {state === 'student_form_jd' && (
        <StudentForm onNext={handleStudentFormNext} onBack={handleBack} assessmentType="jd" />
      )}

      {state === 'topic_selector' && (
        <TopicSelector onNext={handleTopicSelectorNext} onBack={handleBack} />
      )}

      {state === 'jd_form' && assessmentState && (
        <JDForm onNext={handleJDFormNext} onBack={handleBack} isLoading={isLoading} />
      )}

      {state === 'assessment' && assessmentState && (
        <AssessmentFlow
          assessmentId={assessmentState.assessmentId}
          questions={assessmentState.questions}
          onSubmit={handleAssessmentSubmit}
          isLoading={isLoading}
        />
      )}

      {state === 'results' && resultsState && (
        <ResultsPage
          results={resultsState.results}
          assessmentType={resultsState.assessmentType}
          onNewAssessment={handleNewAssessment}
        />
      )}
    </div>
  );
};

export default App;
