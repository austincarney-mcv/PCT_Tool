const { getDb } = require('../config/database');

function getSummary(req, res) {
  const db = getDb();
  const pid = req.params.id;

  const openRisks = db.prepare(
    "SELECT COUNT(*) AS n FROM risks WHERE project_id = ? AND status != 'Closed'"
  ).get(pid).n;

  const openCritical = db.prepare(
    "SELECT COUNT(*) AS n FROM critical_items WHERE project_id = ? AND status != 'Closed'"
  ).get(pid).n;

  const pendingApprovals = db.prepare(
    'SELECT COUNT(*) AS n FROM approvals WHERE project_id = ? AND complete = 0'
  ).get(pid).n;

  const openRfis = db.prepare(
    "SELECT COUNT(*) AS n FROM rfis WHERE project_id = ? AND status != 'Closed'"
  ).get(pid).n;

  const unsubmittedChanges = db.prepare(
    "SELECT COUNT(*) AS n FROM design_changes WHERE project_id = ? AND status = 'Yet to be submitted'"
  ).get(pid).n;

  const totalValueRow = db.prepare(
    'SELECT COALESCE(SUM(value_amount), 0) AS total FROM value_log WHERE project_id = ?'
  ).get(pid);

  res.json({
    open_risks: openRisks,
    open_critical_items: openCritical,
    pending_approvals: pendingApprovals,
    open_rfis: openRfis,
    unsubmitted_design_changes: unsubmittedChanges,
    total_value: totalValueRow.total,
  });
}

module.exports = { getSummary };
