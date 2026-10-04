# CodeKerdos DevOps Assessment Platform

A modern web-based DevOps assessment platform that evaluates technical knowledge through scenario-based questions. Candidates can choose between self-assessments and job-description-based assessments with immediate AI-powered feedback.

## Features

- **Dual Assessment Modes**
  - **Self Assessment**: Test knowledge across 9 DevOps topics (Linux, Networking, Git, AWS, Terraform, Docker, Kubernetes, CI/CD, Observability)
  - **JD-Based Assessment**: Get evaluated against specific job description requirements

- **Two Difficulty Levels**: Junior and Senior with appropriate question complexity

- **Scenario-Based Questions**: Product company-style interview questions focusing on real-world scenarios

- **Instant AI Evaluation**: Claude AI evaluates answers and provides detailed feedback

- **Plagiarism Detection**: Automatic plagiarism risk assessment

- **Database Storage**: PostgreSQL backend stores student results with name, email, topics, scores, and feedback

- **No Question History**: Fresh questions generated each time (no canned questions)

- **No Interim Feedback**: Results shown only at the end to prevent answer influence

## Technology Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **AI**: Anthropic Claude API (Haiku model)

### Frontend
- **Framework**: React 18+ with TypeScript
- **Styling**: CSS3 with responsive design
- **State Management**: React hooks

### Infrastructure
- **Database Setup**: Docker Compose with PostgreSQL 15
- **Development**: Local development environment

## Project Structure

```
codekudos-assessment/
├── backend/
│   ├── src/
│   │   ├── server.ts           # Express server setup
│   │   ├── config.ts           # Configuration & constants
│   │   ├── db.ts               # PostgreSQL connection
│   │   ├── routes/
│   │   │   ├── assessments.ts  # Assessment endpoints
│   │   │   └── results.ts      # Results endpoints
│   │   ├── services/
│   │   │   ├── claudeService.ts # Question generation & evaluation
│   │   │   └── dbService.ts     # Database operations
│   │   └── utils/
│   │       ├── prompts.ts      # Claude prompts
│   │       └── validation.ts   # Input validation
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── LandingPage.tsx
│   │   │   ├── StudentForm.tsx
│   │   │   ├── TopicSelector.tsx
│   │   │   ├── JDForm.tsx
│   │   │   ├── AssessmentFlow.tsx
│   │   │   ├── ResultsPage.tsx
│   │   │   └── Timer.tsx
│   │   ├── api/
│   │   │   └── client.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   └── App.css
│   ├── public/
│   │   └── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── docker-compose.yml
└── README.md
```

## Quick Start

### Prerequisites
- Node.js 16+ and npm/yarn
- PostgreSQL 13+ (or Docker)
- Anthropic API key

### 1. Database Setup

Using Docker Compose:
```bash
docker-compose up -d
```

The PostgreSQL database will be available at `localhost:5432` with credentials:
- User: `postgres`
- Password: `postgres`
- Database: `codekudos`

### 2. Backend Setup

```bash
cd backend

# Copy environment configuration
cp .env.example .env

# Edit .env and add your Anthropic API key
# ANTHROPIC_API_KEY=sk-ant-your-key-here

# Install dependencies
npm install

# Development mode with auto-reload
npm run dev

# Or build and start
npm run build
npm start
```

Backend runs on `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend

# Copy environment configuration
cp .env.example .env

# Install dependencies
npm install

# Development mode with hot reload
npm start

# Or build for production
npm run build
```

Frontend runs on `http://localhost:3000`

## API Endpoints

### Assessment Endpoints

**POST /api/assessments/start**
- Start a self-assessment
- Request: `{name, email, topics[], difficulty, num_questions_per_topic}`
- Response: `{assessment_id, questions[], total_questions, tokens_used}`

**POST /api/assessments/jd-start**
- Start a JD-based assessment
- Request: `{name, email, jd_text, difficulty, num_questions?}`
- Response: `{assessment_id, questions[], total_questions, inferred_topics, tokens_used}`

**POST /api/assessments/:id/submit**
- Submit answers and get evaluation
- Request: `{answers: {q_id: "answer text", ...}}`
- Response: `{score, per_topic_scores, feedback, individual_scores, plagiarism_risk, plagiarism_notes}`

### Results Endpoints

**GET /api/results/assessment/:id**
- Fetch a specific assessment result
- Response: Full assessment record with all details

**GET /api/results/student/:email**
- Fetch all assessments for a student
- Response: `{email, assessments[], total}`

## Database Schema

### students table
```sql
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### assessments table
```sql
CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_email VARCHAR(255) NOT NULL REFERENCES students(email),
  assessment_type VARCHAR(50) NOT NULL, -- 'self' or 'jd'
  difficulty VARCHAR(20) NOT NULL, -- 'junior' or 'senior'
  topics JSONB NOT NULL, -- ["linux", "kubernetes", ...]
  questions JSONB NOT NULL, -- Generated questions
  answers JSONB NOT NULL, -- Candidate's answers
  score INTEGER NOT NULL, -- 0-100
  per_topic_scores JSONB NOT NULL,
  feedback_json JSONB NOT NULL,
  plagiarism_risk VARCHAR(20),
  plagiarism_notes TEXT,
  tokens_used JSONB,
  jd_text TEXT, -- For JD assessments
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);
```

## Assessment Flow

1. **Landing Page** - Choose assessment type (Self or JD)
2. **Student Info** - Enter name and email
3. **Configuration**
   - Self: Select topics (1+), difficulty, questions per topic
   - JD: Paste job description, select difficulty
4. **Question Generation** - Claude AI generates scenario-based questions
5. **Assessment** - Answer questions one at a time with 2-min timer
6. **Evaluation** - Claude AI scores answers and detects plagiarism
7. **Results** - Display score, feedback, per-topic breakdown, plagiarism risk

## Configuration

### Backend Environment Variables

```bash
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/codekudos
ANTHROPIC_API_KEY=sk-ant-your-key-here
CLAUDE_TIMEOUT_SECS=15
```

### Frontend Environment Variables

```bash
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ASSESSMENT_TIMEOUT_MINS=2
```

## Topics Supported

### Self Assessment
- **Linux**: System administration, commands, troubleshooting
- **Networking**: DNS, load balancing, network policies
- **Git**: Version control, branching, collaboration
- **AWS**: Cloud services, infrastructure
- **Terraform**: IaC, state management
- **Docker**: Containers, images, networking
- **Kubernetes**: Architecture, deployments
- **CI/CD**: Pipeline design, automation
- **Observability**: Monitoring, logging, metrics

### JD-Based Assessment
- Topics are extracted from the provided job description
- Questions are generated to match role requirements

## Question Characteristics

- **Scenario-Based**: Real production scenarios
- **1-2 Sentences**: Concise, focused questions
- **No Code**: No code snippets or scripts
- **Action-Oriented**: "How would you...", "Design...", "Troubleshoot..."
- **Difficulty-Appropriate**: Different depth for junior vs senior

## Scoring

- **Scale**: 0-100
- **Calculation**: Average of per-topic scores
- **Per-Question**: 0-10 scale evaluated by Claude
- **Difficulty Adjustments**: Rubric adapts based on difficulty level

## Plagiarism Detection

Claude AI automatically flags suspicious answers based on:
- Polished language inconsistent with other answers
- Unusually long or structured responses
- Suspicious phrase repetition
- Overall writing consistency

Risk levels: **none**, **low**, **high**

## Future Enhancements

- Leaderboard/dashboard for comparing scores
- Email notifications on completion
- Admin panel for analytics
- Retry limits per student
- Assessment history tracking
- Score improvement tracking
- PDF export of results
- Integration with ATS systems

## Troubleshooting

### Backend Issues

**Database connection fails**
```bash
# Verify Docker container is running
docker ps

# Check PostgreSQL logs
docker logs codekudos-db

# Verify credentials in .env
```

**Claude API errors**
```bash
# Verify API key is correct
# Check account has available credits
# Verify network connectivity
```

### Frontend Issues

**API connection fails**
```bash
# Verify backend is running on port 5000
# Check REACT_APP_API_URL in .env
# Check CORS is enabled (should be by default)
```

**Styling issues**
```bash
# Clear npm cache: npm cache clean --force
# Reinstall dependencies: rm -rf node_modules && npm install
```

## Production Deployment

### Backend
- Build: `npm run build`
- Run: `npm start`
- Environment: Set all `.env` variables
- Database: Use managed PostgreSQL (AWS RDS, Azure, etc.)

### Frontend
- Build: `npm run build`
- Serve: Use static hosting (Vercel, Netlify, AWS S3, etc.)
- Configure `REACT_APP_API_URL` to production backend

## License

Proprietary - CodeKerdos DevOps Assessment Platform

## Support

For issues or questions, please contact the development team.
