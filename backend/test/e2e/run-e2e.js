// End-to-end test for the assessment API.
//
// Real Claude (default):
//   node backend/test/e2e/run-e2e.js
//   Uses the stack in deploy/ with the real ANTHROPIC_API_KEY from deploy/.env.
//   Checks structure and internal consistency, because model output varies.
//
// Mock (no API key needed):
//   E2E_MODE=mock node backend/test/e2e/run-e2e.js
//   Uses deploy/docker-compose.test.yml, which points the backend at mock-anthropic.js.
//   Also checks exact values.
//
// Environment (optional):
//   BASE_URL       default http://localhost:18080 (HAProxy)
//   E2E_MODE       "real" (default) or "mock"
//   POSTGRES_DB    default codekudos

const { execFileSync } = require('child_process');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:18080';
const DEPLOY_DIR = path.resolve(__dirname, '../../../deploy');
const POSTGRES_DB = process.env.POSTGRES_DB || 'codekudos';
const MODE = process.env.E2E_MODE === 'mock' ? 'mock' : 'real';
const MOCK = MODE === 'mock';
const STUDENT_NAME = 'E2E Student';
const STUDENT_EMAIL = `e2e.${Date.now()}@example.com`;

let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? ` (${detail})` : ''}`);
  }
}

function skip(name) {
  console.log(`  SKIP  ${name}`);
}

async function call(method, route, body) {
  const response = await fetch(`${BASE_URL}${route}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }
  return { status: response.status, body: json };
}

// Runs a SQL query inside the Postgres container and returns the trimmed output
function sql(query) {
  const files = MOCK
    ? ['-f', 'docker-compose.yml', '-f', 'docker-compose.test.yml']
    : ['-f', 'docker-compose.yml'];
  return execFileSync(
    'docker',
    ['compose', ...files, '--env-file', '.env', 'exec', '-T', 'postgres', 'psql',
      '-U', 'postgres', '-d', POSTGRES_DB, '-t', '-A', '-c', query],
    { cwd: DEPLOY_DIR, encoding: 'utf8' }
  ).trim();
}

const ANSWERS = {
  '1': 'cube CTL get pods lists pods in the current namespace',
  '2': 'df minus h shows disk usage in human readable form',
  '3': 'I would use git rebase to keep history linear',
  '4': 'A load balancer spreads traffic across healthy targets',
  '5': 'Terraform state tracks the real infrastructure',
  '6': 'Docker images are built in layers from a Dockerfile',
};
const SOURCES = { '1': 'voice', '2': 'voice' };
const JD_TEXT = 'We are hiring a DevOps engineer to run Kubernetes clusters, build CI/CD pipelines, and manage AWS infrastructure with Terraform.';

async function main() {
  console.log(`Mode: ${MODE}. Testing ${BASE_URL} with student ${STUDENT_EMAIL}\n`);

  console.log('Health');
  const health = await call('GET', '/health');
  check('GET /health returns 200 with status ok', health.status === 200 && health.body?.status === 'ok');

  console.log('\nSelf assessment: start');
  const bad = await call('POST', '/api/assessments/start', { name: '', email: 'x', topics: [], difficulty: 'junior', total_questions: 6 });
  check('invalid start is rejected with 400', bad.status === 400, `got ${bad.status}`);

  const start = await call('POST', '/api/assessments/start', {
    name: STUDENT_NAME, email: STUDENT_EMAIL, topics: ['linux', 'docker'], difficulty: 'junior', total_questions: 6,
  });
  check('valid start returns 200', start.status === 200, `got ${start.status} ${JSON.stringify(start.body)}`);
  const selfId = start.body?.assessment_id;
  const startQuestions = start.body?.questions || [];
  check('start returns an assessment_id', typeof selfId === 'string' && selfId.length > 0);
  check('start returns 6 questions with id, question and topic',
    startQuestions.length === 6 && startQuestions.every((q) => 'id' in q && 'question' in q && 'topic' in q),
    `got ${startQuestions.length}`);
  check('every question topic is one the student chose',
    startQuestions.every((q) => ['linux', 'docker'].includes(q.topic)));
  const generationTokens = start.body?.tokens_used?.total_tokens;
  if (MOCK) {
    check('start reports generation tokens (1200)', generationTokens === 1200, `got ${generationTokens}`);
  } else {
    check('start reports generation tokens above zero', generationTokens > 0, `got ${generationTokens}`);
  }

  console.log('\nSelf assessment: rejected submit, then valid submit');
  const badSource = await call('POST', `/api/assessments/${selfId}/submit`, {
    answers: { '1': 'x' }, answer_sources: { '1': 'Voice' },
  });
  check('invalid answer_sources value is rejected with 400', badSource.status === 400, `got ${badSource.status}`);

  const submit = await call('POST', `/api/assessments/${selfId}/submit`, { answers: ANSWERS, answer_sources: SOURCES });
  check('valid submit returns 200', submit.status === 200, `got ${submit.status} ${JSON.stringify(submit.body)}`);
  const body = submit.body || {};
  const scores = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'].map((k) => body.individual_scores?.[k]);
  check('submit: six individual scores, each a whole number from 0 to 10',
    scores.every((s) => Number.isInteger(s) && s >= 0 && s <= 10), JSON.stringify(scores));
  const baseSum = scores.reduce((a, b) => a + b, 0);
  check('submit: base score equals the sum of individual scores', body.base_score === baseSum, `base ${body.base_score}, sum ${baseSum}`);
  check('submit: final score does not exceed base score', body.final_score <= body.base_score);
  check('submit: max possible score is 60', body.max_possible_score === 60);
  check('submit: score_percent matches final score',
    body.score_percent === Math.round((body.final_score / 60) * 100), `got ${body.score_percent}`);
  if (MOCK) {
    check('submit (mock): base score is 42 (six answers at 7)', body.base_score === 42);
    check('submit (mock): individual_scores are all 7', scores.every((s) => s === 7));
  }
  check('submit: individual_feedback has an entry for each question',
    Object.keys(body.individual_feedback || {}).length === 6);
  check('submit: overall feedback is present', typeof body.feedback === 'string' && body.feedback.length > 0);
  check('submit: completed_at is set', typeof body.completed_at === 'string');

  const resubmit = await call('POST', `/api/assessments/${selfId}/submit`, { answers: ANSWERS });
  check('second submit is rejected with 409', resubmit.status === 409, `got ${resubmit.status}`);

  console.log('\nSelf assessment: stored record');
  const record = await call('GET', `/api/results/assessment/${selfId}`);
  check('GET assessment returns 200', record.status === 200, `got ${record.status}`);
  const tokens = record.body?.tokens_used || {};
  check('stored tokens: total equals generation plus evaluation',
    tokens.total === (tokens.generation?.total_tokens || 0) + (tokens.evaluation?.total_tokens || 0),
    JSON.stringify(tokens));
  check('stored tokens: evaluation tokens above zero', tokens.evaluation?.total_tokens > 0);
  if (MOCK) {
    check('stored tokens (mock): generation 1200, evaluation 2500, total 3700',
      tokens.generation?.total_tokens === 1200 && tokens.evaluation?.total_tokens === 2500 && tokens.total === 3700);
  }
  const repairLog = record.body?.repair_log || [];
  check('repair log has one entry per question', repairLog.length === 6, `got ${repairLog.length}`);
  check('repair log marks voice answers applied and typed answers skipped',
    repairLog.filter((r) => r.source === 'voice').every((r) => r.status === 'applied') &&
    repairLog.filter((r) => r.source === 'typed').every((r) => r.status === 'skipped'));
  if (MOCK) {
    check('repair log (mock) shows cube CTL changed to kubectl',
      repairLog.find((r) => r.question_id === 1)?.repaired === 'kubectl get pods lists pods in the current namespace');
  } else {
    check('repair log has a repaired text for the voice answer',
      typeof repairLog.find((r) => r.question_id === 1)?.repaired === 'string');
  }

  const byStudent = await call('GET', `/api/results/student/${encodeURIComponent(STUDENT_EMAIL)}`);
  check('student list includes the assessment', byStudent.status === 200 && byStudent.body?.assessments?.some((a) => a.id === selfId));

  console.log('\nAudit table');
  const auditSelf = sql(`SELECT student_name, assessment_type, topics::text, question_count, score, total_tokens, completed_at IS NOT NULL FROM assessment_audit WHERE assessment_id = '${selfId}'`);
  const expectedAudit = `${STUDENT_NAME}|self|["linux", "docker"]|6|${body.final_score}|${tokens.total}|t`;
  check('self audit row matches the stored result (name, type, topics, count, score, tokens, completed)',
    auditSelf === expectedAudit, `got "${auditSelf}", expected "${expectedAudit}"`);

  console.log('\nJob description assessment');
  const jd = await call('POST', '/api/assessments/jd-start', {
    name: STUDENT_NAME, email: STUDENT_EMAIL, jd_text: JD_TEXT, difficulty: 'senior', num_questions: 8,
  });
  check('JD start returns 200', jd.status === 200, `got ${jd.status} ${JSON.stringify(jd.body)}`);
  check('JD start returns the requested 8 questions', jd.body?.questions?.length === 8, `got ${jd.body?.questions?.length}`);
  check('JD start returns inferred_topics', Array.isArray(jd.body?.inferred_topics) && jd.body.inferred_topics.length > 0);
  const jdAudit = sql(`SELECT assessment_type, topics IS NULL, question_count FROM assessment_audit WHERE assessment_id = '${jd.body?.assessment_id}'`);
  check('JD audit row has type jd, no topics and 8 questions', jdAudit === 'jd|t|8', jdAudit);

  console.log('\nFailure handling');
  if (MOCK) {
    const before = sql('SELECT count(*) FROM assessments');
    const beforeAudit = sql('SELECT count(*) FROM assessment_audit');
    const failed500 = await call('POST', '/api/assessments/jd-start', {
      name: STUDENT_NAME, email: STUDENT_EMAIL, jd_text: `FAILTEST ${JD_TEXT}`, difficulty: 'junior',
    });
    check('Claude failure returns 500', failed500.status === 500, `got ${failed500.status}`);
    check('Claude failure leaves no new assessment or audit rows',
      sql('SELECT count(*) FROM assessments') === before && sql('SELECT count(*) FROM assessment_audit') === beforeAudit);
  } else {
    skip('Claude failure path (needs the mock; run with E2E_MODE=mock)');
  }

  console.log('\nTime limit');
  const timed = await call('POST', '/api/assessments/start', {
    name: STUDENT_NAME, email: STUDENT_EMAIL, topics: ['docker'], difficulty: 'junior', total_questions: 6,
  });
  check('start returns expires_at', typeof timed.body?.expires_at === 'string');
  const expectedMs = Date.now() + 6 * 300 * 1000 + 180 * 1000;
  const expiresMs = new Date(timed.body?.expires_at).getTime();
  check('expires_at is 6 questions x 5 minutes plus 3 minutes grace from now', Math.abs(expiresMs - expectedMs) < 60000,
    `got ${timed.body?.expires_at}`);
  sql(`UPDATE assessments SET expires_at = NOW() - INTERVAL '1 second' WHERE id = '${timed.body?.assessment_id}'`);
  const late = await call('POST', `/api/assessments/${timed.body?.assessment_id}/submit`, { answers: ANSWERS });
  check('submit after the deadline is rejected with 410', late.status === 410, `got ${late.status}`);
  check('a late submit records nothing (still open)',
    sql(`SELECT completed_at IS NULL FROM assessments WHERE id = '${timed.body?.assessment_id}'`) === 't');

  console.log(`\nMode ${MODE}: ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('Test run crashed:', error);
  process.exit(1);
});
