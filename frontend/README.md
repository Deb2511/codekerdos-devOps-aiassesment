# Example frontend (reference only)

This React app shows how a student flow uses the assessment API: enter details, pick topics or paste a job description, answer each question within a 5 minute timer, and see the scores and feedback.

It is an example for the CodeKerdos team. It is not deployed and it is not production code.

## Run it locally

Requirements: Node.js 18 or later, and the assessment service running (see the root `README.md`).

```
cd frontend
cp .env.example .env
npm install
npm start
```

Open http://localhost:3000.

## Settings

| Variable | Purpose |
|---|---|
| `REACT_APP_API_URL` | Base URL of the assessment service, including `/api`. Default `http://localhost:5000/api`. |

For a laptop test against the Docker stack on port 8080, set `REACT_APP_API_URL=http://localhost:8080/api`.

## Important

- The browser calls the assessment service directly here, for demonstration only. In CodeKerdos, the browser must call the CodeKerdos backend, and that backend must call the assessment service.
- The assessment service has no authentication. Do not point this app at a service that is reachable from the internet.
- The timer runs 5 minutes per question in the browser. The server enforces the total time at submit, as described in `backend/API_CONTRACT.md`.
