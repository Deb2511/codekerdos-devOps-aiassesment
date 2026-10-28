// Stand-in for the Anthropic Messages API, used only for end-to-end tests.
// It returns answers in the shapes the backend expects, so the full flow can run
// without an API key. It does not test model quality or real response times.
//
// Behaviour:
// - Question generation prompts get a JSON array of questions.
// - Evaluation prompts get a score of 7 for every answer, and a repair for
//   answers that contain "cube CTL".
// - Any prompt containing "FAILTEST" gets an HTTP 500, to test failure handling.

const http = require('http');

const PORT = parseInt(process.env.PORT || '4010');

function questionCountFrom(prompt) {
  const match = prompt.match(/EXACTLY (\d+)/);
  return match ? parseInt(match[1]) : 6;
}

function generationText(prompt) {
  const count = questionCountFrom(prompt);
  const questions = [];
  for (let id = 1; id <= count; id++) {
    questions.push({ id, question: `Mock question ${id}?`, topic: 'linux' });
  }
  return JSON.stringify(questions);
}

function evaluationText(prompt) {
  const ids = [...prompt.matchAll(/<answer id="(\d+)"/g)].map((m) => parseInt(m[1]));
  const questions = ids.map((id) => {
    const voiceBlock = prompt.match(new RegExp(`<answer id="${id}" source="voice"[^>]*>\\n([\\s\\S]*?)\\n</answer>`));
    const isVoice = Boolean(voiceBlock);
    const answer = voiceBlock ? voiceBlock[1] : '';
    const hasCubeCtl = answer.includes('cube CTL');
    return {
      id,
      score: 7,
      repaired: isVoice && hasCubeCtl ? answer.replace('cube CTL', 'kubectl') : answer,
      changes: isVoice && hasCubeCtl
        ? [{ original: 'cube CTL', corrected: 'kubectl', type: 'term', confidence: 'high' }]
        : [],
      unclear: [],
      feedback: `Mock feedback for question ${id}.`,
    };
  });
  return JSON.stringify({
    questions,
    overall_feedback: 'Mock overall feedback for this assessment.',
    plagiarism_risk: 'none',
    plagiarism_notes: '',
  });
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/v1/messages') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ type: 'error', error: { type: 'not_found_error', message: 'not found' } }));
  }

  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    const request = JSON.parse(body || '{}');
    const prompt = (request.messages || []).map((m) => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content))).join('\n');

    if (prompt.includes('FAILTEST')) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ type: 'error', error: { type: 'api_error', message: 'mock failure' } }));
    }

    const isGeneration = prompt.includes('Return as valid JSON array');
    const text = isGeneration ? generationText(prompt) : evaluationText(prompt);
    const usage = isGeneration
      ? { input_tokens: 1000, output_tokens: 200 }
      : { input_tokens: 2000, output_tokens: 500 };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        id: `msg_mock_${Date.now()}`,
        type: 'message',
        role: 'assistant',
        model: request.model,
        content: [{ type: 'text', text }],
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage,
      })
    );
  });
});

server.listen(PORT, () => console.log(`Mock Anthropic API listening on ${PORT}`));
