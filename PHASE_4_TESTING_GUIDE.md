# Phase 4: Comprehensive Testing Guide

## 🚀 Setup Verification

### Prerequisites
- [ ] Node.js 16+ installed: `node --version`
- [ ] npm 8+ installed: `npm --version`
- [ ] PostgreSQL running or Docker available
- [ ] Anthropic API key ready
- [ ] Ports 5000 (backend) and 3000 (frontend) are free

### Database Startup

```bash
# Option 1: Using Docker (Recommended)
docker-compose up -d

# Verify container is running
docker-compose ps

# Wait 5 seconds for initialization
sleep 5

# Option 2: Using local PostgreSQL
psql -U postgres -c "CREATE DATABASE coderkerdos" 2>/dev/null || true
```

### Backend Startup

```bash
cd backend

# Verify .env has API key
cat .env | grep ANTHROPIC_API_KEY

# Install dependencies if needed
npm install

# Start backend (should say "Server running on port 5000")
npm run dev
```

**Expected Output:**
```
Initializing database...
Database initialized successfully
Server running on port 5000 in development mode
```

### Frontend Startup (New Terminal)

```bash
cd frontend

# Install dependencies if needed
npm install --legacy-peer-deps

# Start frontend (should compile successfully)
npm start
```

**Expected Output:**
```
Compiled successfully!
You can now view coderkerdos-frontend in the browser.
Local: http://localhost:3000
```

---

## 📋 Test 1: 6-Question Self-Assessment (Junior)

### Steps

1. **Open http://localhost:3000** ✓
   - Should see landing page with 3 options: Self Assessment, JD-Based, Leaderboard

2. **Click "Self Assessment"**
   - Should navigate to student form

3. **Fill Student Form**
   - Name: `Test User Junior`
   - Email: `testjunior@example.com`
   - Click "Continue"

4. **Select Topics & Questions**
   - Topics: Select `Linux`, `Docker`, `Kubernetes` (3 topics)
   - Difficulty: `Junior`
   - Questions: Select `6 Questions` (600 max points)
   - Click "Start Assessment"

5. **Wait for Questions** (10-15 seconds)
   - Should see "Question 1 of 6"
   - Timer shows "5:00"
   - Question displays topic (LINUX, DOCKER, or KUBERNETES)

6. **Answer Questions**
   - For each of 6 questions:
     - Type answer in textarea (at least 50 characters)
     - Try to copy-paste (should be blocked with message)
     - Click "Next Question" or "Review Answers"
   - Example answers:
     ```
     Q1: "To troubleshoot a Linux service, I would first check the status 
          with systemctl status, then review logs in /var/log/ to identify 
          the root cause of the failure."
     ```

7. **Review & Submit**
   - Should see confirmation: "You have answered 6 out of 6 questions"
   - Click "Submit & Get Results"

8. **Wait for Evaluation** (5-10 seconds)
   - Should show "Evaluating..." while Claude scores answers

9. **View Results**
   - ✅ Should show score breakdown:
     ```
     Base Score: 480/600
     Plagiarism Deduction: 0% (None)
     Final Score: 480/600
     ```
   - ✅ Shows grade (A, B, C, D)
   - ✅ Per-topic scores (Linux, Docker, Kubernetes)
   - ✅ AI feedback paragraph
   - ✅ Individual question scores (6 badges)
   - ✅ No plagiarism warning (none/low = no notice)

### Verification

**Database Check:**
```bash
psql -U postgres -d coderkerdos -c "
SELECT student_email, difficulty, max_possible_score, base_score, 
       final_score, plagiarism_risk, plagiarism_deduction_percent 
FROM assessments 
WHERE student_email = 'testjunior@example.com' 
ORDER BY created_at DESC LIMIT 1;"
```

Expected output:
```
 student_email        | difficulty | max_possible_score | base_score | final_score | plagiarism_risk | plagiarism_deduction_percent
 testjunior@example.com | junior    | 600                | 480        | 480         | none            | 0.00
```

---

## 📋 Test 2: 8-Question Self-Assessment (Senior)

### Steps

1. **Click "Back to Home"** from results
   - Should return to landing page

2. **Click "Self Assessment"**

3. **Fill Student Form**
   - Name: `Test User Senior`
   - Email: `testsenior@example.com`
   - Click "Continue"

4. **Select Topics & Questions**
   - Topics: Select `Terraform`, `AWS`, `Kubernetes` (3 topics)
   - Difficulty: `Senior`
   - Questions: Select `8 Questions` (800 max points)
   - Click "Start Assessment"

5. **Answer 8 Questions**
   - Same flow as Test 1
   - More challenging questions for senior level
   - Try copy-paste blocking again (should fail)

6. **Submit & View Results**
   - Max possible should be **800 points** (not 600)
   - Final score should be a sum of 8 question scores
   - Example:
     ```
     Base Score: 640/800
     Final Score: 640/800
     ```

### Verification

```bash
psql -U postgres -d coderkerdos -c "
SELECT difficulty, max_possible_score, base_score FROM assessments 
WHERE student_email = 'testsenior@example.com';"
```

Expected: `senior | 800 | 640`

---

## 📋 Test 3: 10-Question JD-Based Assessment

### Steps

1. **Click "Back to Home"**

2. **Click "JD-Based Assessment"**

3. **Fill Student Form**
   - Name: `JD Test User`
   - Email: `jdtest@example.com`
   - Click "Continue"

4. **Fill JD Form**
   - Paste job description:
     ```
     DevOps Engineer - 3+ years experience
     Required: Kubernetes, Terraform, AWS, CI/CD, Docker
     Responsibilities: 
     - Infrastructure management and automation
     - Monitoring and observability
     - Incident response and resolution
     - Code review and best practices
     
     Stack: AWS, Kubernetes, Terraform, GitLab CI, Prometheus, ELK
     Team: 4 engineers, reports to Platform Lead
     ```
   - Difficulty: `Senior`
   - Questions: Select `10 Questions` (1000 max points)
   - Click "Generate Assessment Questions"

5. **Wait for Questions** (10-15 seconds)
   - Should see "Question 1 of 10"
   - Questions should relate to JD keywords (AWS, Kubernetes, etc.)

6. **Answer 10 Questions**
   - Same flow as self-assessment
   - Verify copy-paste is blocked

7. **Submit & View Results**
   - Max possible should be **1000 points**
   - Inferred topics should appear (from JD parsing)

### Verification

```bash
psql -U postgres -d coderkerdos -c "
SELECT assessment_type, max_possible_score, topics FROM assessments 
WHERE student_email = 'jdtest@example.com';"
```

Expected: `jd | 1000 | ["aws","kubernetes","terraform","cicd",...]`

---

## 🧪 Test 4: Plagiarism Deduction Verification

### Scenario: High Plagiarism Risk

1. **Start new self-assessment**
   - Name: `Plagiarism Test User`
   - Email: `plagiarism@example.com`
   - 6 questions, Junior, 1 topic (e.g., Linux)

2. **Answer with Suspicious Content**
   - Use very polished, overly formal language
   - Make answers exactly 100+ words each (suspicious length consistency)
   - Use corporate jargon: "Furthermore", "In conclusion", "Taking into account"
   - Example:
     ```
     "In conclusion, to troubleshoot a Linux service failure, one would 
      first need to comprehensively evaluate the status through the 
      systemctl utility, after which a thorough analysis of the system logs 
      would be undertaken. Furthermore, one might consider the architectural 
      implications and organizational constraints before determining the 
      optimal resolution pathway. Taking into account all relevant factors, 
      the aforementioned approach would likely yield satisfactory results."
     ```

3. **Submit & View Results**
   - ⚠️ Should show **plagiarism warning**:
     ```
     Risk Level: HIGH
     ```
   - Should show **score deduction**:
     ```
     Base Score: 480/600
     Plagiarism Deduction: -20% (-96 points)
     Final Score: 384/600
     ```

### Database Verification

```bash
psql -U postgres -d coderkerdos -c "
SELECT base_score, plagiarism_deduction_amount, 
       plagiarism_deduction_percent, final_score, plagiarism_risk 
FROM assessments 
WHERE student_email = 'plagiarism@example.com';"
```

Expected:
```
 base_score | plagiarism_deduction_amount | plagiarism_deduction_percent | final_score | plagiarism_risk
 480        | 96                          | 20.00                        | 384         | high
```

### Deduction Math Verification

For all three deduction levels:

**Low Plagiarism (5% deduction):**
```
Base Score: 600
Deduction: 600 × 5% = 30 points
Final Score: 600 - 30 = 570
```

**Medium Plagiarism (10% deduction):**
```
Base Score: 800
Deduction: 800 × 10% = 80 points
Final Score: 800 - 80 = 720
```

**High Plagiarism (20% deduction):**
```
Base Score: 1000
Deduction: 1000 × 20% = 200 points
Final Score: 1000 - 200 = 800
```

---

## ⏱️ Test 5: Timer Verification

### Steps

1. **Start any assessment**

2. **Observe Timer**
   - ✅ Should show "5:00" (5 minutes, not 2)
   - ✅ Counts down: 5:00 → 4:59 → 4:58 ...
   - ✅ Warning color (red) appears at 0:30

3. **Let Timer Run Out**
   - Don't answer question
   - Wait for timer to reach 0:00
   - ✅ Should auto-advance to next question or show review page
   - ✅ Answer is saved even though empty

---

## 🚫 Test 6: Copy-Paste Blocking Verification

### Test 6A: Block Paste in Answer Box

1. **Start assessment**

2. **Try to Paste**
   - Copy any text to clipboard
   - Click in answer textarea
   - Ctrl+V (or Cmd+V on Mac)
   - ✅ **Should fail with message**: "Pasting is disabled to encourage original thinking"

### Test 6B: Block Copy from Answer Box

1. **Type something in answer box**

2. **Try to Copy**
   - Select text
   - Ctrl+C (or Cmd+C on Mac)
   - ✅ **Should fail silently** (copy blocked)

### Test 6C: Block Right-Click

1. **In answer textarea**

2. **Right-click**
   - ✅ **Should show no context menu** (prevented)

### Test 6D: Block Drag-Drop

1. **Open text file or document**

2. **Try to drag text into answer textarea**
   - ✅ **Should not accept dropped text**

### Test 6E: Allow Paste in JD Textarea

1. **Go to JD-Based Assessment**

2. **In JD textarea**

3. **Try to Paste**
   - Copy job description text
   - Paste in JD textarea
   - ✅ **Should work fine** (not blocked)

---

## 🏆 Test 7: Leaderboard Verification

### Setup: Create Multiple Entries

Run these assessments with different users:
1. Test 1: testjunior@example.com → 480/600
2. Test 2: testsenior@example.com → 640/800
3. Test 3: jdtest@example.com → 850/1000
4. Test 4: plagiarism@example.com → 384/600 (with deduction)

### Test 7A: View Current Month Leaderboard

1. **Go to http://localhost:3000**

2. **Click "Leaderboard"**
   - ✅ Should load leaderboard page
   - ✅ Shows "October 2024" (or current month)

3. **Verify Rankings**
   - ✅ Should show entries ranked by total_score DESC
   - ✅ Top entry should be jdtest@example.com (850 points)
   - ✅ Medals: 🥇 #1, 🥈 #2, 🥉 #3

4. **Verify Display**
   - ✅ Rank | Name | Total Score | # of Tests
   - ✅ Color coding: Green (high), Orange (medium), Red (low)

### Test 7B: Month Navigation

1. **On Leaderboard**

2. **Click "Previous Month"**
   - ✅ Shows no data (previous month had no assessments)

3. **Click "Next Month"** (if applicable)
   - ✅ Should be disabled (can't go into future)

4. **Go back to current month**

### Test 7C: Multiple Assessments Per Student

1. **Take another assessment with same email** (e.g., testjunior@example.com)
   - 480 + new score (e.g., 520) = 1000 total

2. **Check Leaderboard**
   - ✅ Score should be summed (1000)
   - ✅ # of Tests should be 2

### Database Verification

```bash
psql -U postgres -d coderkerdos -c "
SELECT rank, student_name, total_score, num_assessments 
FROM leaderboard_entries 
ORDER BY rank ASC;"
```

Expected output (example):
```
 rank | student_name       | total_score | num_assessments
 1    | JD Test User       | 850         | 1
 2    | Test User Senior   | 640         | 1
 3    | Test User Junior   | 480         | 1
 4    | Plagiarism Test    | 384         | 1
```

---

## 🗄️ Test 8: Complete Database Verification

### All Assessments Created

```bash
psql -U postgres -d coderkerdos -c "
SELECT COUNT(*) as total_assessments,
       COUNT(DISTINCT student_email) as unique_students
FROM assessments;"
```

Expected: Should show 4+ assessments and 4+ unique students

### Assessment Data Integrity

```bash
psql -U postgres -d coderkerdos -c "
SELECT student_email, difficulty, 
       max_possible_score, base_score, final_score,
       plagiarism_risk, plagiarism_deduction_percent,
       created_at
FROM assessments 
ORDER BY created_at DESC LIMIT 5;"
```

Verify:
- ✅ max_possible_score = 600, 800, or 1000
- ✅ base_score ≤ max_possible_score
- ✅ final_score ≤ base_score
- ✅ plagiarism_deduction_percent in [0, 5, 10, 20]
- ✅ created_at is recent

### Student Data

```bash
psql -U postgres -d coderkerdos -c "
SELECT name, email, created_at 
FROM students 
ORDER BY created_at DESC;"
```

Verify:
- ✅ All test emails present
- ✅ Names match student form entries
- ✅ created_at timestamps valid

### Questions Stored Correctly

```bash
psql -U postgres -d coderkerdos -c "
SELECT student_email, 
       jsonb_array_length(questions) as num_questions,
       questions->'0'->>'question' as first_question
FROM assessments 
WHERE student_email = 'testjunior@example.com';"
```

Verify:
- ✅ num_questions = 6
- ✅ first_question contains readable text (not null)

### Answers Stored Correctly

```bash
psql -U postgres -d coderkerdos -c "
SELECT student_email,
       jsonb_array_length(jsonb_object_keys(answers)::jsonb) as num_answers,
       (answers->'1') as first_answer_excerpt
FROM assessments 
WHERE student_email = 'testsenior@example.com' 
LIMIT 1;"
```

Verify:
- ✅ num_answers = 8
- ✅ first_answer_excerpt contains answer text

---

## ✨ Test 9: Edge Cases

### Test 9A: Very Short Answers

1. **Try to answer with < 10 characters**
   - ✅ Should say "Please provide an answer before proceeding"
   - ✅ Can't click "Next Question"

### Test 9B: Empty Questions Skip

1. **Skip question without typing**
   - Click "Skip"
   - ✅ Should advance to next question
   - ✅ Empty answer is saved

### Test 9C: Browser Back Button

1. **During assessment**
   - Press browser back button
   - ✅ Should stay on assessment (or warn)
   - ✅ Don't lose answers

### Test 9D: Invalid Email

1. **On Student Form**
   - Try email: `notanemail`
   - Click "Continue"
   - ✅ Should show error: "Invalid email"

### Test 9E: Duplicate Email

1. **First assessment**: test@example.com
2. **Second assessment**: same test@example.com
   - ✅ Should create new assessment record
   - ✅ Leaderboard sums scores for same email

---

## 📊 Test 10: Performance Check

### Response Times

| Action | Expected | Acceptable |
|--------|----------|-----------|
| Page Load | 2-3 sec | < 5 sec |
| Question Generation | 10-15 sec | < 30 sec |
| Answer Evaluation | 5-10 sec | < 20 sec |
| Leaderboard Load | 1-2 sec | < 5 sec |

### No Database Errors

```bash
# Check backend logs for errors
grep -i "error\|exception" /tmp/backend.log

# Should be empty or show only warnings
```

---

## 🎯 Final Checklist

### Core Features
- [ ] 6-question assessment works (600 max)
- [ ] 8-question assessment works (800 max)
- [ ] 10-question assessment works (1000 max)
- [ ] Self-assessment generates appropriate questions
- [ ] JD-based assessment parses JD correctly
- [ ] Junior questions are basic
- [ ] Senior questions are advanced

### Scoring System
- [ ] Base score = sum of all question scores
- [ ] Final score correctly deducts plagiarism (0%, 5%, 10%, 20%)
- [ ] Plagiarism warning shows when risk > none
- [ ] Plagiarism deduction amount is correct
- [ ] Results display shows breakdown clearly

### Copy-Paste Blocking
- [ ] Paste blocked in answer textarea
- [ ] Copy blocked in answer textarea
- [ ] Right-click blocked in answer textarea
- [ ] Drag-drop blocked in answer textarea
- [ ] Paste NOT blocked in JD textarea
- [ ] All blocking shows friendly messages

### Timer
- [ ] Timer starts at 5:00 (not 2:00)
- [ ] Timer counts down correctly
- [ ] Timer auto-advances question at 0:00
- [ ] Warning color appears at 0:30

### Leaderboard
- [ ] Leaderboard page loads
- [ ] Current month shows correctly
- [ ] Entries ranked by total_score DESC
- [ ] Top 3 get medals (🥇🥈🥉)
- [ ] Scores are colored by performance
- [ ] Month navigation works
- [ ] Multiple tests per student are summed

### Database
- [ ] All fields saved: base_score, final_score, max_possible_score
- [ ] Plagiarism fields saved: deduction_amount, deduction_percent
- [ ] Questions stored as JSON
- [ ] Answers stored as JSON
- [ ] Leaderboard entries created for current month
- [ ] No duplicate entries per (student_email, month_year)

### No Errors
- [ ] No console errors in browser DevTools
- [ ] No TypeScript compilation errors
- [ ] No backend error logs
- [ ] All API responses 200 OK (except intentional 404s)

---

## 🐛 Troubleshooting

### If questions don't generate:
```bash
# Check API key
grep ANTHROPIC_API_KEY backend/.env

# Check Claude is responding
curl -X POST https://api.anthropic.com/v1/messages \
  -H "api-key: sk-ant-..." \
  -H "content-type: application/json" \
  -d '{"model":"claude-haiku-4-5-20251001","max_tokens":100,"messages":[{"role":"user","content":"test"}]}'
```

### If database shows old data:
```bash
# Clear all data (WARNING: Deletes everything)
psql -U postgres -d coderkerdos -c "TRUNCATE assessments, students, leaderboard_entries CASCADE;"

# Restart backend to re-initialize schema
```

### If leaderboard shows no data:
```bash
# Check leaderboard_entries table
psql -U postgres -d coderkerdos -c "SELECT * FROM leaderboard_entries LIMIT 5;"

# Check if assessments exist
psql -U postgres -d coderkerdos -c "SELECT COUNT(*) FROM assessments;"
```

---

## ✅ Sign-Off

Once all tests pass, fill in below:

- [ ] All 10 test scenarios completed
- [ ] No critical bugs found
- [ ] Performance acceptable
- [ ] Copy-paste blocking works
- [ ] Scoring calculations correct
- [ ] Leaderboard displays correctly
- [ ] Database integrity verified

**Tested By:** _________________  
**Date:** _________________  
**Notes:** _________________  

---

## 🎉 You're Done!

All three phases (Phase 1: Features, Phase 2: Scoring, Phase 3: Leaderboard) + Phase 4 Testing complete.

**Ready to deploy or make final adjustments? 🚀**
