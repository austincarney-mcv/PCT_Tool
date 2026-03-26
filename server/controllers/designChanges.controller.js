const { getDb } = require('../config/database');

const FIELDS = ['item_number','date_requested','change_type','initiator_name','discipline',
  'change_details','reason','area_location','document_reference','variation_reference','status',
  'client_cost_impact','risk_assessment_change','client_comments',
  'arch_fees','struc_fees','civil_fees','hyd_fees','certifier_fees',
  'lscape_fees','fire_eng_fees','fire_services_fees','builder_dm_fees','initiator_group'];

const BOOL_FIELDS = ['client_cost_impact','risk_assessment_change'];
const FEE_FIELDS = ['arch_fees','struc_fees','civil_fees','hyd_fees','certifier_fees',
  'lscape_fees','fire_eng_fees','fire_services_fees','builder_dm_fees'];

function list(req, res) {
  const db = getDb();
  const { change_type } = req.query;
  let sql = 'SELECT * FROM design_changes WHERE project_id = ?';
  const params = [req.params.id];
  if (change_type) { sql += ' AND change_type = ?'; params.push(change_type); }
  sql += ' ORDER BY initiator_group, id';
  res.json(db.prepare(sql).all(...params));
}

function feeSummary(req, res) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT
      SUM(arch_fees) as arch_fees, SUM(struc_fees) as struc_fees,
      SUM(civil_fees) as civil_fees, SUM(hyd_fees) as hyd_fees,
      SUM(certifier_fees) as certifier_fees, SUM(lscape_fees) as lscape_fees,
      SUM(fire_eng_fees) as fire_eng_fees, SUM(fire_services_fees) as fire_services_fees,
      SUM(builder_dm_fees) as builder_dm_fees
    FROM design_changes WHERE project_id = ?
  `).get(req.params.id);
  res.json(rows);
}

function create(req, res) {
  const db = getDb();
  const cols = ['project_id', ...FIELDS];
  const vals = [req.params.id, ...FIELDS.map(f => {
    if (BOOL_FIELDS.includes(f)) return req.body[f] ? 1 : 0;
    if (FEE_FIELDS.includes(f)) return req.body[f] || 0;
    return req.body[f] !== undefined ? req.body[f] : null;
  })];
  const result = db.prepare(
    `INSERT INTO design_changes (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`
  ).run(...vals);
  res.status(201).json({ id: result.lastInsertRowid });
}

function update(req, res) {
  const db = getDb();
  const row = db.prepare('SELECT id FROM design_changes WHERE id = ? AND project_id = ?').get(req.params.dcid, req.params.id);
  if (!row) return res.status(404).json({ error: 'Design change not found' });
  const sets = FIELDS.map(f => `${f} = ?`).join(', ');
  const vals = FIELDS.map(f => {
    if (BOOL_FIELDS.includes(f)) return req.body[f] ? 1 : 0;
    if (FEE_FIELDS.includes(f)) return req.body[f] || 0;
    return req.body[f] !== undefined ? req.body[f] : null;
  });
  db.prepare(`UPDATE design_changes SET ${sets} WHERE id = ?`).run(...vals, req.params.dcid);
  res.json({ ok: true });
}

function remove(req, res) {
  const db = getDb();
  const row = db.prepare('SELECT id FROM design_changes WHERE id = ? AND project_id = ?').get(req.params.dcid, req.params.id);
  if (!row) return res.status(404).json({ error: 'Design change not found' });
  db.prepare('DELETE FROM design_changes WHERE id = ?').run(req.params.dcid);
  res.json({ ok: true });
}

module.exports = { list, feeSummary, create, update, remove };
