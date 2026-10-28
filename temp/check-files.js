const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection(process.env.DATABASE_URL);
  const [cols] = await c.query("SHOW COLUMNS FROM File");
  console.log(cols.map(c => c.Field).join(','));
  const [rows] = await c.query("SELECT id, originalName, path, type, createdAt FROM File WHERE createdAt >= '2026-10-26' AND type='IMAGE' ORDER BY createdAt DESC LIMIT 200");
  let missing = [];
  for (const r of rows) {
    const res = await fetch('https://s3.infomania.ru' + r.path, { method: 'HEAD' });
    if (res.status !== 200) missing.push(`${res.status} ${r.createdAt.toISOString()} ${r.path} ${r.originalName}`);
  }
  console.log('checked', rows.length, 'missing', missing.length);
  console.log(missing.join('\n'));
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
