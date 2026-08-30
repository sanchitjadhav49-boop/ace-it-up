-- =====================================================================
-- Ace It Up - Students & Attempts Schema
-- Add this to your existing jee_mock_test_schema.sql database.
-- This assumes you already have: tests, sections, questions tables.
-- If your existing table names are different, tell Claude and it will adjust.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. STUDENTS
-- One row per student who uses the app. This replaces the fake
-- "Roll No: 100001" you saw hardcoded on screen.
-- ---------------------------------------------------------------------
CREATE TABLE students (
  id            SERIAL PRIMARY KEY,
  full_name     VARCHAR(150) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,   -- NEVER store plain text passwords
  roll_no       VARCHAR(50) UNIQUE,      -- auto-generate or let them pick
  phone         VARCHAR(20),
  created_at    TIMESTAMP DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 2. ATTEMPTS
-- One row every time a student STARTS a test. If they attempt the
-- same test 3 times, that's 3 rows here. This is how you get
-- "Attempt #45" instead of it just being a number in memory.
-- ---------------------------------------------------------------------
CREATE TABLE attempts (
  id                  SERIAL PRIMARY KEY,
  student_id          INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  test_id             INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  attempt_number      INTEGER NOT NULL,          -- 1st, 2nd, 3rd attempt at THIS test
  status              VARCHAR(20) DEFAULT 'in_progress', -- in_progress | submitted
  started_at          TIMESTAMP DEFAULT NOW(),
  submitted_at        TIMESTAMP,
  time_used_seconds   INTEGER DEFAULT 0,

  -- Final results, filled in only after submission (kept here so you
  -- don't have to recalculate scores every time someone views history)
  total_score         NUMERIC(6,2),
  correct_count        INTEGER DEFAULT 0,
  incorrect_count       INTEGER DEFAULT 0,
  unattempted_count      INTEGER DEFAULT 0,

  UNIQUE (student_id, test_id, attempt_number)
);

-- ---------------------------------------------------------------------
-- 3. ATTEMPT_ANSWERS
-- The most important table. One row per QUESTION per ATTEMPT.
-- This is what your palette colors, timer-per-question, and
-- Performance Analysis page all read from.
-- ---------------------------------------------------------------------
CREATE TABLE attempt_answers (
  id                SERIAL PRIMARY KEY,
  attempt_id        INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id       INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,

  -- matches exactly what paletteState() in App.jsx already uses:
  status            VARCHAR(20) DEFAULT 'not_visited',
                    -- not_visited | not_answered | answered
                    -- | marked_for_review | answered_marked

  selected_answer   TEXT,             -- 'A' / 'B' / '42.5' etc, NULL if blank
  is_correct        BOOLEAN,          -- filled in at submit time
  marks_awarded     NUMERIC(4,2) DEFAULT 0,   -- +4, -1, or 0

  time_spent_seconds  INTEGER DEFAULT 0,   -- powers your "Time: 21s" display
  first_visited_at    TIMESTAMP,
  last_updated_at     TIMESTAMP DEFAULT NOW(),

  UNIQUE (attempt_id, question_id)   -- one answer row per question per attempt
);

-- ---------------------------------------------------------------------
-- Helpful indexes - makes the app fast once you have many students
-- ---------------------------------------------------------------------
CREATE INDEX idx_attempts_student   ON attempts(student_id);
CREATE INDEX idx_attempts_test      ON attempts(test_id);
CREATE INDEX idx_answers_attempt    ON attempt_answers(attempt_id);
CREATE INDEX idx_answers_question   ON attempt_answers(question_id);
