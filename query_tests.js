const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
(async function(){
  try{
    const res = await pool.query('SELECT id, title, created_at FROM tests ORDER BY id');
    console.log(JSON.stringify(res.rows, null, 2));
  }catch(err){
    console.error('ERROR', err.message || err);
    process.exitCode=1;
  }finally{
    await pool.end();
  }
})();