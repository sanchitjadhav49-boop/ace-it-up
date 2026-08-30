const fs = require('fs');
const file = 'app.js';
let s = fs.readFileSync(file, 'utf8');
const anchor = 'async function saveAnswer(';
const idx = s.indexOf(anchor);
if (idx === -1) {
  console.error('anchor not found');
  process.exit(2);
}

const lines = [
  '// ---------------------------------------------------------------------------',
  "// GET /attempts/:id/error-tags  - saved error tags for an attempt.",
  "//   Returns { attempt_id, tags: { question_id: error_tag } }.",
  '// ---------------------------------------------------------------------------',
  "app.get('/attempts/:id/error-tags', async (req, res, next) => {",
  '  try {',
  "    const attemptId = Number(req.params.id);",
  "    if (!Number.isInteger(attemptId)) throw new ApiError(400, 'invalid attempt id');",
  "",
  "    const { rows } = await pool.query('SELECT question_id, error_tag FROM error_tags WHERE attempt_id = $1', [attemptId]);",
  '    const tags = {};',
  '    for (const r of rows) tags[Number(r.question_id)] = r.error_tag;',
  '    res.json({ attempt_id: attemptId, tags });',
  '  } catch (err) {',
  '    next(err);',
  '  }',
  '});',
  '',
  '// ---------------------------------------------------------------------------',
  "// POST /attempts/:id/error-tags  - save error tags for an attempt.",
  "//   Body: { question_id, error_tag } or { tags: { question_id: error_tag } }.",
  "//   error_tag must be one of the 8 options (correct + 7 error types).",
  '// ---------------------------------------------------------------------------',
  "app.post('/attempts/:id/error-tags', async (req, res, next) => {",
  '  const client = await pool.connect();',
  '  try {',
  "    const attemptId = Number(req.params.id);",
  "    if (!Number.isInteger(attemptId)) throw new ApiError(400, 'invalid attempt id');",
  '    const body = req.body || {};',
  '',
  '    let entries;',
  '    if (body.tags && typeof body.tags === "object" && !Array.isArray(body.tags)) {',
  '      entries = Object.entries(body.tags);',
  '    } else if (body.question_id !== undefined) {',
  '      entries = [[body.question_id, body.error_tag]];',
  '    } else {',
  "      throw new ApiError(400, 'send { question_id, error_tag } or { tags: { question_id: error_tag } }');",
  '    }',
  '    if (entries.length === 0) throw new ApiError(400, "no tags to save");',
  '',
  "    await client.query('BEGIN');",
  "    const attemptRes = await client.query('SELECT id FROM attempts WHERE id = $1', [attemptId]);",
  "    if (attemptRes.rows.length === 0) throw new ApiError(404, 'attempt not found');",
  '',
  '    const saved = {};',
  "    const VALID = ['correct','concept','silly','reading','application','time','guess','recall'];",
  '    for (const [rawQid, rawTag] of entries) {',
  '      const questionId = Number(rawQid);',
  '      const tag = String(rawTag);',
  "      if (!Number.isInteger(questionId)) throw new ApiError(400, 'question_id must be an integer');",
  '      if (!VALID.includes(tag)) {',
  "        throw new ApiError(400, 'error_tag must be one of: ' + VALID.join(', '));",
  '      }',
  "      const inAttempt = await client.query('SELECT 1 FROM attempt_questions WHERE attempt_id = $1 AND question_id = $2', [attemptId, questionId]);",
  "      if (inAttempt.rows.length === 0) { throw new ApiError(400, 'question ' + questionId + ' is not part of this attempt'); }",
  '      await client.query(',
  "        "INSERT INTO error_tags (attempt_id, question_id, error_tag, updated_at) VALUES ($1, $2, $3, now()) " +",
  "        "ON CONFLICT (attempt_id, question_id) DO UPDATE SET error_tag = EXCLUDED.error_tag, updated_at = now()",
  '        [attemptId, questionId, tag]',
  '      );',
  '      saved[questionId] = tag;',
  '    }',
  "    await client.query('COMMIT');",
  "    res.json({ attempt_id: attemptId, tags: saved });",
  '  } catch (err) {',
  "    await client.query('ROLLBACK').catch(() => {});", 
  '    next(err);',
  '  } finally {',
  '    client.release();',
  '  }',
  '});',
  ''
].join('\n');

s = s.slice(0, idx) + lines + '\n' + s.slice(idx);
fs.writeFileSync(file, s, 'utf8');
console.log('inserted endpoints before saveAnswer');
