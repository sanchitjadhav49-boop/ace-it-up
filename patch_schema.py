import io

path = r"C:\Users\sanch\ace it up\jee_mock_test_schema.sql"
with io.open(path, "r", encoding="utf-8") as f:
    content = f.read()

pairs = []

# 1) Header design notes
pairs.append((
"""--   * Marking scheme (stored per question, defaults to the JEE rules):
--       +4 correct, -1 wrong MCQ, -1 wrong numerical, 0 unattempted.
""",
"""--   * Marking scheme (stored per question, defaults to the JEE rules):
--       +4 correct, -1 wrong MCQ, -1 wrong numerical, 0 unattempted.
--   * Rich content: every question stem and every option may carry an
--     optional LaTeX formula, and every question may have one or more
--     attached images (diagrams / figures).
"""))

# 2) questions table: formula column
pairs.append((
"""    body              TEXT NOT NULL,
    correct_option_id BIGINT,              -- MCQ only (validated by trigger)
""",
"""    body              TEXT NOT NULL,
    formula           TEXT,                -- LaTeX for the stem (optional)
    correct_option_id BIGINT,              -- MCQ only (validated by trigger)
"""))

# 3) question_options: formula column
pairs.append((
"""    body        TEXT NOT NULL,
    position    SMALLINT NOT NULL CHECK (position BETWEEN 1 AND 4),
""",
"""    body        TEXT NOT NULL,
    formula     TEXT,                      -- LaTeX for the option (optional)
    position    SMALLINT NOT NULL CHECK (position BETWEEN 1 AND 4),
"""))

# 4) New question_images table after question_options
pairs.append((
"""    UNIQUE (question_id, position)
);

-- ---------------------------------------------------------------------------
-- ATTEMPTS  (one attempt = one sitting of one test by one user)
""",
"""    UNIQUE (question_id, position)
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
"""))

# 5) Index for question_images
pairs.append((
"""CREATE INDEX idx_options_question     ON question_options (question_id);
""",
"""CREATE INDEX idx_options_question     ON question_options (question_id);
CREATE INDEX idx_question_images_question ON question_images (question_id);
"""))

# 6) Publish validator: MCQ options must have body or formula
pairs.append((
"""    SELECT count(*) INTO incomplete
      FROM questions q
      LEFT JOIN LATERAL (
          SELECT count(*) AS n FROM question_options o WHERE o.question_id = q.id
      ) oc ON TRUE
     WHERE q.section_id IN (SELECT id FROM sections WHERE test_id = p_test_id)
       AND ( (q.question_type = 'mcq'
              AND (oc.n IS DISTINCT FROM 4 OR q.correct_option_id IS NULL))
          OR (q.question_type = 'numerical' AND q.correct_answer IS NULL) );
""",
"""    SELECT count(*) INTO incomplete
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
"""))

# 7) Sample data: image + formula example
pairs.append((
"""UPDATE questions SET correct_option_id = 2 WHERE id = 1;  -- 'Newton'
""",
"""UPDATE questions SET correct_option_id = 2 WHERE id = 1;  -- 'Newton'

-- Optional media for a question: an attached diagram and/or a LaTeX stem
INSERT INTO question_images (question_id, image_url, caption) VALUES
    (1, 'https://cdn.example.com/q1.png', 'Free-body diagram');

UPDATE questions SET formula = 'F = m \\\\cdot a' WHERE id = 1;
"""))

for old, new in pairs:
    count = content.count(old)
    assert count == 1, "pattern found %d times (expected 1): %r" % (count, old[:60])
    content = content.replace(old, new, 1)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK: applied %d patches" % len(pairs))
