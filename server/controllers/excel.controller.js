const { getDb } = require('../config/database');
const { buildWorkbook } = require('../services/excel.export');

async function exportProject(req, res) {
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const filename = `${project.project_number} - Project Control Tool.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const wb = await buildWorkbook(req.params.id);
  await wb.xlsx.write(res);
  res.end();
}

module.exports = { exportProject };
