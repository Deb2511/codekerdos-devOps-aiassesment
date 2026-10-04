# CodeKerdos DevOps Assessment - Quick Start Guide

## ⚡ 5-Minute Setup

### 1. Prerequisites Check
```bash
node --version  # Should be 16+
npm --version   # Should be 8+
docker --version  # Optional, for PostgreSQL
```

### 2. Clone/Navigate to Project
```bash
cd /path/to/codekudos-assessment
```

### 3. Setup Database (Choose One)

**Option A: Using Docker** (Recommended)
```bash
docker-compose up -d
# PostgreSQL will be available at localhost:5432
```

**Option B: Existing PostgreSQL**
```bash
# Create database manually
createdb -U postgres codekudos

# Or update DATABASE_URL in backend/.env
```

### 4. Backend Setup
```bash
cd backend

# Copy environment template
cp .env.example .env

# Edit .env - Add your Anthropic API key
# ANTHROPIC_API_KEY=sk-ant-your-key-here

# Install dependencies (already done if you ran earlier)
npm install

# Start backend
npm run dev
# Backend runs at http://localhost:5000
```

### 5. Frontend Setup (New Terminal)
```bash
cd frontend

# Copy environment template
cp .env.example .env

# Install dependencies (already done if you ran earlier)
npm install --legacy-peer-deps

# Start frontend
npm start
# Frontend runs at http://localhost:3000
```

### 6. Test the Application
1. Open browser: `http://localhost:3000`
2. Click "Self Assessment"
3. Enter your name and email
4. Select topics (try: Linux, Kubernetes)
5. Choose "Junior" difficulty
6. Set 3 questions per topic
7. Wait for questions to generate (first time takes 10-15 seconds)
8. Answer questions
9. Submit and see results with AI feedback

---

## 🎯 What You Should See

### Landing Page
- Two large buttons: "Self Assessment" and "JD-Based Assessment"
- Purple gradient background
- Responsive design

### Student Form
- Name and email fields with validation
- Validation messages for invalid input

### Self-Assessment Configuration
- Checkboxes for all 9 topics
- Radio buttons for Junior/Senior difficulty
- Slider for questions per topic (3-10)
- Total question count preview
- Estimated time calculation

### Assessment Flow
- Question number and progress bar
- 2-minute countdown timer
- Large textarea for answer input
- Submit button changes to "Review Answers" on last question
- Skip button to skip questions

### Results Page
- Large score circle (0-100) with grade
- Per-topic score breakdown with bars
- AI-generated feedback
- Individual question scores
- Plagiarism risk indicator
- Option to take another assessment

---

## 🔧 Environment Variables

### Backend (.env)
```
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/codekudos
ANTHROPIC_API_KEY=sk-ant-your-key-here
CLAUDE_TIMEOUT_SECS=15
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ASSESSMENT_TIMEOUT_MINS=2
```

---

## 🚀 Development Workflow

### Backend Development
```bash
cd backend
npm run dev
# Watches for changes with ts-node
# Type check: npm run type-check
# Build: npm run build
```

### Frontend Development
```bash
cd frontend
npm start
# Hot reload on file changes
# TypeScript errors shown in browser
```

### Database Access
```bash
# Connect to database
psql -U postgres -d codekudos

# Check tables
\dt

# Query assessments
SELECT student_email, score, created_at FROM assessments;
```

---

## 🔍 Testing

### Backend Logic Tests (Already Run ✅)
```bash
cd backend
npx ts-node test-logic.ts
# Tests validation, prompts, configuration
```

### Type Checking
```bash
# Backend
cd backend && npm run type-check

# Frontend
cd frontend && npx tsc --noEmit
```

### Build Verification
```bash
# Backend
cd backend && npm run build

# Frontend
cd frontend && npm run build
```

---

## 📝 Available Topics (Self-Assessment)

1. **Linux** - Commands, system admin, troubleshooting
2. **Networking** - DNS, load balancing, network policies
3. **Git** - Version control, branching, collaboration
4. **AWS** - Cloud services, infrastructure
5. **Terraform** - Infrastructure as Code, state management
6. **Docker** - Containers, images, networking
7. **Kubernetes** - Architecture, deployments, troubleshooting
8. **CI/CD** - Pipeline design, automation
9. **Observability** - Monitoring, logging, metrics

---

## 🛠️ Troubleshooting

### Backend Won't Start
```bash
# Check if port 5000 is in use
lsof -i :5000

# Kill process if needed
kill -9 <PID>

# Check database connection
psql -U postgres -d codekudos -c "SELECT 1"

# Verify API key
echo $ANTHROPIC_API_KEY
```

### Frontend Won't Start
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules
npm install --legacy-peer-deps
npm start
```

### Database Connection Failed
```bash
# Check if PostgreSQL is running
docker ps  # If using Docker

# Or check local PostgreSQL
psql -U postgres

# Verify DATABASE_URL format in .env
```

### Claude API Errors
```bash
# Check API key is correct
# Verify account has available credits at https://console.anthropic.com
# Check network connectivity
# Verify API key in backend/.env has no extra spaces
```

---

## 📊 Expected Performance

| Operation | Time |
|-----------|------|
| Question Generation | 3-10 seconds |
| Answer Evaluation | 2-5 seconds |
| Database Query | <100ms |
| Page Load | <1 second |
| Frontend Build | ~30 seconds |
| Backend Build | ~3 seconds |

---

## 🎓 Assessment Workflow

```
1. User chooses Self or JD Assessment
   ↓
2. Enters name and email
   ↓
3. [Self] Selects topics + difficulty → [JD] Pastes job description + difficulty
   ↓
4. System generates scenario-based questions
   ↓
5. User answers questions (one at a time, 2-min timer)
   ↓
6. User reviews and submits answers
   ↓
7. Claude AI evaluates answers
   ↓
8. System displays results with feedback
   ↓
9. Results stored in database
```

---

## 📦 Project Structure Summary

```
codekudos-assessment/
├── backend/           # Node.js + Express + PostgreSQL
├── frontend/          # React + TypeScript
├── docker-compose.yml # PostgreSQL setup
├── README.md          # Full documentation
├── TEST_RESULTS.md    # Test verification
├── QUICK_START.md     # This file
└── .gitignore
```

---

## ✅ Verification Checklist

Before going to production:
- [ ] Backend compiles: `npm run build`
- [ ] Frontend compiles: `npm run build`
- [ ] Database migrations run on startup
- [ ] Claude API key is valid
- [ ] Environment variables set in both directories
- [ ] All 9 topics appear in topic selector
- [ ] Timer works (countdown and auto-advance)
- [ ] Questions generated successfully
- [ ] Answers evaluated and stored
- [ ] Scores calculated correctly

---

## 🎉 You're Ready!

The application is fully functional and tested. Start both servers and enjoy using CodeKerdos DevOps Assessment!

For detailed documentation, see [README.md](./README.md)
