// End-to-end test for the assessment API.
//
// Run against the test stack (see deploy/README section "Running the end-to-end test"):
//   node backend/test/e2e/run-e2e.js
//
// Environment (optional):
//   BASE_URL       default http://localhost:18080 (HAProxy)
//   DEPLOY_DIR     default ../../../deploy relative to this file
//   POSTGRES_DB    default codekudos

const { execFileSync } = require('child_process');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:18080';
const DEPLOY_DIR = process.env.DEPLOY_DIR || path.resolve(__dirname, '../../../deploy');
const POSTGRES_DB = process.env.POSTGRES_DB || 'codekudos';
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
  return execFileSync(
    'docker',
    ['compose', '-f', 'docker-compose.yml', '-f', 'docker-compose.test.yml', '--env-file', '.env',
      'exec', '-T', 'postgres', 'psql', '-U', 'postgres', '-d', POSTGRES_DB, '-t', '-A', '-c', query],
    { cwd: DEPLOY_DIR, encoding: 'utf8' }
  ).trim();
}

const SHORT_ANSWERS = {
  '1': 'cube CTL get pods lists pods in the current namespace',
  '2': 'df minus h shows disk usage in human readable form',
  '3': 'I would use git rebase to keep history linear',
  '4': 'A load balancer spreads traffic across healthy targets',
  '5': 'Terraform state tracks the real infrastructure',
  '6': 'Docker images are built in layers from a Dockerfile',
};
const SOURCES = { '1': 'voice', '2': 'voice' };

async function main() {
  console.log(`Testing ${BASE_URL} with student ${STUDENT_EMAIL}\n`);

  console.log('Health');
  const health = await call('GET', '/health');
  check('GET /health returns 200 with status ok', health.status === 200 && health.body?.status === 'ok');

  console.log('\nSelf assessment: start');
  const bad = await call('POST', '/api/assessments/start', { name: '', email: 'x', topics: [], difficulty: 'junior', total_questions: 6 });
  check('invalid start is rejected with 400', bad.status === 400, `got ${bad.status}`);

  const start = await call('POST', '/api/assessments/start', {
    name: 'E2E Student', email: STUDENT_EMAIL, topics: ['linux', 'docker'], difficulty: 'junior', total_questions: 6,
  });
  check('valid start returns 200', start.status === 200, `got ${start.status}`);
  const selfId = start.body?.assessment_id;
  check('start returns an assessment_id', typeof selfId === 'string' && selfId.length > 0);
  check('start returns 6 questions with id, question and topic',
    Array.isArray(start.body?.questions) && start.body.questions.length === 6 &&
    start.body.questions.every((q) => 'id' in q && 'question' in q && 'topic' in q));
  check('start reports generation tokens (1200)', start.body?.tokens_used?.total_tokens === 1200, JSON.stringify(start.body?.tokens_used));

  console.log('\nSelf assessment: rejected submit, then valid submit');
  const badSource = await call('POST', `/api/assessments/${selfId}/submit`, {
    answers: { '1': 'x' }, answer_sources: { '1': 'Voice' },
  });
  check('invalid answer_sources value is rejected with 400', badSource.status === 400, `got ${badSource.status}`);

  const submit = await call('POST', `/api/assessments/${selfId}/submit`, { answers: SHORT_ANSWERS, answer_sources: SOURCES });
  check('valid submit returns 200', submit.status === 200, `got ${submit.status} ${JSON.stringify(submit.body)}`);
  check('submit: base score is 42 (six answers at 7)', submit.body?.base_score === 42, `got ${submit.body?.base_score}`);
  check('submit: final score is 42 with no plagiarism deduction', submit.body?.final_score === 42);
  check('submit: score_percent is 70', submit.body?.score_percent === 70, `got ${submit.body?.score_percent}`);
  check('submit: individual_scores has q1 to q6',
    ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'].every((k) => submit.body?.individual_scores?.[k] === 7));
  check('submit: individual_feedback is present for each question',
    Object.keys(submit.body?.individual_feedback || {}).length === 6);
  check('submit: completed_at is set', typeof submit.body?.completed_at === 'string');

  const resubmit = await call('POST', `/api/assessments/${selfId}/submit`, { answers: SHORT_ANSWERS });
  check('second submit is rejected with 409', resubmit.status === 409, `got ${resubmit.status}`);

  console.log('\nSelf assessment: stored record');
  const record = await call('GET', `/api/results/assessment/${selfId}`);
  check('GET assessment returns 200', record.status === 200, `got ${record.status}`);
  check('stored tokens: generation 1200, evaluation 2500, total 3700',
    record.body?.tokens_used?.generation?.total_tokens === 1200 &&
    record.body?.tokens_used?.evaluation?.total_tokens === 2500 &&
    record.body?.tokens_used?.total === 3700, JSON.stringify(record.body?.tokens_used));
  const repairLog = record.body?.repair_log || [];
  check('repair log has one entry per question', repairLog.length === 6);
  check('repair log marks voice answers applied and typed answers skipped',
    repairLog.filter((r) => r.source === 'voice').every((r) => r.status === 'applied') &&
    repairLog.filter((r) => r.source === 'typed').every((r) => r.status === 'skipped'));
  check('repair log shows the voice repair (cube CTL to kubectl)',
    repairLog.find((r) => r.question_id === 1)?.repaired === 'kubectl get pods lists pods in the current namespace');

  const byStudent = await call('GET', `/api/results/student/${encodeURIComponent(STUDENT_EMAIL)}`);
  check('student list includes the assessment', byStudent.status === 200 && byStudent.body?.assessments?.some((a) => a.id === selfId));

  console.log('\nAudit table');
  const auditSelf = sql(`SELECT student_name, assessment_type, topics::text, question_count, score, total_tokens, completed_at IS NOT NULL FROM assessment_audit WHERE assessment_id = '${selfId}'`);
  check('self audit row exists with name, type, topics and question count',
    auditSelf === 'E2E Student|self|["linux", "docker"]|6|42|3700|t', auditSelf);

  console.log('\nJob description assessment');
  const jdText = 'We are hiring a DevOps engineer to run Kubernetes clusters, build CI/CD pipelines, and manage AWS infrastructure with Terraform.';
  const jd = await call('POST', '/api/assessments/jd-start', {
    name: 'E2E Student', email: STUDENT_EMAIL, jd_text: jdText, difficulty: 'senior', num_questions: 8,
  });
  check('JD start returns 200', jd.status === 200, `got ${jd.status}`);
  check('JD start returns questions and inferred_topics',
    Array.isArray(jd.body?.questions) && jd.body.questions.length > 0 && Array.isArray(jd.body?.inferred_topics));
  const jdAudit = sql(`SELECT assessment_type, topics IS NULL, total_tokens FROM assessment_audit WHERE assessment_id = '${jd.body?.assessment_id}'`);
  check('JD audit row has type jd, no topics and generation tokens', jdAudit === 'jd|t|1200', jdAudit);

  console.log('\nFailure handling');
  const before = sql('SELECT count(*) FROM assessments');
  const beforeAudit = sql('SELECT count(*) FROM assessment_audit');
  const failed500 = await call('POST', '/api/assessments/jd-start', {
    name: 'E2E Student', email: STUDENT_EMAIL, jd_text: `FAILTEST ${jdText}`, difficulty: 'junior',
  });
  check('Claude failure returns 500', failed500.status === 500, `got ${failed500.status}`);
  check('Claude failure leaves no new assessment or audit rows',
    sql('SELECT count(*) FROM assessments') === before && sql('SELECT count(*) FROM assessment_audit') === beforeAudit);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('Test run crashed:', error);
  process.exit(1);
});
