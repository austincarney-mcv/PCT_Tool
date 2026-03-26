const { getDb } = require('../config/database');

const FIELDS = ['issue_id_text','issue_type','date_raised','raised_by','author',
  'description','priority','severity','risk_likelihood','status','last_updated','closure_date'];

function list(req, res) {
  const db = getDb();
  const { status } = req.query;
  let sql = 'SELECT * FROM risks WHERE project_id = ?';
  const params = [req.params.id];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY id';
  res.json(db.prepare(sql).all(...params));
}

function create(req, res) {
  const db = getDb();
  if (!req.body.description) return res.status(400).json({ error: 'description required' });
  const cols = ['project_id', ...FIELDS];
  const vals = [req.params.id, ...FIELDS.map(f => req.body[f] !== undefined ? req.body[f] : null)];
  const result = db.prepare(
    `INSERT INTO risks (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`
  ).run(...vals);
  res.status(201).json({ id: result.lastInsertRowid });
}

function update(req, res) {
  const db = getDb();
  const row = db.prepare('SELECT id FROM risks WHERE id = ? AND project_id = ?').get(req.params.rid, req.params.id);
  if (!row) return res.status(404).json({ error: 'Risk not found' });
  const sets = FIELDS.map(f => `${f} = ?`).join(', ');
  const vals = FIELDS.map(f => req.body[f] !== undefined ? req.body[f] : null);
  db.prepare(`UPDATE risks SET ${sets} WHERE id = ?`).run(...vals, req.params.rid);
  res.json({ ok: true });
}

function remove(req, res) {
  const db = getDb();
  const row = db.prepare('SELECT id FROM risks WHERE id = ? AND project_id = ?').get(req.params.rid, req.params.id);
  if (!row) return res.status(404).json({ error: 'Risk not found' });
  db.prepare('DELETE FROM risks WHERE id = ?').run(req.params.rid);
  res.json({ ok: true });
}

module.exports = { list, create, update, remove };
