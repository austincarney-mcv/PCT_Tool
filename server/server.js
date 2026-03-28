require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const { migrate } = require('./db/migrate');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3002;

// ─── Middleware ───────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',                          require('./routes/auth.routes'));
app.use('/api/projects',                      require('./routes/projects.routes'));

// Project-scoped routes (mergeParams handled in routers)
app.use('/api/projects/:id/drawings',         require('./routes/drawings.routes'));
app.use('/api/projects/:id/resources',        require('./routes/teamResources.routes'));
app.use('/api/projects/:id/c2c',              require('./routes/c2c.routes'));
app.use('/api/projects/:id/approvals',        require('./routes/approvals.routes'));
app.use('/api/projects/:id/critical-items',   require('./routes/criticalItems.routes'));
app.use('/api/projects/:id/design-changes',   require('./routes/designChanges.routes'));
app.use('/api/projects/:id/risks',            require('./routes/risks.routes'));
app.use('/api/projects/:id/rfis',             require('./routes/rfis.routes'));
app.use('/api/projects/:id/lessons',          require('./routes/lessons.routes'));
app.use('/api/projects/:id/sid',              require('./routes/sid.routes'));
app.use('/api/projects/:id/value-log',        require('./routes/valueLog.routes'));
app.use('/api/projects/:id/brief-compliance', require('./routes/briefCompliance.routes'));
app.use('/api/projects/:id/summary',          require('./routes/summary.routes'));
app.use('/api/projects/:id',                  require('./routes/excel.routes'));

// ─── Error handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
migrate();
app.listen(PORT, () => {
  console.log(`[PCT] API server running on port ${PORT}`);
});

module.exports = app;
