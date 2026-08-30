-- ===========================================================================
-- Ace It Up -- JEE Main Mock Test App
-- File 01: core schema (enums, tables, constraints)
-- Target: PostgreSQL 13+
-- ===========================================================================
--
-- Structure enforced by this schema:
--   * A test (paper) has exactly 3 sections: Physics, Chemistry, Maths.
--   * Each section has exactly 20 single-correct MCQ questions (4 options)
--     and exactly 5 numerical-answer questions  -> 25 per section, 75 total.
--   * An attempt runs on a 3-hour countdown timer (server authoritative).
--   * Every question in an attempt carries a per-question status:
--     not_visited / not_answered / answered / marked_review /
--     answered_and_marked_review  (JEE / NTA abhyas convention).
--   * Marking scheme: +4 correct, -1 incorrect MCQ, -1 incorrect numerical,
--     0 for unattempted (and 0 for questions dropped by the setter).
-- ===========================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;     -- case-insensitive email

-- ---------------------------------------------------------------------------
-- 1. Enumerated types
-- ---------------------------------------------------------------------------

-- The three fixed subjects of a JEE Main paper.
CREATE TYPE subject_t AS ENUM ('physics', 'chemistry', 'maths');

-- Two question formats used in JEE Main (Paper 1).
CREATE TYPE question_type_t AS ENUM ('mcq', 'numerical');

-- Option labels for an MCQ. Exactly four exist per MCQ.
CREATE TYPE option_label_t AS ENUM ('A', 'B', 'C', 'D');

-- Lifecycle of one attempt at a test.
--   in_progress -> submitted   (candidate pressed "Submit")
--   in_progress -> expired     (3-hour timer ran out, auto-submitted)
--   in_progress -> abandoned   (admin/janitor closed a dead session)
CREATE TYPE attempt_status_t AS ENUM
    ('in_progress', 'submitted', 'expired', 'abandoned');

-- Per-question UI state inside an attempt.
CREATE TYPE question_state_t AS ENUM (
    'not_visited',                  -- grey  : never opened
    'not_answered',                 -- red   : opened, left blank
    'answered',                     -- green : has a response
    'marked_review',                -- purple: flagged, no response
    'answered_and_marked_review'    -- purple+tick: flagged, has response
);

-- How a question was finally graded.
CREATE TYPE grade_t AS ENUM ('correct', 'incorrect', 'unattempted', 'dropped');

-- ---------------------------------------------------------------------------
-- 2. Marking scheme (data, not hard-coded numbers)
-- ---------------------------------------------------------------------------
-- Keeping the scheme in a table means a future paper pattern (e.g. numerical
-- questions with no negative marking) needs no code change.
CREATE TABLE marking_scheme (
    id                  smallserial PRIMARY KEY,
    name                text        NOT NULL UNIQUE,
    mcq_correct         numeric(5,2) NOT NULL DEFAULT  4,
    mcq_incorrect       numeric(5,2) NOT NULL DEFAULT -1,
    mcq_unattempted     numeric(5,2) NOT NULL DEFAULT  0,
    num_correct         numeric(5,2) NOT NULL DEFAULT  4,
    num_incorrect       numeric(5,2) NOT NULL DEFAULT -1,
    num_unattempted     numeric(5,2) NOT NULL DEFAULT  0,
    created_at          timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE marking_scheme IS
    'Reusable marking rules. Row "jee_main_2024" is the default: +4 / -1 / 0.';

INSERT INTO marking_scheme (name) VALUES ('jee_main_2024');

-- ---------------------------------------------------------------------------
-- 3. Users
-- ---------------------------------------------------------------------------
CREATE TABLE users (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email          citext      NOT NULL UNIQUE,
    full_name      text        NOT NULL CHECK (length(btrim(full_name)) > 0),
    password_hash  text        NOT NULL,
    target_year    smallint    CHECK (target_year BETWEEN 2020 AND 2100),
    is_admin       boolean     NOT NULL DEFAULT false,
    created_at     timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 4. Tests, sections, questions, options
-- ---------------------------------------------------------------------------

-- One mock paper.
CREATE TABLE tests (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title              text        NOT NULL,
    slug               text        NOT NULL UNIQUE,
    description        text,
    -- 3 hours = 180 minutes. Stored so a future "half-length" paper is possible,
    -- but constrained to positive values; the app default is 180.
    duration_minutes   integer     NOT NULL DEFAULT 180
                                   CHECK (duration_minutes BETWEEN 1 AND 600),
    marking_scheme_id  smallint    NOT NULL REFERENCES marking_scheme(id),
    -- A test may only be attempted once published; publishing also freezes
    -- the question set (enforced in 02_scoring.sql by trigger).
    is_published       boolean     NOT NULL DEFAULT false,
    created_by         uuid        REFERENCES users(id) ON DELETE SET NULL,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN tests.duration_minutes IS
    'Countdown length in minutes; 180 = the standard 3-hour JEE Main paper.';

-- Exactly three sections per test, one per subject.
CREATE TABLE test_sections (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id      uuid      NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    subject      subject_t NOT NULL,
    -- Display order in the exam UI: 1 Physics, 2 Chemistry, 3 Maths.
    position     smallint  NOT NULL CHECK (position BETWEEN 1 AND 3),
    -- Expected counts; used by the "paper is complete" validation.
    mcq_count       smallint NOT NULL DEFAULT 20 CHECK (mcq_count = 20),
    numerical_count smallint NOT NULL DEFAULT 5  CHECK (numerical_count = 5),
    UNIQUE (test_id, subject),      -- no duplicate subject in a paper
    UNIQUE (test_id, position)      -- stable, unique ordering
);

COMMENT ON TABLE test_sections IS
    'Exactly 3 rows per test (physics, chemistry, maths); enforced by trigger.';

-- Questions. Both formats live in one table; a CHECK keeps the
-- format-specific columns mutually exclusive and non-null where required.
CREATE TABLE questions (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id     uuid            NOT NULL
                                   REFERENCES test_sections(id) ON DELETE CASCADE,
    q_type         question_type_t NOT NULL,
    -- 1..20 for MCQs, 21..25 for numericals (per section).
    q_number       smallint        NOT NULL CHECK (q_number BETWEEN 1 AND 25),
    body           text            NOT NULL CHECK (length(btrim(body)) > 0),
    image_url      text,
    solution_text  text,

    -- ---- numerical-only fields -------------------------------------------
    -- NTA accepts a value within a tolerance; default 0 means exact match
    -- after rounding to numerical_decimals places.
    correct_value      numeric(14,4),
    tolerance          numeric(14,4) DEFAULT 0 CHECK (tolerance >= 0),
    numerical_decimals smallint      DEFAULT 2
                                     CHECK (numerical_decimals BETWEEN 0 AND 4),

    -- Setter dropped the question after the paper went live: everybody who
    -- attempted it gets grade 'dropped' and 0 (see grading function).
    is_dropped     boolean     NOT NULL DEFAULT false,
    created_at     timestamptz NOT NULL DEFAULT now(),

    UNIQUE (section_id, q_number),

    -- Format integrity: numericals carry a correct_value, MCQs do not.
    CONSTRAINT questions_format_ck CHECK (
        (q_type = 'numerical' AND correct_value IS NOT NULL)
        OR
        (q_type = 'mcq'       AND correct_value IS NULL)
    ),
    -- Numbering convention keeps the 20 + 5 split visible in the data.
    CONSTRAINT questions_numbering_ck CHECK (
        (q_type = 'mcq'       AND q_number BETWEEN  1 AND 20)
        OR
        (q_type = 'numerical' AND q_number BETWEEN 21 AND 25)
    )
);

CREATE INDEX questions_section_idx ON questions (section_id, q_number);

-- Four options per MCQ, exactly one flagged correct (trigger-enforced).
CREATE TABLE question_options (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id  uuid           NOT NULL
                                REFERENCES questions(id) ON DELETE CASCADE,
    label        option_label_t NOT NULL,
    body         text           NOT NULL CHECK (length(btrim(body)) > 0),
    is_correct   boolean        NOT NULL DEFAULT false,
    UNIQUE (question_id, label)
);

-- Fast lookup of the single correct option, and a hard guarantee that no
-- MCQ can ever have two correct options.
CREATE UNIQUE INDEX question_options_one_correct_idx
    ON question_options (question_id)
    WHERE is_correct;

COMMENT ON INDEX question_options_one_correct_idx IS
    'Partial unique index: at most one correct option per MCQ.';

COMMIT;
