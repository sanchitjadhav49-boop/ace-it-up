'use strict';
// ---------------------------------------------------------------------------
// topics/index.js - JEE Main topic / subtopic taxonomy + keyword classifier.
//
// The taxonomy lives in ./physics.js, ./chemistry.js and ./maths.js:
//
//   { 'Topic (chapter)': { 'Subtopic': [keyword, ...], '*': [topic-wide keywords] } }
//
// ./extra_keywords.js adds supplemental coverage; it is merged in below.
//
// classify() scores every chapter against the question text and returns the
// best chapter plus the best sub-chapter inside it. It is used for two things:
//
//   1. tag_topics.js - backfilling questions.topic / questions.subtopic so the
//      analysis page can report which topics a student got right and wrong.
//   2. any future re-tagging when new papers are imported.
//
// Scoring notes
//   * Matching is case-insensitive, on word boundaries, and matches word
//     prefixes ('collis' -> collision/collisions).
//   * A multi-word keyword is worth more than a single word, and a long single
//     word ('nernst', 'ellingham') is worth more than a short generic one.
//   * Every chapter is scored, but chapters belonging to the question's own
//     subject (from the section name) get a bonus, so a Physics question is
//     almost always filed under Physics - unless the content clearly belongs to
//     another subject (some seeded mocks do mix content across sections).
//   * An explicit topic hint (the 'topic' field that some seed files carry) is
//     weighted far above the question body, so curated tags win over the guess.
//   * Answer options are a weak signal only: a chapter that is matched *only*
//     in the options never wins over a chapter matched in the stem, otherwise a
//     distractor like 'vibrate perpendicularly' would file a magnetism question
//     under oscillations.
// ---------------------------------------------------------------------------

const physics = require('./physics');
const chemistry = require('./chemistry');
const maths = require('./maths');
const extraKeywords = require('./extra_keywords');

const TAXONOMY = {
  Physics: physics,
  Chemistry: chemistry,
  Mathematics: maths,
};

const SUBJECTS = Object.keys(TAXONOMY);

// ---- merge supplemental keywords (topics/extra_keywords.js) --------------
// Extra coverage for questions the base taxonomy misses; new subtopics are
// created on the fly, existing ones simply gain more keywords.
function mergeExtraKeywords(source) {
  for (const subject of Object.keys(source)) {
    if (!TAXONOMY[subject]) continue;
    for (const topic of Object.keys(source[subject])) {
      if (!TAXONOMY[subject][topic]) TAXONOMY[subject][topic] = {};
      const incoming = source[subject][topic];
      for (const subtopic of Object.keys(incoming)) {
        if (!TAXONOMY[subject][topic][subtopic]) {
          TAXONOMY[subject][topic][subtopic] = incoming[subtopic].slice();
        } else {
          const existing = new Set(TAXONOMY[subject][topic][subtopic]);
          for (const keyword of incoming[subtopic]) {
            if (!existing.has(keyword)) TAXONOMY[subject][topic][subtopic].push(keyword);
          }
        }
      }
    }
  }
}

mergeExtraKeywords(extraKeywords);

const UNCLASSIFIED_TOPIC = 'Unclassified';
const UNCLASSIFIED_SUBTOPIC = 'General';

const TOPIC_WIDE = '*';

// How strongly the section's own subject is preferred when scores are close.
const SECTION_BONUS = 1.5;
// Weight of an explicit curated hint relative to the question stem.
const HINT_WEIGHT = 2.5;
// Weight of the answer options relative to the question stem.
const OPTION_WEIGHT = 0.2;
// Flat bonus for a chapter that matched somewhere in the stem (or the hint), so
// option-only matches never win.
const STEM_BONUS = 2;

// ---- keyword indexes ------------------------------------------------------

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function keywordWeight(raw, words) {
  if (words >= 3) return 3;
  if (words === 2) return 2;
  // Single word: long, unusual words are far more informative than short ones.
  return raw.length >= 7 ? 2 : 1;
}

function buildRegex(raw) {
  const escaped = escapeRegExp(raw.trim()).replace(/\\?\s+/g, '\\s+');
  const lead = /^[a-z0-9]/i.test(raw) ? '\\b' : '';
  const tail = /[a-z0-9]$/i.test(raw) ? '\\w*\\b' : '';
  return new RegExp(lead + escaped + tail, 'gi');
}

const INDEX = {}; // subject -> array of entries

for (const subject of SUBJECTS) {
  const entries = [];
  const topics = TAXONOMY[subject];
  for (const topic of Object.keys(topics)) {
    const subtopics = topics[topic];
    for (const subtopic of Object.keys(subtopics)) {
      const isTopicWide = subtopic === TOPIC_WIDE;
      for (const raw of subtopics[subtopic]) {
        const words = raw.trim().split(/\s+/).length;
        entries.push({
          subject,
          topic,
          subtopic: isTopicWide ? null : subtopic,
          raw,
          weight: keywordWeight(raw, words) * (isTopicWide ? 0.6 : 1),
          regex: buildRegex(raw),
        });
      }
    }
  }
  INDEX[subject] = entries;
}

// Chapter order inside a subject (syllabus order, used for stable display).
const TOPIC_ORDER = {};
for (const subject of SUBJECTS) {
  TOPIC_ORDER[subject] = Object.keys(TAXONOMY[subject]);
}

// ---- helpers --------------------------------------------------------------

function subjectOf(value) {
  const text = String(value || '');
  if (/physics/i.test(text)) return 'Physics';
  if (/chem/i.test(text)) return 'Chemistry';
  if (/math/i.test(text)) return 'Mathematics';
  return null;
}

function countMatches(regex, text) {
  if (!text) return 0;
  regex.lastIndex = 0;
  let seen = 0;
  while (regex.exec(text) !== null) {
    seen += 1;
    if (seen > 25) break; // cap: keyword stuffing in a stem is not extra signal
  }
  return seen;
}

function defaultSubtopicFor(subject, topic) {
  const subs = Object.keys(TAXONOMY[subject][topic]).filter((s) => s !== TOPIC_WIDE);
  return subs[0] || UNCLASSIFIED_SUBTOPIC;
}

// ---- classifier -----------------------------------------------------------

function classify(input) {
  const question = input || {};
  const sectionSubject = subjectOf(question.subject) || subjectOf(question.section);
  const hint = String(question.hint || '');
  const body = String(question.body || '');
  const options = Array.isArray(question.options) ? question.options.join(' ') : String(question.options || '');

  const topicScores = new Map(); // 'subject||topic' -> { stem, option, subject, keywords }
  const subtopicScores = new Map(); // 'subject||topic||subtopic' -> { stem, option }

  for (const subject of SUBJECTS) {
    const bonus = subject === sectionSubject ? SECTION_BONUS : 1;
    for (const entry of INDEX[subject]) {
      const stemHits = countMatches(entry.regex, body) + countMatches(entry.regex, hint) * HINT_WEIGHT;
      const optionHits = countMatches(entry.regex, options);
      if (stemHits === 0 && optionHits === 0) continue;

      const stemValue = entry.weight * bonus * stemHits;
      const optionValue = entry.weight * bonus * optionHits * OPTION_WEIGHT;

      const topicKey = subject + '||' + entry.topic;
      let topicInfo = topicScores.get(topicKey);
      if (!topicInfo) {
        topicInfo = { stem: 0, option: 0, subject, keywords: new Set() };
        topicScores.set(topicKey, topicInfo);
      }
      topicInfo.stem += stemValue;
      topicInfo.option += optionValue;
      topicInfo.keywords.add(entry.raw);

      if (entry.subtopic) {
        const subKey = topicKey + '||' + entry.subtopic;
        let subInfo = subtopicScores.get(subKey);
        if (!subInfo) {
          subInfo = { stem: 0, option: 0 };
          subtopicScores.set(subKey, subInfo);
        }
        subInfo.stem += stemValue;
        subInfo.option += optionValue;
      }
    }
  }

  const total = (info) => info.stem + info.option + (info.stem > 0 ? STEM_BONUS : 0);

  if (topicScores.size === 0) {
    return {
      subject: sectionSubject,
      sectionSubject,
      topic: UNCLASSIFIED_TOPIC,
      subtopic: UNCLASSIFIED_SUBTOPIC,
      topicScore: 0,
      subtopicScore: 0,
      score: 0,
      matched: [],
    };
  }

  const bestTopic = [...topicScores.entries()].sort(
    (a, b) => total(b[1]) - total(a[1]) || a[0].localeCompare(b[0])
  )[0];
  const [bestTopicKey, bestTopicInfo] = bestTopic;
  const bestTopicScore = total(bestTopicInfo);

  const candidates = [...subtopicScores.entries()]
    .filter(([key]) => key.startsWith(bestTopicKey + '||'))
    .sort((a, b) => total(b[1]) - total(a[1]) || a[0].localeCompare(b[0]));

  const topicName = bestTopicKey.split('||')[1];
  const subtopic = candidates.length
    ? candidates[0][0].split('||')[2]
    : defaultSubtopicFor(bestTopicInfo.subject, topicName);
  const bestSubScore = candidates.length ? total(candidates[0][1]) : 0;

  return {
    subject: bestTopicInfo.subject,
    sectionSubject,
    topic: topicName,
    subtopic,
    topicScore: Math.round(bestTopicScore * 100) / 100,
    subtopicScore: Math.round(bestSubScore * 100) / 100,
    score: Math.round((bestTopicScore + 0.001 * bestSubScore) * 100) / 100,
    matched: [...bestTopicInfo.keywords].slice(0, 8),
  };
}

// Convenience wrapper for the backfill script: returns just the labels.
function classifyLabels(question) {
  const res = classify(question);
  return {
    subject: res.subject,
    topic: res.topic,
    subtopic: res.subtopic,
    score: res.score,
    crossSubject: res.sectionSubject !== res.subject,
  };
}

// A hint may already be an exact chapter or subtopic name from the taxonomy
// ('Kinematics'); such a hint is trusted directly instead of scored.
function exactTopicMatch(subject, hint) {
  const text = String(hint || '').trim().toLowerCase();
  if (!text) return null;
  const subjects = subject ? [subject] : SUBJECTS;
  for (const candidate of subjects) {
    if (!TAXONOMY[candidate]) continue;
    for (const topic of Object.keys(TAXONOMY[candidate])) {
      if (topic.toLowerCase() === text) {
        return { subject: candidate, topic, subtopic: defaultSubtopicFor(candidate, topic) };
      }
      for (const subtopic of Object.keys(TAXONOMY[candidate][topic])) {
        if (subtopic !== TOPIC_WIDE && subtopic.toLowerCase() === text) {
          return { subject: candidate, topic, subtopic };
        }
      }
    }
  }
  return null;
}

module.exports = {
  TAXONOMY,
  SUBJECTS,
  TOPIC_ORDER,
  TOPIC_WIDE,
  SECTION_BONUS,
  UNCLASSIFIED_TOPIC,
  UNCLASSIFIED_SUBTOPIC,
  subjectOf,
  classify,
  classifyLabels,
  exactTopicMatch,
  defaultSubtopicFor,
  topicsOf: (subject) => Object.keys(TAXONOMY[subject] || {}),
  subtopicsOf: (subject, topic) =>
    Object.keys((TAXONOMY[subject] || {})[topic] || {}).filter((s) => s !== TOPIC_WIDE),
  keywordCount: () => SUBJECTS.reduce((n, s) => n + INDEX[s].length, 0),
};
