const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@localhost:5432/aceitup' });
pool.query('select id, email, full_name, (password_hash is not null) as has_pw from users order by id')
  .then((r) => {
    for (const row of r.rows) console.log(row.id, row.email, '|', row.full_name, '| has_pw=' + row.has_pw);
    return pool.end();
  })
  .catch((e) => { console.error('ERR', e.message); process.exit(1); });
