const { getDb } = require('../config/database');

function list(req, res) {
  const db = getDb();
  res.json(db.prepare(
    'SELECT * FROM team_resources WHERE project_id = ? ORDER BY discipline, sort_order, name'
  ).all(req.params.id));
}

function create(req, res) {
  const db = getDb();
  const { name, discipline, hourly_rate, sort_order } = req.body;
  if (!name || !discipline || hourly_rate == null) {
    return res.status(400).json({ error: 'name, discipline, hourly_rate required' });
  }
  const result = db.prepare(
    'INSERT INTO team_resources (project_id, name, discipline, hourly_rate, sort_order) VALUES (?,?,?,?,?)'
  ).run(req.params.id, name, discipline, hourly_rate, sort_order || 0);
  res.status(201).json({ id: result.lastInsertRowid });
}

function update(req, res) {
  const db = getDb();
  const row = db.prepare('SELECT id FROM team_resources WHERE id = ? AND project_id = ?').get(req.params.rid, req.params.id);
  if (!row) return res.status(404).json({ error: 'Resource not found' });
  const { name, discipline, hourly_rate, sort_order } = req.body;
  db.prepare('UPDATE team_resources SET name=?, discipline=?, hourly_rate=?, sort_order=? WHERE id=?')
    .run(name, discipline, hourly_rate, sort_order ?? 0, req.params.rid);
  res.json({ ok: true });
}

function remove(req, res) {
  const db = getDb();
  const row = db.prepare('SELECT id FROM team_resources WHERE id = ? AND project_id = ?').get(req.params.rid, req.params.id);
  if (!row) return res.status(404).json({ error: 'Resource not found' });
  // Block if used in locked snapshots
  const used = db.prepare(`
    SELECT cra.id FROM c2c_resource_allocations cra
    JOIN c2c_snapshots s ON s.id = cra.snapshot_id
    WHERE cra.resource_id = ? AND s.snapshot_locked = 1
    LIMIT 1
  `).get(req.params.rid);
  if (used) {
    return res.status(409).json({ error: 'Resource is referenced by locked C2C snapshots and cannot be deleted' });
  }
  db.prepare('DELETE FROM team_resources WHERE id = ?').run(req.params.rid);
  res.json({ ok: true });
}

function reorder(req, res) {
  const db = getDb();
  const { items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items array required' });
  const stmt = db.prepare('UPDATE team_resources SET sort_order = ? WHERE id = ? AND project_id = ?');
  db.transaction(() => items.forEach(({ id, sort_order }) => stmt.run(sort_order, id, req.params.id)))();
  res.json({ ok: true });
}

module.exports = { list, create, update, remove, reorder };
