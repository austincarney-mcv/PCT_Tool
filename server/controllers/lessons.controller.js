const { getDb } = require('../config/database');

const FIELDS = ['item_number','event_details','effect','cause','early_warnings',
  'previously_identified','future_recommendation','action_step_ref','action_details',
  'logged_by','logged_date','priority','status','responsible_person'];

function list(req, res) {
  const db = getDb();
  const { status } = req.query;
  let sql = 'SELECT * FROM lessons_learnt WHERE project_id = ?';
  const params = [req.params.id];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY id';
  res.json(db.prepare(sql).all(...params));
}

function create(req, res) {
  const db = getDb();
  if (!req.body.event_details) return res.status(400).json({ error: 'event_details required' });
  const cols = ['project_id', ...FIELDS];
  const vals = [req.params.id, ...FIELDS.map(f => {
    if (f === 'previously_identified') return req.body[f] ? 1 : 0;
    return req.body[f] !== undefined ? req.body[f] : null;
  })];
  const result = db.prepare(
    `INSERT INTO lessons_learnt (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`
  ).run(...vals);
  res.status(201).json({ id: result.lastInsertRowid });
}

function update(req, res) {
  const db = getDb();
  const row = db.prepare('SELECT id FROM lessons_learnt WHERE id = ? AND project_id = ?').get(req.params.lid, req.params.id);
  if (!row) return res.status(404).json({ error: 'Lesson not found' });
  const sets = FIELDS.map(f => `${f} = ?`).join(', ');
  const vals = FIELDS.map(f => {
    if (f === 'previously_identified') return req.body[f] ? 1 : 0;
    return req.body[f] !== undefined ? req.body[f] : null;
  });
  db.prepare(`UPDATE lessons_learnt SET ${sets} WHERE id = ?`).run(...vals, req.params.lid);
  res.json({ ok: true });
}

function remove(req, res) {
  const db = getDb();
  const row = db.prepare('SELECT id FROM lessons_learnt WHERE id = ? AND project_id = ?').get(req.params.lid, req.params.id);
  if (!row) return res.status(404).json({ error: 'Lesson not found' });
  db.prepare('DELETE FROM lessons_learnt WHERE id = ?').run(req.params.lid);
  res.json({ ok: true });
}

module.exports = { list, create, update, remove };
