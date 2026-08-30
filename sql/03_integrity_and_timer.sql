-- ===========================================================================
-- Ace It Up -- JEE Main Mock Test App
-- File 03: integrity triggers, timer enforcement, grading + scoring logic
-- Run after 02_attempts_schema.sql
-- ===========================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 9.1  updated_at housekeeping
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER tests_touch
    BEFORE UPDATE ON tests
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER attempt_responses_touch
    BEFORE UPDATE ON attempt_responses
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ---------------------------------------------------------------------------
-- 9.2  Paper structure validation: 3 sections x (20 MCQ + 5 numerical),
--      4 options per MCQ with exactly 1 correct.
--      Called on publish; also exposed for admin previews.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_test_structure(p_test_id uuid)
RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
    v_sections   int;
    v_bad_subj   int;
    v_bad_sect   text;
    v_bad_opts   text;
BEGIN
    SELECT count(*) INTO v_sections
      FROM test_sections WHERE test_id = p_test_id;

    IF v_sections <> 3 THEN
        RAISE EXCEPTION
            'test % has % section(s); exactly 3 required (physics, chemistry, maths)',
            p_test_id, v_sections;
    END IF;

    -- All three subjects must be present exactly once (UNIQUE handles "once").
    SELECT count(*) INTO v_bad_subj
      FROM unnest(enum_range(NULL::subject_t)) AS s(subject)
     WHERE NOT EXISTS (SELECT 1 FROM test_sections ts
                        WHERE ts.test_id = p_test_id AND ts.subject = s.subject);
    IF v_bad_subj > 0 THEN
        RAISE EXCEPTION 'test % is missing % subject section(s)', p_test_id, v_bad_subj;
    END IF;

    -- Per-section question counts.
    SELECT string_agg(format('%s: %s MCQ / %s numerical',
                             ts.subject, x.mcqs, x.nums), ', ')
      INTO v_bad_sect
      FROM test_sections ts
      JOIN LATERAL (
            SELECT count(*) FILTER (WHERE q.q_type = 'mcq')       AS mcqs,
                   count(*) FILTER (WHERE q.q_type = 'numerical') AS nums
              FROM questions q WHERE q.section_id = ts.id
           ) x ON true
     WHERE ts.test_id = p_test_id
       AND (x.mcqs <> ts.mcq_count OR x.nums <> ts.numerical_count);

    IF v_bad_sect IS NOT NULL THEN
        RAISE EXCEPTION
            'test % has malformed sections (need 20 MCQ + 5 numerical each) -> %',
            p_test_id, v_bad_sect;
    END IF;

    -- Every MCQ needs 4 options and exactly 1 correct one.
    SELECT string_agg(format('%s/Q%s: %s options, %s correct',
                             ts.subject, q.q_number, o.n_opts, o.n_correct), ', ')
      INTO v_bad_opts
      FROM questions q
      JOIN test_sections ts ON ts.id = q.section_id
      JOIN LATERAL (
            SELECT count(*)                                 AS n_opts,
                   count(*) FILTER (WHERE qo.is_correct)     AS n_correct
              FROM question_options qo WHERE qo.question_id = q.id
           ) o ON true
     WHERE ts.test_id = p_test_id
       AND q.q_type = 'mcq'
       AND (o.n_opts <> 4 OR o.n_correct <> 1);

    IF v_bad_opts IS NOT NULL THEN
        RAISE EXCEPTION
            'test % has invalid MCQ options (need 4 options, 1 correct) -> %',
            p_test_id, v_bad_opts;
    END IF;
END;
$$;

COMMENT ON FUNCTION validate_test_structure(uuid) IS
    'Raises unless the paper is exactly 3 sections x (20 MCQ + 5 numerical), 4 options/MCQ.';

-- Block publishing an incomplete paper.
CREATE OR REPLACE FUNCTION tests_publish_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.is_published AND (TG_OP = 'INSERT' OR NOT OLD.is_published) THEN
        PERFORM validate_test_structure(NEW.id);
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER tests_publish_guard_trg
    BEFORE INSERT OR UPDATE OF is_published ON tests
    FOR EACH ROW EXECUTE FUNCTION tests_publish_guard();

-- ---------------------------------------------------------------------------
-- 9.3  Option must belong to the question it is selected for, and only
--      MCQs take options while only numericals take a numeric answer.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION response_answer_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    v_type question_type_t;
BEGIN
    SELECT q_type INTO v_type FROM questions WHERE id = NEW.question_id;

    IF v_type = 'mcq' AND NEW.numeric_answer IS NOT NULL THEN
        RAISE EXCEPTION 'question % is an MCQ; numeric_answer not allowed',
                        NEW.question_id;
    END IF;

    IF v_type = 'numerical' AND NEW.selected_option_id IS NOT NULL THEN
        RAISE EXCEPTION 'question % is numerical; selected_option_id not allowed',
                        NEW.question_id;
    END IF;

    IF NEW.selected_option_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM question_options
                        WHERE id = NEW.selected_option_id
                          AND question_id = NEW.question_id) THEN
        RAISE EXCEPTION 'option % does not belong to question %',
                        NEW.selected_option_id, NEW.question_id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER attempt_responses_answer_guard
    BEFORE INSERT OR UPDATE ON attempt_responses
    FOR EACH ROW EXECUTE FUNCTION response_answer_guard();

-- ---------------------------------------------------------------------------
-- 9.4  TIMER ENFORCEMENT
--      No answer may be written after expires_at, or once the attempt is
--      no longer in_progress. This is what makes the countdown real.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION response_window_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    a record;
BEGIN
    SELECT status, expires_at INTO a
      FROM test_attempts WHERE id = NEW.attempt_id
      FOR SHARE;

    -- Grading writes (grade/marks_awarded) happen after submit, so allow
    -- updates that come from finalize_attempt() -- flagged via a GUC.
    IF current_setting('aceitup.grading', true) = 'on' THEN
        RETURN NEW;
    END IF;

    IF a.status <> 'in_progress' THEN
        RAISE EXCEPTION 'attempt % is %; no further answers accepted',
                        NEW.attempt_id, a.status;
    END IF;

    IF now() > a.expires_at THEN
        RAISE EXCEPTION 'attempt % expired at % (3-hour timer elapsed)',
                        NEW.attempt_id, a.expires_at;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER attempt_responses_window_guard
    BEFORE INSERT OR UPDATE ON attempt_responses
    FOR EACH ROW EXECUTE FUNCTION response_window_guard();

-- Seconds left on the clock (0 once elapsed).
CREATE OR REPLACE FUNCTION attempt_remaining_seconds(p_attempt_id uuid)
RETURNS integer
LANGUAGE sql STABLE AS $$
    SELECT GREATEST(0, CEIL(EXTRACT(EPOCH FROM (expires_at - now()))))::int
      FROM test_attempts WHERE id = p_attempt_id;
$$;

COMMIT;
