'use strict';

const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const os = require('os');

const app = express();
app.use(express.json());
const EOL = os.EOL || '\n';

// ---------------------------------------------------------------------
// SIGNUP — create a new student account
// ---------------------------------------------------------------------
app.post('/api/signup', async (req, res) => {
  try {
    const { email, full_name, password } = req.body;
    if (!email || !full_name || !password) {
      throw new ApiError(400, 'email, full_name and password are required');
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, full_name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, full_name`,
      [email, full_name, password_hash]
    );

    res.json({ user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      // duplicate email
      return res.status(400).json({ error: 'An account with this email already exists' });
    }
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------
// LOGIN — check email + password
// ---------------------------------------------------------------------
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new ApiError(400, 'email and password are required');
    }

    const result = await pool.query(
      `SELECT id, email, full_name, password_hash FROM users WHERE email = $1`,
      [email]
    );
    const user = result.rows[0];

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({
      user: { id: user.id, email: user.email, full_name: user.full_name }
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});
// ---------------------------------------------------------------------
// ATTEMPT HISTORY — get all past attempts for a student
// ---------------------------------------------------------------------
app.get('/api/users/:userId/attempts', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      `SELECT a.id, a.test_id, a.status, a.started_at, a.submitted_at, a.total_marks,
              t.title AS test_title, t.duration_minutes,
              (SELECT COALESCE(SUM(q.positive_marks), 0)
                 FROM questions q
                 JOIN sections s ON s.id = q.section_id
                WHERE s.test_id = a.test_id) AS max_marks
       FROM attempts a
       JOIN tests t ON t.id = a.test_id
       WHERE a.user_id = $1
       ORDER BY a.started_at DESC`,
      [userId]
    );
    res.json({ attempts: result.rows });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// PostgreSQL connection
//   Configure via DATABASE_URL, e.g. postgres://user:pass@host:5432/aceitup
// ---------------------------------------------------------------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/aceitup',
});

// ---------------------------------------------------------------------------
// Small helper for HTTP errors with a status code
// ---------------------------------------------------------------------------
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Per-question status values understood by the API (drives the exam palette):
//   not_visited        - never opened
//   visited            - opened, no answer saved (JEE palette: "Not Answered")
//   answered           - has an answer
//   marked_for_review  - flagged; may or may not carry an answer
const ANSWER_STATUSES = ['answered', 'marked_for_review', 'not_visited', 'visited'];

const PAGE_QUESTIONS_COLS =
  'q.id, q.section_id, q.question_type, q.body, q.formula, ' +
  'q.positive_marks, q.negative_marks, q.position, q.difficulty';

// ---------------------------------------------------------------------------
// GET /tests  � list available (published) tests
// ---------------------------------------------------------------------------
app.get('/tests', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, description, duration_minutes, is_published, created_at
         FROM tests
        WHERE is_published = TRUE
        ORDER BY id`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /tests/:id  � one test with sections, questions and options.
//   NEVER exposes correct_option_id or correct_answer.
// ---------------------------------------------------------------------------
app.get('/tests/:id', async (req, res, next) => {
  try {
    const testId = Number(req.params.id);
    if (!Number.isInteger(testId)) throw new ApiError(400, 'invalid test id');

    const testRes = await pool.query(
      `SELECT id, title, description, duration_minutes, is_published, created_at
         FROM tests
        WHERE id = $1 AND is_published = TRUE`,
      [testId]
    );
    if (testRes.rows.length === 0) throw new ApiError(404, 'test not found');

    const test = testRes.rows[0];

    const sectionsRes = await pool.query(
      `SELECT id, name, position
         FROM sections
        WHERE test_id = $1
        ORDER BY position`,
      [testId]
    );
    const sections = sectionsRes.rows;
    const sectionIds = sections.map((s) => s.id);

    const questionsRes = sectionIds.length
      ? await pool.query(
          `SELECT ${PAGE_QUESTIONS_COLS}
             FROM questions q
            WHERE q.section_id = ANY($1)
            ORDER BY q.section_id, q.position`,
          [sectionIds]
        )
      : { rows: [] };
    const questions = questionsRes.rows;
    const questionIds = questions.map((q) => q.id);

    const optionsRes = questionIds.length
      ? await pool.query(
          `SELECT id, question_id, body, formula, position
             FROM question_options
            WHERE question_id = ANY($1)
            ORDER BY question_id, position`,
          [questionIds]
        )
      : { rows: [] };

    // Group options under their question, questions under their section.
    const optionsByQuestion = new Map();
    for (const o of optionsRes.rows) {
      if (!optionsByQuestion.has(o.question_id)) optionsByQuestion.set(o.question_id, []);
      optionsByQuestion.get(o.question_id).push({
        id: o.id,
        body: o.body,
        formula: o.formula,
        position: o.position,
      });
    }

    const questionsBySection = new Map();
    for (const q of questions) {
      const payload = {
        id: q.id,
        question_type: q.question_type,
        body: q.body,
        formula: q.formula,
        positive_marks: q.positive_marks,
        negative_marks: q.negative_marks,
        position: q.position,
        difficulty: q.difficulty,
        options: optionsByQuestion.get(q.id) || [],
      };
      if (!questionsBySection.has(q.section_id)) questionsBySection.set(q.section_id, []);
      questionsBySection.get(q.section_id).push(payload);
    }

    test.sections = sections.map((s) => ({
      id: s.id,
      name: s.name,
      position: s.position,
      questions: questionsBySection.get(s.id) || [],
    }));

    res.json(test);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /attempts?user_id=&test_id=  � find the in-progress attempt (resume).
//   Returns 404 when there is none.
// ---------------------------------------------------------------------------
app.get('/attempts', async (req, res, next) => {
  try {
    const userId = Number(req.query.user_id);
    const testId = Number(req.query.test_id);
    if (!Number.isInteger(userId) || !Number.isInteger(testId)) {
      throw new ApiError(400, 'user_id and test_id (integers) are required');
    }
    const { rows } = await pool.query(
      `SELECT id, test_id, status, started_at
         FROM attempts
        WHERE user_id = $1 AND test_id = $2 AND status = 'in_progress'
        ORDER BY started_at DESC
        LIMIT 1`,
      [userId, testId]
    );
    if (rows.length === 0) throw new ApiError(404, 'no in-progress attempt');
    res.json({ attempt_id: rows[0].id, start_time: rows[0].started_at, status: rows[0].status });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /attempts  � start a new attempt. Body: { user_id, test_id }
//   The schema's snapshot trigger copies every question of the test into
//   attempt_questions when the attempt row is inserted.
// ---------------------------------------------------------------------------
app.post('/attempts', async (req, res, next) => {
  try {
    const { user_id: userId, test_id: testId } = req.body || {};
    if (!Number.isInteger(userId) || !Number.isInteger(testId)) {
      throw new ApiError(400, 'user_id and test_id (integers) are required');
    }

    const testRes = await pool.query(
      'SELECT id FROM tests WHERE id = $1 AND is_published = TRUE',
      [testId]
    );
    if (testRes.rows.length === 0) {
      throw new ApiError(400, 'test not found or not published');
    }

    const { rows } = await pool.query(
      `INSERT INTO attempts (user_id, test_id)
       VALUES ($1, $2)
       RETURNING id, started_at`,
      [userId, testId]
    );

    res.status(201).json({
      attempt_id: rows[0].id,
      start_time: rows[0].started_at,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /attempts/:id  � full state of an in-progress attempt (resume on refresh).
//   Returns the test (questions + options) and every saved per-question
//   status/answer. Correct answers are never exposed.
// ---------------------------------------------------------------------------
app.get('/attempts/:id', async (req, res, next) => {
  try {
    const attemptId = Number(req.params.id);
    if (!Number.isInteger(attemptId)) throw new ApiError(400, 'invalid attempt id');

    const attemptRes = await pool.query(
      `SELECT a.id, a.user_id, a.test_id, a.status, a.started_at, a.submitted_at, a.total_marks,
              t.title, t.description, t.duration_minutes
         FROM attempts a
         JOIN tests t ON t.id = a.test_id
        WHERE a.id = $1`,
      [attemptId]
    );
    if (attemptRes.rows.length === 0) throw new ApiError(404, 'attempt not found');
    const attempt = attemptRes.rows[0];
    if (attempt.status !== 'in_progress') {
      throw new ApiError(409, `attempt is ${attempt.status}, not in progress`);
    }

    // Same shape as GET /tests/:id so the exam screen can render directly.
    const sectionsRes = await pool.query(
      `SELECT id, name, position FROM sections WHERE test_id = $1 ORDER BY position`,
      [attempt.test_id]
    );
    const sections = sectionsRes.rows;
    const sectionIds = sections.map((s) => s.id);

    const questionsRes = sectionIds.length
      ? await pool.query(
          `SELECT ${PAGE_QUESTIONS_COLS}
             FROM questions q
            WHERE q.section_id = ANY($1)
            ORDER BY q.section_id, q.position`,
          [sectionIds]
        )
      : { rows: [] };
    const questions = questionsRes.rows;
    const questionIds = questions.map((q) => q.id);

    const optionsRes = questionIds.length
      ? await pool.query(
          `SELECT id, question_id, body, formula, position
             FROM question_options
            WHERE question_id = ANY($1)
            ORDER BY question_id, position`,
          [questionIds]
        )
      : { rows: [] };

    const answersRes = questionIds.length
      ? await pool.query(
          `SELECT question_id, status, selected_option_id, numerical_answer, time_spent_seconds
             FROM attempt_questions
            WHERE attempt_id = $1`,
          [attemptId]
        )
      : { rows: [] };
    const answerByQuestion = new Map(answersRes.rows.map((r) => [r.question_id, r]));

    const optionsByQuestion = new Map();
    for (const o of optionsRes.rows) {
      if (!optionsByQuestion.has(o.question_id)) optionsByQuestion.set(o.question_id, []);
      optionsByQuestion.get(o.question_id).push({
        id: o.id,
        body: o.body,
        formula: o.formula,
        position: o.position,
      });
    }

    const questionsBySection = new Map();
    for (const q of questions) {
      const aq = answerByQuestion.get(q.id) || {};
      const payload = {
        id: q.id,
        question_type: q.question_type,
        body: q.body,
        formula: q.formula,
        positive_marks: q.positive_marks,
        negative_marks: q.negative_marks,
        position: q.position,
        status: aq.status || 'not_visited',
        selected_option_id: aq.selected_option_id != null ? Number(aq.selected_option_id) : null,
        numerical_answer: aq.numerical_answer != null ? Number(aq.numerical_answer) : null,
        time_spent_seconds: aq.time_spent_seconds != null ? Number(aq.time_spent_seconds) : 0,
        difficulty: q.difficulty,
        options: optionsByQuestion.get(q.id) || [],
      };
      if (!questionsBySection.has(q.section_id)) questionsBySection.set(q.section_id, []);
      questionsBySection.get(q.section_id).push(payload);
    }

    const test = {
      id: attempt.test_id,
      title: attempt.title,
      description: attempt.description,
      duration_minutes: attempt.duration_minutes,
      sections: sections.map((s) => ({
        id: s.id,
        name: s.name,
        position: s.position,
        questions: questionsBySection.get(s.id) || [],
      })),
    };

    res.json({
      attempt_id: attempt.id,
      status: attempt.status,
      start_time: attempt.started_at,
      test,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /attempts/:id/answer  � save one answer / status live (debounced by the
//   client). Body: { question_id, status?, selected_option_id?, numerical_value? }
//   status may be 'answered' | 'marked_for_review' | 'not_visited' | 'visited'.
//   Omit answer fields to only change status; send status 'visited' (or
//   'not_visited') with no answer to mark a question seen / wipe a saved answer.
// ---------------------------------------------------------------------------
app.post('/attempts/:id/answer', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const attemptId = Number(req.params.id);
    if (!Number.isInteger(attemptId)) throw new ApiError(400, 'invalid attempt id');
    const body = req.body || {};
    const questionId = Number(body.question_id);
    const status = body.status || 'answered';
    if (!Number.isInteger(questionId)) throw new ApiError(400, 'question_id (integer) is required');
    if (!ANSWER_STATUSES.includes(status)) {
      throw new ApiError(400, `status must be one of: ${ANSWER_STATUSES.join(', ')}`);
    }

    await client.query('BEGIN');

    const attemptRes = await client.query(
      'SELECT status FROM attempts WHERE id = $1 FOR UPDATE',
      [attemptId]
    );
    if (attemptRes.rows.length === 0) throw new ApiError(404, 'attempt not found');
    if (attemptRes.rows[0].status !== 'in_progress') {
      throw new ApiError(409, `attempt is ${attemptRes.rows[0].status}`);
    }

    const qRes = await client.query(
      `SELECT q.question_type
         FROM attempt_questions aq
         JOIN questions q ON q.id = aq.question_id
        WHERE aq.attempt_id = $1 AND aq.question_id = $2`,
      [attemptId, questionId]
    );
    if (qRes.rows.length === 0) {
      throw new ApiError(400, `question ${questionId} is not part of this attempt`);
    }
    const qtype = qRes.rows[0].question_type;

    // Optional per-question time spent (accumulated seconds, client-side).
    let timeSpent = null;
    if (body.time_spent_seconds !== undefined && body.time_spent_seconds !== null && body.time_spent_seconds !== '') {
      const n = Number(body.time_spent_seconds);
      if (!Number.isFinite(n) || n < 0) {
        throw new ApiError(400, 'time_spent_seconds must be a non-negative number');
      }
      timeSpent = Math.round(n);
    }

    const hasAnswer =
      (qtype === 'mcq' && Number.isInteger(Number(body.selected_option_id))) ||
      (qtype === 'numerical' && body.numerical_value !== undefined && body.numerical_value !== null && body.numerical_value !== '');
    
    if (hasAnswer) {
      if (qtype === 'mcq') {
        await client.query(
          `INSERT INTO attempt_questions
             (attempt_id, question_id, status, selected_option_id, numerical_answer, answered_at, time_spent_seconds)
           VALUES ($1, $2, 'answered', $3, NULL, now(), COALESCE($4, 0))
           ON CONFLICT (attempt_id, question_id) DO UPDATE
              SET status = 'answered', selected_option_id = $3,
                  numerical_answer = NULL, answered_at = now(),
                  time_spent_seconds = COALESCE($4, attempt_questions.time_spent_seconds)`,
          [attemptId, questionId, Number(body.selected_option_id), timeSpent]
        );
      } else {
        await client.query(
          `INSERT INTO attempt_questions
             (attempt_id, question_id, status, selected_option_id, numerical_answer, answered_at, time_spent_seconds)
           VALUES ($1, $2, 'answered', NULL, $3, now(), COALESCE($4, 0))
           ON CONFLICT (attempt_id, question_id) DO UPDATE
              SET status = 'answered', selected_option_id = NULL,
                  numerical_answer = $3, answered_at = now(),
                  time_spent_seconds = COALESCE($4, attempt_questions.time_spent_seconds)`,
          [attemptId, questionId, body.numerical_value, timeSpent]
        );
      }
      // The trigger forces status to 'answered'; override to marked_for_review
      // when the student wants to save the answer AND flag it for review.
      if (status === 'marked_for_review') {
        await client.query(
          `UPDATE attempt_questions SET status = 'marked_for_review'
            WHERE attempt_id = $1 AND question_id = $2`,
          [attemptId, questionId]
        );
      }
    } else if (status === 'marked_for_review') {
      // Flag for review without touching the answer: keep any existing
      // answer (JEE: "Answered & Marked for Review") or leave it unanswered.
      await client.query(
        `INSERT INTO attempt_questions
           (attempt_id, question_id, status, time_spent_seconds)
         VALUES ($1, $2, 'marked_for_review', COALESCE($3, 0))
         ON CONFLICT (attempt_id, question_id) DO UPDATE
            SET status = 'marked_for_review',
                time_spent_seconds = COALESCE($3, attempt_questions.time_spent_seconds)`,
        [attemptId, questionId, timeSpent]
      );
    } else {
      // No answer, not marking: mark as seen / clear / reset (wipe answer).
      await client.query(
        `INSERT INTO attempt_questions
           (attempt_id, question_id, status, selected_option_id, numerical_answer, time_spent_seconds)
         VALUES ($1, $2, $3, NULL, NULL, COALESCE($4, 0))
         ON CONFLICT (attempt_id, question_id) DO UPDATE
            SET status = $3, selected_option_id = NULL, numerical_answer = NULL,
                time_spent_seconds = COALESCE($4, attempt_questions.time_spent_seconds)`,
        [attemptId, questionId, status, timeSpent]
      );
    }

    await client.query('COMMIT');
    res.json({ ok: true, question_id: questionId, status });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

// ---------------------------------------------------------------------------
// POST /attempts/:id/submit  � Body: { answers: [...] }
//   Each answer: { question_id, selected_option_id } for MCQ or
//                { question_id, numerical_value } for numerical.
//   Saves the answers, flips the attempt to 'submitted' (the schema's
//   scoring trigger grades every question: +positive_marks correct,
//   -negative_marks wrong, 0 unattempted), then returns the score.
// ---------------------------------------------------------------------------
app.post('/attempts/:id/submit', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const attemptId = Number(req.params.id);
    if (!Number.isInteger(attemptId)) throw new ApiError(400, 'invalid attempt id');

    const answers = (req.body && req.body.answers) || [];
    if (!Array.isArray(answers)) throw new ApiError(400, 'answers must be an array');

    const timeSpentMap = (req.body && req.body.time_spent) || {};
    if (typeof timeSpentMap !== 'object' || Array.isArray(timeSpentMap)) {
      throw new ApiError(400, 'time_spent must be an object mapping question_id to seconds');
    }
    
    await client.query('BEGIN');
    const attemptRes = await client.query(
      'SELECT id, status FROM attempts WHERE id = $1 FOR UPDATE',
      [attemptId]
    );
    if (attemptRes.rows.length === 0) throw new ApiError(404, 'attempt not found');
    if (attemptRes.rows[0].status !== 'in_progress') {
      throw new ApiError(409, `attempt is already ${attemptRes.rows[0].status}`);
    }
    for (const answer of answers) {
      await saveAnswer(client, attemptId, answer);
    }
    // Persist accumulated per-question times (answered or not) so the
    // analysis screen can show how long was spent on each question.
    for (const [qid, secs] of Object.entries(timeSpentMap)) {
      const questionId = Number(qid);
      const seconds = Math.round(Number(secs));
      if (!Number.isInteger(questionId) || !Number.isFinite(seconds) || seconds < 0) {
        throw new ApiError(400, 'time_spent must map question ids to non-negative seconds');
      }
      const upd = await client.query(
        `UPDATE attempt_questions SET time_spent_seconds = $3
          WHERE attempt_id = $1 AND question_id = $2`,
        [attemptId, questionId, seconds]
      );
      if (upd.rowCount === 0) {
        throw new ApiError(400, `question ${questionId} is not part of this attempt`);
      }
    }
    // Flipping the status fires trg_score_attempt, which computes
    // is_correct, marks_awarded and attempts.total_marks per the schema.
    const submitted = await client.query(
      `UPDATE attempts SET status = 'submitted'
        WHERE id = $1
        RETURNING submitted_at, total_marks`,
      [attemptId]
    );
    const scoreRes = await client.query(
      `SELECT count(*) FILTER (WHERE is_correct)        AS correct,
              count(*) FILTER (WHERE marks_awarded < 0) AS incorrect,
              count(*) FILTER (WHERE marks_awarded = 0) AS unattempted,
              COALESCE(SUM(marks_awarded), 0)           AS total_marks
         FROM attempt_questions
        WHERE attempt_id = $1`,
      [attemptId]
    );
    await client.query('COMMIT');
    const s = submitted.rows[0];    const score = scoreRes.rows[0];
    res.json({      attempt_id: attemptId,      total_marks: Number(score.total_marks),      correct: Number(score.correct),      incorrect: Number(score.incorrect),      unattempted: Number(score.unattempted),      submitted_at: s.submitted_at,    });  } catch (err) {    await client.query('ROLLBACK').catch(() => {});    next(err);  } finally {    client.release();  }});

// ---------------------------------------------------------------------------
// GET /attempts/:id/result  � detailed performance analysis (after submit).
//   Overall + per-section scorecards and a full question-by-question review
//   that reveals the correct answers. Only available once the attempt is
//   submitted or expired.
// ---------------------------------------------------------------------------
app.get('/attempts/:id/result', async (req, res, next) => {
  try {
    const attemptId = Number(req.params.id);
    if (!Number.isInteger(attemptId)) throw new ApiError(400, 'invalid attempt id');

    const attemptRes = await pool.query(
      `SELECT a.id, a.user_id, a.test_id, a.status, a.started_at, a.submitted_at,
              a.total_marks, t.title, t.description, t.duration_minutes
         FROM attempts a
         JOIN tests t ON t.id = a.test_id
        WHERE a.id = $1`,
      [attemptId]
    );    if (attemptRes.rows.length === 0) throw new ApiError(404, 'attempt not found');    const attempt = attemptRes.rows[0];    if (attempt.status === 'in_progress') {      throw new ApiError(409, 'attempt is still in progress; submit it first');    }

    // Overall scorecard
    const overallRes = await pool.query(
      `SELECT count(*) FILTER (WHERE aq.is_correct)        AS correct,
              count(*) FILTER (WHERE aq.marks_awarded < 0) AS incorrect,
              count(*) FILTER (WHERE aq.marks_awarded = 0) AS unattempted,
              count(*)                                     AS total,
              COALESCE(SUM(aq.marks_awarded), 0)           AS total_marks,
              COALESCE(SUM(q.positive_marks), 0)           AS max_marks
         FROM attempt_questions aq
         JOIN questions q ON q.id = aq.question_id
        WHERE aq.attempt_id = $1`,
      [attemptId]
    );
    const overall = overallRes.rows[0];

    // Section-wise scorecards
    const sectionsRes = await pool.query(
      `SELECT s.name,
              count(aq.question_id)                 AS question_count,
              count(*) FILTER (WHERE aq.is_correct) AS correct_count,
              COALESCE(SUM(aq.marks_awarded), 0)    AS section_marks,
              COALESCE(SUM(q.positive_marks), 0)    AS max_marks
         FROM attempt_questions aq
         JOIN questions q ON q.id = aq.question_id
         JOIN sections  s ON s.id = q.section_id
        WHERE aq.attempt_id = $1
        GROUP BY s.name, s.position
        ORDER BY s.position`,
      [attemptId]
    );

    // Question-by-question review (correct answers revealed)
    const reviewRes = await pool.query(
      `SELECT q.id, s.name AS section, q.question_type, q.body, q.formula,
              q.positive_marks, q.negative_marks, q.position, q.difficulty,
              aq.status, aq.selected_option_id, aq.numerical_answer,
              aq.is_correct, aq.marks_awarded, aq.time_spent_seconds,
              q.correct_option_id, q.correct_answer
         FROM attempt_questions aq
         JOIN questions q ON q.id = aq.question_id
         JOIN sections  s ON s.id = q.section_id
        WHERE aq.attempt_id = $1
        ORDER BY s.position, q.position`,
      [attemptId]    );    const questionIds = reviewRes.rows.map((r) => r.id);    const optionsRes = questionIds.length      ? await pool.query(          `SELECT id, question_id, body, formula, position
             FROM question_options
            WHERE question_id = ANY($1)
            ORDER BY question_id, position`,
          [questionIds]        )      : { rows: [] };    const optionsByQuestion = new Map();    for (const o of optionsRes.rows) {      if (!optionsByQuestion.has(o.question_id)) optionsByQuestion.set(o.question_id, []);      optionsByQuestion.get(o.question_id).push({        id: o.id,        body: o.body,        formula: o.formula,        position: o.position,      });    }    const questions = reviewRes.rows.map((r) => ({      id: r.id,      section: r.section,      question_type: r.question_type,      body: r.body,      formula: r.formula,      positive_marks: Number(r.positive_marks),      negative_marks: Number(r.negative_marks),      position: r.position,      difficulty: r.difficulty,      status: r.status,      selected_option_id: r.selected_option_id != null ? Number(r.selected_option_id) : null,      numerical_answer: r.numerical_answer != null ? Number(r.numerical_answer) : null,      is_correct: r.is_correct,      marks_awarded: Number(r.marks_awarded),      time_spent_seconds: r.time_spent_seconds != null ? Number(r.time_spent_seconds) : 0,      correct_option_id: r.correct_option_id != null ? Number(r.correct_option_id) : null,      correct_answer: r.correct_answer != null ? Number(r.correct_answer) : null,      options: optionsByQuestion.get(r.id) || [],    }));    res.json({      attempt_id: attempt.id,      status: attempt.status,      title: attempt.title,      started_at: attempt.started_at,      submitted_at: attempt.submitted_at,      overall: {        total: Number(overall.total),        correct: Number(overall.correct),        incorrect: Number(overall.incorrect),        unattempted: Number(overall.unattempted),        total_marks: Number(overall.total_marks),        max_marks: Number(overall.max_marks),      },      sections: sectionsRes.rows.map((s) => ({        name: s.name,        question_count: Number(s.question_count),        correct_count: Number(s.correct_count),        section_marks: Number(s.section_marks),        max_marks: Number(s.max_marks),      })),      questions,    });  } catch (err) {    next(err);  }});

// ---------------------------------------------------------------------------
// GET /attempts/:id/error-tags  - saved error tags for an attempt.
//   Returns { attempt_id, tags: { question_id: error_tag } }.
// ---------------------------------------------------------------------------
app.get('/attempts/:id/error-tags', async (req, res, next) => {  try {    const attemptId = Number(req.params.id);    if (!Number.isInteger(attemptId)) throw new ApiError(400, 'invalid attempt id');    const { rows } = await pool.query(      'SELECT question_id, error_tag FROM error_tags WHERE attempt_id = $1',      [attemptId]    );    const tags = {};    for (const r of rows) tags[Number(r.question_id)] = r.error_tag;    res.json({ attempt_id: attemptId, tags });  } catch (err) {    next(err);  }});

// ---------------------------------------------------------------------------
// POST /attempts/:id/error-tags  - save error tags for an attempt.
//   Body: { question_id, error_tag } or { tags: { question_id: error_tag } }.//   error_tag must be one of the 8 options (correct + 7 error types).// ---------------------------------------------------------------------------
const ERROR_TAG_VALUES = ['correct', 'concept', 'silly', 'reading', 'application', 'time', 'guess', 'recall'];

app.post('/attempts/:id/error-tags', async (req, res, next) => {  const client = await pool.connect();  try {    const attemptId = Number(req.params.id);    if (!Number.isInteger(attemptId)) throw new ApiError(400, 'invalid attempt id');    const body = req.body || {};    let entries;    if (body.tags && typeof body.tags === 'object' && !Array.isArray(body.tags)) {      entries = Object.entries(body.tags);    } else if (body.question_id !== undefined) {      entries = [[body.question_id, body.error_tag]];    } else {      throw new ApiError(400, 'send { question_id, error_tag } or { tags: { question_id: error_tag } }');    }    if (entries.length === 0) throw new ApiError(400, 'no tags to save');    await client.query('BEGIN');    const attemptRes = await client.query('SELECT id FROM attempts WHERE id = $1', [attemptId]);    if (attemptRes.rows.length === 0) throw new ApiError(404, 'attempt not found');    const saved = {};    for (const [rawQid, rawTag] of entries) {      const questionId = Number(rawQid);      const tag = String(rawTag);      if (!Number.isInteger(questionId)) throw new ApiError(400, 'question_id must be an integer');      if (!ERROR_TAG_VALUES.includes(tag)) {        throw new ApiError(400, 'error_tag must be one of: ' + ERROR_TAG_VALUES.join(', '));      }      const inAttempt = await client.query(        'SELECT 1 FROM attempt_questions WHERE attempt_id = $1 AND question_id = $2',        [attemptId, questionId]      );      if (inAttempt.rows.length === 0) {        throw new ApiError(400, 'question ' + questionId + ' is not part of this attempt');      }      await client.query(        'INSERT INTO error_tags (attempt_id, question_id, error_tag, updated_at)' + EOL +        "         VALUES ($1, $2, $3, now())" + EOL +        '         ON CONFLICT (attempt_id, question_id) DO UPDATE' + EOL +        '            SET error_tag = EXCLUDED.error_tag, updated_at = now()',        [attemptId, questionId, tag]      );      saved[questionId] = tag;    }    await client.query('COMMIT');    res.json({ attempt_id: attemptId, tags: saved });  } catch (err) {    await client.query('ROLLBACK').catch(() => {});    next(err);  } finally {    client.release();  }});

// ---------------------------------------------------------------------------
// Save one answer into attempt_questions (upsert).
//   Relies on the schema's fn_validate_attempt_answer trigger for shape and
//   option-ownership checks; its RAISE EXCEPTION surfaces as a 400 below.
// ---------------------------------------------------------------------------
async function saveAnswer(client, attemptId, answer) {  // Coerce with Number(): the API returns BIGINT ids as strings, so strict  // Number.isInteger checks on raw body values would reject every id.  const questionId = Number(answer && answer.question_id);  const selectedOptionId = Number(answer && answer.selected_option_id);  const rawNumerical = answer && answer.numerical_value;  const numericalValue = rawNumerical === '' ? NaN : Number(rawNumerical);  let timeSpent = null;  if (answer && answer.time_spent_seconds !== undefined && answer.time_spent_seconds !== null && answer.time_spent_seconds !== '') {    const n = Number(answer.time_spent_seconds);    if (!Number.isFinite(n) || n < 0) {      throw new ApiError(400, 'time_spent_seconds must be a non-negative number');    }    timeSpent = Math.round(n);  }  if (!Number.isInteger(questionId)) {    throw new ApiError(400, 'each answer needs an integer question_id');  }  const qRes = await client.query(    `SELECT q.question_type       FROM attempt_questions aq       JOIN questions q ON q.id = aq.question_id      WHERE aq.attempt_id = $1 AND aq.question_id = $2`,    [attemptId, questionId]  );  if (qRes.rows.length === 0) {    throw new ApiError(400, `question ${questionId} is not part of this attempt`);  }  if (qRes.rows[0].question_type === 'mcq') {    if (!Number.isInteger(selectedOptionId)) {      throw new ApiError(400, `MCQ question ${questionId} requires selected_option_id`);    }    await client.query(      `INSERT INTO attempt_questions         (attempt_id, question_id, status, selected_option_id, numerical_answer, answered_at, time_spent_seconds)       VALUES ($1, $2, 'answered', $3, NULL, now(), COALESCE($4, 0))       ON CONFLICT (attempt_id, question_id) DO UPDATE          SET status = 'answered',              selected_option_id = $3,              numerical_answer = NULL,              answered_at = now(),              time_spent_seconds = COALESCE($4, attempt_questions.time_spent_seconds)`,      [attemptId, questionId, selectedOptionId, timeSpent]    );  } else {    if (rawNumerical === undefined || rawNumerical === null || rawNumerical === '' || Number.isNaN(numericalValue)) {      throw new ApiError(400, `numerical question ${questionId} requires numerical_value`);    }    await client.query(      `INSERT INTO attempt_questions         (attempt_id, question_id, status, selected_option_id, numerical_answer, answered_at, time_spent_seconds)       VALUES ($1, $2, 'answered', NULL, $3, now(), COALESCE($4, 0))       ON CONFLICT (attempt_id, question_id) DO UPDATE          SET status = 'answered',              selected_option_id = NULL,              numerical_answer = $3, answered_at = now(),              time_spent_seconds = COALESCE($4, attempt_questions.time_spent_seconds)`,      [attemptId, questionId, numericalValue, timeSpent]    );  }}

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------
app.use((err, req, res, next) => {  if (err instanceof ApiError) {    return res.status(err.status).json({ error: err.message });  }  // Postgres trigger RAISE EXCEPTION  if (err.code === 'P0001') {    return res.status(400).json({ error: err.message });  }  // Unique violation (e.g. one in-progress attempt per user+test)  if (err.code === '23505') {    return res.status(409).json({ error: 'conflict: ' + (err.detail || err.message) });  }  // FK violation (user or test does not exist)  if (err.code === '23503') {    return res.status(400).json({ error: 'referenced record does not exist' });  }  console.error(err);  res.status(500).json({ error: 'internal server error' });});

// ---------------------------------------------------------------------
// TIME ANALYSIS — per-question time breakdown for one attempt
// ---------------------------------------------------------------------
app.get('/api/attempts/:attemptId/time-analysis', async (req, res) => {  try {    const { attemptId } = req.params;    const result = await pool.query(`      SELECT        q.id AS question_id,        s.name AS subject,        q.difficulty AS difficulty,        aq.time_spent_seconds,        aq.status,        aq.is_correct      FROM attempt_questions aq      JOIN questions q ON q.id = aq.question_id      JOIN sections s ON s.id = q.section_id      WHERE aq.attempt_id = $1    `, [attemptId]);    const bySubject = {};    const byDifficulty = {};    const byResult = { correct: 0, incorrect: 0, unattempted: 0 };    for (const row of result.rows) {      const t = row.time_spent_seconds || 0;      bySubject[row.subject] = (bySubject[row.subject] || 0) + t;      byDifficulty[row.difficulty] = (byDifficulty[row.difficulty] || 0) + t;      let key;      if (row.status === 'not_visited' || row.status === 'visited') key = 'unattempted';      else if (row.is_correct === true) key = 'correct';      else key = 'incorrect';      byResult[key] += t;    }    res.json({ bySubject, byDifficulty, byResult });  } catch (err) {    res.status(err.status || 500).json({ error: err.message });  }});
app.use((req, res) => {  res.status(404).json({ error: 'not found' });});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {  console.log(`Ace It Up API listening on port ${PORT}`);});
