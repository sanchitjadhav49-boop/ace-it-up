\pset pager off
\echo -- USERS --
SELECT column_name, data_type FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position;
\echo -- ATTEMPTS --
SELECT column_name, data_type FROM information_schema.columns WHERE table_name='attempts' ORDER BY ordinal_position;
\echo -- TESTS --
SELECT column_name, data_type FROM information_schema.columns WHERE table_name='tests' ORDER BY ordinal_position;
\echo -- COUNTS --
SELECT (SELECT count(*) FROM users) AS users, (SELECT count(*) FROM attempts) AS attempts, (SELECT count(*) FROM tests) AS tests;
\echo -- RECENT SAMPLE --
SELECT email, full_name FROM users ORDER BY id DESC LIMIT 3;
