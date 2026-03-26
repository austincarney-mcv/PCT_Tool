const { getDb } = require('../config/database');

function list(req, res) {
  const db = getDb();
  const { discipline } = req.query;
  let sql = 'SELECT * FROM drawings WHERE project_id = ?';
  const params = [req.params.id];
  if (discipline) { sql += ' AND discipline = ?'; params.push(discipline); }
  sql += ' ORDER BY discipline, sort_order, drawing_number';
  res.json(db.prepare(sql).all(...params));
}

function create(req, res) {
  const db = getDb();
  const { discipline, series, drawing_number, drawing_title, scale,
    issue_1_date, issue_2_date, issue_3_date, issue_4_date, issue_5_date,
    complete_pct, residual_pct, primary_purpose, procurement_flag, ifc_flag, sort_order } = req.body;
  if (!discipline || !drawing_number || !drawing_title) {
    return res.status(400).json({ error: 'discipline, drawing_number, drawing_title required' });
  }
  const result = db.prepare(`
    INSERT INTO drawings (project_id, discipline, series, drawing_number, drawing_title, scale,
      issue_1_date, issue_2_date, issue_3_date, issue_4_date, issue_5_date,
      complete_pct, residual_pct, primary_purpose, procurement_flag, ifc_flag, sort_order)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(req.params.id, discipline, series||null, drawing_number, drawing_title, scale||null,
    issue_1_date||null, issue_2_date||null, issue_3_date||null, issue_4_date||null, issue_5_date||null,
    complete_pct||0, residual_pct||0, primary_purpose||null,
    procurement_flag?1:0, ifc_flag?1:0, sort_order||0);
  res.status(201).json({ id: result.lastInsertRowid });
}

function update(req, res) {
  const db = getDb();
  const row = db.prepare('SELECT id FROM drawings WHERE id = ? AND project_id = ?').get(req.params.did, req.params.id);
  if (!row) return res.status(404).json({ error: 'Drawing not found' });
  const fields = ['discipline','series','drawing_number','drawing_title','scale',
    'issue_1_date','issue_2_date','issue_3_date','issue_4_date','issue_5_date',
    'complete_pct','residual_pct','primary_purpose','procurement_flag','ifc_flag','sort_order'];
  const sets = fields.map(f => `${f} = ?`).join(', ');
  const vals = fields.map(f => {
    if (f === 'procurement_flag' || f === 'ifc_flag') return req.body[f] ? 1 : 0;
    return req.body[f] !== undefined ? req.body[f] : null;
  });
  db.prepare(`UPDATE drawings SET ${sets} WHERE id = ?`).run(...vals, req.params.did);
  res.json({ ok: true });
}

function remove(req, res) {
  const db = getDb();
  const row = db.prepare('SELECT id FROM drawings WHERE id = ? AND project_id = ?').get(req.params.did, req.params.id);
  if (!row) return res.status(404).json({ error: 'Drawing not found' });
  db.prepare('DELETE FROM drawings WHERE id = ?').run(req.params.did);
  res.json({ ok: true });
}

function reorder(req, res) {
  const db = getDb();
  const { items } = req.body; // [{id, sort_order}]
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items array required' });
  const stmt = db.prepare('UPDATE drawings SET sort_order = ? WHERE id = ? AND project_id = ?');
  const run = db.transaction(() => items.forEach(({ id, sort_order }) => stmt.run(sort_order, id, req.params.id)));
  run();
  res.json({ ok: true });
}

module.exports = { list, create, update, remove, reorder };
