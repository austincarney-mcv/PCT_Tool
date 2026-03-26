const fs = require('fs');
const path = require('path');
const { getDb } = require('../config/database');

function migrate() {
  const db = getDb();
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  // Split on semicolons, filter out blank/comment-only chunks
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => {
      if (!s.length) return false;
      // Strip comment lines, check if any real SQL remains
      const stripped = s.split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n')
        .trim();
      return stripped.length > 0;
    });

  const runMigrations = db.transaction(() => {
    for (const stmt of statements) {
      db.prepare(stmt).run();
    }
  });

  runMigrations();
  console.log('[migrate] Schema applied successfully.');
}

module.exports = { migrate };
