'use strict';
// ---------------------------------------------------------------------------
// tag_topics.js
//   Fills questions.topic and questions.subtopic for every question in the
//   database, which is what the Topic Analysis tab in the analysis page reads
//   ("which topic / subtopic did I get wrong, which did I get right").
//
//   Tagging strategy, best signal first:
//     1. Seed files that already carry a curated 'topic' per question
//        (tests/*.json) are indexed by question body text. A database question
//        whose body matches one of those gets the curated label, re-mapped onto
//        the canonical taxonomy in topics/.
//     2. Everything else is classified by keyword scoring the question stem
//        (topics/index.js), scoped to the question's subject from its section.
//
//   Usage:
//     node tag_topics.js                 # fill only untagged questions
//     node tag_topics.js --report        # no writes, print what would happen
//     node tag_topics.js --dry-run       # classify + summarise, write nothing
//     node tag_topics.js --force         # re-tag every question
//     node tag_topics.js --dir /path     # extra folder of seed sources
//
//   DATABASE_URL overrides the default local connection.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const topics = require('./topics');

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const DRY_RUN = args.includes('--dry-run') || args.includes('--report');
const LIMIT_ARG = args.indexOf('--limit');
const LIMIT = LIMIT_ARG >= 0 ? Number(args[LIMIT_ARG + 1]) : 0;

const PLACEHOLDER = /PASTE|__.*__/;

// ---------------------------------------------------------------------------
// Seed sources
// ---------------------------------------------------------------------------

function normBody(text) {
  return String(text || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function loadJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
  } catch (e) {
    return null;
  }
}

// tests/*.json -> { sections: [ { name, questions: [ { body, options, topic } ] } ] }
function harvestVerboseJson(data, out) {
  if (!data || !Array.isArray(data.sections)) return 0;
  let n = 0;
  for (const sec of data.sections) {
    for (const q of sec.questions || []) {
      if (!q || !q.body) continue;
      out.push({ section: sec.name, body: q.body, options: q.options, hint: q.topic || '' });
      n += 1;
    }
  }
  return n;
}

// papers_2026/*.js and papers_2026/import/*.json -> compact rows
//   mcq: [body, [options], answerIndex, difficulty]
//   num: [body, answer, difficulty]
function harvestCompact(data, out) {
  if (!data || !Array.isArray(data.sections)) return 0;
  let n = 0;
  for (const sec of data.sections) {
    for (const row of sec.mcq || []) {
      if (PLACEHOLDER.test(String(row[0]))) continue;
      out.push({ section: sec.name, body: row[0], options: row[1] });
      n += 1;
    }
    for (const row of (sec.num || sec.numerical || [])) {
      if (PLACEHOLDER.test(String(row[0]))) continue;
      out.push({ section: sec.name, body: row[0], options: [], numeric: true });
      n += 1;
    }
  }
  return n;
}

function buildSeedIndex() {
  const harvested = [];

  const jsonDirs = ['tests'];
  for (const dir of jsonDirs) {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.json')) continue;
      const data = loadJson(path.join(dir, file));
      const n = harvestVerboseJson(data, harvested);
      console.log(`seed ${path.join(dir, file)}: ${n} questions${n ? ' (curated topic hints)' : ''}`);
    }
  }

  if (fs.existsSync('papers_2026')) {
    for (const file of fs.readdirSync('papers_2026')) {
      if (!file.endsWith('.js')) continue;
      let data = null;
      try { data = require(path.resolve('papers_2026', file)); } catch (e) { data = null; }
      const n = harvestCompact(data, harvested);
      console.log(`seed papers_2026/${file}: ${n} questions`);
    }
    const importDir = path.join('papers_2026', 'import');
    if (fs.existsSync(importDir)) {
      for (const file of fs.readdirSync(importDir)) {
        if (!file.endsWith('.json')) continue;
        const n = harvestCompact(loadJson(path.join(importDir, file)), harvested);
        if (n > 0) console.log(`seed papers_2026/import/${file}: ${n} questions`);
      }
    }
  }

  const index = new Map();
  let withHint = 0;
  for (const q of harvested) {
    const key = normBody(q.body);
    if (!key) continue;
    const labels = topics.classify({ section: q.section, body: q.body, options: q.options, hint: q.hint });
    if (q.hint) withHint += 1;
    index.set(key, {
      topic: labels.topic,
      subtopic: labels.subtopic,
      source: q.hint ? 'curated-hint' : 'seed-body',
      rawHint: q.hint || '',
    });
  }
  console.log(`seed index: ${index.size} unique question stems (${withHint} with a curated topic hint)\n`);
  return index;
}

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/aceitup',
});

async function fetchQuestions() {
  const res = await pool.query(
    `SELECT q.id, q.body, q.topic, q.subtopic, s.name AS section,
            COALESCE(string_agg(o.body, ' '), '') AS option_text
       FROM questions q
       JOIN sections s ON s.id = q.section_id
       LEFT JOIN question_options o ON o.question_id = q.id
      GROUP BY q.id, q.body, q.topic, q.subtopic, s.name
      ORDER BY s.name, q.id`
  );
  return res.rows;
}

async function applyTags(rows) {
  const CHUNK = 200;
  let updated = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    await pool.query(
      `UPDATE questions q
          SET topic = u.topic, subtopic = u.subtopic
         FROM (SELECT unnest($1::bigint[]) AS id,
                      unnest($2::text[])   AS topic,
                      unnest($3::text[])   AS subtopic) u
        WHERE q.id = u.id`,
      [chunk.map((r) => r.id), chunk.map((r) => r.topic), chunk.map((r) => r.subtopic)]
    );
    updated += chunk.length;
  }
  return updated;
}

function summarise(tagged) {
  const bySubjectTopic = new Map();
  const subtopicCount = new Map();
  const unclassified = [];
  const bySource = new Map();

  for (const row of tagged) {
    const subject = row.section;
    if (!bySubjectTopic.has(subject)) bySubjectTopic.set(subject, new Map());
    const perTopic = bySubjectTopic.get(subject);
    perTopic.set(row.topic, (perTopic.get(row.topic) || 0) + 1);

    const key = `${row.topic} > ${row.subtopic}`;
    subtopicCount.set(key, (subtopicCount.get(key) || 0) + 1);

    bySource.set(row.source, (bySource.get(row.source) || 0) + 1);

    if (row.topic === topics.UNCLASSIFIED_TOPIC) unclassified.push(row);
  }

  console.log('\n=== tagging sources ===');
  for (const [source, count] of [...bySource.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(4)}  ${source}`);
  }

  for (const [subject, perTopic] of bySubjectTopic) {
    const total = [...perTopic.values()].reduce((a, b) => a + b, 0);
    console.log(`\n=== ${subject} (${total} questions, ${perTopic.size} topics) ===`);
    for (const [topic, count] of [...perTopic.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(count).padStart(4)}  ${topic}`);
    }
  }

  console.log(`\n=== unclassified questions: ${unclassified.length} ===`);
  for (const row of unclassified) {
    console.log(`  [${row.section}] ${String(row.body).replace(/\s+/g, ' ').slice(0, 110)}`);
  }

  return { unclassified };
}

async function main() {
  console.log('tag_topics.js - JEE topic/subtopic backfill');
  console.log(`mode: ${DRY_RUN ? 'dry run (no writes)' : FORCE ? 'force re-tag' : 'fill untagged only'}\n`);

  const seedIndex = buildSeedIndex();
  const all = await fetchQuestions();
  console.log(`database: ${all.length} questions`);

  const todo = FORCE ? all : all.filter((q) => !q.topic || !q.subtopic);
  console.log(`to tag: ${todo.length} (already tagged: ${all.length - todo.length})\n`);

  const work = LIMIT > 0 ? todo.slice(0, LIMIT) : todo;
  const tagged = [];

  for (const q of work) {
    const seed = seedIndex.get(normBody(q.body));
    let labels;
    let source;
    if (seed) {
      labels = seed;
      source = seed.source;
    } else {
      labels = topics.classify({ section: q.section, body: q.body, options: q.option_text });
      source = 'keyword';
    }
    tagged.push({
      id: q.id,
      section: q.section,
      body: q.body,
      topic: labels.topic,
      subtopic: labels.subtopic,
      source,
    });
  }

  summarise(tagged);

  if (DRY_RUN) {
    console.log('\ndry run: nothing written to the database.');
    await pool.end();
    return;
  }

  const written = await applyTags(tagged);
  console.log(`\nupdated ${written} questions`);

  const check = await pool.query(
    `SELECT count(*)::int AS total,
            count(topic)::int    AS with_topic,
            count(subtopic)::int AS with_subtopic
       FROM questions`
  );
  const r = check.rows[0];
  console.log(`database now: ${r.with_topic}/${r.total} questions have a topic, ${r.with_subtopic}/${r.total} have a subtopic`);
  await pool.end();
}

main().catch(async (err) => {
  console.error('ERR', err.message);
  try { await pool.end(); } catch (e) { /* ignore */ }
  process.exit(1);
});
