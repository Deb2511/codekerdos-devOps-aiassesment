export type Difficulty = 'junior' | 'senior';
export type AssessmentType = 'self' | 'jd';

export interface Question {
  id: number;
  question: string;
  topic: string;
}

export interface Assessment {
  id: string;
  student_email: string;
  assessment_type: AssessmentType;
  difficulty: Difficulty;
  topics: string[];
  questions: Question[];
  answers: Record<string, string>;
  score: number;
  per_topic_scores: Record<string, number>;
  feedback_json: {
    feedback: string;
    individual_scores: Record<string, number>;
  };
  plagiarism_risk: 'none' | 'low' | 'high';
  plagiarism_notes: string;
  tokens_used: any;
  jd_text: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface StartAssessmentResponse {
  assessment_id: string;
  questions: Question[];
  total_questions: number;
  inferred_topics?: string[];
  tokens_used: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

export interface SubmitAnswersResponse {
  assessment_id: string;
  score: number;
  base_score?: number;
  final_score?: number;
  max_possible_score?: number;
  plagiarism_deduction_amount?: number;
  plagiarism_deduction_percent?: number;
  per_topic_scores: Record<string, number>;
  feedback: string;
  individual_scores: Record<string, number>;
  plagiarism_risk: 'none' | 'low' | 'high';
  plagiarism_notes: string;
  completed_at: string;
}

export const TOPICS = {
  linux: 'Linux commands, system administration, and troubleshooting',
  networking: 'Networking fundamentals, DNS, load balancing, and network policies',
  git: 'Git version control, branching strategies, and collaboration workflows',
  aws: 'AWS services, infrastructure, and cloud architecture',
  terraform: 'Infrastructure as Code, state management, and resource provisioning',
  docker: 'Container fundamentals, images, and container networking',
  kubernetes: 'Kubernetes architecture, deployments, and troubleshooting',
  cicd: 'CI/CD pipeline design, automation, and best practices',
  observability: 'Monitoring, logging, metrics, and observability tools',
};

export const TOPIC_LIST = Object.entries(TOPICS).map(([key, value]) => ({
  key: key as keyof typeof TOPICS,
  label: key.charAt(0).toUpperCase() + key.slice(1),
  description: value,
}));
