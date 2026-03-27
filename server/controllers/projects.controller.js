const { getDb } = require('../config/database');
const { today } = require('../utils/dateUtils');

function list(req, res) {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
  res.json(rows);
}

function get(req, res) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Project not found' });
  res.json(row);
}

function create(req, res) {
  const db = getDb();
  const { project_number, project_name, client, author, version, release_status } = req.body;
  if (!project_number || !project_name) {
    return res.status(400).json({ error: 'project_number and project_name are required' });
  }
  if (!/^\d{8}$/.test(String(project_number))) {
    return res.status(400).json({ error: 'Project number must be exactly 8 digits (e.g. 00010162)' });
  }
  const stmt = db.prepare(`
    INSERT INTO projects (project_number, project_name, client, author, version, release_status, date_created)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    project_number,
    project_name,
    client || null,
    author || null,
    version || '1.0',
    release_status || 'Draft',
    today()
  );
  res.status(201).json({ id: result.lastInsertRowid });
}

function update(req, res) {
  const db = getDb();
  const { project_number, project_name, client, author, version, release_status } = req.body;
  const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Project not found' });
  if (project_number && !/^\d{8}$/.test(String(project_number))) {
    return res.status(400).json({ error: 'Project number must be exactly 8 digits (e.g. 00010162)' });
  }

  db.prepare(`
    UPDATE projects
    SET project_number = ?, project_name = ?, client = ?, author = ?,
        version = ?, release_status = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(project_number, project_name, client || null, author || null,
         version || '1.0', release_status || 'Draft', req.params.id);

  res.json({ ok: true });
}

function remove(req, res) {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Project not found' });
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
}

module.exports = { list, get, create, update, remove };
