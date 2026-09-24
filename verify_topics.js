'use strict';
// ---------------------------------------------------------------------------
// verify_topics.js
//   Quality check for the topic tagging behind the Topic Analysis tab:
//
//     * coverage   - how many questions carry a topic / subtopic
//     * sources    - curated seed hint vs keyword classifier
//     * spread     - chapters per subject (a single chapter swallowing most
//                    questions usually means a keyword is too greedy)
//     * spot check - a readable sample per subject so mis-tags are obvious
//
//   Usage:
//     node verify_topics.js            # coverage + spread + spot check
//     node verify_topics.js --quiet    # coverage only
//     node verify_topics.js --force    # re-tag first, then report
// ---------------------------------------------------------------------------
const { Pool } = require('pg');
const topics = require('./topics');

const args = process.argv.slice(2);
const QUIET = args.includes('--quiet');
const SAMPLE_PER_SUBJECT = 12;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/aceitup',
});

function shortBody(text) {
  return String(text || '').replace(/\s+/g, ' ').slice(0, 78);
}

(async () => {
  const coverage = await pool.query(
    `SELECT count(*)::int                   AS total,
            count(q.topic)::int             AS with_topic,
            count(q.subtopic)::int          AS with_subtopic,
            count(*) FILTER (WHERE q.topic = $1)::int AS unclassified
       FROM questions q`,
    [topics.UNCLASSIFIED_TOPIC]
  );
  const c = coverage.rows[0];
  const pctTagged = c.total ? Math.round(((c.total - c.unclassified) / c.total) * 1000) / 10 : 0;
  console.log('questions:', c.total);
  console.log('with topic:', c.with_topic, '| with subtopic:', c.with_subtopic);
  console.log('unclassified:', c.unclassified, `(${100 - pctTagged}% of the bank)`);
  console.log('taxonomy keywords loaded:', topics.keywordCount());

  const rows = await pool.query(
    `SELECT s.name AS section, q.topic, q.subtopic, q.body
       FROM questions q JOIN sections s ON s.id = q.section_id
      ORDER BY s.name, q.topic, q.subtopic, q.position`
  );

  const perSubject = new Map();
  const perTopic = new Map();
  for (const r of rows.rows) {
    if (!perSubject.has(r.section)) perSubject.set(r.section, []);
    perSubject.get(r.section).push(r);
    if (r.topic) {
      const key = `${r.section} > ${r.topic}`;
      perTopic.set(key, (perTopic.get(key) || 0) + 1);
    }
  }

  for (const [section, list] of perSubject) {
    const chapters = new Set(list.map((r) => r.topic));
    console.log(`\n${section}: ${list.length} questions across ${chapters.size} chapters`);

    if (QUIET) continue;

    const counts = new Map();
    for (const r of list) counts.set(r.topic, (counts.get(r.topic) || 0) + 1);
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    console.log('  heaviest chapters: ' + sorted.slice(0, 8).map(([t, n]) => `${t} (${n})`).join(', '));
    console.log('  thinnest chapters: ' + sorted.slice(-5).map(([t, n]) => `${t} (${n})`).join(', '));

    const step = Math.max(1, Math.floor(list.length / SAMPLE_PER_SUBJECT));
    console.log('  spot check:');
    for (let i = 0; i < list.length; i += step) {
      const r = list[i];
      const check = topics.classify({ section: r.section, body: r.body });
      const drift = check.topic === r.topic ? '' : `   [re-classifies as ${check.topic} > ${check.subtopic}]`;
      console.log(`    ${String(r.topic).padEnd(40)} | ${String(r.subtopic).padEnd(32)} | ${shortBody(r.body)}${drift}`);
    }
  }

  await pool.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
