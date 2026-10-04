# CodeKerdos Implementation Plan - Anti-Cheating & Score Adjustments

## 🎯 Scope (Learning Platform Focus)

**Use Case:** Self-paced learning assessment  
**Users:** Students learning DevOps  
**High Stakes:** No (learning, not hiring)  
**Focus:** Encourage honest learning + build leaderboard later

---

## 1. COPY-PASTE BLOCKING (Self-Assessment Only)

### What to Block
- ✅ Block copy-paste in answer textarea
- ❌ **NOT** in JD-based assessments (user has different needs)
- Show message: "Copy-paste is disabled to encourage original thinking"

### Implementation Points

**Frontend Changes Required:**
1. `frontend/src/components/AssessmentFlow.tsx`
   - Add copy-paste prevention to textarea
   - Show warning message
   - Only apply for self-assessment, not JD

2. `frontend/src/components/JDForm.tsx`
   - Keep copy-paste enabled (no changes)

### Code Changes Needed:
```typescript
// In AssessmentFlow.tsx, add to textarea:

// Disable right-click
answerTextarea.addEventListener('contextmenu', e => e.preventDefault());

// Disable Ctrl+C
document.addEventListener('copy', e => {
  if (e.target === answerTextarea) {
    e.preventDefault();
    showToast("Copying is disabled for this assessment");
  }
});

// Disable Ctrl+V
document.addEventListener('paste', e => {
  if (e.target === answerTextarea) {
    e.preventDefault();
    showToast("Pasting is disabled to encourage original thinking");
  }
});

// Disable drag-drop
answerTextarea.addEventListener('dragover', e => e.preventDefault());
answerTextarea.addEventListener('drop', e => e.preventDefault());
```

**Effort:** 30 minutes  
**Risk:** Low (user can still type)

---

## 2. PLAGIARISM-BASED SCORE DEDUCTION

### Scoring System

**Current:** Score 0-100 based on answer quality  
**New:** Deduct points based on plagiarism risk

```
Final Score = (Quality Score × 0.7) + (20 × Plagiarism Adjustment)

Plagiarism Adjustments:
- None:   -0%   (100% of score)
- Low:    -5%   (95% of score)
- Medium: -10%  (90% of score)
- High:   -20%  (80% of score)
```

### Example:
```
Quality Score: 75/100
Plagiarism Risk: Medium

Calculation:
- Quality: 75 × 0.7 = 52.5
- Plagiarism: 100 - 10 = 90
- Blend: 52.5 + (20 × 0.9) = 52.5 + 18 = 70.5
- Final: 70 (rounded)

OR simpler:
- Base Score: 75
- Deduction: 75 × 10% = 7.5
- Final Score: 75 - 7.5 = 67.5 ≈ 68
```

### Implementation Points

**Backend Changes Required:**
1. `backend/src/routes/assessments.ts`
   - Modify submit endpoint to apply deduction
   - Calculate: `final_score = base_score - (base_score × plagiarism_penalty)`

2. `backend/src/services/dbService.ts`
   - Store both: `base_score` and `final_score`
   - Store: `plagiarism_deduction_percent`

3. `backend/src/db.ts`
   - Update assessment table schema (optional):
     ```sql
     ADD COLUMN base_score INTEGER,
     ADD COLUMN plagiarism_deduction INTEGER,
     ADD COLUMN final_score INTEGER
     ```

### Code Logic:
```typescript
// In assessments.ts, after evaluation:

const plagiarismPenalty = {
  'none': 0,
  'low': 0.05,      // 5%
  'medium': 0.10,   // 10%
  'high': 0.20      // 20%
};

const baseScore = result.overall; // 0-100
const penalty = plagiarismPenalty[result.plagiarism_risk] || 0;
const finalScore = Math.round(baseScore * (1 - penalty));

// Store both scores
const assessment = {
  ...existing,
  base_score: baseScore,
  final_score: finalScore,
  plagiarism_deduction_percent: penalty * 100
};
```

**Effort:** 45 minutes  
**Risk:** Low (transparent to user)

### Frontend Changes:
1. `frontend/src/components/ResultsPage.tsx`
   - Show both scores if plagiarism detected
   ```
   Base Score: 75
   Plagiarism Deduction: -10%
   Final Score: 68 ← Show prominently
   ```
   - Explain deduction in results

**Effort:** 20 minutes

---

## 3. INCREASE TIMER FROM 2 MIN TO 5 MIN

### Current
- 2 minutes per question
- Constant defined in `frontend/src/components/AssessmentFlow.tsx`

### Change to 5 Minutes

**Frontend Changes:**
1. `frontend/src/components/AssessmentFlow.tsx`
   ```typescript
   // Line ~XX, change:
   const TIMER_SECONDS = 120; // 2 minutes
   
   // To:
   const TIMER_SECONDS = 300; // 5 minutes
   ```

2. `frontend/.env.example` (optional)
   ```
   # Update comment:
   REACT_APP_ASSESSMENT_TIMEOUT_MINS=5
   ```

3. `backend/src/config.ts` (optional)
   ```typescript
   ASSESSMENT_TIMEOUT_MINS: 5 // from 2
   ```

**Effort:** 5 minutes  
**Risk:** None

---

## 4. LEADERBOARD PREPARATION

### What to Add Now (Schema-Ready)

**Database Changes:**
1. Add columns for leaderboard ranking:
   ```sql
   ALTER TABLE assessments ADD COLUMN rank_percentile INTEGER;
   ALTER TABLE assessments ADD COLUMN total_attempts INTEGER;
   ALTER TABLE students ADD COLUMN best_score INTEGER;
   ```

2. Store normalization data:
   ```sql
   CREATE TABLE leaderboard_snapshots (
     id UUID PRIMARY KEY,
     assessment_type VARCHAR(20),
     difficulty VARCHAR(20),
     topic VARCHAR(50),
     timestamp TIMESTAMP,
     total_attempts INTEGER,
     avg_score INTEGER,
     percentiles JSONB -- {1: 45, 25: 60, 50: 70, 75: 85, 99: 98}
   );
   ```

**Frontend Prep:**
1. Create `frontend/src/components/Leaderboard.tsx` (empty)
2. Add route `/leaderboard` in App.tsx (placeholder)
3. Add API client: `getLeaderboard()` in `api/client.ts`

**Effort:** 30 minutes (just structure, no rendering)

---

## 5. IMPLEMENTATION CHECKLIST

### Phase 1: Copy-Paste & Plagiarism (1 hour)
- [ ] Add copy-paste prevention to AssessmentFlow.tsx
- [ ] Add plagiarism deduction logic to backend
- [ ] Update ResultsPage to show deduction
- [ ] Test self-assessment flow

### Phase 2: Timer & DB Schema (30 min)
- [ ] Update timer to 5 minutes
- [ ] Add database columns for leaderboard
- [ ] Update migrations

### Phase 3: Leaderboard Prep (30 min)
- [ ] Create leaderboard schema
- [ ] Create empty Leaderboard component
- [ ] Add route placeholder

---

## 6. DETAILED FILE CHANGES

### File 1: `frontend/src/components/AssessmentFlow.tsx`

**Add after imports:**
```typescript
// Copy-paste prevention for self-assessment
const preventCopyPaste = (assessmentType: 'self' | 'jd') => {
  if (assessmentType !== 'self') return; // Only for self-assessment
  
  const textarea = document.querySelector('textarea');
  if (!textarea) return;
  
  // Disable context menu on textarea
  textarea.addEventListener('contextmenu', e => e.preventDefault());
  
  // Disable copy
  document.addEventListener('copy', e => {
    if (e.target === textarea) {
      e.preventDefault();
      showNotification("Copying is disabled for this assessment");
    }
  });
  
  // Disable paste
  document.addEventListener('paste', e => {
    if (e.target === textarea) {
      e.preventDefault();
      showNotification("Pasting is disabled to encourage original thinking");
    }
  });
  
  // Disable drag-drop
  textarea.addEventListener('dragover', e => e.preventDefault());
  textarea.addEventListener('drop', e => e.preventDefault());
};

// Call in useEffect when component mounts
useEffect(() => {
  preventCopyPaste(assessmentType);
}, [assessmentType]);

// Update timer constant
const TIMER_SECONDS = 300; // 5 minutes (was 120)
```

**Effort:** 20 lines  
**Location:** Top of component file

---

### File 2: `backend/src/routes/assessments.ts`

**In the submit endpoint, after evaluation:**
```typescript
const plagiarismPenaltyMap: Record<string, number> = {
  'none': 0.00,
  'low': 0.05,
  'medium': 0.10,
  'high': 0.20
};

const baseScore = result.overall;
const plagiarismPenalty = plagiarismPenaltyMap[result.plagiarism_risk] || 0;
const finalScore = Math.round(baseScore * (1 - plagiarismPenalty));

// Update the response
res.json({
  assessment_id: assessment_id,
  base_score: baseScore,
  final_score: finalScore,
  plagiarism_penalty_percent: plagiarismPenalty * 100,
  score: finalScore, // Keep for backwards compatibility
  // ... rest of response
});
```

**Effort:** 15 lines  
**Location:** Around line ~150 in submit endpoint

---

### File 3: `frontend/src/components/ResultsPage.tsx`

**Show deduction if exists:**
```typescript
{results.plagiarism_penalty_percent > 0 && (
  <div className="plagiarism-deduction-notice">
    <p>Base Score: {results.base_score}</p>
    <p>Plagiarism Deduction: -{results.plagiarism_penalty_percent}%</p>
    <p className="final-score">Final Score: {results.final_score}</p>
    <small>Learn more: plagiarism deduction is applied to encourage original thinking</small>
  </div>
)}
```

**Effort:** 10 lines  
**Location:** In score display section

---

### File 4: `backend/src/config.ts`

**Update timer constant:**
```typescript
ASSESSMENT_TIMEOUT_MINS: 5, // from 2
```

**Effort:** 1 line

---

## 7. TESTING CHECKLIST

**Self-Assessment Flow:**
- [ ] Copy-paste blocked (Ctrl+C, Ctrl+V, right-click)
- [ ] Paste notification shows
- [ ] 5-minute timer displays correctly
- [ ] Score with deduction calculates correctly
- [ ] Results show base and final score

**JD-Assessment Flow:**
- [ ] Copy-paste works normally (not blocked)
- [ ] Plagiarism check still runs
- [ ] Scoring unchanged

**Edge Cases:**
- [ ] Mobile: Can user still type normally?
- [ ] Typing fast doesn't trigger false alerts
- [ ] Plagiarism deduction never exceeds 20%
- [ ] Final score never goes below 0

---

## 8. LEADERBOARD FOUNDATION

### Later (Not Now)
When you build leaderboard:

1. **Query patterns:**
   ```sql
   -- Get top 10 self-assessment junior
   SELECT student_email, AVG(final_score) as avg_score
   FROM assessments
   WHERE assessment_type = 'self' 
   AND difficulty = 'junior'
   GROUP BY student_email
   ORDER BY avg_score DESC
   LIMIT 10;
   ```

2. **Considerations:**
   - Show anonymous (rank, score, not name)
   - Or ask consent in assessment start
   - Filter by topic/difficulty/timeframe
   - Update rankings daily (not real-time)

---

## 9. SUMMARY OF CHANGES

| Component | Change | Effort | Risk |
|-----------|--------|--------|------|
| AssessmentFlow.tsx | Add copy-paste prevention | 20min | Low |
| assessments.ts (backend) | Add plagiarism deduction logic | 15min | Low |
| ResultsPage.tsx | Show deduction in results | 10min | Low |
| config.ts | Update timer to 5min | 2min | None |
| DB Schema | Add leaderboard columns | 10min | Low |
| **Total** | | **57 min** | **Low** |

---

## 10. IMPLEMENTATION ORDER

1. **First:** Timer change (easiest, no risk) - 2 minutes
2. **Second:** Copy-paste blocking - 20 minutes
3. **Third:** Plagiarism deduction backend - 15 minutes
4. **Fourth:** Plagiarism deduction frontend - 10 minutes
5. **Fifth:** Database schema prep - 10 minutes

**Total Time:** ~1 hour  
**Test Time:** ~30 minutes  
**Ready for Launch:** ~1.5 hours

---

## ✅ Ready to Implement?

Questions before we start:
1. Should copy-paste prevention show a friendly message?
2. Should leaderboard show student names or be anonymous?
3. Any other considerations?

Let me know and we can start coding! 🚀
