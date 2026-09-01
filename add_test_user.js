// add_test_user.js - inserts a test user if not present
'use strict';
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const email = process.env.TEST_USER_EMAIL || 'testuser@example.com';
  const fullName = process.env.TEST_USER_FULLNAME || 'Test User';
  const rawPassword = process.env.TEST_USER_PASSWORD || 'TestPass123!';

  const client = await pool.connect();
  try {
    // check existing
    const r = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (r.rows.length > 0) {
      console.log(`User already exists: ${email} (id ${r.rows[0].id})`);
      return;
    }
    const hash = await bcrypt.hash(rawPassword, 10);
    const res = await client.query(
      `INSERT INTO users (email, full_name, password_hash) VALUES ($1, $2, $3) RETURNING id`,
      [email, fullName, hash]
    );
    console.log(`Created user ${email} with id ${res.rows[0].id}`);
    console.log('Credentials:');
    console.log(`  email: ${email}`);
    console.log(`  password: ${rawPassword}`);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) main();