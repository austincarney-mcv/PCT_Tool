const { getDb } = require('../config/database');
const { calcRiskRating } = require('../config/constants');

const FIELDS = ['ref_number','element_activity','hazard','potential_harm',
  'likelihood','outcome','risk_rating','action_required','action_by','status','architect_notes','category'];

function list(req, res) {
  const db = getDb();
  const { status } = req.query;
  let sql = 'SELECT * FROM sid_hazards WHERE project_id = ?';
  const params = [req.params.id];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY category, id';
  res.json(db.prepare(sql).all(...params));
}

function create(req, res) {
  const db = getDb();
  if (!req.body.hazard) return res.status(400).json({ error: 'hazard required' });
  const body = { ...req.body };
  // Auto-calculate risk_rating if not provided
  if (!body.risk_rating && body.likelihood && body.outcome) {
    body.risk_rating = calcRiskRating(body.likelihood, body.outcome);
  }
  const cols = ['project_id', ...FIELDS];
  const vals = [req.params.id, ...FIELDS.map(f => body[f] !== undefined ? body[f] : null)];
  const result = db.prepare(
    `INSERT INTO sid_hazards (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`
  ).run(...vals);
  res.status(201).json({ id: result.lastInsertRowid });
}

function update(req, res) {
  const db = getDb();
  const row = db.prepare('SELECT id FROM sid_hazards WHERE id = ? AND project_id = ?').get(req.params.hid, req.params.id);
  if (!row) return res.status(404).json({ error: 'Hazard not found' });
  const body = { ...req.body };
  if (!body.risk_rating && body.likelihood && body.outcome) {
    body.risk_rating = calcRiskRating(body.likelihood, body.outcome);
  }
  const sets = FIELDS.map(f => `${f} = ?`).join(', ');
  const vals = FIELDS.map(f => body[f] !== undefined ? body[f] : null);
  db.prepare(`UPDATE sid_hazards SET ${sets} WHERE id = ?`).run(...vals, req.params.hid);
  res.json({ ok: true });
}

function remove(req, res) {
  const db = getDb();
  const row = db.prepare('SELECT id FROM sid_hazards WHERE id = ? AND project_id = ?').get(req.params.hid, req.params.id);
  if (!row) return res.status(404).json({ error: 'Hazard not found' });
  db.prepare('DELETE FROM sid_hazards WHERE id = ?').run(req.params.hid);
  res.json({ ok: true });
}

module.exports = { list, create, update, remove };
