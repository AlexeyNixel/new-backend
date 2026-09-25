require('dotenv').config();
const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({host:process.env.SOURCE_DB_HOST,port:+process.env.SOURCE_DB_PORT,user:process.env.SOURCE_DB_USERNAME,password:process.env.SOURCE_DB_PASSWORD});
  const S='db_noub_new', T='nomb_dev';
  const q=async(s)=>(await c.query(s))[0];
  const rows = await q(`SELECT sf.id, sf.hash, sf.path, sf.type, LENGTH(sf.mimeType) ml, LENGTH(sf.originalName) nl, sf.createdAt,
      th.id tgtIdSameHash, th.path tgtPathSameHash
    FROM ${S}.Entry e JOIN ${S}.File sf ON sf.id=e.fileId
    LEFT JOIN ${T}.files f ON f.id=e.fileId
    LEFT JOIN ${T}.files th ON th.hash=sf.hash
    WHERE f.id IS NULL`);
  console.log(rows.length, 'withHashConflict', rows.filter(r=>r.tgtIdSameHash).length);
  console.log(rows.slice(0,3));
  console.log('long name/mime', rows.filter(r=>r.ml>50||r.nl>200).length);
  console.log('all source files missing in target', await q(`SELECT COUNT(*) n, SUM(EXISTS(SELECT 1 FROM ${T}.files th WHERE th.hash=sf.hash)) hashConflict FROM ${S}.File sf LEFT JOIN ${T}.files f ON f.id=sf.id WHERE f.id IS NULL`));
  await c.end();
})().catch(e=>{console.error(e.message);process.exit(1)});
