# CodeKerdos DevOps Assessment - Deployment & Testing Guide

## ⚡ Quick Start (5 Minutes)

### Prerequisites
- Node.js 16+ and npm 8+
- PostgreSQL 13+ (or Docker)
- Anthropic API key (get at https://console.anthropic.com)

### Step-by-Step

#### 1. Navigate to Project
```bash
cd /home/debjyoti/Downloads/coderkerdos-assessment
```

#### 2. Setup PostgreSQL Database

**Option A: Using Docker (Recommended)**
```bash
# Start PostgreSQL with Docker
docker-compose up -d

# Verify it's running
docker-compose ps
# You should see coderkerdos-db as 'Up'

# Wait 5 seconds for database to initialize
sleep 5
```

**Option B: Using Local PostgreSQL**
```bash
# Create database
createdb -U postgres coderkerdos

# Or if using different user:
createdb -U your_postgres_user coderkerdos
```

**Option C: Using Docker Directly**
```bash
docker run -d \
  --name coderkerdos-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=coderkerdos \
  -p 5432:5432 \
  postgres:15-alpine
```

#### 3. Setup Backend

```bash
cd backend

# Copy environment file
cp .env.example .env

# Edit .env with your API key
# Option 1: Using nano
nano .env
# Change: ANTHROPIC_API_KEY=sk-ant-your-key-here

# Option 2: Using sed (replace YOUR_KEY)
sed -i 's/sk-ant-your-key-here/sk-ant-YOUR_ACTUAL_KEY/g' .env

# Verify it's set
grep ANTHROPIC_API_KEY .env

# Install dependencies
npm install

# Start backend
npm run dev
```

**Expected Output:**
```
Server running on port 5000 in development mode
Database initialized successfully
✓ Health check passed
```

#### 4. Setup Frontend (New Terminal)

```bash
cd /path/to/coderkerdos-assessment/frontend

# Copy environment file
cp .env.example .env

# No changes needed - defaults are correct
cat .env

# Install dependencies
npm install --legacy-peer-deps

# Start frontend
npm start
```

**Expected Output:**
```
Compiled successfully!
You can now view coderkerdos-frontend in the browser.
Local: http://localhost:3000
```

#### 5. Test in Browser

Open: **http://localhost:3000**

---

## 🧪 Testing the Application

### Test 1: Self-Assessment Flow

1. **Click "Self Assessment"**
   - ✓ You should see topic selection page

2. **Enter Student Info**
   - Name: `Test User`
   - Email: `test@example.com`
   - Click "Continue"

3. **Select Topics & Difficulty**
   - Check: Linux, Kubernetes, Docker (3 topics)
   - Difficulty: Junior
   - Questions: 3 per topic (9 total)
   - Click "Start Assessment"

4. **Wait for Questions to Generate** (10-15 seconds)
   - ✓ Should see Question 1 with 2-min timer

5. **Answer Questions**
   - Type answer for each question
   - Click "Next Question"
   - Repeat for all 9 questions

6. **Submit Answers**
   - Review answers
   - Click "Submit & Get Results"

7. **View Results** (5-10 seconds while Claude evaluates)
   - ✓ Should see score (0-100)
   - ✓ Per-topic breakdown
   - ✓ AI feedback
   - ✓ Plagiarism risk

### Test 2: JD-Based Assessment

1. **Click "JD-Based Assessment"**

2. **Enter Student Info**
   - Name: `Jane Doe`
   - Email: `jane@example.com`
   - Click "Continue"

3. **Paste Job Description**
   ```
   We are hiring a DevOps Engineer with 3+ years experience.
   Required: Kubernetes, Terraform, AWS, CI/CD, Docker
   Responsibilities: Infrastructure management, automation, monitoring, incident response
   ```
   - Difficulty: Senior
   - Click "Generate Assessment Questions"

4. **Answer Questions** (Same as self-assessment)

5. **Get Results**

---

## 🔧 Environment Configuration

### Backend .env
```
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/coderkerdos
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
CLAUDE_TIMEOUT_SECS=15
```

**Where to get API Key:**
1. Go to https://console.anthropic.com
2. Login with your account
3. Create API key
4. Copy and paste into .env

### Frontend .env
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ASSESSMENT_TIMEOUT_MINS=2
```

---

## 🐛 Troubleshooting

### Issue: "Cannot connect to database"

**Check if database is running:**
```bash
# If using Docker
docker ps

# If using local PostgreSQL
psql -U postgres -c "SELECT 1"

# If using Docker Compose
docker-compose ps
```

**Fix:**
```bash
# Start Docker if needed
docker-compose up -d

# Or create database
createdb -U postgres coderkerdos

# Test connection
psql -U postgres -d coderkerdos -c "SELECT 1"
```

### Issue: "ANTHROPIC_API_KEY is missing or invalid"

**Solution:**
```bash
# Check if key is set
echo $ANTHROPIC_API_KEY

# If empty, edit .env
nano backend/.env

# Make sure it says:
# ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE

# NO QUOTES, NO SPACES before or after

# Restart backend
npm run dev
```

### Issue: "Frontend can't reach backend"

**Verify backend is running:**
```bash
# Test health endpoint
curl http://localhost:5000/health
# Should return: {"status":"ok","timestamp":"..."}
```

**Check frontend .env:**
```bash
cat frontend/.env
# Should have: REACT_APP_API_URL=http://localhost:5000/api
```

**If not working:**
- Close frontend tab
- Restart backend: `npm run dev` (in backend directory)
- Wait 5 seconds
- Refresh frontend: http://localhost:3000

### Issue: "Questions are not generating"

**Likely cause:** Invalid or missing API key

**Solution:**
```bash
# Check key in .env
cat backend/.env | grep ANTHROPIC

# Verify it's correct at https://console.anthropic.com

# If wrong, update:
nano backend/.env

# Restart backend:
npm run dev
```

**Check backend logs:**
- Look for error messages in backend terminal
- Should show Claude API call details

### Issue: "Port 5000 already in use"

```bash
# Find process using port 5000
lsof -i :5000

# Kill it
kill -9 <PID>

# Or use different port in .env
PORT=5001
```

### Issue: "npm install fails"

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules
rm -rf node_modules

# Reinstall
npm install --legacy-peer-deps  # For frontend
npm install  # For backend
```

---

## 📊 Expected Performance

| Action | Time |
|--------|------|
| Backend startup | 3-5 seconds |
| Frontend startup | 10-15 seconds |
| Question generation | 10-15 seconds |
| Answering 5 questions | 2-3 minutes |
| AI evaluation | 5-10 seconds |
| **Total first test** | ~4-5 minutes |

---

## ✅ Verification Checklist

### Before Starting
- [ ] Node.js 16+ installed: `node --version`
- [ ] npm 8+ installed: `npm --version`
- [ ] PostgreSQL available: `psql --version`
- [ ] API key from Anthropic
- [ ] Both directories have node_modules

### During Startup
- [ ] Docker running (if using): `docker ps`
- [ ] Database created: `psql -l | grep coderkerdos`
- [ ] Backend starts without errors
- [ ] Frontend compiles successfully
- [ ] Browser opens to http://localhost:3000

### During Testing
- [ ] Topic selection page loads
- [ ] Questions appear after 10-15 seconds
- [ ] Timer counts down from 2 minutes
- [ ] Answers submit without errors
- [ ] Results page shows score
- [ ] Data saves to database

---

## 🗄️ Database Verification

### Check if data was saved

```bash
# Connect to database
psql -U postgres -d coderkerdos

# List all students
SELECT * FROM students;

# List all assessments
SELECT student_email, assessment_type, difficulty, score, created_at FROM assessments;

# Count assessments
SELECT COUNT(*) FROM assessments;

# Exit
\q
```

---

## 🚀 Advanced Testing

### Test Different Scenarios

**Test 1: Senior Level Assessment**
```
Topics: Kubernetes, Terraform, AWS
Difficulty: Senior
Questions: 5 per topic (15 total)
```

**Test 2: JD-Based Junior**
```
JD: Copy a real job posting
Difficulty: Junior
```

**Test 3: Multiple Students**
- Create 2-3 different student emails
- Run assessments for each
- Check results in database

**Test 4: Error Handling**
- Try invalid email: `not-an-email`
- Try short JD: `Too short`
- Try empty fields

---

## 📝 Full Setup Command Sequence

Copy and run these commands in order:

```bash
# Navigate to project
cd /home/debjyoti/Downloads/coderkerdos-assessment

# 1. Start database
docker-compose up -d
sleep 5

# 2. Backend setup
cd backend
cp .env.example .env
# ⚠️ EDIT .env - Add your ANTHROPIC_API_KEY
nano .env

npm install
npm run dev &  # Run in background
sleep 10

# 3. Frontend setup (new terminal)
cd ../frontend
cp .env.example .env
npm install --legacy-peer-deps
npm start

# 4. Open browser
# Browser should automatically open to http://localhost:3000
# If not, manually go to: http://localhost:3000
```

---

## 🎯 Success Indicators

You'll know it's working when:

✅ **Frontend loads** at http://localhost:3000  
✅ **Click assessment** → Selection page appears  
✅ **Wait 10-15 sec** → Questions appear with timer  
✅ **Answer questions** → Submit button works  
✅ **5-10 sec wait** → Results show score & feedback  
✅ **Check database** → Data saved successfully  

---

## 📞 Common Questions

**Q: Can I use different ports?**
A: Yes. Change PORT in backend/.env and REACT_APP_API_URL in frontend/.env

**Q: Do I need Docker?**
A: No. You can use local PostgreSQL instead with createdb command

**Q: How long does question generation take?**
A: 10-15 seconds first time. Faster on repeat calls.

**Q: Where is data stored?**
A: PostgreSQL database. Check with psql commands above.

**Q: Can I test without API key?**
A: No. Claude AI is required for question generation and evaluation.

**Q: How do I stop the servers?**
A: Press Ctrl+C in each terminal, or:
```bash
# Kill specific processes
lsof -i :5000  # Find backend PID
kill -9 <PID>

lsof -i :3000  # Find frontend PID
kill -9 <PID>

# Or stop database
docker-compose down
```

---

## 🎉 You're Ready!

Follow the Quick Start above and you'll have the full CodeKerdos application running in **5 minutes**!

**Any issues?** Check the Troubleshooting section or verify your:
1. Node.js version
2. PostgreSQL connectivity
3. ANTHROPIC_API_KEY is valid
4. Ports 5000 and 3000 are free

Good luck! 🚀
