const { getDb } = require('../config/database');

const FIELDS = ['spec_number','location','clause','brief_item','discipline',
  'compliant','deviation','comments','client_response','counter_response','source_document'];

const BOOL_FIELDS = ['compliant','deviation'];

function list(req, res) {
  const db = getDb();
  const { discipline } = req.query;
  let sql = 'SELECT * FROM brief_compliance WHERE project_id = ?';
  const params = [req.params.id];
  if (discipline) { sql += ' AND discipline = ?'; params.push(discipline); }
  sql += ' ORDER BY discipline, id';
  res.json(db.prepare(sql).all(...params));
}

function create(req, res) {
  const db = getDb();
  if (!req.body.brief_item) return res.status(400).json({ error: 'brief_item required' });
  const cols = ['project_id', ...FIELDS];
  const vals = [req.params.id, ...FIELDS.map(f => {
    if (BOOL_FIELDS.includes(f)) return req.body[f] ? 1 : 0;
    return req.body[f] !== undefined ? req.body[f] : null;
  })];
  const result = db.prepare(
    `INSERT INTO brief_compliance (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`
  ).run(...vals);
  res.status(201).json({ id: result.lastInsertRowid });
}

function update(req, res) {
  const db = getDb();
  const row = db.prepare('SELECT id FROM brief_compliance WHERE id = ? AND project_id = ?').get(req.params.bcid, req.params.id);
  if (!row) return res.status(404).json({ error: 'Item not found' });
  const sets = FIELDS.map(f => `${f} = ?`).join(', ');
  const vals = FIELDS.map(f => {
    if (BOOL_FIELDS.includes(f)) return req.body[f] ? 1 : 0;
    return req.body[f] !== undefined ? req.body[f] : null;
  });
  db.prepare(`UPDATE brief_compliance SET ${sets} WHERE id = ?`).run(...vals, req.params.bcid);
  res.json({ ok: true });
}

function remove(req, res) {
  const db = getDb();
  const row = db.prepare('SELECT id FROM brief_compliance WHERE id = ? AND project_id = ?').get(req.params.bcid, req.params.id);
  if (!row) return res.status(404).json({ error: 'Item not found' });
  db.prepare('DELETE FROM brief_compliance WHERE id = ?').run(req.params.bcid);
  res.json({ ok: true });
}

module.exports = { list, create, update, remove };
