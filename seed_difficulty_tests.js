// ============================================================================
// seed_difficulty_tests.js - rebuilds the test catalogue as SIX difficulty-
// mixed mock tests, each with a specific Easy/Moderate/Difficult blend:
//
//   2 Easy      tests:  45 easy / 20 moderate / 10 difficult   (60% / 27% / 13%)
//   2 Moderate  tests:  15 easy / 40 moderate / 20 difficult   (20% / 53% / 27%)
//   2 Difficult tests:  15 easy / 20 moderate / 40 difficult   (20% / 27% / 53%)
//
// Every test keeps the JEE structure: 3 sections (Physics, Chemistry,
// Mathematics) x (20 MCQ + 5 numerical) = 75 questions, published.
//
// The question bank is built from the existing sources (seed_full_test.js +
// papers_2026/paper1-5.js = 450 questions). The bank is heavily easy-weighted
// (312 easy / 106 moderate / 32 difficult), so to hit the exact per-test
// blends the seed deterministically PROMOTES some easy questions to
// moderate/difficult tags (content is unchanged). Each of the 450 questions
// is used exactly once across the six tests.
//
// This seed WIPES the tests table first (attempt history cascades away).
//
// Run:  node seed_difficulty_tests.js
// Uses DATABASE_URL or defaults to postgres://postgres:postgres@localhost:5432/aceitup
// ============================================================================
'use strict';

const { Pool } = require('pg');
const mock1 = require('./seed_full_test');
const { loadPapers } = require('./seed_previous_year_papers');

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/aceitup',
});

const DIFFICULTIES = ['easy', 'moderate', 'difficult'];

// Target pool sizes after promotion (totals consumed by the six tests below).
const TARGETS = {
  easy: { mcq: 120, numerical: 30 },
  moderate: { mcq: 128, numerical: 32 },
  difficult: { mcq: 112, numerical: 28 },
};

// Per-test, per-subject question plan. Each subject row: 20 MCQ + 5 numerical.
// { name: subject, mcq: {easy, moderate, difficult}, num: {easy, moderate, difficult} }
function subjectPlan(name, mcq, num) {
  return { name, mcq, num };
}
const EASY_PLAN = [
  subjectPlan('Physics', { easy: 12, moderate: 6, difficult: 2 }, { easy: 3, moderate: 1, difficult: 1 }),
  subjectPlan('Chemistry', { easy: 12, moderate: 6, difficult: 2 }, { easy: 3, moderate: 1, difficult: 1 }),
  subjectPlan('Mathematics', { easy: 12, moderate: 6, difficult: 2 }, { easy: 3, moderate: 0, difficult: 2 }),
];
const MODERATE_PLAN = [
  subjectPlan('Physics', { easy: 4, moderate: 9, difficult: 7 }, { easy: 1, moderate: 4, difficult: 0 }),
  subjectPlan('Chemistry', { easy: 4, moderate: 9, difficult: 7 }, { easy: 1, moderate: 4, difficult: 0 }),
  subjectPlan('Mathematics', { easy: 4, moderate: 11, difficult: 5 }, { easy: 1, moderate: 3, difficult: 1 }),
];
const DIFFICULT_PLAN = [
  subjectPlan('Physics', { easy: 4, moderate: 6, difficult: 10 }, { easy: 1, moderate: 1, difficult: 3 }),
  subjectPlan('Chemistry', { easy: 4, moderate: 6, difficult: 10 }, { easy: 1, moderate: 1, difficult: 3 }),
  subjectPlan('Mathematics', { easy: 4, moderate: 5, difficult: 11 }, { easy: 1, moderate: 1, difficult: 3 }),
];

const TEST_DEFS = [
  { title: 'JEE Main 2026 Easy Mock 1', tag: 'easy', subjects: EASY_PLAN },
  { title: 'JEE Main 2026 Easy Mock 2', tag: 'easy', subjects: EASY_PLAN },
  { title: 'JEE Main 2026 Moderate Mock 1', tag: 'moderate', subjects: MODERATE_PLAN },
  { title: 'JEE Main 2026 Moderate Mock 2', tag: 'moderate', subjects: MODERATE_PLAN },
  { title: 'JEE Main 2026 Difficult Mock 1', tag: 'difficult', subjects: DIFFICULT_PLAN },
  { title: 'JEE Main 2026 Difficult Mock 2', tag: 'difficult', subjects: DIFFICULT_PLAN },
];

const DESCRIPTIONS = {
  easy: 'Easy mock: 45 easy + 20 moderate + 10 difficult questions (60% easy). 75 questions (25 per subject), 3 hours, +4/-1 marking.',
  moderate: 'Moderate mock: 15 easy + 40 moderate + 20 difficult questions (53% moderate). 75 questions (25 per subject), 3 hours, +4/-1 marking.',
  difficult: 'Difficult mock: 15 easy + 20 moderate + 40 difficult questions (53% difficult). 75 questions (25 per subject), 3 hours, +4/-1 marking.',
};

// ---------------------------------------------------------------------------
// Deterministic RNG (mulberry32) so re-seeding reproduces the exact same tests.
// ---------------------------------------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------------------------------------------------------------------------
// Build the bank from all question sources, group by (difficulty, type).
// ---------------------------------------------------------------------------
function buildPools() {
  const pools = {};
  for (const d of DIFFICULTIES) pools[d] = { mcq: [], numerical: [] };

  for (const sec of mock1.SECTIONS) {
    for (const [body, options, correctIdx, difficulty] of sec.mcq) {
      pools[difficulty].mcq.push({ body, options, correctIdx });
    }
    for (const [body, answer, difficulty] of sec.num) {
      pools[difficulty].numerical.push({ body, answer });
    }
  }
  for (const paper of loadPapers()) {
    for (const sec of paper.sections) {
      for (const [body, options, correctIdx, difficulty] of sec.mcq) {
        pools[difficulty].mcq.push({ body, options, correctIdx });
      }
      for (const [body, answer, difficulty] of sec.num) {
        pools[difficulty].numerical.push({ body, answer });
      }
    }
  }
  return pools;
}

// ---------------------------------------------------------------------------
// Promote easy questions to moderate/difficult so every pool matches TARGETS,
// then tag every question with the bucket it ends up in.
// ---------------------------------------------------------------------------
function balancePools(pools) {
  const log = [];
  for (const type of ['mcq', 'numerical']) {
    for (const d of ['moderate', 'difficult']) {
      const need = TARGETS[d][type] - pools[d][type].length;
      if (need < 0) throw new Error(`pool ${d}.${type} already exceeds target by ${-need}`);
      if (need > pools.easy[type].length) {
        throw new Error(`not enough easy.${type} to promote ${need}`);
      }
      const promoted = pools.easy[type].splice(0, need);
      pools[d][type].push(...promoted);
      log.push(`easy->${d} ${type}: ${need}`);
    }
  }
  for (const d of DIFFICULTIES) {
    for (const type of ['mcq', 'numerical']) {
      for (const q of pools[d][type]) q._diff = d;
    }
  }
  console.log('Balance:', log.join(' | '));
}

// ---------------------------------------------------------------------------
// Validate a test plan: per subject 20 MCQ + 5 num; per test the right blend.
// ---------------------------------------------------------------------------
function validatePlan(def, index) {
  const totals = { easy: 0, moderate: 0, difficult: 0 };
  for (const s of def.subjects) {
    let mcq = 0, num = 0;
    for (const d of DIFFICULTIES) {
      mcq += s.mcq[d]; num += s.num[d];
      totals[d] += s.mcq[d] + s.num[d];
    }
    if (mcq !== 20 || num !== 5) {
      throw new Error(`Test ${index + 1} subject ${s.name}: need 20 MCQ + 5 num, got ${mcq} + ${num}`);
    }
  }
  const expected = { easy: 45, moderate: 20, difficult: 10 };
  if (def.tag === 'moderate') { expected.easy = 15; expected.moderate = 40; expected.difficult = 20; }
  if (def.tag === 'difficult') { expected.easy = 15; expected.moderate = 20; expected.difficult = 40; }
  for (const d of DIFFICULTIES) {
    if (totals[d] !== expected[d]) {
      throw new Error(`Test ${index + 1}: expected ${expected[d]} ${d}, got ${totals[d]}`);
    }
  }
  return totals;
}

// ---------------------------------------------------------------------------
// Seed one test from the (shuffled) pools, consuming questions front-to-back.
// ---------------------------------------------------------------------------
async function seedTest(client, def, pools, rng) {
  // Delete any previous test with the same title.
  await client.query('DELETE FROM tests WHERE title = $1', [def.title]);

  const testRes = await client.query(
    `INSERT INTO tests (title, description, duration_minutes)
     VALUES ($1, $2, 180) RETURNING id`,
    [def.title, DESCRIPTIONS[def.tag]]
  );
  const testId = testRes.rows[0].id;

  let total = 0;
  for (const plan of def.subjects) {
    const secRes = await client.query(
      `INSERT INTO sections (test_id, name, position) VALUES ($1, $2, $3) RETURNING id`,
      [testId, plan.name, def.subjects.indexOf(plan) + 1]
    );
    const sectionId = secRes.rows[0].id;

    // Draw the MCQs for this subject: per difficulty, then shuffle together.
    const mcqPick = [];
    for (const d of DIFFICULTIES) {
      const n = plan.mcq[d];
      mcqPick.push(...pools[d].mcq.splice(0, n));
    }
    shuffle(mcqPick, rng);

    let position = 1;
    for (const q of mcqPick) {
      const qRes = await client.query(
        `INSERT INTO questions (section_id, question_type, body, difficulty, position)
         VALUES ($1, 'mcq', $2, $3, $4) RETURNING id`,
        [sectionId, q.body, q._diff, position]
      );
      const qId = qRes.rows[0].id;
      let correctOptionId = null;
      for (let i = 0; i < q.options.length; i++) {
        const oRes = await client.query(
          `INSERT INTO question_options (question_id, body, position)
           VALUES ($1, $2, $3) RETURNING id`,
          [qId, q.options[i], i + 1]
        );
        if (i === q.correctIdx) correctOptionId = oRes.rows[0].id;
      }
      await client.query(
        `UPDATE questions SET correct_option_id = $1 WHERE id = $2`,
        [correctOptionId, qId]
      );
      position++;
      total++;
    }

    // Draw the numericals for this subject.
    const numPick = [];
    for (const d of DIFFICULTIES) {
      const n = plan.num[d];
      numPick.push(...pools[d].numerical.splice(0, n));
    }
    shuffle(numPick, rng);
    for (const q of numPick) {
      await client.query(
        `INSERT INTO questions (section_id, question_type, body, correct_answer, difficulty, position)
         VALUES ($1, 'numerical', $2, $3, $4, $5)`,
        [sectionId, q.body, q.answer, q._diff, position]
      );
      position++;
      total++;
    }
  }

  await client.query('SELECT fn_validate_test_for_publish($1)', [testId]);
  await client.query('UPDATE tests SET is_published = TRUE WHERE id = $1', [testId]);
  return { testId, total };
}

// ---------------------------------------------------------------------------
async function main() {
  const client = await pool.connect();
  try {
    const pools = buildPools();
    balancePools(pools);
    for (const d of DIFFICULTIES) {
      for (const type of ['mcq', 'numerical']) {
        console.log(`pool ${d}.${type}: ${pools[d][type].length}`);
        if (pools[d][type].length !== TARGETS[d][type]) {
          throw new Error(`pool ${d}.${type} has ${pools[d][type].length}, expected ${TARGETS[d][type]}`);
        }
      }
    }

    // Wipe the whole catalogue (attempts cascade away).
    await client.query('BEGIN');
    await client.query('DELETE FROM tests');

    const rng = mulberry32(20260826);
    for (let i = 0; i < TEST_DEFS.length; i++) {
      validatePlan(TEST_DEFS[i], i);
      const { testId, total } = await seedTest(client, TEST_DEFS[i], pools, rng);
      console.log(`Seeded test #${testId} "${TEST_DEFS[i].title}" (${TEST_DEFS[i].tag}) with ${total} questions.`);
    }

    // Make sure every pool is fully consumed (no leftovers, no overdraw).
    for (const d of DIFFICULTIES) {
      for (const type of ['mcq', 'numerical']) {
        if (pools[d][type].length !== 0) {
          throw new Error(`leftover ${d}.${type}: ${pools[d][type].length}`);
        }
      }
    }

    await client.query('COMMIT');
    console.log('Done: 6 difficulty-mixed tests published.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
