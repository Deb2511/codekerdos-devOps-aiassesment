# CodeKerdos Anti-Cheating & AI-Proof Strategy

## Current Situation
- Candidates answer open-ended scenario questions
- Answers are evaluated by Claude AI
- **Risk**: Candidates copy-paste from ChatGPT/Claude directly
- **Goal**: Make it harder to cheat while maintaining usability

---

## 1. DISABLE COPY-PASTE (Technical Implementation)

### Option 1A: JavaScript Prevention (Easy)
```javascript
// Disable right-click copy
answerInput.addEventListener('contextmenu', e => e.preventDefault());

// Disable Ctrl+C / Cmd+C
answerInput.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'c') e.preventDefault();
});

// Disable Ctrl+V / Cmd+V for pasting
answerInput.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'v') e.preventDefault();
});

// Prevent drag-drop
answerInput.addEventListener('dragover', e => e.preventDefault());
answerInput.addEventListener('drop', e => e.preventDefault());
```

**Pros:**
- Simple to implement
- No backend changes needed
- Works for most users

**Cons:**
- Can be bypassed (F12 dev tools, browser extensions)
- Annoys legitimate users who want to paste their notes
- Poor UX for users on mobile or tablets
- Accessibility issue for users with motor disabilities

---

### Option 1B: Advanced JavaScript Prevention
```javascript
// Monitor clipboard access
document.addEventListener('paste', e => {
  e.preventDefault();
  alert("Copy-pasting is disabled for answer integrity");
});

document.addEventListener('copy', e => {
  e.preventDefault();
});

// Detect if text was pasted by checking length changes
answerInput.addEventListener('input', e => {
  if (e.target.value.length > previousLength + 20) {
    // Might be a paste - log it
    console.warn("Potential paste detected");
  }
});
```

**Pros:**
- Detects suspicious activity
- Can log attempts

**Cons:**
- Still bypassable with dev tools
- False positives (typing fast)
- Browser inconsistencies

---

## 2. DETECT AI-GENERATED ANSWERS (Best Practice)

### Option 2A: Claude API Moderation
```javascript
// Before storing answer, check if it's AI-generated
const checkIfAIGenerated = async (answer) => {
  const response = await fetch('/api/check-ai-generated', {
    method: 'POST',
    body: JSON.stringify({ text: answer })
  });
  return response.json();
};

// Backend endpoint
app.post('/api/check-ai-generated', async (req, res) => {
  const { text } = req.body;
  
  // Use Claude to detect if text is AI-generated
  const detection = await client.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 100,
    messages: [{
      role: "user",
      content: `Analyze this answer and determine likelihood it was AI-generated (0-100%):
      
Answer: "${text}"

Consider:
- Overly polished language
- Too comprehensive for time limit
- Perfect structure/formatting
- Generic corporate language
- Lack of personal touches or typos

Respond only with a number 0-100.`
    }]
  });
  
  const score = parseInt(detection.content[0].text);
  res.json({ aiGeneratedScore: score, flagged: score > 70 });
});
```

**Pros:**
- Actually detects AI-generated content
- Flagging system for review
- Works even if copy-paste is allowed
- More sophisticated detection

**Cons:**
- Requires extra API call (cost + latency)
- Not 100% accurate
- False positives possible
- May flag well-written legitimate answers

---

### Option 2B: Pattern Detection
```javascript
// Detect patterns common in AI responses
const aiPatterns = [
  /^(In conclusion|To summarize|As mentioned above)/i,
  /Furthermore|Moreover|Additionally/gi,  // Overused connectors
  /First and foremost/i,
  /It is important to note/i,
  /Therefore|Hence/gi,
  /In light of|Taking into account/i
];

const checkAIPatterns = (answer) => {
  let patternMatches = 0;
  aiPatterns.forEach(pattern => {
    if (pattern.test(answer)) patternMatches++;
  });
  return patternMatches > 3; // Flag if multiple patterns found
};
```

**Pros:**
- Fast, no extra API calls
- Good signal for copied content
- Easy to implement

**Cons:**
- May flag legitimate answers
- Easy to game (just avoid patterns)
- False positives for educated writers

---

## 3. OTHER AI-PROOF MEASURES

### Option 3A: Random Follow-up Questions
```javascript
// After candidate answers, ask Claude-generated follow-up
const followUpQuestions = [
  "Can you give a specific example from your experience?",
  "What would happen if {scenario-specific detail}?",
  "Walk through the steps in order",
  "What's the worst case here and how would you handle it?",
  "Why did you choose that approach vs alternatives?"
];

// Pick random follow-up for each question
const askFollowUp = () => {
  const random = followUpQuestions[Math.floor(Math.random() * followUpQuestions.length)];
  // Show follow-up after main answer
};
```

**Pros:**
- Forces candidate to think deeper
- AI can't provide same answer twice
- Reveals true understanding
- Hard to copy-paste for follow-ups

**Cons:**
- Makes assessment longer
- More complex grading
- Still copyable if candidate tries

---

### Option 3B: Time Constraints Matter
```javascript
// Current: 2-minute timer per question
// Make it harder to research/copy-paste in time

// Proposal: Show timer progress
// - First 30 seconds: Candidate can't submit (read time)
// - 30 seconds to 1:30: Normal answering
// - Final 30 seconds: Answer becomes read-only preview

const questionPhases = {
  reading: { start: 0, end: 30, enabled: false },
  writing: { start: 30, end: 90, enabled: true },
  review: { start: 90, end: 120, enabled: false }
};
```

**Pros:**
- Not enough time to ChatGPT and copy
- Favors thinking vs. googling
- Fair to all candidates

**Cons:**
- Shorter actual answer time
- Might stress candidates

---

### Option 3C: Handwriting/Video Verification (Extreme)
```javascript
// Could require:
// - Webcam on during assessment (candidates visible)
// - No external monitors/screens visible
// - Microphone on
// - Screen share (see what's on screen)

// This is like proctored exams
```

**Pros:**
- Very hard to cheat
- Professional/legitimate feel
- Can detect obvious cheating

**Cons:**
- Privacy concerns
- Technical issues (webcam not available)
- Stressful for candidates
- Accessibility issues
- Expensive to implement

---

### Option 3D: Answer Style Analysis
```javascript
// Track candidate's "writing fingerprint"
// Compare answer style to their background/resume

// Metrics:
// - Vocabulary level
// - Sentence structure complexity
// - Technical depth
// - Personal examples vs. generic

// If candidate's LinkedIn shows "5 years DevOps"
// but answer quality seems junior-level, flag
```

**Pros:**
- Sophisticated approach
- Uses available data
- Behavioral analysis

**Cons:**
- Privacy concerns
- Bias potential
- Unreliable signal

---

### Option 3E: Plagiarism Checking
```javascript
// Use existing plagiarism APIs
// Check if answer matches:
// - Other candidates' answers
// - Public blog posts
// - Stack Overflow
// - GitHub repos

const checkPlagiarism = async (answer) => {
  // Use Turnitin API or similar
  const plagiarismScore = await plagiarismAPI.check(answer);
  // Flag if >20% matching content
};
```

**Pros:**
- Catches exact copy-pastes
- Industry standard
- Proven technology

**Cons:**
- Additional cost
- Some false positives
- Doesn't catch paraphrased AI content

---

## 4. PLAGIARISM DETECTION (ALREADY IN PLACE!)

### What We Already Have:
```javascript
// Claude already evaluates plagiarism risk
{
  "plagiarism_risk": "none|low|high",
  "plagiarism_notes": "Suspicious if polished, too long, structural consistency"
}
```

**Current approach checks:**
- ✓ Overly polished language (ChatGPT signature)
- ✓ Length inconsistency across answers
- ✓ Repetitive phrasing
- ✓ Generic corporate language

---

## 5. RECOMMENDED STRATEGY (Balanced Approach)

### Tier 1: Easy (Implement First)
1. **Disable copy-paste** in answer box
   - Prevent casual cheaters
   - Show anti-cheating message: "Copy-paste is disabled to ensure assessment integrity"

2. **Enhance plagiarism detection**
   - Improve Claude's existing plagiarism check
   - Flag suspicious answers for manual review
   - Show "Plagiarism Risk" in results dashboard

3. **Better scoring rubric**
   - Weight answers that show personal experience higher
   - Penalize overly polished language
   - Look for typos/casual language as legitimacy signal

### Tier 2: Medium (If Needed)
4. **Follow-up questions**
   - 20% of answers trigger random follow-up
   - Forces deeper thinking
   - Can't prepare follow-ups in advance

5. **Answer timing analysis**
   - Flag if answer written suspiciously fast
   - Flag if candidate uses full 2 minutes on short answers
   - Pattern analysis

### Tier 3: Extreme (Only for High-Stakes)
6. **Proctoring** (Webcam monitoring)
   - Only if assessment is for hiring/certification
   - Screen share detection
   - Microphone monitoring

7. **Manual review dashboard**
   - Show assessors which answers are flagged
   - Let human verify legitimacy
   - Context around assessment

---

## 6. IMPLEMENTATION PRIORITY & EFFORT

| Method | Effort | Effectiveness | User Impact |
|--------|--------|----------------|-------------|
| Disable copy-paste | ⭐ Easy | ⭐⭐ Low | ⭐⭐⭐ High (annoying) |
| Enhance plagiarism detection | ⭐⭐ Medium | ⭐⭐⭐⭐ High | ⭐ None (background) |
| Follow-up questions | ⭐⭐⭐ Hard | ⭐⭐⭐⭐⭐ Very High | ⭐⭐ Longer assessment |
| Answer timing analysis | ⭐⭐ Medium | ⭐⭐ Medium | ⭐ None (background) |
| Proctoring | ⭐⭐⭐⭐⭐ Very Hard | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐⭐ Very High (privacy) |
| Manual review dashboard | ⭐⭐⭐ Hard | ⭐⭐⭐ Medium | ⭐ None (backend only) |

---

## 7. RECOMMENDATION

**Start with Tier 1 (all three):**

1. **Disable copy-paste** - Shows intent, stops casual cheaters
2. **Enhance plagiarism detection** - Actually detects AI content
3. **Better scoring rubric** - Human evaluation matters most

**Why this approach:**
- ✅ Easy to implement
- ✅ No privacy concerns
- ✅ Doesn't hurt user experience much
- ✅ Actually effective against AI cheating
- ✅ Can add more later if needed

**IF assessment is for hiring (high stakes):**
- Add Tier 2: Follow-up questions
- Add dashboard for manual review

**IF assessment is just for learning (low stakes):**
- Keep Tier 1 only
- Focus on encouraging honest answers

---

## 8. WHAT WON'T WORK

❌ **Just disabling copy-paste** - Bypassable, annoying, limited effectiveness  
❌ **Only checking plagiarism** - Good but not complete  
❌ **Limiting by time alone** - Smart people still cheat fast  
❌ **Asking for personal examples** - Candidates can prompt ChatGPT with scenarios  

---

## 9. KEY INSIGHT

**Best anti-cheating isn't technical—it's behavioral:**
- Well-timed follow-ups force original thinking
- Scenario-based questions harder to generic AI responses
- Scoring rubric that values personal touches
- Human review for high-stakes assessments

Technical prevention (copy-paste, proctoring) helps but isn't primary defense.

---

## MY RECOMMENDATION FOR CODERKERDOS

**Implement in Phase 1:**
1. Disable copy-paste (5 min implementation)
2. Enhance plagiarism detection prompt (10 min)
3. Add flagging system for manual review (30 min)

**Consider for Phase 2:**
4. Follow-up question system (1-2 hours implementation)
5. Answer timing analysis (1 hour)

**Only if enterprise (Phase 3):**
6. Proctoring/webcam integration

---

## Questions to Discuss

1. **Scope**: Is this for learning, assessment, or hiring?
2. **Stakes**: Low, medium, or high?
3. **Users**: Students, candidates, employees?
4. **Privacy**: How much monitoring is acceptable?
5. **Budget**: Can we add AI detection API?
6. **UX**: How much can we burden the user?

What's your preference? Where do you want to focus first?
