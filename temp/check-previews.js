require('dotenv').config();
const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({host:process.env.SOURCE_DB_HOST,port:+process.env.SOURCE_DB_PORT,user:process.env.SOURCE_DB_USERNAME,password:process.env.SOURCE_DB_PASSWORD});
  const S='db_noub_new', T='nomb_dev', D='aa8c3d9e-f7de-44cc-8391-b6e7f8782ce3';
  const q=async(s)=>(await c.query(s))[0];
  console.log('files src/tgt', await q(`SELECT (SELECT COUNT(*) FROM ${S}.File) src,(SELECT COUNT(*) FROM ${T}.files) tgt`));
  console.log('default file exists', await q(`SELECT id,path FROM ${T}.files WHERE id='${D}'`));
  console.log('posts by preview', await q(`SELECT
    SUM(p.previewFileId='${D}') onDefault,
    SUM(p.previewFileId IS NULL) nullPreview,
    SUM(p.previewFileId<>'${D}') ownPreview,
    COUNT(*) total FROM ${T}.posts p`));
  console.log('fixable (default now, old has file, file exists in target)', await q(`SELECT COUNT(*) n FROM ${T}.posts p JOIN ${S}.Entry e ON e.id=p.id JOIN ${T}.files f ON f.id=e.fileId WHERE p.previewFileId='${D}' OR p.previewFileId IS NULL`));
  console.log('old has fileId but missing in target files', await q(`SELECT COUNT(*) n FROM ${S}.Entry e LEFT JOIN ${T}.files f ON f.id=e.fileId WHERE e.fileId IS NOT NULL AND f.id IS NULL`));
  console.log('old without fileId', await q(`SELECT COUNT(*) n FROM ${S}.Entry WHERE fileId IS NULL`));
  console.log('mismatch own preview != old', await q(`SELECT COUNT(*) n FROM ${T}.posts p JOIN ${S}.Entry e ON e.id=p.id WHERE p.previewFileId<>'${D}' AND e.fileId IS NOT NULL AND p.previewFileId<>e.fileId`));
  console.log('sample', await q(`SELECT e.id,e.fileId,f.path,f.variants FROM ${S}.Entry e JOIN ${T}.files f ON f.id=e.fileId LIMIT 2`));
  await c.end();
})().catch(e=>{console.error(e.message);process.exit(1)});
