const express = require('express');
const router = express.Router({ mergeParams: true });
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');
const c = require('../controllers/c2c.controller');

// Snapshots (nested under /api/projects/:id/c2c)
router.get('/snapshots', auth, c.listSnapshots);
router.post('/snapshots', auth, c.createSnapshot);
router.get('/snapshots/:sid', auth, c.getSnapshot);
router.put('/snapshots/:sid/lock', auth, c.lockSnapshot);
router.put('/snapshots/:sid/unlock', auth, c.unlockSnapshot);
// Admin-only: temporarily unlock a past week for 24 h, or manually re-lock it
router.put('/snapshots/:sid/admin-unlock', auth, requireAdmin, c.adminUnlock);
router.put('/snapshots/:sid/admin-relock', auth, requireAdmin, c.adminRelock);
router.delete('/snapshots/:sid', auth, c.deleteSnapshot);
router.get('/trend', auth, c.trend);
router.get('/stage-view', auth, c.stageView);

// Allocations and financials (by snapshot id)
router.get('/snapshots/:sid/allocations', auth, c.getAllocations);
router.put('/snapshots/:sid/allocations', auth, c.updateAllocations);
router.get('/snapshots/:sid/financials', auth, c.getFinancials);
router.put('/snapshots/:sid/financials', auth, c.updateFinancials);

module.exports = router;
