const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/aceitup',
});

(async () => {
  const client = await pool.connect();
  try {
    console.log('Updating error_tags table constraint to allow \'skip\' option...');
    
    // Drop the old constraint and add the new one
    await client.query('BEGIN');
    
    // Drop the old CHECK constraint
    await client.query(`
      ALTER TABLE error_tags DROP CONSTRAINT error_tags_error_tag_check;
    `);
    
    // Add the new CHECK constraint that includes 'skip'
    await client.query(`
      ALTER TABLE error_tags ADD CONSTRAINT error_tags_error_tag_check CHECK (
        error_tag IN ('correct', 'concept', 'silly', 'reading', 'application', 'time', 'guess', 'recall', 'skip')
      );
    `);
    
    await client.query('COMMIT');
    console.log('✓ Successfully updated error_tags constraint to allow \'skip\' option');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('✗ Error updating constraint:', err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
})();
