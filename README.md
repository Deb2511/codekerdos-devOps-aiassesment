# CodeKerdos Assessment Service

This service generates DevOps assessment questions with Claude, scores student answers, and returns the scores and AI feedback. The CodeKerdos backend calls it server-to-server. Students never call it directly.

It stores each assessment in PostgreSQL for 30 days and keeps a small audit record for each one.

Students choose a self assessment (topics such as Docker, Kubernetes, Linux or SRE) or a job-description assessment (a pasted JD). Each assessment has six, eight or ten scenario questions, at junior or senior level.

| Document | Read it for |
|---|---|
| This README | Deploying and operating the service |
| [backend/API_CONTRACT.md](backend/API_CONTRACT.md) | Endpoints, request and response shapes, errors, timeouts, stored data |

## How an assessment works

1. **Start.** The CodeKerdos backend calls `/api/assessments/start` or `/api/assessments/jd-start`. Claude writes the questions. The response includes the questions, the `assessment_id` and `expires_at`.
2. **Answer.** The student answers in the CodeKerdos frontend, typed or spoken. Spoken answers arrive as text with `answer_sources` marked `voice`, and Claude repairs transcription errors in those answers only.
3. **Submit.** The CodeKerdos backend calls `/api/assessments/{id}/submit`. Claude scores each answer from 0 to 10 against the level rubric, and writes one or two sentences of feedback per question, plus an overall summary of two to three sentences.
4. **Score.** The server adds the per-question scores, applies any plagiarism deduction, and calculates the percentage out of 10 points per question. The arithmetic happens in code, not in the model.

**Levels.** Junior uses the beginner rubric and senior uses the intermediate rubric, both taken from the SRE assessment bot.

**Time limit.** Each question has 5 minutes, and the browser timer moves the student through the questions. The server allows a submit until the total time plus a 3 minute grace period, that is 33 minutes for six questions. A later submit returns `410`, and nothing is scored or saved.

**Single submit.** A second submit returns `409`. A failed evaluation leaves the assessment open, so the student can retry.

## Architecture

```
CodeKerdos frontend (browser)
        |
CodeKerdos backend  (their server)
        |  HTTP, private network only
        v
HAProxy  (port 8080)
        |
   +----+----+
   v         v
backend-1  backend-2     Node.js (Express), one image, two containers
   |         |
   +----+----+
        v
PostgreSQL 15  (named Docker volume)
        |
        v
Anthropic API  (question generation and evaluation)
```

- Each backend container is stateless. All state lives in PostgreSQL, so containers can be added or removed freely.
- Only HAProxy publishes a port. The backend containers and the database have no published ports.
- Every API call waits for its result. There is no polling and no callback.

## Repository layout

Paths below are relative to the repository root.

```
backend/                 Node.js service (TypeScript, Express, pg)
  src/                   Application code
  API_CONTRACT.md        Integration contract for the CodeKerdos team
  Dockerfile             Builds the backend image
  test/e2e/              End-to-end test and a mock Anthropic API
deploy/                  Everything needed to run the service
  docker-compose.yml     Production stack: PostgreSQL, backend replicas, HAProxy
  docker-compose.test.yml  Test-only override that adds a mock Anthropic API
  haproxy.cfg            Load balancer configuration
  .env.example           Settings template (copy to .env)
frontend/                Example React client, for reference only. Not deployed.
```

## Prerequisites

- Docker Engine 24 or later, with the Compose plugin (`docker compose version` should work)
- Outbound HTTPS to `api.anthropic.com` from the server
- An Anthropic API key
- Network access from the CodeKerdos backend to the service's private IP and port

## Configuration

All settings live in `deploy/.env`. Create it from the template:

```
cd deploy
cp .env.example .env
```

| Variable | Required | Purpose |
|---|---|---|
| `POSTGRES_PASSWORD` | yes | Database password. Use letters and digits only, because it is part of a connection URL. |
| `POSTGRES_DB` | no | Database name. Default `codekudos`. |
| `ANTHROPIC_API_KEY` | yes | Claude API key. Set it only on the server. |
| `CLAUDE_TIMEOUT_SECS` | no | Timeout for question generation. Default `60`. |
| `RETENTION_DAYS` | no | Records older than this are deleted. Default `30`. |
| `HAPROXY_BIND` | yes | IP address HAProxy listens on. Use the instance's private IP in production, and `127.0.0.1` on a laptop. |
| `HAPROXY_PORT` | no | Port HAProxy listens on. Default `8080`. |
| `BACKEND_REPLICAS` | no | Number of backend containers. Default `2`. |

Keep `deploy/.env` private: `chmod 600 deploy/.env` on the server. Git ignores it, and the Docker image excludes it.

## Deploying on EC2

The steps below assume an Ubuntu instance in the same VPC as the CodeKerdos backend.

1. **Install Docker and the Compose plugin.** Follow Docker's official instructions for Ubuntu, then confirm with `docker compose version`.

2. **Copy the code to the server.** Clone the repository, or copy the `backend/` and `deploy/` folders.

3. **Create the settings file.**
   ```
   cd deploy
   cp .env.example .env
   nano .env
   ```
   Set `POSTGRES_PASSWORD`, `ANTHROPIC_API_KEY`, and `HAPROXY_BIND` (the instance's private IP). Then restrict the file:
   ```
   chmod 600 .env
   ```

4. **Start with one backend.** A single container creates the database tables. Starting two at the same moment can make both try at once.
   ```
   BACKEND_REPLICAS=1 docker compose -f docker-compose.yml --env-file .env up -d --build
   ```
   Wait about 20 seconds, then check that the backend is healthy:
   ```
   docker compose -f docker-compose.yml --env-file .env ps
   curl http://<private-ip>:8080/health
   ```
   The expected response is `{"status":"ok", ...}`.

5. **Scale to two backends.** Set `BACKEND_REPLICAS=2` in `.env` (or leave the default), then run:
   ```
   docker compose -f docker-compose.yml --env-file .env up -d
   ```

6. **Open the port to the CodeKerdos backend only.** In the instance's security group, allow TCP `8080` from the security group or subnet used by the CodeKerdos backend. Do not open it to the internet.

7. **Confirm end to end.** Ask the CodeKerdos team to make one start call and one submit call from their backend. Check that the row appears in `assessment_audit`.

## Running locally (laptop test)

Use the same files with a local address and a throwaway password:

```
cd deploy
cat > .env <<'EOF'
POSTGRES_PASSWORD=localtest123
POSTGRES_DB=codekudos
ANTHROPIC_API_KEY=your-key-here
CLAUDE_TIMEOUT_SECS=60
RETENTION_DAYS=30
HAPROXY_BIND=127.0.0.1
HAPROXY_PORT=8080
BACKEND_REPLICAS=2
NODE_ENV=production
EOF
docker compose -f docker-compose.yml --env-file .env up -d --build
```

Then `curl http://localhost:8080/health`. Delete `.env` when you finish, or keep it out of version control.

To run without a real API key, use the test override, which points the backend at a mock:

```
docker compose -f docker-compose.yml -f docker-compose.test.yml --env-file .env up -d --build
```

Never use `docker-compose.test.yml` on the server.

## Running the end-to-end test

**Against the real Claude API (default).** Start the normal stack with your real key in `deploy/.env`, then run from the repository root:

```
node backend/test/e2e/run-e2e.js
```

**Without an API key (mock).** Start the test stack, then run in mock mode:

```
cd deploy
docker compose -f docker-compose.yml -f docker-compose.test.yml --env-file .env up -d --build
cd ..
E2E_MODE=mock node backend/test/e2e/run-e2e.js
```

The test calls the API through HAProxy and checks the database through `psql`. It covers:

- starting self and job description assessments, including validation errors
- submitting answers with a mix of voice and typed sources, including the transcript repair
- score calculation, stored token totals, and the repair log
- the audit rows for both assessment types
- rejecting a second submit with `409`
- a Claude failure, which must leave no new records

With the real API, the test checks structure and consistency rather than exact scores, because model output varies from run to run. It does not judge the quality of the questions or feedback. The mock mode also checks exact values and the Claude failure path, which the real mode skips.

## Operating the service

**Logs:**
```
docker compose -f docker-compose.yml --env-file .env logs -f backend
docker compose -f docker-compose.yml --env-file .env logs -f haproxy
```

**Restart a service:**
```
docker compose -f docker-compose.yml --env-file .env restart backend
```

**Update to a new version:** pull the new code, then run
```
docker compose -f docker-compose.yml --env-file .env up -d --build
```
Each container restarts briefly during the update.

**Stop the stack without losing data:** `docker compose -f docker-compose.yml --env-file .env down`. Do not add `-v`, because that deletes the database volume.

**Retention:** a job runs inside each backend container at startup and then every 24 hours. It deletes assessments, audit rows and unused students older than `RETENTION_DAYS`. Each run is logged as `Retention (30 days): deleted {...}`.

## Security notes

- The service has no authentication. Access is controlled by the network, so the port must stay private.
- `ANTHROPIC_API_KEY` is read from `deploy/.env` only. It is never written to the image or to git.
- The database has no published port. Only the backend containers can reach it.
- Student names, emails and answers are personal data. A data processing agreement must cover this service before live use.

## Known limitations

- **Topics must not outnumber questions.** The topic plan gives each topic at least one question. If a student picks more topics than questions, the extra topic gets no question and its per-topic score is `null`. The fix is to reject such requests with a `400`. This is a known gap.
- **The question count is not checked.** If Claude returns fewer or more questions than requested, the server accepts them. This hasn't been seen in testing, but it isn't guarded against.
- **The audit row is written after the assessment row.** A database error between the two writes would leave an assessment with no audit row. This is unlikely, and it isn't covered by a test.
- **Question quality is not guaranteed.** The prompt bans hints and invented details, and testing shows fewer leaks than before. A few questions may still hint at the answer or name the category of a problem. Artifact questions, such as a Dockerfile with a planted error, may contain more than one problem.
- **Evaluation can be generous or harsh.** Scores come from the model, guided by the rubric. They are calibrated by testing, not by a human marker.
- **The example frontend does not yet show the server deadline.** It still counts 5 minutes per question and does not use `expires_at`.
- **Timeouts depend on Claude's speed.** A slow evaluation can take several minutes. HAProxy waits up to 300 seconds, and the CodeKerdos backend should wait at least that long on submit.
- **Starting several backends at once can race.** Follow the one-then-two sequence in step 4 when deploying.
- **Cost.** A six-question assessment costs roughly ₹1.5 at the list prices checked in testing (about $1 per million input tokens and $5 per million output tokens for Claude Haiku 4.5, at about ₹96 per dollar). Check the current prices before budgeting.
- **Retention also applies to the audit table.** The audit table holds student names, so it follows the same 30 day limit.
