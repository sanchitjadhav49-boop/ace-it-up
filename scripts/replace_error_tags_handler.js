const fs = require('fs');
const file = 'app.js';
let s = fs.readFileSync(file, 'utf8');
const startPat = "app.post('/attempts/:id/error-tags'";
const si = s.indexOf(startPat);
if (si === -1) { console.error('start not found'); process.exit(2); }
// find the opening brace of the handler function
const arrow = s.indexOf('=>', si);
if (arrow === -1) { console.error('arrow not found'); process.exit(2); }
const funcStart = s.indexOf('{', arrow);
if (funcStart === -1) { console.error('func start not found'); process.exit(2); }
// find matching closing brace
let depth = 0; let i = funcStart;
for (; i < s.length; i++){
  const ch = s[i];
  if (ch === '{') depth++;
  else if (ch === '}') { depth--; if (depth === 0) break; }
}
if (depth !== 0) { console.error('could not find function end'); process.exit(2); }
const funcEnd = i; // index of closing '}'
// include the following ); that ends app.post(...);
let restIdx = funcEnd+1;
const semi = s.indexOf(');', restIdx);
if (semi === -1) { console.error('closing ); not found'); process.exit(2); }
const replaceEnd = semi+2;
const old = s.slice(si, replaceEnd);
console.log('Old handler length', old.length);

const newHandler = `app.post('/attempts/:id/error-tags', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const attemptId = Number(req.params.id);
    if (!Number.isInteger(attemptId)) throw new ApiError(400, 'invalid attempt id');
    const body = req.body || {};

    let entries;
    if (body.tags && typeof body.tags === 'object' && !Array.isArray(body.tags)) {
      entries = Object.entries(body.tags);
    } else if (body.question_id !== undefined) {
      entries = [[body.question_id, body.error_tag]];
    } else {
      throw new ApiError(400, 'send { question_id, error_tag } or { tags: { question_id: error_tag } }');
    }
    if (entries.length === 0) throw new ApiError(400, 'no tags to save');

    await client.query('BEGIN');
    const attemptRes = await client.query('SELECT id FROM attempts WHERE id = $1', [attemptId]);
    if (attemptRes.rows.length === 0) throw new ApiError(404, 'attempt not found');

    const saved = {};
    for (const [rawQid, rawTag] of entries) {
      const questionId = Number(rawQid);
      const tag = String(rawTag);
      if (!Number.isInteger(questionId)) throw new ApiError(400, 'question_id must be an integer');
      if (!['correct','concept','silly','reading','application','time','guess','recall'].includes(tag)) {
        throw new ApiError(400, 'error_tag must be one of: correct, concept, silly, reading, application, time, guess, recall');
      }
      const inAttempt = await client.query(
        'SELECT 1 FROM attempt_questions WHERE attempt_id = $1 AND question_id = $2',
        [attemptId, questionId]
      );
      if (inAttempt.rows.length === 0) {
        throw new ApiError(400, 'question ' + questionId + ' is not part of this attempt');
      }
      await client.query(
        `INSERT INTO error_tags (attempt_id, question_id, error_tag, updated_at)
         VALUES ($1, $2, $3, now())
         ON CONFLICT (attempt_id, question_id) DO UPDATE
            SET error_tag = EXCLUDED.error_tag, updated_at = now()`,
        [attemptId, questionId, tag]
      );
      saved[questionId] = tag;
    }
    await client.query('COMMIT');
    res.json({ attempt_id: attemptId, tags: saved });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});`;

s = s.slice(0, si) + newHandler + s.slice(replaceEnd);
fs.writeFileSync(file, s, 'utf8');
console.log('replaced handler');
