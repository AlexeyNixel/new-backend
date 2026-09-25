require('dotenv').config();
const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({host:process.env.SOURCE_DB_HOST,port:+process.env.SOURCE_DB_PORT,user:process.env.SOURCE_DB_USERNAME,password:process.env.SOURCE_DB_PASSWORD});
  const S='db_noub_new', T='nomb_dev';
  const q=async(s)=>(await c.query(s))[0];
  console.log('source links', await q(`SELECT COUNT(*) n FROM ${S}.RubricsOnEntries`));
  console.log('target links', await q(`SELECT COUNT(*) n FROM ${T}.tags_on_posts`));
  console.log('source cols', await q(`SHOW COLUMNS FROM ${S}.RubricsOnEntries`));
  console.log('already present', await q(`SELECT COUNT(*) n FROM ${S}.RubricsOnEntries r JOIN ${T}.tags_on_posts t ON t.postId=r.entryId AND t.tagId=r.rubricId`));
  console.log('missing post', await q(`SELECT COUNT(*) n FROM ${S}.RubricsOnEntries r LEFT JOIN ${T}.posts p ON p.id=r.entryId WHERE p.id IS NULL`));
  console.log('missing tag', await q(`SELECT COUNT(*) n FROM ${S}.RubricsOnEntries r LEFT JOIN ${T}.tags g ON g.id=r.rubricId WHERE g.id IS NULL`));
  console.log('tags src/target', await q(`SELECT (SELECT COUNT(*) FROM ${S}.Rubric) src,(SELECT COUNT(*) FROM ${T}.tags) tgt`));
  console.log('posts src/target', await q(`SELECT (SELECT COUNT(*) FROM ${S}.Entry) src,(SELECT COUNT(*) FROM ${T}.posts) tgt`));
  await c.end();
})().catch(e=>{console.error(e.message);process.exit(1)});
