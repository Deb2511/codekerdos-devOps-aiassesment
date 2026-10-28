# CodeKerdos Assessment API: Integration Contract

This service generates DevOps assessment questions with Claude, scores the answers, and returns the scores and AI feedback. It is called server-to-server by the CodeKerdos backend. The browser never calls this service directly.

## Flow

1. The student starts an assessment in the CodeKerdos frontend.
2. The CodeKerdos backend calls `POST /api/assessments/start` or `POST /api/assessments/jd-start` and waits for the response. The response contains the questions and an `assessment_id`.
3. The student answers the questions. The CodeKerdos backend stores the `assessment_id` in the student's session.
4. The CodeKerdos backend calls `POST /api/assessments/{assessment_id}/submit` and waits for the response. The response contains the scores and feedback.
5. The CodeKerdos backend stores the scores and feedback in its own system and shows them on the dashboard.

Every call returns its result on the same HTTP response. There is no polling and no callback.

## Base URL and access

- Base URL: `http://<service-host>:<port>/api`, where the port is the HAProxy listener.
- Health check: `GET /health` (no `/api` prefix).
- Authentication: none at the application level. Access is restricted by network: only the CodeKerdos backend's security group or subnet can reach the service.
- Content type: all request bodies are JSON (`Content-Type: application/json`).

## Endpoints

### 1. Start a self assessment

`POST /api/assessments/start`

Request body:

| Field | Required | Rules |
|---|---|---|
| `name` | yes | Text, 1 to 255 characters |
| `email` | yes | Valid email address. Identifies the student. |
| `topics` | yes | Non-empty array. Allowed values: `linux`, `networking`, `git`, `aws`, `terraform`, `docker`, `kubernetes`, `cicd`, `observability`, `sre` |
| `difficulty` | yes | `junior` or `senior` |
| `total_questions` | yes | `6`, `8` or `10` |

Response `200`:

```json
{
  "assessment_id": "3f6c1e2a-9b1d-4c7e-8a55-0d2f7e1b9a10",
  "questions": [
    { "id": 1, "question": "...", "topic": "linux" }
  ],
  "total_questions": 6,
  "tokens_used": { "input_tokens": 1200, "output_tokens": 900, "total_tokens": 2100 }
}
```

### 2. Start a job description assessment

`POST /api/assessments/jd-start`

Request body:

| Field | Required | Rules |
|---|---|---|
| `name` | yes | Same as above |
| `email` | yes | Same as above |
| `jd_text` | yes | Job description, 51 to 10,000 characters |
| `difficulty` | yes | `junior` or `senior` |
| `num_questions` | no | `6`, `8` or `10`. Defaults to `6`. |

Response `200`: the same shape as the self start response, plus `inferred_topics`, the topics the AI took from the job description.

```json
{
  "assessment_id": "...",
  "questions": [ { "id": 1, "question": "...", "topic": "..." } ],
  "total_questions": 6,
  "inferred_topics": ["kubernetes", "cicd"],
  "tokens_used": { "input_tokens": 1500, "output_tokens": 950, "total_tokens": 2450 }
}
```

### 3. Submit answers

`POST /api/assessments/{assessment_id}/submit`

Request body:

| Field | Required | Rules |
|---|---|---|
| `answers` | yes | Object keyed by question ID as a string, for example `{ "1": "answer text", "2": "answer text" }`. A missing answer is scored as empty. |
| `answer_sources` | no | Object with the same keys. Each value must be `voice` or `typed`. Use `voice` when the answer was spoken and transcribed in the browser. A missing entry is treated as `typed`. |

Response `200`:

```json
{
  "assessment_id": "...",
  "base_score": 42,
  "final_score": 40,
  "max_possible_score": 60,
  "score_percent": 67,
  "plagiarism_deduction_amount": 2,
  "plagiarism_deduction_percent": 5,
  "per_topic_scores": { "linux": 70, "docker": 60 },
  "feedback": "Overall AI feedback for the student.",
  "individual_scores": { "q1": 8, "q2": 6 },
  "individual_feedback": { "q1": "Feedback for question 1.", "q2": "Feedback for question 2." },
  "plagiarism_risk": "low",
  "plagiarism_notes": "",
  "completed_at": "2026-10-29T10:15:00.000Z"
}
```

Scoring:

- Each question scores 0 to 10.
- `max_possible_score` is 10 times the number of questions.
- `per_topic_scores` are percentages (0 to 100) per topic.
- Plagiarism risk reduces the score: `low` 5%, `medium` 10%, `high` 20%.

### 4. Get one assessment

`GET /api/results/assessment/{assessment_id}`

Returns the full stored record for the assessment (see "What we store"). Returns `404` if the ID does not exist. Pass only the fields your system needs to students.

### 5. List a student's assessments

`GET /api/results/student/{email}?limit=10`

Returns the student's assessments, newest first. `limit` defaults to 10.

```json
{ "email": "student@example.com", "assessments": [ ... ], "total": 1 }
```

## Errors

Every error has the same shape: `{ "error": "message" }`.

| Status | Meaning |
|---|---|
| `400` | Invalid input. The message names the field. |
| `404` | Assessment not found. |
| `409` | Assessment already submitted. Do not resubmit. |
| `410` | Time limit exceeded. The assessment can no longer be submitted. Show the student that time has run out. |
| `500` | Failed to start or evaluate. Safe to show the student a retry option. |

A `500` on start usually means no records were created, so a retry is safe. A `500` on submit before results are saved leaves the assessment open, so a retry is safe. The one exception is a database failure after the results are saved: the assessment is then marked submitted, and a retry returns `409`.

## Time limit

Each question has 5 minutes. The whole assessment therefore has a deadline of 5 minutes times the number of questions, plus a 3 minute grace period for network delay. For 6 questions that is 33 minutes; for 8 questions, 43 minutes.

- The start response includes `expires_at`, the deadline as an ISO timestamp. Show it to the student so the timer matches the server.
- A submit that arrives after `expires_at` returns `410`. Nothing is scored or saved.
- The browser timer moves the student from question to question. The server only checks the total time, at submit.
- Assessments created before this rule have no deadline and can still be submitted.

## Timeouts and retries

| Call | Service-side limit | Recommended client timeout |
|---|---|---|
| start, jd-start | 60 seconds (`CLAUDE_TIMEOUT_SECS`) | 120 seconds |
| submit | 90 seconds per evaluation attempt, up to two attempts | 300 seconds |

- Configure HAProxy's server timeout to at least 300 seconds.
- Retry a failed submit. Do not retry a start automatically: a retry after a slow success creates a second assessment.
- Submit only once per assessment. A second submit returns `409`.

## What we store

All data is in PostgreSQL. Our service is the record of the evaluation.

Retention: every record is deleted 30 days after it was created. A daily job removes assessments, audit rows and students who no longer have any assessments. After deletion, the only copy of a student's scores and feedback is in CodeKerdos's own system, so their backend should keep what it needs. The period is set by `RETENTION_DAYS`.

Table `students`: one row per email address.
- `name`, `email`, `created_at`. The name is saved the first time a student starts an assessment.

Table `assessments`: one row per assessment.
- Setup: `assessment_type` (`self` or `jd`), `difficulty`, `topics`, `questions` (as generated), `jd_text` (JD assessments only).
- Answers: `answers`, `repair_log` (the transcript repairs for voice answers).
- Scores: `base_score`, `final_score`, `max_possible_score`, `score_percent`, `per_topic_scores`, plagiarism fields.
- AI output: `feedback_json`, `plagiarism_risk`, `plagiarism_notes`.
- Tokens: `tokens_used` with `generation`, `evaluation` and `total`.
- Timestamps: `created_at` (start), `completed_at` (submit).

Table `assessment_audit`: one row per assessment, for audit records.
- `assessment_id`, `student_name`, `assessment_type`, `topics` (self assessments only, otherwise empty), `question_count`, `score` (final score), `total_tokens` (generation and evaluation combined), `started_at`, `completed_at`.
- This table holds no email address. It has no foreign key, and it is deleted by the same 30 day rule.

## Open items

- Data processing agreement: the database holds student names, emails and answers. It must be confirmed before go-live.
- The assessment time limit (`ASSESSMENT_TIMEOUT_MINS`) is defined but not enforced by the server.
