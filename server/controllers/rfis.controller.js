const { getDb } = require('../config/database');

const FIELDS = ['rfi_number','description','date_received','client_deadline',
  'outstanding_action','status','closed_date','eot_ref','var_ref'];

function list(req, res) {
  const db = getDb();
  const { status } = req.query;
  let sql = 'SELECT * FROM rfis WHERE project_id = ?';
  const params = [req.params.id];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY rfi_number';
  res.json(db.prepare(sql).all(...params));
}

function create(req, res) {
  const db = getDb();
  if (!req.body.rfi_number) return res.status(400).json({ error: 'rfi_number required' });
  const cols = ['project_id', ...FIELDS];
  const vals = [req.params.id, ...FIELDS.map(f => req.body[f] !== undefined ? req.body[f] : null)];
  const result = db.prepare(
    `INSERT INTO rfis (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`
  ).run(...vals);
  res.status(201).json({ id: result.lastInsertRowid });
}

function update(req, res) {
  const db = getDb();
  const row = db.prepare('SELECT id FROM rfis WHERE id = ? AND project_id = ?').get(req.params.rfid, req.params.id);
  if (!row) return res.status(404).json({ error: 'RFI not found' });
  const sets = FIELDS.map(f => `${f} = ?`).join(', ');
  const vals = FIELDS.map(f => req.body[f] !== undefined ? req.body[f] : null);
  db.prepare(`UPDATE rfis SET ${sets} WHERE id = ?`).run(...vals, req.params.rfid);
  res.json({ ok: true });
}

function remove(req, res) {
  const db = getDb();
  const row = db.prepare('SELECT id FROM rfis WHERE id = ? AND project_id = ?').get(req.params.rfid, req.params.id);
  if (!row) return res.status(404).json({ error: 'RFI not found' });
  db.prepare('DELETE FROM rfis WHERE id = ?').run(req.params.rfid);
  res.json({ ok: true });
}

module.exports = { list, create, update, remove };
