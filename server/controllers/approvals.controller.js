const { getDb } = require('../config/database');

const FIELDS = ['item_number','description','legislation','authority','application_id',
  'current_status','date_lodged','date_paid','date_properly_made','rfi_date','rfi_response',
  'expected_date','next_step','responsible_person','due_date','complete','category','sort_order'];

function list(req, res) {
  const db = getDb();
  res.json(db.prepare(
    'SELECT * FROM approvals WHERE project_id = ? ORDER BY sort_order, id'
  ).all(req.params.id));
}

function create(req, res) {
  const db = getDb();
  if (!req.body.description) return res.status(400).json({ error: 'description required' });
  const cols = ['project_id', ...FIELDS];
  const vals = [req.params.id, ...FIELDS.map(f => {
    if (f === 'complete') return req.body[f] ? 1 : 0;
    return req.body[f] !== undefined ? req.body[f] : null;
  })];
  const result = db.prepare(
    `INSERT INTO approvals (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`
  ).run(...vals);
  res.status(201).json({ id: result.lastInsertRowid });
}

function update(req, res) {
  const db = getDb();
  const row = db.prepare('SELECT id FROM approvals WHERE id = ? AND project_id = ?').get(req.params.aid, req.params.id);
  if (!row) return res.status(404).json({ error: 'Approval not found' });
  const sets = FIELDS.map(f => `${f} = ?`).join(', ');
  const vals = FIELDS.map(f => {
    if (f === 'complete') return req.body[f] ? 1 : 0;
    return req.body[f] !== undefined ? req.body[f] : null;
  });
  db.prepare(`UPDATE approvals SET ${sets} WHERE id = ?`).run(...vals, req.params.aid);
  res.json({ ok: true });
}

function remove(req, res) {
  const db = getDb();
  const row = db.prepare('SELECT id FROM approvals WHERE id = ? AND project_id = ?').get(req.params.aid, req.params.id);
  if (!row) return res.status(404).json({ error: 'Approval not found' });
  db.prepare('DELETE FROM approvals WHERE id = ?').run(req.params.aid);
  res.json({ ok: true });
}

function toggleComplete(req, res) {
  const db = getDb();
  const row = db.prepare('SELECT id, complete FROM approvals WHERE id = ? AND project_id = ?').get(req.params.aid, req.params.id);
  if (!row) return res.status(404).json({ error: 'Approval not found' });
  const newVal = row.complete ? 0 : 1;
  db.prepare('UPDATE approvals SET complete = ? WHERE id = ?').run(newVal, req.params.aid);
  res.json({ complete: newVal });
}

module.exports = { list, create, update, remove, toggleComplete };
