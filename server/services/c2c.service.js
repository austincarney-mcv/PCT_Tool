const { getDb } = require('../config/database');
const { WEEK_HOURS } = require('../config/constants');

function assertUnlocked(snapshotId) {
  const db = getDb();
  const snap = db.prepare('SELECT snapshot_locked FROM c2c_snapshots WHERE id = ?').get(snapshotId);
  if (!snap) throw Object.assign(new Error('Snapshot not found'), { status: 404 });
  if (snap.snapshot_locked) throw Object.assign(new Error('Snapshot is locked and cannot be modified'), { status: 403 });
}

function getSnapshot(snapshotId) {
  const db = getDb();
  const snap = db.prepare('SELECT * FROM c2c_snapshots WHERE id = ?').get(snapshotId);
  if (!snap) return null;
  const allocations = getAllocations(snapshotId);
  const financials = getFinancials(snapshotId);
  return { ...snap, allocations, financials };
}

function getAllocations(snapshotId) {
  const db = getDb();
  return db.prepare(`
    SELECT cra.*, tr.name as resource_name, tr.discipline, tr.hourly_rate
    FROM c2c_resource_allocations cra
    JOIN team_resources tr ON tr.id = cra.resource_id
    WHERE cra.snapshot_id = ?
    ORDER BY tr.discipline, tr.sort_order
  `).all(snapshotId);
}

function getFinancials(snapshotId) {
  const db = getDb();
  return db.prepare('SELECT * FROM c2c_discipline_financials WHERE snapshot_id = ? ORDER BY discipline').all(snapshotId);
}

function createSnapshot(projectId, { phase, week_number, snapshot_date, week_label }) {
  const db = getDb();
  // Insert snapshot (locked by default)
  const result = db.prepare(`
    INSERT INTO c2c_snapshots (project_id, phase, week_number, snapshot_date, week_label, snapshot_locked)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run(projectId, phase, week_number, snapshot_date, week_label);
  const snapshotId = result.lastInsertRowid;

  // Find previous snapshot to copy allocations from
  const prev = db.prepare(`
    SELECT id FROM c2c_snapshots
    WHERE project_id = ? AND phase = ? AND week_number < ?
    ORDER BY week_number DESC LIMIT 1
  `).get(projectId, phase, week_number);

  if (prev) {
    // Copy allocations from previous snapshot
    const prevAllocs = db.prepare('SELECT * FROM c2c_resource_allocations WHERE snapshot_id = ?').all(prev.id);
    const insertAlloc = db.prepare(`
      INSERT INTO c2c_resource_allocations (snapshot_id, resource_id, weekly_utilisation, remaining_weeks, cost_calculated)
      VALUES (?, ?, ?, ?, ?)
    `);
    const prevFinancials = db.prepare('SELECT * FROM c2c_discipline_financials WHERE snapshot_id = ?').all(prev.id);
    const insertFin = db.prepare(`
      INSERT INTO c2c_discipline_financials
        (snapshot_id, discipline, agreed_fee, cost_at_close, net_to_carry,
         synergy_net_residual, total_net_to_carry, construction_doc_cost_to_complete,
         fee_less_wip)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
      for (const a of prevAllocs) {
        const hours = a.weekly_utilisation * WEEK_HOURS * a.remaining_weeks;
        // Look up resource hourly rate
        const resource = db.prepare('SELECT hourly_rate FROM team_resources WHERE id = ?').get(a.resource_id);
        const cost = resource ? hours * resource.hourly_rate : 0;
        insertAlloc.run(snapshotId, a.resource_id, a.weekly_utilisation, a.remaining_weeks, cost);
      }
      for (const f of prevFinancials) {
        insertFin.run(snapshotId, f.discipline, f.agreed_fee, f.cost_at_close,
          f.net_to_carry, f.synergy_net_residual, f.total_net_to_carry,
          f.construction_doc_cost_to_complete,
          // TODO: fee_less_wip placeholder — carry forward from previous week.
          //       Replace with live value from external finance DB when integration is built. Revisit.
          f.fee_less_wip ?? 1000);
      }
    })();
  } else {
    // First snapshot: seed from all project resources with zero allocations
    const resources = db.prepare('SELECT * FROM team_resources WHERE project_id = ? ORDER BY discipline, sort_order').all(projectId);
    const insertAlloc = db.prepare(`
      INSERT INTO c2c_resource_allocations (snapshot_id, resource_id, weekly_utilisation, remaining_weeks, cost_calculated)
      VALUES (?, ?, 0, 0, 0)
    `);
    db.transaction(() => resources.forEach(r => insertAlloc.run(snapshotId, r.id)))();
  }

  return snapshotId;
}

function updateAllocations(snapshotId, items) {
  assertUnlocked(snapshotId);
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE c2c_resource_allocations
    SET weekly_utilisation = ?, remaining_weeks = ?, cost_calculated = ?
    WHERE id = ? AND snapshot_id = ?
  `);
  db.transaction(() => {
    for (const item of items) {
      const resource = db.prepare('SELECT hourly_rate FROM team_resources WHERE id = (SELECT resource_id FROM c2c_resource_allocations WHERE id = ?)').get(item.id);
      const hours = (item.weekly_utilisation || 0) * WEEK_HOURS * (item.remaining_weeks || 0);
      const cost = resource ? hours * resource.hourly_rate : 0;
      stmt.run(item.weekly_utilisation || 0, item.remaining_weeks || 0, cost, item.id, snapshotId);
    }
  })();

  // Recalculate construction_doc_cost_to_complete per discipline
  recalcDisciplineCosts(snapshotId);
}

function recalcDisciplineCosts(snapshotId) {
  const db = getDb();
  const disciplineCosts = db.prepare(`
    SELECT tr.discipline, SUM(cra.cost_calculated) as total_cost
    FROM c2c_resource_allocations cra
    JOIN team_resources tr ON tr.id = cra.resource_id
    WHERE cra.snapshot_id = ?
    GROUP BY tr.discipline
  `).all(snapshotId);

  const stmt = db.prepare(`
    INSERT INTO c2c_discipline_financials (snapshot_id, discipline, construction_doc_cost_to_complete)
    VALUES (?, ?, ?)
    ON CONFLICT(snapshot_id, discipline) DO UPDATE SET construction_doc_cost_to_complete = excluded.construction_doc_cost_to_complete
  `);

  db.transaction(() => disciplineCosts.forEach(d => stmt.run(snapshotId, d.discipline, d.total_cost)))();
}

function updateFinancials(snapshotId, items) {
  assertUnlocked(snapshotId);
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO c2c_discipline_financials
      (snapshot_id, discipline, agreed_fee, cost_at_close, net_to_carry,
       synergy_net_residual, total_net_to_carry, construction_doc_cost_to_complete,
       fee_less_wip)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(snapshot_id, discipline) DO UPDATE SET
      agreed_fee = excluded.agreed_fee,
      cost_at_close = excluded.cost_at_close,
      net_to_carry = excluded.net_to_carry,
      synergy_net_residual = excluded.synergy_net_residual,
      total_net_to_carry = excluded.total_net_to_carry,
      construction_doc_cost_to_complete = excluded.construction_doc_cost_to_complete,
      -- TODO: fee_less_wip placeholder — to be sourced from external finance DB. Revisit.
      fee_less_wip = excluded.fee_less_wip
  `);
  db.transaction(() => {
    for (const item of items) {
      stmt.run(snapshotId, item.discipline, item.agreed_fee || 0, item.cost_at_close || 0,
        item.net_to_carry || 0, item.synergy_net_residual || 0,
        item.total_net_to_carry || 0, item.construction_doc_cost_to_complete || 0,
        item.fee_less_wip ?? 1000);
    }
  })();
}

function lockSnapshot(snapshotId) {
  const db = getDb();
  const snap = db.prepare('SELECT id FROM c2c_snapshots WHERE id = ?').get(snapshotId);
  if (!snap) throw Object.assign(new Error('Snapshot not found'), { status: 404 });
  db.prepare('UPDATE c2c_snapshots SET snapshot_locked = 1 WHERE id = ?').run(snapshotId);
}

function getTrend(projectId) {
  const db = getDb();
  return db.prepare(`
    SELECT s.id, s.phase, s.week_number, s.week_label, s.snapshot_date,
      SUM(f.under_over) as total_under_over,
      SUM(f.construction_doc_cost_to_complete) as total_ctc
    FROM c2c_snapshots s
    LEFT JOIN c2c_discipline_financials f ON f.snapshot_id = s.id
    WHERE s.project_id = ?
    GROUP BY s.id
    ORDER BY s.phase, s.week_number
  `).all(projectId);
}

module.exports = {
  getSnapshot, getAllocations, getFinancials, createSnapshot,
  updateAllocations, updateFinancials, lockSnapshot, getTrend, recalcDisciplineCosts,
};
