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
  alterV2(db);
  console.log('[migrate] Schema applied successfully.');
}

function alterV2(db) {
  const cols = [
    `ALTER TABLE c2c_snapshots ADD COLUMN submission_status TEXT NOT NULL DEFAULT 'draft' CHECK (submission_status IN ('draft','submitted'))`,
    `ALTER TABLE c2c_snapshots ADD COLUMN submitted_at TEXT`,
    `ALTER TABLE c2c_snapshots ADD COLUMN submitted_by TEXT`,
    `ALTER TABLE c2c_snapshots ADD COLUMN unlock_reason TEXT`,
  ]
  for (const sql of cols) {
    try { db.prepare(sql).run() } catch (e) {
      if (!e.message.includes('duplicate column name')) throw e
    }
  }
}

module.exports = { migrate, alterV2 };
