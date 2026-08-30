-- ============================================================================
-- JEE MAIN MOCK TEST APP - POSTGRESQL SCHEMA
-- ============================================================================
-- Design notes:
--   * One test  = 3 sections (Physics, Chemistry, Mathematics).
--   * One section = exactly 20 MCQ questions (4 options, exactly 1 correct)
--                   + 5 numerical-answer questions.
--   * Each attempt runs on a countdown timer: started_at + test duration
--     (default 180 minutes). Remaining time is exposed via v_attempt_timers.
--   * Per-question state per attempt: not_visited / visited (seen, no answer) / answered / marked_for_review.
--   * Per-question time spent is accumulated client-side and stored in
--     attempt_questions.time_spent_seconds so the analysis screen can show
--     how long the student spent on each question.
--   * Marking scheme (stored per question, defaults to the JEE rules):
--       +4 correct, -1 wrong MCQ, -1 wrong numerical, 0 unattempted.
--   * Rich content: every question stem and every option may carry an
--     optional LaTeX formula, and every question may have one or more
--     attached images (diagrams / figures).
--   * When an attempt starts, all questions of the test are snapshotted into
--     attempt_questions, so later edits to the test never affect a running
--     attempt.
--   * Structural rules (20+5 per section, 4 options, 1 correct option) are
--     enforced by triggers while building, and re-verified in full by
--     fn_validate_test_for_publish() before a test goes live.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- USERS
-- ---------------------------------------------------------------------------
CREATE TABLE users (
    id         BIGSERIAL PRIMARY KEY,
    email      TEXT NOT NULL UNIQUE,
    full_name  TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- TESTS  (a mock test; duration drives the 3-hour countdown)
-- ---------------------------------------------------------------------------
CREATE TABLE tests (
    id               BIGSERIAL PRIMARY KEY,
    title            TEXT NOT NULL,
    description      TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 180 CHECK (duration_minutes > 0),
    is_published     BOOLEAN NOT NULL DEFAULT FALSE,   -- gate: only published tests can be attempted
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- SECTIONS  (exactly 3 per test: Physics, Chemistry, Mathematics)
-- ---------------------------------------------------------------------------
CREATE TABLE sections (
    id       BIGSERIAL PRIMARY KEY,
    test_id  BIGINT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    name     TEXT NOT NULL CHECK (name IN ('Physics', 'Chemistry', 'Mathematics')),
    position SMALLINT NOT NULL CHECK (position BETWEEN 1 AND 3),
    UNIQUE (test_id, name),
    UNIQUE (test_id, position)              -- sections are ordered 1..3
);

-- ---------------------------------------------------------------------------
-- QUESTIONS
--   type 'mcq'       -> 4 rows in question_options + correct_option_id
--   type 'numerical' -> no options + exact correct_answer
--   positive_marks / negative_marks default to the JEE scheme (+4 / -1);
--   negative_marks is stored positive and subtracted when the answer is wrong.
-- ---------------------------------------------------------------------------
CREATE TABLE questions (
    id                BIGSERIAL PRIMARY KEY,
    section_id        BIGINT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    question_type     TEXT NOT NULL CHECK (question_type IN ('mcq', 'numerical')),
    difficulty        TEXT NOT NULL DEFAULT 'easy'
                      CHECK (difficulty IN ('easy', 'moderate', 'difficult')),
    body              TEXT NOT NULL,
    formula           TEXT,                -- LaTeX for the stem (optional)
    correct_option_id BIGINT,              -- MCQ only (validated by trigger)
    correct_answer    NUMERIC(10, 4),      -- numerical only (exact match)
    positive_marks    NUMERIC(5, 2) NOT NULL DEFAULT 4,
    negative_marks    NUMERIC(5, 2) NOT NULL DEFAULT 1,
    position          SMALLINT NOT NULL,   -- 1..25 within the section (20 MCQ + 5 numerical)
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (section_id, position)
);

-- ---------------------------------------------------------------------------
-- QUESTION OPTIONS  (MCQ only; 1..4 per question, exactly 4 when complete)
-- ---------------------------------------------------------------------------
CREATE TABLE question_options (
    id          BIGSERIAL PRIMARY KEY,
    question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    body        TEXT NOT NULL,
    formula     TEXT,                      -- LaTeX for the option (optional)
    position    SMALLINT NOT NULL CHECK (position BETWEEN 1 AND 4),
    UNIQUE (question_id, position)
);

-- ---------------------------------------------------------------------------
-- QUESTION IMAGES  (diagrams / figures; a question can have several)
--   Rendered in order of position. Image storage is app-managed; only the
--   URL lives in the DB (supports S3 / CDN / local static serving).
-- ---------------------------------------------------------------------------
CREATE TABLE question_images (
    id          BIGSERIAL PRIMARY KEY,
    question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    image_url   TEXT NOT NULL,
    caption     TEXT,
    position    SMALLINT NOT NULL DEFAULT 1,
    UNIQUE (question_id, position)
);

-- ---------------------------------------------------------------------------
-- ATTEMPTS  (one attempt = one sitting of one test by one user)
--   status flow: in_progress -> submitted (user) | expired (timer ran out).
--   total_marks is filled by the scoring trigger when the attempt ends.
--   A background job (pg_cron or the app) flips attempts whose deadline has
--   passed from 'in_progress' to 'expired'; v_attempt_timers makes that trivial.
-- ---------------------------------------------------------------------------
CREATE TABLE attempts (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    test_id      BIGINT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    status       TEXT NOT NULL DEFAULT 'in_progress'
                 CHECK (status IN ('in_progress', 'submitted', 'expired')),
    started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    submitted_at TIMESTAMPTZ,
    total_marks  NUMERIC(8, 2),
    UNIQUE (user_id, test_id, started_at)   -- a user may retake a test over time
);

-- At most ONE in-progress attempt per (user, test)
CREATE UNIQUE INDEX uq_attempts_one_in_progress
    ON attempts (user_id, test_id) WHERE status = 'in_progress';

-- ---------------------------------------------------------------------------
-- ATTEMPT_QUESTIONS  (per-question state + answer for one attempt)
--   status: not_visited (never touched) / visited (seen, no answer) /
--            answered / marked_for_review.
--   A 'not_visited' row can never carry an answer (CHECK below).
--   'marked_for_review' MAY carry an answer (like the real JEE interface).
--   is_correct / marks_awarded are computed by the scoring trigger at the end.
--   time_spent_seconds is accumulated by the client and sent with each save
--   and with the submit call; it feeds the "time per question" analysis.
-- ---------------------------------------------------------------------------
CREATE TABLE attempt_questions (
    attempt_id         BIGINT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
    question_id        BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    status             TEXT NOT NULL DEFAULT 'not_visited'
                       CHECK (status IN ('answered', 'marked_for_review', 'not_visited', 'visited')),
    selected_option_id BIGINT REFERENCES question_options(id) ON DELETE SET NULL,
    numerical_answer   NUMERIC(10, 4),
    is_correct         BOOLEAN,        -- filled at scoring time (NULL = unattempted)
    marks_awarded      NUMERIC(6, 2),  -- filled at scoring time (0 = unattempted)
    answered_at        TIMESTAMPTZ,
    time_spent_seconds INTEGER NOT NULL DEFAULT 0,  -- accumulated viewing time
    PRIMARY KEY (attempt_id, question_id),
    CONSTRAINT ck_not_visited_has_no_answer
        CHECK (status <> 'not_visited' OR (selected_option_id IS NULL AND numerical_answer IS NULL))
);


-- ---------------------------------------------------------------------------
-- ERROR TAGS  (student's self-analysis of why a question went wrong)
--   One row per (attempt, question). The student picks exactly one tag per
--   question after the test: 'correct' or one of the 7 error types.
--   Powers the Error Distribution tab in the analysis page.
-- ---------------------------------------------------------------------------
CREATE TABLE error_tags (
    attempt_id  BIGINT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
    question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    error_tag   TEXT NOT NULL CHECK (error_tag IN
                  ('correct', 'concept', 'silly', 'reading',
                   'application', 'time', 'guess', 'recall')),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (attempt_id, question_id)
);

CREATE INDEX idx_error_tags_attempt ON error_tags (attempt_id);

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------
CREATE INDEX idx_questions_section    ON questions (section_id);
CREATE INDEX idx_options_question     ON question_options (question_id);
CREATE INDEX idx_question_images_question ON question_images (question_id);
CREATE INDEX idx_attempts_user        ON attempts (user_id);
CREATE INDEX idx_attempts_test        ON attempts (test_id);
CREATE INDEX idx_attempt_q_attempt    ON attempt_questions (attempt_id);
CREATE INDEX idx_attempt_q_question   ON attempt_questions (question_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Section capacity: at most 20 MCQ + 5 numerical per section while building.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_check_section_question_counts()
RETURNS trigger AS $$
DECLARE
    mcq_count INT;
    num_count INT;
BEGIN
    SELECT count(*) FILTER (WHERE question_type = 'mcq'),
           count(*) FILTER (WHERE question_type = 'numerical')
      INTO mcq_count, num_count
      FROM questions
     WHERE section_id = NEW.section_id;

    IF mcq_count > 20 OR num_count > 5 THEN
        RAISE EXCEPTION 'Section % exceeds limits: % MCQs (max 20), % numerical (max 5)',
                        NEW.section_id, mcq_count, num_count;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_section_question_counts
BEFORE INSERT OR UPDATE ON questions
FOR EACH ROW EXECUTE FUNCTION fn_check_section_question_counts();

-- ---------------------------------------------------------------------------
-- 2) Question shape: MCQ must reference one of its OWN options; numerical
--    must have an exact answer and never an option.
--    Insertion order is free: create the question, add options, then set
--    correct_option_id (validated here on UPDATE; ownership re-checked by the
--    option-counts trigger and the publish validator).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_validate_question()
RETURNS trigger AS $$
DECLARE
    opt_count INT;
    opt_owner BIGINT;
BEGIN
    SELECT count(*) INTO opt_count FROM question_options WHERE question_id = NEW.id;

    IF NEW.question_type = 'mcq' THEN
        IF opt_count > 4 THEN
            RAISE EXCEPTION 'MCQ question % must have exactly 4 options', NEW.id;
        END IF;
        IF NEW.correct_option_id IS NOT NULL THEN
            SELECT question_id INTO opt_owner
              FROM question_options WHERE id = NEW.correct_option_id;
            IF opt_owner IS DISTINCT FROM NEW.id THEN
                RAISE EXCEPTION 'correct_option_id % does not belong to question %',
                                NEW.correct_option_id, NEW.id;
            END IF;
        ELSIF TG_OP = 'UPDATE' THEN
            RAISE EXCEPTION 'MCQ question % must set correct_option_id', NEW.id;
        END IF;
    ELSE  -- numerical
        IF NEW.correct_option_id IS NOT NULL THEN
            RAISE EXCEPTION 'Numerical question % cannot set correct_option_id', NEW.id;
        END IF;
        IF NEW.correct_answer IS NULL THEN
            RAISE EXCEPTION 'Numerical question % must set correct_answer', NEW.id;
        END IF;
        IF opt_count > 0 THEN
            RAISE EXCEPTION 'Numerical question % cannot have options', NEW.id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_question
BEFORE INSERT OR UPDATE ON questions
FOR EACH ROW EXECUTE FUNCTION fn_validate_question();

-- ---------------------------------------------------------------------------
-- 3) Option counts after every option mutation (MCQ <= 4, numerical = 0).
--    The "exactly 4 + correct set" rule is enforced at publish time by
--    fn_validate_test_for_publish() so authors can build incrementally.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_validate_option_counts()
RETURNS trigger AS $$
DECLARE
    qid        BIGINT;
    qtype      TEXT;
    opt_count  INT;
BEGIN
    qid := COALESCE(NEW.question_id, OLD.question_id);

    SELECT question_type INTO qtype FROM questions WHERE id = qid;
    SELECT count(*) INTO opt_count FROM question_options WHERE question_id = qid;

    IF qtype = 'mcq' THEN
        IF opt_count > 4 THEN
            RAISE EXCEPTION 'MCQ question % must have exactly 4 options (has %)', qid, opt_count;
        END IF;
    ELSIF qtype = 'numerical' AND opt_count > 0 THEN
        RAISE EXCEPTION 'Numerical question % cannot have options', qid;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_option_counts
AFTER INSERT OR UPDATE OR DELETE ON question_options
FOR EACH ROW EXECUTE FUNCTION fn_validate_option_counts();

-- ---------------------------------------------------------------------------
-- 4) Snapshot: when an attempt starts, copy every question of the test into
--    attempt_questions so the attempt is insulated from later test edits.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_snapshot_attempt_questions()
RETURNS trigger AS $$
BEGIN
    INSERT INTO attempt_questions (attempt_id, question_id)
    SELECT NEW.id, q.id
      FROM questions q
      JOIN sections s ON s.id = q.section_id
     WHERE s.test_id = NEW.test_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_snapshot_attempt_questions
AFTER INSERT ON attempts
FOR EACH ROW EXECUTE FUNCTION fn_snapshot_attempt_questions();

-- ---------------------------------------------------------------------------
-- 5) Answer sanity + status bookkeeping on attempt_questions:
--    - MCQ rows get a selected option, never a numerical answer (and the
--      option must belong to that question).
--    - Numerical rows get a numerical answer, never an option.
--    - Supplying an answer flips status to 'answered' automatically.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_validate_attempt_answer()
RETURNS trigger AS $$
DECLARE
    qtype TEXT;
BEGIN
    SELECT question_type INTO qtype FROM questions WHERE id = NEW.question_id;

    IF qtype = 'mcq' THEN
        IF NEW.numerical_answer IS NOT NULL THEN
            RAISE EXCEPTION 'MCQ question % cannot have a numerical answer', NEW.question_id;
        END IF;
        IF NEW.selected_option_id IS NOT NULL
           AND NOT EXISTS (SELECT 1 FROM question_options
                           WHERE id = NEW.selected_option_id
                             AND question_id = NEW.question_id) THEN
            RAISE EXCEPTION 'Option % does not belong to question %',
                            NEW.selected_option_id, NEW.question_id;
        END IF;
    ELSE
        IF NEW.selected_option_id IS NOT NULL THEN
            RAISE EXCEPTION 'Numerical question % cannot have a selected option', NEW.question_id;
        END IF;
    END IF;

    IF NEW.selected_option_id IS NOT NULL OR NEW.numerical_answer IS NOT NULL THEN
        -- 'marked_for_review' may carry an answer (JEE: Answered & Marked
        -- for Review); only auto-set 'answered' for other statuses.
        IF NEW.status <> 'marked_for_review' THEN
            NEW.status := 'answered';
        END IF;
        NEW.answered_at := COALESCE(NEW.answered_at, now());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_attempt_answer
BEFORE INSERT OR UPDATE ON attempt_questions
FOR EACH ROW EXECUTE FUNCTION fn_validate_attempt_answer();

-- ---------------------------------------------------------------------------
-- 6) Scoring: when an attempt moves from in_progress to submitted/expired,
--    grade every answer and total the marks.
--      +positive_marks correct | -negative_marks wrong | 0 unattempted
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_score_attempt()
RETURNS trigger AS $$
DECLARE
    total NUMERIC(8, 2);
BEGIN
    IF NEW.status = OLD.status THEN
        RETURN NEW;
    END IF;

    IF NEW.status IN ('submitted', 'expired') AND OLD.status = 'in_progress' THEN
        NEW.submitted_at := COALESCE(NEW.submitted_at, now());

        UPDATE attempt_questions aq
           SET is_correct    = g.is_correct,
               marks_awarded = g.marks
          FROM (
              SELECT aq2.attempt_id, aq2.question_id,
                     CASE
                         WHEN aq2.selected_option_id IS NOT NULL
                              THEN aq2.selected_option_id = q.correct_option_id
                         WHEN aq2.numerical_answer IS NOT NULL
                              THEN aq2.numerical_answer = q.correct_answer
                         ELSE NULL
                     END AS is_correct,
                     CASE
                         WHEN aq2.selected_option_id IS NULL AND aq2.numerical_answer IS NULL
                              THEN 0
                         WHEN (aq2.selected_option_id IS NOT NULL
                               AND aq2.selected_option_id = q.correct_option_id)
                           OR (aq2.numerical_answer IS NOT NULL
                               AND aq2.numerical_answer = q.correct_answer)
                              THEN q.positive_marks
                         ELSE -q.negative_marks
                     END AS marks
                FROM attempt_questions aq2
                JOIN questions q ON q.id = aq2.question_id
               WHERE aq2.attempt_id = NEW.id
          ) g
         WHERE aq.attempt_id = g.attempt_id AND aq.question_id = g.question_id;

        SELECT COALESCE(SUM(marks_awarded), 0) INTO total
          FROM attempt_questions WHERE attempt_id = NEW.id;
        NEW.total_marks := total;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_score_attempt
BEFORE UPDATE OF status ON attempts
FOR EACH ROW EXECUTE FUNCTION fn_score_attempt();

-- ============================================================================
-- PUBLISH VALIDATOR  (run before a test goes live)
--   Checks the full structural contract: 3 sections, 20 MCQ + 5 numerical per
--   section, every MCQ has exactly 4 options and a valid correct option, every
--   numerical has an answer.  Call it from the app's "publish test" flow.
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_validate_test_for_publish(p_test_id BIGINT)
RETURNS void AS $$
DECLARE
    r           RECORD;
    mcq_count   INT;
    num_count   INT;
    incomplete  INT;
    sec_count   INT;
BEGIN
    SELECT count(*) INTO sec_count FROM sections WHERE test_id = p_test_id;
    IF sec_count <> 3 THEN
        RAISE EXCEPTION 'Test % must have exactly 3 sections (has %)', p_test_id, sec_count;
    END IF;

    FOR r IN SELECT id, name FROM sections WHERE test_id = p_test_id LOOP
        SELECT count(*) FILTER (WHERE question_type = 'mcq'),
               count(*) FILTER (WHERE question_type = 'numerical')
          INTO mcq_count, num_count
          FROM questions WHERE section_id = r.id;

        IF mcq_count <> 20 OR num_count <> 5 THEN
            RAISE EXCEPTION 'Section % (%) must have exactly 20 MCQ + 5 numerical (has % + %)',
                            r.id, r.name, mcq_count, num_count;
        END IF;
    END LOOP;

    SELECT count(*) INTO incomplete
      FROM questions q
      LEFT JOIN LATERAL (
          SELECT count(*) AS n,
                 count(*) FILTER (WHERE o.body IS NOT NULL OR o.formula IS NOT NULL)
                     AS with_content
            FROM question_options o WHERE o.question_id = q.id
      ) oc ON TRUE
     WHERE q.section_id IN (SELECT id FROM sections WHERE test_id = p_test_id)
       AND ( (q.question_type = 'mcq'
              AND (oc.n IS DISTINCT FROM 4
                   OR oc.with_content IS DISTINCT FROM 4
                   OR q.correct_option_id IS NULL))
          OR (q.question_type = 'numerical' AND q.correct_answer IS NULL) );

    IF incomplete > 0 THEN
        RAISE EXCEPTION 'Test % has % incomplete questions', p_test_id, incomplete;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Countdown timer: remaining whole seconds for every attempt.
-- Auto-expire job:  UPDATE attempts SET status='expired'
--                   WHERE status='in_progress' AND deadline <= now();
CREATE VIEW v_attempt_timers AS
SELECT a.id AS attempt_id,
       a.user_id,
       a.test_id,
       a.status,
       a.started_at,
       a.started_at + make_interval(mins => t.duration_minutes) AS deadline,
       GREATEST(0, EXTRACT(EPOCH FROM (
           a.started_at + make_interval(mins => t.duration_minutes) - now()
       ))::INT) AS seconds_remaining
  FROM attempts a
  JOIN tests t ON t.id = a.test_id;

-- Per-question status counts -> drives the exam-palette UI legend
CREATE VIEW v_attempt_progress AS
SELECT attempt_id,
       count(*) FILTER (WHERE status = 'not_visited')       AS not_visited,
       count(*) FILTER (WHERE status = 'visited')           AS not_answered,
       count(*) FILTER (WHERE status = 'answered')          AS answered,
       count(*) FILTER (WHERE status = 'marked_for_review') AS marked_for_review,
       count(*)                                             AS total
  FROM attempt_questions
 GROUP BY attempt_id;

-- Overall scorecard: correct / wrong / unattempted / total marks
CREATE VIEW v_attempt_scores AS
SELECT attempt_id,
       count(*) FILTER (WHERE is_correct)        AS correct_count,
       count(*) FILTER (WHERE marks_awarded < 0) AS wrong_count,
       count(*) FILTER (WHERE marks_awarded = 0) AS unattempted_count,
       COALESCE(SUM(marks_awarded), 0)           AS total_marks
  FROM attempt_questions
 GROUP BY attempt_id;

-- Section-wise scorecard (3 rows per attempt, ordered Physics->Maths)
CREATE VIEW v_attempt_section_scores AS
SELECT aq.attempt_id,
       s.name                                 AS section,
       count(aq.question_id)                   AS question_count,
       count(*) FILTER (WHERE aq.is_correct)   AS correct_count,
       COALESCE(SUM(aq.marks_awarded), 0)      AS section_marks
  FROM attempt_questions aq
  JOIN questions q ON q.id = aq.question_id
  JOIN sections  s ON s.id = q.section_id
 GROUP BY aq.attempt_id, s.name, s.position
 ORDER BY aq.attempt_id, s.position;

-- ============================================================================
-- SAMPLE DATA (shows the required insertion order)
-- ============================================================================
-- The inserts below run as one DO block and capture generated ids in local
-- variables, so they work no matter what the current sequence values are.
--
-- 1) Test + 3 sections (Physics, Chemistry, Mathematics)
-- 2) One MCQ question:
--    a) create the question (correct_option_id NULL for now)
--    b) add its 4 options
--    c) set correct_option_id to one of them
-- 3) One numerical question (Physics, position 21)
-- 4) Before publishing, run the validator with the test id printed in the
--    NOTICE below, then flip is_published:
--       SELECT fn_validate_test_for_publish(<test_id>);
--       UPDATE tests SET is_published = TRUE WHERE id = <test_id>;
DO $$
DECLARE
    v_test_id     BIGINT;
    v_physics_id  BIGINT;
    v_q_mcq       BIGINT;
    v_opt_newton  BIGINT;
BEGIN
    -- 1) Test + 3 sections
    INSERT INTO tests (title, duration_minutes)
    VALUES ('JEE Main 2026 Mock 1', 180)
    RETURNING id INTO v_test_id;

    INSERT INTO sections (test_id, name, position) VALUES
        (v_test_id, 'Physics', 1),
        (v_test_id, 'Chemistry', 2),
        (v_test_id, 'Mathematics', 3);

    SELECT id INTO v_physics_id
      FROM sections
     WHERE test_id = v_test_id AND name = 'Physics';

    -- 2a) MCQ question first (correct_option_id is set after its options exist)
    INSERT INTO questions (section_id, question_type, body, position)
    VALUES (v_physics_id, 'mcq', 'The SI unit of force is:', 1)
    RETURNING id INTO v_q_mcq;

    -- 2b) its 4 options
    INSERT INTO question_options (question_id, body, position) VALUES
        (v_q_mcq, 'Joule', 1),
        (v_q_mcq, 'Newton', 2),
        (v_q_mcq, 'Watt', 3),
        (v_q_mcq, 'Pascal', 4);

    -- 2c) mark 'Newton' as the correct option
    SELECT id INTO v_opt_newton
      FROM question_options
     WHERE question_id = v_q_mcq AND body = 'Newton';
    UPDATE questions SET correct_option_id = v_opt_newton WHERE id = v_q_mcq;

    -- Optional media for the question: an attached diagram and a LaTeX stem
    INSERT INTO question_images (question_id, image_url, caption) VALUES
        (v_q_mcq, 'https://cdn.example.com/q1.png', 'Free-body diagram');
    UPDATE questions SET formula = 'F = m \cdot a' WHERE id = v_q_mcq;

    -- 3) One numerical question
    INSERT INTO questions (section_id, question_type, body, correct_answer, position)
    VALUES (v_physics_id, 'numerical', 'If g = 9.8 m/s^2, what is 2g?', 19.6000, 21);

    RAISE NOTICE 'Sample data ready: test % (Physics section %), MCQ % with 4 options, numerical question added',
                 v_test_id, v_physics_id, v_q_mcq;
END $$;
