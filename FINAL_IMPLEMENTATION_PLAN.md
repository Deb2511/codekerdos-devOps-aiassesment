# CodeKerdos Final Implementation Plan - Complete Feature Set

## ✅ User Specifications (Confirmed)

### 1. Copy-Paste Blocking
- ✅ Block in BOTH self-assessment AND JD-based
- ✅ BUT allow pasting in JD textarea during input phase (before assessment starts)
- ✅ Block copying/pasting in answer box (after assessment starts)

### 2. Question Count (Fixed Options)
- ✅ Remove slider/input field
- ✅ Only 3 options: **6, 8, or 10 questions**
- ✅ Example: 6 questions = max 600 points, 8 = 800, 10 = 1000

### 3. Scoring System (Variable Max)
- ✅ Each question scored 0-100 points
- ✅ Total = Sum of all question scores
- ✅ Then apply plagiarism deduction to total
- ✅ Formula: `Final Score = Base Score - (Base Score × Plagiarism Deduction %)`

### 4. Leaderboard (Monthly, Cumulative)
- ✅ Reset monthly at UTC 00:00 on 1st of month
- ✅ Combine all difficulties (no separate boards)
- ✅ Sum all scores for same student in that month
- ✅ Display: Rank + Name + Total Score
- ✅ Simple, encouraging participation

---

## 📊 Scoring Examples

```
Example 1: 6 Questions, Medium Plagiarism
- Q1: 85, Q2: 72, Q3: 91, Q4: 78, Q5: 88, Q6: 82
- Base Score: 85 + 72 + 91 + 78 + 88 + 82 = 496 points
- Plagiarism Deduction: -10% (medium)
- Final Score: 496 - (496 × 0.10) = 496 - 49.6 = 446 points ≈ 446

Example 2: 8 Questions, High Plagiarism
- Sum of 8 questions: 640 points
- Plagiarism Deduction: -20% (high)
- Final Score: 640 - (640 × 0.20) = 640 - 128 = 512 points

Example 3: 10 Questions, No Plagiarism
- Sum of 10 questions: 850 points
- Plagiarism Deduction: 0%
- Final Score: 850 points
```

---

## 📋 Implementation Checklist

### Phase 1: Core Feature Changes (45 min)
- [ ] Update config: Question count to 6/8/10 only
- [ ] Update TopicSelector component: Radio buttons for 6/8/10
- [ ] Update AssessmentFlow: Variable score calculation
- [ ] Add copy-paste blocking to answer textarea (both modes)
- [ ] Allow copy-paste in JD textarea (not blocked)
- [ ] Update Timer: Keep 5 minutes

### Phase 2: Plagiarism Scoring (30 min)
- [ ] Update backend scoring logic: Deduct from total
- [ ] Store base_score and final_score separately
- [ ] Update ResultsPage: Show deduction clearly
- [ ] Database schema: Add columns if needed

### Phase 3: Leaderboard Foundation (1 hour)
- [ ] Create leaderboard_entries table (monthly snapshots)
- [ ] Create monthly calculation job (cron or trigger)
- [ ] Create Leaderboard.tsx component (empty placeholder)
- [ ] Add `/leaderboard` route in App.tsx
- [ ] Add API endpoint: GET /api/leaderboard

### Phase 4: Testing (30 min)
- [ ] Test 6-question flow end-to-end
- [ ] Test 8-question flow
- [ ] Test 10-question flow
- [ ] Verify scoring with plagiarism deduction
- [ ] Check leaderboard data structure

---

## 🔧 Detailed Changes by File

### 1. Frontend: TopicSelector.tsx

**OLD** (Slider 3-10):
```typescript
const [questionsPerTopic, setQuestionsPerTopic] = useState(5);
<input type="range" min="3" max="10" />
```

**NEW** (Radio 6/8/10):
```typescript
const [totalQuestions, setTotalQuestions] = useState(6);

// In JSX:
<div className="question-options">
  <label>
    <input type="radio" value={6} checked={totalQuestions === 6} onChange={...} />
    6 Questions (600 max points)
  </label>
  <label>
    <input type="radio" value={8} checked={totalQuestions === 8} onChange={...} />
    8 Questions (800 max points)
  </label>
  <label>
    <input type="radio" value={10} checked={totalQuestions === 10} onChange={...} />
    10 Questions (1000 max points)
  </label>
</div>
```

**Changes**: Rename from `questionsPerTopic` to `totalQuestions` and pass total count instead of per-topic.

**Impact**: Backend needs to adjust: `num_questions = totalQuestions` (not `totalQuestions per topic`)

---

### 2. Frontend: AssessmentFlow.tsx

**Add Copy-Paste Prevention** (Both self & JD modes):
```typescript
useEffect(() => {
  // Get answer textarea
  const answerTextarea = document.getElementById('answer-textarea');
  if (!answerTextarea) return;

  // ONLY block in answer textarea, NOT in other inputs
  const blockCopyPaste = (e: ClipboardEvent) => {
    if (e.target === answerTextarea) {
      e.preventDefault();
      showToast("Copy-paste is disabled to encourage original thinking");
    }
  };

  document.addEventListener('paste', blockCopyPaste);
  document.addEventListener('copy', (e) => {
    if (e.target === answerTextarea) e.preventDefault();
  });

  // Prevent right-click on textarea
  answerTextarea.addEventListener('contextmenu', (e) => e.preventDefault());

  return () => {
    document.removeEventListener('paste', blockCopyPaste);
    answerTextarea.removeEventListener('contextmenu', (e) => e.preventDefault());
  };
}, []);

// Keep Timer at 5 minutes
const TIMER_SECONDS = 300; // 5 minutes
```

**Score Calculation** (Variable based on question count):
```typescript
// When submitting answers:
const calculateScore = (answers: Record<string, number>, totalQuestions: number) => {
  const scoredAnswers = Object.values(answers);
  const baseScore = scoredAnswers.reduce((a, b) => a + b, 0);
  
  // baseScore is already the sum (not averaged)
  // e.g., 6 questions × avg 80 = 480 points (not 80)
  
  return baseScore;
};
```

---

### 3. Frontend: JDForm.tsx

**Keep unchanged** - Allow copy-paste in JD textarea:
```typescript
// DO NOT add copy-paste blocking here
// Users need to paste job descriptions
```

---

### 4. Backend: config.ts

**Update question options**:
```typescript
QUESTION_COUNT_OPTIONS: [6, 8, 10] as const,
DEFAULT_QUESTION_COUNT: 6,

// Remove old config
// QUESTIONS_PER_TOPIC: { min: 3, max: 10 }
```

---

### 5. Backend: assessments.ts (routes)

**Update `/start` endpoint**:
```typescript
// OLD:
const numQuestions = req.body.num_questions_per_topic;
const totalQuestions = numQuestions * topics.length;

// NEW:
const totalQuestions = req.body.total_questions; // 6, 8, or 10
// Validate it's one of allowed options
if (![6, 8, 10].includes(totalQuestions)) {
  return res.status(400).json({ error: "Invalid question count" });
}
```

---

### 6. Backend: Scoring Logic (assessments.ts)

**OLD** (Score 0-100, then deduct):
```typescript
const baseScore = result.overall; // 0-100
const penalty = plagiarismPenalty[result.plagiarism_risk] || 0;
const finalScore = Math.round(baseScore * (1 - penalty));
```

**NEW** (Sum all question scores, then deduct):
```typescript
// Scoring returns per-question scores: { q1: 82, q2: 75, q3: 91, ... }
const questionScores = Object.values(result.scores); // [82, 75, 91, ...]
const baseScore = questionScores.reduce((a, b) => a + b, 0); // Sum all

const plagiarismPenaltyMap: Record<string, number> = {
  'none': 0.00,
  'low': 0.05,
  'medium': 0.10,
  'high': 0.20
};

const penalty = plagiarismPenaltyMap[result.plagiarism_risk] || 0;
const deductionAmount = Math.round(baseScore * penalty);
const finalScore = baseScore - deductionAmount;

// Store all values
const assessment = {
  ...existing,
  base_score: baseScore,
  final_score: finalScore,
  plagiarism_deduction_amount: deductionAmount,
  plagiarism_deduction_percent: penalty * 100,
  max_possible_score: totalQuestions * 100 // 600, 800, or 1000
};
```

---

### 7. Backend: db.ts (Schema Updates)

**Add columns to assessments table**:
```sql
ALTER TABLE assessments ADD COLUMN base_score INTEGER;
ALTER TABLE assessments ADD COLUMN final_score INTEGER;
ALTER TABLE assessments ADD COLUMN plagiarism_deduction_amount INTEGER;
ALTER TABLE assessments ADD COLUMN plagiarism_deduction_percent DECIMAL(5, 2);
ALTER TABLE assessments ADD COLUMN max_possible_score INTEGER; -- 600, 800, 1000

-- Index for leaderboard queries (by month)
CREATE INDEX idx_student_month 
ON assessments(student_email, DATE_TRUNC('month', created_at));
```

**Create leaderboard_entries table**:
```sql
CREATE TABLE leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rank INTEGER,
  student_email VARCHAR(255) NOT NULL,
  student_name VARCHAR(255) NOT NULL,
  total_score INTEGER NOT NULL,
  num_assessments INTEGER,
  month_year DATE NOT NULL, -- 2024-10-01
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(student_email, month_year),
  INDEX idx_month_rank (month_year, rank)
);
```

---

### 8. Frontend: ResultsPage.tsx

**Show Score Breakdown**:
```typescript
<div className="score-display">
  <div className="max-possible">
    Max Possible: {assessment.max_possible_score} points
  </div>
  
  <div className="base-score">
    <h3>Base Score: {assessment.base_score}</h3>
    <p className="per-question">
      {assessment.max_possible_score > 0 
        ? `(Average: ${(assessment.base_score / totalQuestions).toFixed(0)}/100 per question)`
        : ''
      }
    </p>
  </div>

  {assessment.plagiarism_deduction_percent > 0 && (
    <div className="plagiarism-deduction">
      <p>Plagiarism Deduction: -{assessment.plagiarism_deduction_percent}%</p>
      <p className="small">(-{assessment.plagiarism_deduction_amount} points)</p>
    </div>
  )}

  <div className="final-score highlight">
    <h2>Final Score: {assessment.final_score}</h2>
  </div>
</div>
```

---

### 9. Frontend: Leaderboard.tsx (New Component)

**Create placeholder** (implement leaderboard logic later):
```typescript
import React, { useState, useEffect } from 'react';
import { api } from '../api/client';

interface LeaderboardEntry {
  rank: number;
  student_name: string;
  total_score: number;
}

export const Leaderboard: React.FC = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date());

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await api.getLeaderboard(month);
        setEntries(response);
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [month]);

  if (loading) return <div>Loading leaderboard...</div>;

  return (
    <div className="leaderboard">
      <h1>Monthly DevOps Assessment Leaderboard</h1>
      <h2>{month.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
      
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Student</th>
            <th>Total Score</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.rank}>
              <td className="rank">#{entry.rank}</td>
              <td className="name">{entry.student_name}</td>
              <td className="score">{entry.total_score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

---

### 10. Frontend: App.tsx (Routes)

**Add leaderboard route**:
```typescript
// In your routing setup
{state === 'landing' && <LandingPage />}
{state === 'leaderboard' && <Leaderboard />}

// Add button to landing page or navbar
<button onClick={() => setState('leaderboard')}>
  View Leaderboard
</button>
```

---

### 11. Backend: routes/leaderboard.ts (New Route)

**GET /api/leaderboard**:
```typescript
import { Router } from 'express';
import { db } from '../db';

const router = Router();

router.get('/leaderboard', async (req, res) => {
  try {
    const monthParam = req.query.month ? new Date(req.query.month as string) : new Date();
    const monthStart = new Date(monthParam.getFullYear(), monthParam.getMonth(), 1);
    const monthEnd = new Date(monthParam.getFullYear(), monthParam.getMonth() + 1, 1);

    // Calculate leaderboard for the month
    const result = await db.query(`
      SELECT 
        student_email,
        (SELECT name FROM students WHERE email = student_email) as student_name,
        SUM(final_score) as total_score,
        COUNT(*) as num_assessments,
        ROW_NUMBER() OVER (ORDER BY SUM(final_score) DESC) as rank
      FROM assessments
      WHERE created_at >= $1 AND created_at < $2
      GROUP BY student_email
      ORDER BY total_score DESC
    `, [monthStart, monthEnd]);

    res.json(result.rows);
  } catch (error) {
    console.error('Leaderboard fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export default router;
```

---

### 12. Backend: utils/prompts.ts (Update Evaluation)

**Modify evaluation prompt to return per-question scores**:
```typescript
export const generateEvaluationPrompt = (
  questions: Array<{ id: string; question: string }>,
  answers: Record<string, string>,
  difficulty: string,
  topics: string[]
) => {
  return `
You are evaluating DevOps interview answers.

Difficulty: ${difficulty}
Topics: ${topics.join(', ')}

Score each answer on a 0-100 scale:
- 0-30: Missing core concepts, wrong approach
- 31-50: Partial understanding, significant gaps
- 51-70: Adequate understanding, minor gaps
- 71-85: Good understanding, slight improvements needed
- 86-100: Excellent understanding, production-ready thinking

For each question, provide a score 0-100.

Also evaluate overall plagiarism risk (none|low|medium|high).

Return ONLY valid JSON (no markdown, no code blocks):
{
  "scores": {
    "q1": 85,
    "q2": 72,
    ...
  },
  "overall": 78,
  "feedback": "2-3 sentences on strengths and growth areas",
  "plagiarism_risk": "medium",
  "plagiarism_notes": "optional context"
}
`;
};
```

---

### 13. Backend: api/client.ts (Frontend API)

**Add leaderboard endpoint**:
```typescript
export const api = {
  // ... existing functions ...

  getLeaderboard: async (month: Date) => {
    const response = await fetch(
      `${API_URL}/leaderboard?month=${month.toISOString()}`,
      { method: 'GET' }
    );
    if (!response.ok) throw new Error('Failed to fetch leaderboard');
    return response.json();
  }
};
```

---

## 📊 Monthly Leaderboard Logic

### Calculation Strategy

**Every 1st of month at UTC 00:00:**

```typescript
// Pseudocode for calculation
const calculateMonthlyLeaderboard = async (monthDate: Date) => {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);

  // Get all assessments in month
  const assessments = await db.query(
    'SELECT student_email, final_score FROM assessments WHERE created_at >= $1 AND created_at < $2',
    [monthStart, monthEnd]
  );

  // Group and sum by student
  const grouped = groupBy(assessments, 'student_email');
  
  const leaderboard = Object.entries(grouped)
    .map(([email, scores]) => ({
      student_email: email,
      total_score: scores.reduce((a, b) => a + b.final_score, 0),
      num_assessments: scores.length
    }))
    .sort((a, b) => b.total_score - a.total_score) // Sort by score DESC
    .map((entry, index) => ({
      rank: index + 1,
      ...entry
    }));

  // Store in leaderboard_entries table
  for (const entry of leaderboard) {
    await db.query(
      'INSERT INTO leaderboard_entries (rank, student_email, student_name, total_score, num_assessments, month_year) VALUES ($1, $2, $3, $4, $5, $6)',
      [entry.rank, entry.student_email, entry.student_name, entry.total_score, entry.num_assessments, monthStart]
    );
  }
};
```

### Optional: Cron Job (Node.js)

```typescript
import cron from 'node-cron';

// Run at 00:00 UTC on 1st of every month
cron.schedule('0 0 1 * *', async () => {
  console.log('Calculating monthly leaderboard...');
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  await calculateMonthlyLeaderboard(lastMonth);
});
```

---

## 🧪 Testing Scenarios

### Test 1: 6-Question Assessment
```
Student: john@example.com
Questions: 6 (Linux, Docker, K8s)
Scores: 85, 72, 91, 78, 88, 82
Base: 496 points
Plagiarism: Medium (-10%)
Final: 446 points ✓
```

### Test 2: 10-Question Assessment
```
Student: jane@example.com
Questions: 10
Avg: 80/question
Base: 800 points
Plagiarism: High (-20%)
Final: 640 points ✓
```

### Test 3: Leaderboard
```
Student 1: 446 + 500 = 946 (2 assessments)
Student 2: 640 + 600 = 1240 (2 assessments)
Student 3: 380 (1 assessment)

Ranked:
#1 Student 2: 1240
#2 Student 1: 946
#3 Student 3: 380
```

---

## 📋 File Modification Summary

| File | Type | Change |
|------|------|--------|
| TopicSelector.tsx | Frontend | Radio buttons 6/8/10 |
| AssessmentFlow.tsx | Frontend | Copy-paste block, 5min timer |
| JDForm.tsx | Frontend | Keep pasting enabled |
| ResultsPage.tsx | Frontend | Show score breakdown |
| Leaderboard.tsx | Frontend | New component (placeholder) |
| App.tsx | Frontend | Add leaderboard route |
| config.ts | Backend | Update question options |
| assessments.ts | Backend | Update scoring logic |
| db.ts | Backend | Add schema columns |
| leaderboard.ts | Backend | New endpoint |
| prompts.ts | Backend | Update evaluation prompt |
| client.ts | Frontend API | Add getLeaderboard() |

---

## ⏱️ Time Estimate

- **Frontend changes**: 45 min
- **Backend changes**: 45 min
- **Database schema**: 15 min
- **Leaderboard foundation**: 30 min
- **Testing**: 30 min
- **Total**: ~2.5 hours

---

## ✅ Ready to Implement?

All decisions confirmed:
- ✅ Copy-paste blocking both modes (but allow JD textarea)
- ✅ Question counts: 6, 8, 10 only
- ✅ Scoring: Sum of all questions, then plagiarism deduction
- ✅ Leaderboard: Monthly (UTC), all difficulties, sum all scores, rank + name + score

**Shall I start with Phase 1 (config and frontend)? 🚀**

