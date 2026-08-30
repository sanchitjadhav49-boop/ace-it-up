const fs = require('fs');
const file = 'app.js';
let s = fs.readFileSync(file, 'utf8');
const startPat = "app.post('/attempts/:id/error-tags'";
const si = s.indexOf(startPat);
if (si === -1) { console.error('start not found'); process.exit(2); }
// find end of this app.post(...) call by locating the next '\n});\n' after si
const endPat = '\n});\n';
const ei = s.indexOf(endPat, si);
if (ei === -1) {
  console.error('end pattern not found'); process.exit(2);
}
const replaceEnd = ei + endPat.length;
const old = s.slice(si, replaceEnd);
console.log('Found handler length', old.length);

const newHandler = "app.post('/attempts/:id/error-tags', async (req, res, next) => {\n  const client = await pool.connect();\n  try {\n    const attemptId = Number(req.params.id);\n    if (!Number.isInteger(attemptId)) throw new ApiError(400, 'invalid attempt id');\n    const body = req.body || {};\n\n    let entries;\n    if (body.tags && typeof body.tags === 'object' && !Array.isArray(body.tags)) {\n      entries = Object.entries(body.tags);\n    } else if (body.question_id !== undefined) {\n      entries = [[body.question_id, body.error_tag]];\n    } else {\n      throw new ApiError(400, 'send { question_id, error_tag } or { tags: { question_id: error_tag } }');\n    }\n    if (entries.length === 0) throw new ApiError(400, 'no tags to save');\n\n    await client.query('BEGIN');\n    const attemptRes = await client.query('SELECT id FROM attempts WHERE id = $1', [attemptId]);\n    if (attemptRes.rows.length === 0) throw new ApiError(404, 'attempt not found');\n\n    const saved = {};\n    for (const [rawQid, rawTag] of entries) {\n      const questionId = Number(rawQid);\n      const tag = String(rawTag);\n      if (!Number.isInteger(questionId)) throw new ApiError(400, 'question_id must be an integer');\n      if (!['correct','concept','silly','reading','application','time','guess','recall'].includes(tag)) {\n        throw new ApiError(400, 'error_tag must be one of: correct, concept, silly, reading, application, time, guess, recall');\n      }\n      const inAttempt = await client.query(\n        'SELECT 1 FROM attempt_questions WHERE attempt_id = $1 AND question_id = $2',\n        [attemptId, questionId]\n      );\n      if (inAttempt.rows.length === 0) {\n        throw new ApiError(400, 'question ' + questionId + ' is not part of this attempt');\n      }\n      await client.query(\n        'INSERT INTO error_tags (attempt_id, question_id, error_tag, updated_at)\\n         VALUES ($1, $2, $3, now())\\n         ON CONFLICT (attempt_id, question_id) DO UPDATE\\n            SET error_tag = EXCLUDED.error_tag, updated_at = now()',\n        [attemptId, questionId, tag]\n      );\n      saved[questionId] = tag;\n    }\n    await client.query('COMMIT');\n    res.json({ attempt_id: attemptId, tags: saved });\n  } catch (err) {\n    await client.query('ROLLBACK').catch(() => {});\n    next(err);\n  } finally {\n    client.release();\n  }\n});\n";

s = s.slice(0, si) + newHandler + s.slice(replaceEnd);
fs.writeFileSync(file, s, 'utf8');
console.log('replaced handler');
