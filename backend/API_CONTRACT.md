# CodeKerdos Assessment API: Integration Guide

This document is for the CodeKerdos backend team. It describes exactly what to send to the assessment service, what it returns, how long each call takes, and how to handle every error.

The assessment service generates DevOps questions with Claude, scores the answers, and returns the scores and feedback. Your backend calls it server-to-server. Your frontend never calls it directly.

## 1. Base URL and access

| Item | Value |
|---|---|
| Base URL | `http://<SERVICE_HOST>:<PORT>/api` (the HAProxy port, for example `8080`) |
| Health check | `GET http://<SERVICE_HOST>:<PORT>/health` (no `/api` prefix) |
| Content type | Every request body is JSON. Send `Content-Type: application/json`. |
| Authentication | None. Access is limited by network. Only your backend's security group or subnet can reach the service. Do not expose it to browsers or the internet. |

## 2. The calls, in order

1. **Start.** When a student begins, call `POST /api/assessments/start` (self assessment) or `POST /api/assessments/jd-start` (job description). Save the returned `assessment_id` and `expires_at` against the student's session. Show the questions to the student.
2. **Answer.** The student answers in your frontend. Collect the answers, and mark each one `voice` or `typed`.
3. **Submit.** Call `POST /api/assessments/{assessment_id}/submit` once, with all the answers. Save the returned scores and feedback in your own system.
4. **Read back (optional).** Use `GET /api/results/assessment/{assessment_id}` or `GET /api/results/student/{email}` to show past results.

Every call returns its result in the same HTTP response. There is no polling and no callback. Each call waits for Claude, so the timings in section 6 matter.

## 3. Endpoints

### 3.1 Start a self assessment

`POST /api/assessments/start`

Request:

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | yes | 1 to 255 characters, not blank |
| `email` | string | yes | A valid email address. It identifies the student. |
| `topics` | array of strings | yes | 1 or more. Allowed: `linux`, `networking`, `git`, `aws`, `terraform`, `docker`, `kubernetes`, `cicd`, `observability`, `sre`. Keep the list to no more topics than `total_questions`. The service does not reject a longer list yet, and a topic with no question gets a `null` per-topic score. |
| `difficulty` | string | yes | `junior` or `senior` |
| `total_questions` | integer | yes | `6`, `8` or `10` |

Example request:

```bash
curl -X POST http://<SERVICE_HOST>:8080/api/assessments/start \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Asha Verma",
    "email": "asha.verma@example.com",
    "topics": ["docker", "kubernetes"],
    "difficulty": "junior",
    "total_questions": 6
  }'
```

Response `200`:

```json
{
  "assessment_id": "3f6c1e2a-9b1d-4c7e-8a55-0d2f7e1b9a10",
  "questions": [
    { "id": 1, "question": "Your team runs a containerised API ... How would you ...?", "topic": "docker" },
    { "id": 2, "question": "...", "topic": "kubernetes" }
  ],
  "total_questions": 6,
  "tokens_used": { "input_tokens": 1699, "output_tokens": 1054, "total_tokens": 2753 },
  "expires_at": "2026-10-29T10:33:00.000Z"
}
```

- `questions[].id` is the number you use as the key when you submit answers.
- `questions[].question` can be several sentences long. It can include a short file (a Dockerfile, Terraform or a Kubernetes manifest) inside the text. Display it as plain text with line breaks preserved.
- `expires_at` is the submit deadline (see section 5).

### 3.2 Start a job description assessment

`POST /api/assessments/jd-start`

Request:

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | yes | 1 to 255 characters, not blank |
| `email` | string | yes | A valid email address |
| `jd_text` | string | yes | 51 to 10,000 characters |
| `difficulty` | string | yes | `junior` or `senior` |
| `num_questions` | integer | no | `6`, `8` or `10`. Defaults to `6`. |

Example request:

```bash
curl -X POST http://<SERVICE_HOST>:8080/api/assessments/jd-start \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Asha Verma",
    "email": "asha.verma@example.com",
    "jd_text": "Senior DevOps Engineer. Run a payments platform on AWS with EKS, Terraform, GitHub Actions and Prometheus.",
    "difficulty": "senior",
    "num_questions": 8
  }'
```

Response `200`: the same as the self start, plus `inferred_topics`, the topics the model took from the job description. These are free text, such as `kubernetes-troubleshooting`, and are not limited to the self assessment list.

```json
{
  "assessment_id": "...",
  "questions": [ { "id": 1, "question": "...", "topic": "kubernetes-troubleshooting" } ],
  "total_questions": 8,
  "inferred_topics": ["kubernetes-troubleshooting", "cost-optimization"],
  "tokens_used": { "input_tokens": 1800, "output_tokens": 1400, "total_tokens": 3200 },
  "expires_at": "..."
}
```

### 3.3 Submit answers

`POST /api/assessments/{assessment_id}/submit`

Request:

| Field | Type | Required | Rules |
|---|---|---|---|
| `answers` | object | yes | Keys are question ids as strings (`"1"`, `"2"`, ...). Values are the student's answer text. A question left blank can be sent as `""`. |
| `answer_sources` | object | no | Same keys as `answers`. Each value is `voice` (the answer was spoken and transcribed) or `typed`. A missing key counts as `typed`. Any other value is rejected with `400`. |

Example request:

```bash
curl -X POST http://<SERVICE_HOST>:8080/api/assessments/3f6c1e2a-9b1d-4c7e-8a55-0d2f7e1b9a10/submit \
  -H 'Content-Type: application/json' \
  -d '{
    "answers": {
      "1": "I would check the container logs and the exit code first, then run the image interactively to reproduce the failure.",
      "2": "cube control get events shows why the pod is pending, then I would check node capacity.",
      "3": "",
      "4": "I would look at the pod events and the readiness probe history.",
      "5": "I would check the volume mounts with docker inspect.",
      "6": "I would check the service endpoints and whether the pod IP is listed."
    },
    "answer_sources": { "2": "voice" }
  }'
```

Response `200`:

```json
{
  "assessment_id": "3f6c1e2a-9b1d-4c7e-8a55-0d2f7e1b9a10",
  "base_score": 40,
  "final_score": 38,
  "max_possible_score": 60,
  "score_percent": 63,
  "plagiarism_deduction_amount": 2,
  "plagiarism_deduction_percent": 5,
  "per_topic_scores": { "docker": 60, "kubernetes": 73 },
  "feedback": "Strongest area: ... Weakest area: ... Next step: ...",
  "individual_scores": { "q1": 8, "q2": 8, "q3": 2, "q4": 7, "q5": 8, "q6": 7 },
  "individual_feedback": { "q1": "One or two sentences.", "q2": "...", "q3": "...", "q4": "...", "q5": "...", "q6": "..." },
  "plagiarism_risk": "low",
  "plagiarism_notes": "",
  "completed_at": "2026-10-29T10:20:55.701Z"
}
```

How to read the result:

- `individual_scores` keys are `q` followed by the question id: `q1` is question `1`. Each score is a whole number from 0 to 10.
- `base_score` is the sum of the question scores. `final_score` is `base_score` minus `plagiarism_deduction_amount`. Show `final_score` as the total.
- `score_percent` is `final_score` divided by `max_possible_score`, as a percentage. `max_possible_score` is 10 times the number of questions.
- `per_topic_scores` gives each topic as a percentage from 0 to 100.
- `feedback` is a short overall summary. `individual_feedback` gives one or two sentences per question.
- `plagiarism_risk` is `none`, `low`, `medium` or `high`. The deduction is 0% for `none`, 5% for `low`, 10% for `medium` and 20% for `high`. It is applied to `base_score`.

### 3.4 Read one assessment

`GET /api/results/assessment/{assessment_id}`

Returns the full stored record, including the questions, the answers, the repair log and the token counts. Pass only the fields you need to the student. This endpoint returns `404` if the id does not exist.

```bash
curl http://<SERVICE_HOST>:8080/api/results/assessment/3f6c1e2a-9b1d-4c7e-8a55-0d2f7e1b9a10
```

### 3.5 List a student's assessments

`GET /api/results/student/{email}?limit=10`

`limit` is optional and defaults to 10. The response is newest first:

```json
{ "email": "asha.verma@example.com", "assessments": [ { "id": "...", "...": "..." } ], "total": 1 }
```

Use URL encoding for the email address, so `+` and `@` are sent correctly.

### 3.6 Health check

`GET /health` returns `{"status":"ok","timestamp":"..."}`. Use it for monitoring. It does not check the database.

## 4. Errors

Every error body has the form `{ "error": "message" }`.

| Status | When | Example message | What your backend should do |
|---|---|---|---|
| `400` | Invalid input | `Invalid name`, `Invalid email`, `Invalid difficulty level`, `Invalid topics`, `Number of questions must be one of: 6, 8, 10`, `Job description must be between 50 and 10000 characters`, `Invalid answers format`, `Invalid answer_sources value for question 1. Use "voice" or "typed".` | Fix the input. Do not retry the same request. |
| `404` | Unknown assessment id | `Assessment not found` | Check the id. Do not retry. |
| `409` | Already submitted | `Assessment has already been submitted` | Show the stored result. Do not submit again. |
| `410` | Past the deadline | `Time limit exceeded. This assessment can no longer be submitted.` | Tell the student time has run out. Nothing was scored. |
| `500` | Service error (Claude failed, or a timeout inside the service) | `Failed to start assessment`, `Failed to start JD-based assessment`, `Failed to evaluate assessment` | Show a retry option. See section 6 for when a retry is safe. |

## 5. Time limit

Each question has 5 minutes. The whole assessment has a deadline of 5 minutes times the number of questions, plus a 3 minute grace period for network delay. For 6 questions, that is 33 minutes after the start call. For 8, it is 43 minutes. For 10, it is 53 minutes.

- The start response includes `expires_at`. Show the student the same deadline, so your timer and the service's timer agree.
- A submit that arrives after `expires_at` returns `410`. Nothing is scored or saved.
- The service checks only the total time, at submit. Moving the student from question to question is your frontend's job.
- Assessments created before this rule was added have no deadline. You should not see one in new traffic.

## 6. Timing and timeouts

These timings were measured with the real Claude API:

| Call | Typical | Slowest measured (5 at a time) | Recommended client timeout |
|---|---|---|---|
| Start (self or JD) | about 10 seconds | about 12 seconds | 120 seconds |
| Submit | about 11 seconds | about 14 seconds | 300 seconds |

Set your HTTP client to these timeouts. A slow evaluation can take longer than the typical time, so do not set the submit timeout lower than 300 seconds.

Show a loading state while each call runs. A start or submit normally takes 10 to 15 seconds.

### When a retry is safe

- **Start:** do not retry automatically after a timeout. The first call may have succeeded and created an assessment, so a retry creates a second one. Ask the student to try again, or check with the student before retrying.
- **Submit:** if a submit times out or returns `500`, read `GET /api/results/assessment/{id}` first. If `completed_at` is set, the submit succeeded, so show the result. If it is not set, the assessment is still open, and a retry is safe.
- Never retry a submit that returned `409` or `410`.

## 7. Example backend code (Node.js)

```js
const BASE = process.env.ASSESSMENT_API_URL; // for example http://10.0.1.25:8080/api

async function callAssessment(path, body, timeoutMs) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.error || `HTTP ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return data;
}

// Start: 120 second timeout, no automatic retry
const started = await callAssessment('/assessments/start', {
  name, email, topics, difficulty, total_questions: 6,
}, 120_000);
// Save started.assessment_id and started.expires_at for this student

// Submit: 300 second timeout
const result = await callAssessment(`/assessments/${assessmentId}/submit`, {
  answers, answer_sources,
}, 300_000);
// Save result.final_score, result.individual_scores and result.feedback
```

## 8. What the service stores

The service keeps records for 30 days, then deletes them. Save what you need in your own system before then.

- **Students:** name and email.
- **Assessments:** the questions, the answers, the repaired transcripts, the scores, the feedback, the token counts, and the deadline.
- **Audit rows:** one per assessment, with the student name, type, topics, question count, final score, total tokens and times. No email address.

Once a record is deleted, the only copy of its scores and feedback is in your system.

## 9. Checklist for the CodeKerdos team

- [ ] Your backend can reach the service's private IP and port 8080, and nothing else can.
- [ ] Start and submit use the timeouts in section 6.
- [ ] You store `assessment_id` and `expires_at` for each student session.
- [ ] You send each answer under its question id, and mark spoken answers `voice`.
- [ ] You show the deadline and handle `410`.
- [ ] You handle `409` by showing the stored result.
- [ ] You do not retry a start automatically.
- [ ] You copy scores and feedback into your own system within 30 days.
- [ ] You have confirmed the data processing agreement covers student names, emails and answers.
