-- ===========================================================================
-- Ace It Up -- JEE Main Mock Test App
-- File 02: attempts, per-question tracking, timer columns, score storage
-- Run after 01_core_schema.sql
-- ===========================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 5. Attempts (one candidate sitting one paper once)
-- ---------------------------------------------------------------------------
-- TIMER MODEL (server authoritative -- never trust the browser clock):
--   started_at            : set once, at creation
--   duration_seconds      : snapshot of tests.duration_minutes * 60 (10800)
--   expires_at            : generated = started_at + duration_seconds
--   The client polls / receives remaining_seconds = expires_at - now(),
--   clamped at 0. Any write to responses is rejected past expires_at
--   (trigger in 03_logic.sql), so a stale tab cannot cheat the clock.
-- ---------------------------------------------------------------------------
CREATE TABLE test_attempts (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           uuid NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    test_id           uuid NOT NULL REFERENCES tests(id)  ON DELETE RESTRICT,
    -- Scheme is snapshotted so re-grading an old attempt stays reproducible
    -- even if the test later points at a different scheme.
    marking_scheme_id smallint NOT NULL REFERENCES marking_scheme(id),

    status            attempt_status_t NOT NULL DEFAULT 'in_progress',

    started_at        timestamptz NOT NULL DEFAULT now(),
    duration_seconds  integer     NOT NULL DEFAULT 10800   -- 3 hours
                                  CHECK (duration_seconds BETWEEN 60 AND 36000),
    expires_at        timestamptz GENERATED ALWAYS AS
                          (started_at + make_interval(secs => duration_seconds))
                          STORED,
    submitted_at      timestamptz,
    -- Wall-clock seconds actually consumed; filled in on submit.
    time_spent_seconds integer CHECK (time_spent_seconds >= 0),

    -- Denormalised scoreboard, recomputed by finalize_attempt().
    total_score        numeric(6,2),
    max_score          numeric(6,2),          -- 75 * 4 = 300
    correct_count      smallint,
    incorrect_count    smallint,
    unattempted_count  smallint,

    created_at        timestamptz NOT NULL DEFAULT now(),

    -- Cannot be submitted without a submit timestamp, and vice versa.
    CONSTRAINT attempt_submit_ck CHECK (
        (status = 'in_progress' AND submitted_at IS NULL)
        OR
        (status <> 'in_progress' AND submitted_at IS NOT NULL)
    )
);

-- A candidate may have at most ONE live attempt per test at a time.
CREATE UNIQUE INDEX test_attempts_one_live_idx
    ON test_attempts (user_id, test_id)
    WHERE status = 'in_progress';

CREATE INDEX test_attempts_user_idx    ON test_attempts (user_id, created_at DESC);
CREATE INDEX test_attempts_expiry_idx  ON test_attempts (expires_at)
    WHERE status = 'in_progress';   -- used by the auto-expire janitor

COMMENT ON COLUMN test_attempts.expires_at IS
    'Generated: started_at + duration_seconds. Single source of truth for the countdown.';

-- ---------------------------------------------------------------------------
-- 6. Per-question response / status tracking
-- ---------------------------------------------------------------------------
-- One row per (attempt, question), created up-front by start_attempt() with
-- state = 'not_visited', so the question palette can be rendered with a
-- single query and counts are always consistent.
-- ---------------------------------------------------------------------------
CREATE TABLE attempt_responses (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id     uuid NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
    question_id    uuid NOT NULL REFERENCES questions(id)     ON DELETE CASCADE,
    -- Copied for cheap section-wise aggregation without extra joins.
    section_id     uuid NOT NULL REFERENCES test_sections(id) ON DELETE CASCADE,

    state          question_state_t NOT NULL DEFAULT 'not_visited',

    -- ---- the answer itself (exactly one of these is used) -----------------
    selected_option_id uuid REFERENCES question_options(id) ON DELETE SET NULL,
    numeric_answer     numeric(14,4),

    -- ---- analytics -------------------------------------------------------
    visit_count        integer NOT NULL DEFAULT 0 CHECK (visit_count >= 0),
    time_spent_seconds integer NOT NULL DEFAULT 0 CHECK (time_spent_seconds >= 0),
    first_visited_at   timestamptz,
    answered_at        timestamptz,

    -- ---- grading (filled by finalize_attempt()) --------------------------
    grade         grade_t,
    marks_awarded numeric(5,2),

    updated_at    timestamptz NOT NULL DEFAULT now(),

    UNIQUE (attempt_id, question_id),

    -- An answer may not be recorded in both formats at once.
    CONSTRAINT response_single_answer_ck CHECK (
        NOT (selected_option_id IS NOT NULL AND numeric_answer IS NOT NULL)
    ),
    -- States that claim "answered" must actually carry an answer, and the
    -- blank states must not carry one.
    CONSTRAINT response_state_answer_ck CHECK (
        CASE
            WHEN state IN ('answered', 'answered_and_marked_review')
                THEN (selected_option_id IS NOT NULL OR numeric_answer IS NOT NULL)
            ELSE (selected_option_id IS NULL AND numeric_answer IS NULL)
        END
    )
);

CREATE INDEX attempt_responses_attempt_idx ON attempt_responses (attempt_id);
CREATE INDEX attempt_responses_section_idx ON attempt_responses (attempt_id, section_id);
CREATE INDEX attempt_responses_question_idx ON attempt_responses (question_id);

COMMENT ON TABLE attempt_responses IS
    'Per-question state machine: not_visited -> not_answered -> answered, '
    '+ marked_review variants. Also stores the grade and marks after submit.';

-- ---------------------------------------------------------------------------
-- 7. Section-wise score summary (one row per attempt per section)
-- ---------------------------------------------------------------------------
CREATE TABLE attempt_section_scores (
    attempt_id        uuid NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
    section_id        uuid NOT NULL REFERENCES test_sections(id) ON DELETE CASCADE,
    subject           subject_t    NOT NULL,
    score             numeric(6,2) NOT NULL,
    max_score         numeric(6,2) NOT NULL,   -- 25 * 4 = 100
    correct_count     smallint     NOT NULL,
    incorrect_count   smallint     NOT NULL,
    unattempted_count smallint     NOT NULL,
    accuracy_pct      numeric(5,2),            -- correct / attempted * 100
    PRIMARY KEY (attempt_id, section_id)
);

-- ---------------------------------------------------------------------------
-- 8. Timer heartbeat / audit log (optional but useful)
-- ---------------------------------------------------------------------------
-- The client pings every ~30 s; rows let you reconstruct a session after a
-- crash and detect suspicious clock behaviour.
CREATE TABLE attempt_heartbeats (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id        uuid NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
    beat_at           timestamptz NOT NULL DEFAULT now(),
    remaining_seconds integer     NOT NULL CHECK (remaining_seconds >= 0),
    current_question_id uuid REFERENCES questions(id) ON DELETE SET NULL
);

CREATE INDEX attempt_heartbeats_attempt_idx
    ON attempt_heartbeats (attempt_id, beat_at DESC);

COMMIT;
