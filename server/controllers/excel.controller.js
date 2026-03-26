const { getDb } = require('../config/database');
const { buildWorkbook } = require('../services/excel.export');
const { importWorkbook } = require('../services/excel.import');

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

async function importProject(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { project_number_override } = req.body;
  try {
    const projectId = await importWorkbook(req.file.buffer, project_number_override);
    res.status(201).json({ project_id: projectId, message: 'Import successful' });
  } catch (err) {
    if (err.status === 409) return res.status(409).json({ error: err.message });
    throw err;
  }
}

module.exports = { exportProject, importProject };
