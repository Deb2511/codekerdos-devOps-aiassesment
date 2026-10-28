import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  PORT: parseInt(process.env.PORT || '5000'),
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Database
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/codekudos',
  // Records older than this many days are deleted by the retention job
  RETENTION_DAYS: parseInt(process.env.RETENTION_DAYS || '30'),

  // Claude API
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  CLAUDE_MODEL: 'claude-haiku-4-5-20251001',
  // Timeout for question generation (start endpoints)
  CLAUDE_TIMEOUT_SECS: parseInt(process.env.CLAUDE_TIMEOUT_SECS || '60'),
  CLAUDE_MAX_TOKENS: 4000, // Scenario questions with artifacts need more room than the old 2000
  EVALUATION_MAX_TOKENS: 6000,
  EVALUATION_TIMEOUT_SECS: 90,

  // Assessment Configuration
  // Each question has QUESTION_TIME_SECS. A submit is accepted until the total time plus SUBMIT_GRACE_SECS.
  QUESTION_TIME_SECS: 300,
  SUBMIT_GRACE_SECS: 180,
  QUESTION_COUNT_OPTIONS: [6, 8, 10] as const,
  DEFAULT_QUESTION_COUNT: 6,

  // Topics for self-assessment (no subtopics)
  SELF_ASSESSMENT_TOPICS: {
    'linux': 'Linux commands, system administration, and troubleshooting',
    'networking': 'Networking fundamentals, DNS, load balancing, and network policies',
    'git': 'Git version control, branching strategies, and collaboration workflows',
    'aws': 'AWS services, infrastructure, and cloud architecture',
    'terraform': 'Infrastructure as Code, state management, and resource provisioning',
    'docker': 'Container fundamentals, images, and container networking',
    'kubernetes': 'Kubernetes architecture, deployments, and troubleshooting',
    'cicd': 'CI/CD pipeline design, automation, and best practices',
    'observability': 'Monitoring, logging, metrics, and observability tools',
    'sre': 'Site reliability engineering: SLOs and error budgets, incident response and postmortems, on-call and alerting, capacity planning, reliability design, toil reduction, and failure testing'
  },

  // Difficulty levels
  DIFFICULTY_LEVELS: ['junior', 'senior'] as const,

  // Assessment types
  ASSESSMENT_TYPES: ['self', 'jd'] as const,
};
