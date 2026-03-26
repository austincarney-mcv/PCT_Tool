const { getDb } = require('../config/database');

const FIELDS = ['item_number','details','agreed_strategy','action_step','responsible_person',
  'action_date','date_raised','resolution_required_date','date_resolved','status',
  'deliverable_affected','initiator_group'];

function list(req, res) {
  const db = getDb();
  const { status } = req.query;
  let sql = 'SELECT * FROM critical_items WHERE project_id = ?';
  const params = [req.params.id];
  if (status) { sql += ' AND status = ?'; params.push(status.toUpperCase()); }
  sql += ' ORDER BY initiator_group, id';
  res.json(db.prepare(sql).all(...params));
}

function create(req, res) {
  const db = getDb();
  if (!req.body.details) return res.status(400).json({ error: 'details required' });
  const cols = ['project_id', ...FIELDS];
  const vals = [req.params.id, ...FIELDS.map(f => req.body[f] !== undefined ? req.body[f] : (f === 'status' ? 'OPEN' : null))];
  const result = db.prepare(
    `INSERT INTO critical_items (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`
  ).run(...vals);
  res.status(201).json({ id: result.lastInsertRowid });
}

function update(req, res) {
  const db = getDb();
  const row = db.prepare('SELECT id FROM critical_items WHERE id = ? AND project_id = ?').get(req.params.cid, req.params.id);
  if (!row) return res.status(404).json({ error: 'Item not found' });
  const sets = FIELDS.map(f => `${f} = ?`).join(', ');
  const vals = FIELDS.map(f => req.body[f] !== undefined ? req.body[f] : null);
  db.prepare(`UPDATE critical_items SET ${sets} WHERE id = ?`).run(...vals, req.params.cid);
  res.json({ ok: true });
}

function remove(req, res) {
  const db = getDb();
  const row = db.prepare('SELECT id FROM critical_items WHERE id = ? AND project_id = ?').get(req.params.cid, req.params.id);
  if (!row) return res.status(404).json({ error: 'Item not found' });
  db.prepare('DELETE FROM critical_items WHERE id = ?').run(req.params.cid);
  res.json({ ok: true });
}

function toggleStatus(req, res) {
  const db = getDb();
  const row = db.prepare('SELECT id, status FROM critical_items WHERE id = ? AND project_id = ?').get(req.params.cid, req.params.id);
  if (!row) return res.status(404).json({ error: 'Item not found' });
  const newStatus = row.status === 'OPEN' ? 'CLOSED' : 'OPEN';
  db.prepare('UPDATE critical_items SET status = ? WHERE id = ?').run(newStatus, req.params.cid);
  res.json({ status: newStatus });
}

module.exports = { list, create, update, remove, toggleStatus };
