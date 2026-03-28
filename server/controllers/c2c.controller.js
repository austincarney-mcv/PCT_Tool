const { getDb } = require('../config/database');
const svc = require('../services/c2c.service');

function listSnapshots(req, res) {
  const db = getDb();
  const snapshots = db.prepare(
    'SELECT * FROM c2c_snapshots WHERE project_id = ? ORDER BY phase, week_number'
  ).all(req.params.id);
  res.json(snapshots);
}

function getSnapshot(req, res) {
  const snap = svc.getSnapshot(req.params.sid);
  if (!snap) return res.status(404).json({ error: 'Snapshot not found' });
  // Verify belongs to project
  if (String(snap.project_id) !== String(req.params.id)) {
    return res.status(404).json({ error: 'Snapshot not found' });
  }
  res.json(snap);
}

function createSnapshot(req, res) {
  const { phase, week_number, snapshot_date, week_label } = req.body;
  if (!phase || !week_number || !snapshot_date || !week_label) {
    return res.status(400).json({ error: 'phase, week_number, snapshot_date, week_label required' });
  }
  try {
    const id = svc.createSnapshot(req.params.id, { phase, week_number, snapshot_date, week_label });
    res.status(201).json({ id });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Snapshot already exists for this project/phase/week' });
    }
    throw err;
  }
}

function lockSnapshot(req, res) {
  try {
    svc.lockSnapshot(req.params.sid);
    res.json({ ok: true });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

function unlockSnapshot(req, res) {
  try {
    svc.unlockSnapshot(req.params.sid);
    res.json({ ok: true });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

function deleteSnapshot(req, res) {
  try {
    const result = svc.deleteSnapshot(req.params.id, req.params.sid);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

function getAllocations(req, res) {
  // Verify snapshot belongs to project
  const db = getDb();
  const snap = db.prepare('SELECT id FROM c2c_snapshots WHERE id = ? AND project_id = ?').get(req.params.sid, req.params.id);
  if (!snap) return res.status(404).json({ error: 'Snapshot not found' });
  res.json(svc.getAllocations(req.params.sid));
}

function updateAllocations(req, res) {
  const db = getDb();
  const snap = db.prepare('SELECT id FROM c2c_snapshots WHERE id = ? AND project_id = ?').get(req.params.sid, req.params.id);
  if (!snap) return res.status(404).json({ error: 'Snapshot not found' });
  const { items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items array required' });
  try {
    svc.updateAllocations(req.params.sid, items);
    res.json({ ok: true });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

function getFinancials(req, res) {
  const db = getDb();
  const snap = db.prepare('SELECT id FROM c2c_snapshots WHERE id = ? AND project_id = ?').get(req.params.sid, req.params.id);
  if (!snap) return res.status(404).json({ error: 'Snapshot not found' });
  res.json(svc.getFinancials(req.params.sid));
}

function updateFinancials(req, res) {
  const db = getDb();
  const snap = db.prepare('SELECT id FROM c2c_snapshots WHERE id = ? AND project_id = ?').get(req.params.sid, req.params.id);
  if (!snap) return res.status(404).json({ error: 'Snapshot not found' });
  const { items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items array required' });
  try {
    svc.updateFinancials(req.params.sid, items);
    res.json({ ok: true });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

function adminUnlock(req, res) {
  try {
    svc.adminUnlockSnapshot(req.params.sid);
    res.json({ ok: true });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

function adminRelock(req, res) {
  try {
    svc.adminRelockSnapshot(req.params.sid);
    res.json({ ok: true });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

function trend(req, res) {
  res.json(svc.getTrend(req.params.id));
}

function stageView(req, res) {
  const { phase } = req.query;
  if (!phase || !['design', 'construction'].includes(phase)) {
    return res.status(400).json({ error: 'phase query param must be "design" or "construction"' });
  }
  res.json(svc.getStageView(req.params.id, phase));
}

module.exports = {
  listSnapshots, getSnapshot, createSnapshot, lockSnapshot, unlockSnapshot, deleteSnapshot,
  adminUnlock, adminRelock,
  getAllocations, updateAllocations, getFinancials, updateFinancials,
  trend, stageView,
};
