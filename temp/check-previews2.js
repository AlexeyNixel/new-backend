require('dotenv').config();
const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({host:process.env.SOURCE_DB_HOST,port:+process.env.SOURCE_DB_PORT,user:process.env.SOURCE_DB_USERNAME,password:process.env.SOURCE_DB_PASSWORD});
  const S='db_noub_new', T='nomb_dev', D='aa8c3d9e-f7de-44cc-8391-b6e7f8782ce3';
  const q=async(s)=>(await c.query(s))[0];
  console.log('latest 15 posts target', await q(`SELECT p.publishedAt, p.createdAt, LEFT(p.title,40) t, p.previewFileId=('${D}') def, e.fileId oldFile, (SELECT COUNT(*) FROM ${S}.File sf WHERE sf.id=e.fileId) inSrcFile, (SELECT COUNT(*) FROM ${T}.files tf WHERE tf.id=e.fileId) inTgtFile, LENGTH(p.content) len FROM ${T}.posts p LEFT JOIN ${S}.Entry e ON e.id=p.id ORDER BY p.publishedAt DESC LIMIT 15`));
  console.log('default by year', await q(`SELECT YEAR(publishedAt) y, SUM(previewFileId='${D}') def, COUNT(*) n FROM ${T}.posts GROUP BY y ORDER BY y DESC`));
  console.log('28 missing: exist in source File?', await q(`SELECT COUNT(*) n, SUM(sf.id IS NOT NULL) inSrc FROM ${S}.Entry e LEFT JOIN ${T}.files f ON f.id=e.fileId LEFT JOIN ${S}.File sf ON sf.id=e.fileId WHERE e.fileId IS NOT NULL AND f.id IS NULL`));
  console.log('Entry columns', (await q(`SHOW COLUMNS FROM ${S}.Entry`)).map(r=>r.Field).join(','));
  console.log('posts in target not in source', await q(`SELECT p.id, p.title, p.createdAt FROM ${T}.posts p LEFT JOIN ${S}.Entry e ON e.id=p.id WHERE e.id IS NULL`));
  await c.end();
})().catch(e=>{console.error(e.message);process.exit(1)});
