const fs = require('fs');
const p = 'app.js';
let s = fs.readFileSync(p, 'utf8');
const marker = 'INSERT INTO error_tags';
const mi = s.indexOf(marker);
if (mi === -1) { console.error('marker not found'); process.exit(2); }
// find previous occurrence of "app.post('/attempts/:id/error-tags'"
const postSig = "app.post('/attempts/:id/error-tags'";
let si = s.lastIndexOf(postSig, mi);
if (si === -1) {
  // fallback: find last 'app.post(' before marker
  si = s.lastIndexOf('app.post(', mi);
}
if (si === -1) { console.error('app.post not found before marker'); process.exit(2); }
// find end of this app.post call by locating the next '\n});' after mi
const endPat = '\n});';
let ei = s.indexOf(endPat, mi);
if (ei === -1) {
  // try find '});\n' slightly further
  ei = s.indexOf('});', mi);
  if (ei === -1) { console.error('end not found'); process.exit(2); }
}
const replaceEnd = ei + endPat.length;
console.log('replacing region', si, 'to', replaceEnd);

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
});\n`;

s = s.slice(0, si) + newHandler + s.slice(replaceEnd);
fs.writeFileSync(p, s, 'utf8');
console.log('patched app.js');
process.exit(0);
`;}