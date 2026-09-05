'use strict';
// scripts/seed_all_live_tests.js
// Helper to run all seeding steps required to publish the five previous-year
// papers and the three custom JSON tests to a live database. Intended to be
// executed in the backend repo with DATABASE_URL set in the environment.
// Usage (on the server / CI):
//   DATABASE_URL=postgres://user:pass@host:5432/db npm run seed:live

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function run(cmd, args, opts) {
  console.log('\n$ ' + [cmd].concat(args || []).join(' '));
  const r = spawnSync(cmd, args || [], Object.assign({ stdio: 'inherit', env: process.env, cwd: process.cwd() }, opts || {}));
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`Command failed: ${cmd} ${args ? args.join(' ') : ''} (exit ${r.status})`);
}

function main() {
  // Basic sanity: ensure DATABASE_URL present
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is not set. Aborting.');
    process.exit(2);
  }

  // Ensure node scripts exist
  const required = [
    path.join(__dirname, '..', 'seed_previous_year_papers.js'),
    path.join(__dirname, '..', 'seed_custom_test.js'),
  ];
  for (const f of required) {
    if (!fs.existsSync(f)) {
      console.error(`ERROR: required seed script missing: ${f}`);
      process.exit(3);
    }
  }

  try {
    // 1) Seed the five previous-year papers (paper1..paper5) from papers_2026/
    run(process.execPath, [path.join('seed_previous_year_papers.js')]);

    // 2) Seed all custom JSON tests found in tests/
    // This is intentionally name-agnostic so a file like
    // custom_moderate_testA.json or custom_moderate_test_A.json is still included.
    const testsDir = path.join(process.cwd(), 'tests');
    const customFiles = fs.existsSync(testsDir)
      ? fs.readdirSync(testsDir)
          .filter((fname) => /^custom_.*test.*\.json$/i.test(fname))
          .sort()
      : [];

    if (customFiles.length === 0) {
      console.warn(`Warning: no custom test JSON files found in ${testsDir}`);
    }

    for (const fname of customFiles) {
      const full = path.join(testsDir, fname);
      run(process.execPath, [path.join('seed_custom_test.js'), full]);
    }

    console.log('\nAll seed operations completed successfully.');
  } catch (err) {
    console.error('\nSeeding failed:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

if (require.main === module) main();
