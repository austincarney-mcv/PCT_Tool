const { getDb } = require('../config/database');

const FIELDS = ['file_ref','job_ref','item_number','description','date','who',
  'team','value_amount','communicated_date','communicated_how','approved'];

function list(req, res) {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM value_log WHERE project_id = ? ORDER BY date, id').all(req.params.id));
}

function create(req, res) {
  const db = getDb();
  if (!req.body.description) return res.status(400).json({ error: 'description required' });
  const cols = ['project_id', ...FIELDS];
  const vals = [req.params.id, ...FIELDS.map(f => {
    if (f === 'approved') return req.body[f] ? 1 : 0;
    if (f === 'value_amount') return req.body[f] || 0;
    return req.body[f] !== undefined ? req.body[f] : null;
  })];
  const result = db.prepare(
    `INSERT INTO value_log (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`
  ).run(...vals);
  res.status(201).json({ id: result.lastInsertRowid });
}

function update(req, res) {
  const db = getDb();
  const row = db.prepare('SELECT id FROM value_log WHERE id = ? AND project_id = ?').get(req.params.vid, req.params.id);
  if (!row) return res.status(404).json({ error: 'Entry not found' });
  const sets = FIELDS.map(f => `${f} = ?`).join(', ');
  const vals = FIELDS.map(f => {
    if (f === 'approved') return req.body[f] ? 1 : 0;
    if (f === 'value_amount') return req.body[f] || 0;
    return req.body[f] !== undefined ? req.body[f] : null;
  });
  db.prepare(`UPDATE value_log SET ${sets} WHERE id = ?`).run(...vals, req.params.vid);
  res.json({ ok: true });
}

function remove(req, res) {
  const db = getDb();
  const row = db.prepare('SELECT id FROM value_log WHERE id = ? AND project_id = ?').get(req.params.vid, req.params.id);
  if (!row) return res.status(404).json({ error: 'Entry not found' });
  db.prepare('DELETE FROM value_log WHERE id = ?').run(req.params.vid);
  res.json({ ok: true });
}

module.exports = { list, create, update, remove };
