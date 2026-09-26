require('dotenv').config();
const mysql = require('mysql2/promise');
const D='aa8c3d9e-f7de-44cc-8391-b6e7f8782ce3';
(async () => {
  const src = await mysql.createConnection({host:process.env.SOURCE_DB_HOST,port:+process.env.SOURCE_DB_PORT,user:process.env.SOURCE_DB_USERNAME,password:process.env.SOURCE_DB_PASSWORD,database:process.env.SOURCE_DB_NAME});
  const tgt = await mysql.createConnection({uri:process.env.DATABASE_URL});
  const s=async(q,p)=>(await src.query(q,p))[0], t=async(q,p)=>(await tgt.query(q,p))[0];
  console.log('target db', await t('SELECT DATABASE() db, @@hostname h'));
  const srcFiles = await s('SELECT id FROM File');
  const tgtFiles = new Set((await t('SELECT id FROM files')).map(r=>r.id));
  const missingFiles = srcFiles.filter(r=>!tgtFiles.has(r.id));
  console.log('files src', srcFiles.length, 'tgt', tgtFiles.size, 'src missing in tgt', missingFiles.length);
  console.log('last file createdAt src/tgt', await s('SELECT MAX(createdAt) m FROM File'), await t('SELECT MAX(createdAt) m FROM files'));
  const entries = await s('SELECT id, fileId FROM Entry');
  const posts = new Map((await t('SELECT id, previewFileId p FROM posts')).map(r=>[r.id,r.p]));
  let notMigrated=0, onDefault=0, fixable=0, fileMissing=0, noOldFile=0, mismatch=0;
  for (const e of entries) {
    if (!posts.has(e.id)) { notMigrated++; continue; }
    const p = posts.get(e.id);
    if (p===D || p===null) { onDefault++; if(!e.fileId) noOldFile++; else if (tgtFiles.has(e.fileId)) fixable++; else fileMissing++; }
    else if (e.fileId && p!==e.fileId) mismatch++;
  }
  console.log({entries: entries.length, postsTgt: posts.size, notMigrated, onDefault, noOldFile, fixable, fileMissing, mismatch});
  console.log('default file in target', await t('SELECT id FROM files WHERE id=?',[D]));
  await src.end(); await tgt.end();
})().catch(e=>{console.error(e.message);process.exit(1)});
