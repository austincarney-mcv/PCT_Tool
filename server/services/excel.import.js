const ExcelJS = require('exceljs');
const { getDb } = require('../config/database');
const { toISODate } = require('../utils/dateUtils');
const { calcRiskRating } = require('../config/constants');

function cellVal(row, col) {
  const cell = row.getCell(col);
  if (!cell || cell.value === null || cell.value === undefined) return null;
  if (cell.value && typeof cell.value === 'object' && cell.value.result !== undefined) return cell.value.result;
  if (cell.value instanceof Date) return toISODate(cell.value);
  return cell.value;
}

function strVal(row, col) {
  const v = cellVal(row, col);
  return v != null ? String(v).trim() : null;
}

function numVal(row, col) {
  const v = cellVal(row, col);
  if (v === null || v === '') return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function boolVal(row, col) {
  const v = strVal(row, col);
  if (!v) return 0;
  return ['y','yes','true','1','x'].includes(v.toLowerCase()) ? 1 : 0;
}

function dateVal(row, col) {
  const v = cellVal(row, col);
  if (!v) return null;
  return toISODate(v);
}

// ─── Cover Sheet ──────────────────────────────────────────────────────────────
function parseCoverSheet(ws, projectNumberOverride) {
  // Scan for key rows by looking at column A values
  const data = {};
  ws.eachRow((row, rn) => {
    const label = strVal(row, 1);
    const value = strVal(row, 2);
    if (!label) return;
    const lc = label.toLowerCase();
    if (lc.includes('project number')) data.project_number = value;
    if (lc.includes('project name'))   data.project_name = value;
    if (lc.includes('client'))         data.client = value;
    if (lc.includes('author'))         data.author = value;
    if (lc.includes('version'))        data.version = value;
    if (lc.includes('status'))         data.release_status = value;
    if (lc.includes('date'))           data.date_created = dateVal(row, 2) || value;
  });
  if (projectNumberOverride) data.project_number = projectNumberOverride;
  return data;
}

// ─── Deliverables Schedule ────────────────────────────────────────────────────
function parseDeliverables(ws) {
  const drawings = [];
  let headerRowNum = null;
  let currentDiscipline = null;

  ws.eachRow((row, rn) => {
    const a = strVal(row, 1);
    const b = strVal(row, 2);
    // Detect header row
    if (a && a.toLowerCase().includes('drawing number')) { headerRowNum = rn; return; }
    if (!headerRowNum) return;
    if (!a && !b) return;
    // Detect discipline rows (all caps, no drawing number)
    if (a && a === a.toUpperCase() && !b && a.length > 3 && !/^\d/.test(a)) {
      currentDiscipline = a.charAt(0) + a.slice(1).toLowerCase();
      return;
    }
    // Drawing row: col A or B has a drawing number pattern
    const drawNum = b || a;
    if (!drawNum) return;
    drawings.push({
      discipline: currentDiscipline || 'Architecture',
      drawing_number: strVal(row, 2) || strVal(row, 1),
      drawing_title: strVal(row, 3) || strVal(row, 4),
      scale: strVal(row, 5),
      issue_1_date: dateVal(row, 6),
      issue_2_date: dateVal(row, 7),
      issue_3_date: dateVal(row, 8),
      issue_4_date: dateVal(row, 9),
      issue_5_date: dateVal(row, 10),
      complete_pct: (() => { const v = numVal(row, 11); return v != null ? (v <= 1 ? v * 100 : v) : 0; })(),
      residual_pct: (() => { const v = numVal(row, 12); return v != null ? (v <= 1 ? v * 100 : v) : 0; })(),
      primary_purpose: strVal(row, 13),
      procurement_flag: boolVal(row, 14),
      ifc_flag: boolVal(row, 15),
      sort_order: drawings.length,
    });
  });
  return drawings.filter(d => d.drawing_number);
}

// ─── C2C Sheet ────────────────────────────────────────────────────────────────
function parseC2CSheet(ws, phase, weekNumber) {
  const resources = [];
  const financials = {};
  let snapshotDate = null;
  let weekLabel = null;
  let currentDiscipline = null;
  let inFinancials = false;

  const FINANCIAL_KEYS = {
    'agreed fee': 'agreed_fee',
    'cost at close': 'cost_at_close',
    'net to carry': 'net_to_carry',
    'synergy net residual': 'synergy_net_residual',
    'total net to carry': 'total_net_to_carry',
    'cost to complete': 'construction_doc_cost_to_complete',
  };

  const DISCIPLINES = ['Architecture','Civil','Structural','Hydraulics',
    'Landscaping','Certifier','Fire Engineering','Fire Services','Builder/CM'];

  ws.eachRow((row, rn) => {
    const a = strVal(row, 1);
    if (!a) return;
    const al = a.toLowerCase();

    // Capture week date
    if (al.includes('week beginning') || al.includes('snapshot date') || al.includes('period')) {
      const dv = dateVal(row, 2) || dateVal(row, 3);
      if (dv) snapshotDate = dv;
      if (!weekLabel) weekLabel = `Week ${weekNumber}`;
    }

    // Detect discipline headers (e.g., "Architectural Resource Program")
    const matchedDisc = DISCIPLINES.find(d => al.includes(d.toLowerCase()));
    if (matchedDisc) {
      currentDiscipline = matchedDisc;
      inFinancials = false;
      if (!financials[currentDiscipline]) financials[currentDiscipline] = {};
      return;
    }

    // Detect financial summary rows
    for (const [key, field] of Object.entries(FINANCIAL_KEYS)) {
      if (al.includes(key)) {
        inFinancials = true;
        const val = numVal(row, 2) || numVal(row, 3) || 0;
        if (currentDiscipline) {
          if (!financials[currentDiscipline]) financials[currentDiscipline] = {};
          financials[currentDiscipline][field] = val;
        }
        return;
      }
    }

    if (inFinancials || !currentDiscipline) return;

    // Resource row: col B = rate (number), col C+ = utilisation
    const rate = numVal(row, 2);
    if (!rate || rate <= 0) return;
    const utilisation = numVal(row, 3) || 0;
    const remainingWeeks = numVal(row, 13) || numVal(row, 12) || 0;

    resources.push({
      discipline: currentDiscipline,
      name: a,
      hourly_rate: rate,
      weekly_utilisation: utilisation > 1 ? 1 : utilisation,
      remaining_weeks: remainingWeeks,
    });
  });

  return {
    phase,
    week_number: weekNumber,
    snapshot_date: snapshotDate || new Date().toISOString().slice(0, 10),
    week_label: weekLabel || `Week ${weekNumber}`,
    resources,
    financials,
  };
}

// ─── Approvals ────────────────────────────────────────────────────────────────
function parseApprovals(ws) {
  const items = [];
  let headerFound = false;
  let currentCategory = null;

  ws.eachRow((row, rn) => {
    const a = strVal(row, 1);
    const b = strVal(row, 2);
    if (!headerFound) {
      if (a && a.toLowerCase().includes('item')) headerFound = true;
      return;
    }
    if (!b) {
      if (a) currentCategory = a;
      return;
    }
    items.push({
      item_number: a,
      description: b,
      legislation: strVal(row, 3),
      authority: strVal(row, 4),
      application_id: strVal(row, 5),
      current_status: strVal(row, 6),
      date_lodged: dateVal(row, 7),
      date_paid: dateVal(row, 8),
      date_properly_made: dateVal(row, 9),
      rfi_date: dateVal(row, 10),
      rfi_response: strVal(row, 11),
      expected_date: dateVal(row, 12),
      next_step: strVal(row, 13),
      responsible_person: strVal(row, 14),
      due_date: dateVal(row, 15),
      complete: boolVal(row, 16),
      category: currentCategory,
      sort_order: items.length,
    });
  });
  return items;
}

// ─── Critical Items ───────────────────────────────────────────────────────────
function parseCriticalItems(ws) {
  const items = [];
  let headerFound = false;
  let currentGroup = null;

  ws.eachRow((row, rn) => {
    const a = strVal(row, 1);
    const b = strVal(row, 2);
    if (!headerFound) {
      if (a && (a.toLowerCase().includes('item') || a.toLowerCase().includes('details'))) headerFound = true;
      return;
    }
    if (!b && a) { currentGroup = a; return; }
    if (!b) return;
    items.push({
      item_number: a,
      details: b,
      agreed_strategy: strVal(row, 3),
      action_step: strVal(row, 4),
      responsible_person: strVal(row, 5),
      action_date: dateVal(row, 6),
      date_raised: dateVal(row, 7),
      resolution_required_date: dateVal(row, 8),
      date_resolved: dateVal(row, 9),
      status: strVal(row, 10) || 'OPEN',
      deliverable_affected: strVal(row, 11),
      initiator_group: currentGroup,
    });
  });
  return items.filter(i => i.details);
}

// ─── Brief Compliance ─────────────────────────────────────────────────────────
function parseBriefCompliance(ws) {
  const items = [];
  let headerFound = false;
  let sourceDoc = null;

  ws.eachRow((row, rn) => {
    const a = strVal(row, 1);
    const b = strVal(row, 2);
    if (!headerFound) {
      if (a && a.toLowerCase().includes('spec')) { headerFound = true; }
      return;
    }
    if (!b && a) { sourceDoc = a; return; }
    if (!b) return;
    items.push({
      spec_number: a,
      location: b,
      clause: strVal(row, 3),
      brief_item: strVal(row, 4),
      discipline: strVal(row, 5),
      compliant: boolVal(row, 6),
      deviation: boolVal(row, 7),
      comments: strVal(row, 8),
      client_response: strVal(row, 9),
      counter_response: strVal(row, 10),
      source_document: sourceDoc,
    });
  });
  return items.filter(i => i.brief_item);
}

// ─── Design Changes ───────────────────────────────────────────────────────────
function parseDesignChanges(ws) {
  const items = [];
  let headerFound = false;
  let currentGroup = null;

  ws.eachRow((row, rn) => {
    const a = strVal(row, 1);
    const b = strVal(row, 2);
    if (!headerFound) {
      if (a && a.toLowerCase().includes('item')) { headerFound = true; }
      return;
    }
    if (!b && a) { currentGroup = a; return; }
    if (!b) return;
    items.push({
      item_number: a,
      date_requested: dateVal(row, 2),
      change_type: strVal(row, 3),
      initiator_name: strVal(row, 4),
      discipline: strVal(row, 5),
      change_details: strVal(row, 6),
      reason: strVal(row, 7),
      area_location: strVal(row, 8),
      document_reference: strVal(row, 9),
      variation_reference: strVal(row, 10),
      status: strVal(row, 11) || 'Yet to be submitted',
      client_cost_impact: boolVal(row, 12),
      risk_assessment_change: boolVal(row, 13),
      client_comments: strVal(row, 14),
      arch_fees: numVal(row, 15) || 0,
      struc_fees: numVal(row, 16) || 0,
      civil_fees: numVal(row, 17) || 0,
      hyd_fees: numVal(row, 18) || 0,
      certifier_fees: numVal(row, 19) || 0,
      lscape_fees: numVal(row, 20) || 0,
      fire_eng_fees: numVal(row, 21) || 0,
      fire_services_fees: numVal(row, 22) || 0,
      builder_dm_fees: numVal(row, 23) || 0,
      initiator_group: currentGroup,
    });
  });
  return items.filter(i => i.change_details || i.initiator_name);
}

// ─── Risks ────────────────────────────────────────────────────────────────────
function parseRisks(ws) {
  const items = [];
  let headerFound = false;

  ws.eachRow((row, rn) => {
    const a = strVal(row, 1);
    if (!headerFound) {
      if (a && a.toLowerCase().includes('issue')) { headerFound = true; }
      return;
    }
    const desc = strVal(row, 6);
    if (!desc) return;
    const likelihood = strVal(row, 9);
    const outcome = strVal(row, 8);
    items.push({
      issue_id_text: a,
      issue_type: strVal(row, 2),
      date_raised: dateVal(row, 3),
      raised_by: strVal(row, 4),
      author: strVal(row, 5),
      description: desc,
      priority: strVal(row, 7),
      severity: outcome,
      risk_likelihood: likelihood,
      status: strVal(row, 10) || 'Open',
      last_updated: dateVal(row, 11),
      closure_date: dateVal(row, 12),
    });
  });
  return items;
}

// ─── RFIs ─────────────────────────────────────────────────────────────────────
function parseRFIs(ws) {
  const items = [];
  let headerFound = false;

  ws.eachRow((row, rn) => {
    const a = strVal(row, 1);
    if (!headerFound) {
      if (a && a.toLowerCase().includes('rfi')) { headerFound = true; }
      return;
    }
    if (!a) return;
    items.push({
      rfi_number: a,
      description: strVal(row, 2),
      date_received: dateVal(row, 3),
      client_deadline: dateVal(row, 4),
      outstanding_action: strVal(row, 5),
      status: strVal(row, 6) || 'Open',
      closed_date: dateVal(row, 7),
      eot_ref: strVal(row, 8),
      var_ref: strVal(row, 9),
    });
  });
  return items;
}

// ─── Lessons ──────────────────────────────────────────────────────────────────
function parseLessons(ws) {
  const items = [];
  let headerFound = false;

  ws.eachRow((row, rn) => {
    const a = strVal(row, 1);
    if (!headerFound) {
      if (a && a.toLowerCase().includes('item')) { headerFound = true; }
      return;
    }
    const details = strVal(row, 2);
    if (!details) return;
    items.push({
      item_number: a,
      event_details: details,
      effect: strVal(row, 3),
      cause: strVal(row, 4),
      early_warnings: strVal(row, 5),
      previously_identified: boolVal(row, 6),
      future_recommendation: strVal(row, 7),
      action_step_ref: strVal(row, 8),
      action_details: strVal(row, 9),
      logged_by: strVal(row, 10),
      logged_date: dateVal(row, 11),
      priority: strVal(row, 12),
      status: strVal(row, 13) || 'Open',
      responsible_person: strVal(row, 14),
    });
  });
  return items;
}

// ─── SiD ──────────────────────────────────────────────────────────────────────
function parseSiD(ws) {
  const items = [];
  let headerFound = false;
  let currentCategory = null;

  ws.eachRow((row, rn) => {
    const a = strVal(row, 1);
    if (!headerFound) {
      if (a && a.toLowerCase().includes('ref')) { headerFound = true; }
      return;
    }
    const hazard = strVal(row, 3);
    if (!hazard) {
      if (a) currentCategory = a;
      return;
    }
    const likelihood = strVal(row, 5);
    const outcome = strVal(row, 6);
    items.push({
      ref_number: a,
      element_activity: strVal(row, 2),
      hazard,
      potential_harm: strVal(row, 4),
      likelihood,
      outcome,
      risk_rating: strVal(row, 7) || calcRiskRating(likelihood, outcome),
      action_required: strVal(row, 8),
      action_by: strVal(row, 9),
      status: strVal(row, 10) || 'Open',
      architect_notes: strVal(row, 11),
      category: currentCategory,
    });
  });
  return items;
}

// ─── Value Log ────────────────────────────────────────────────────────────────
function parseValueLog(ws) {
  const items = [];
  let headerFound = false;

  ws.eachRow((row, rn) => {
    const a = strVal(row, 1);
    if (!headerFound) {
      if (a && (a.toLowerCase().includes('file') || a.toLowerCase().includes('item'))) { headerFound = true; }
      return;
    }
    const desc = strVal(row, 4);
    if (!desc) return;
    items.push({
      file_ref: a,
      job_ref: strVal(row, 2),
      item_number: strVal(row, 3),
      description: desc,
      date: dateVal(row, 5),
      who: strVal(row, 6),
      team: strVal(row, 7),
      value_amount: numVal(row, 8) || 0,
      communicated_date: dateVal(row, 9),
      communicated_how: strVal(row, 10),
      approved: boolVal(row, 11),
    });
  });
  return items;
}

// ─── Main importer ────────────────────────────────────────────────────────────
async function importWorkbook(buffer, projectNumberOverride) {
  const db = getDb();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  let projectData = {};
  let drawingsData = [];
  const c2cSheets = [];
  let approvalsData = [];
  let critItemsData = [];
  let briefData = [];
  let designChgsData = [];
  let risksData = [];
  let rfisData = [];
  let lessonsData = [];
  let sidData = [];
  let valueData = [];

  wb.eachSheet((ws, sid) => {
    const name = ws.name;
    const nl = name.toLowerCase();

    if (nl === 'cover sheet') {
      projectData = parseCoverSheet(ws, projectNumberOverride);
    } else if (nl === 'deliverables schedule') {
      drawingsData = parseDeliverables(ws);
    } else if (nl.startsWith('cost to complete') || nl === 'cost to complete - start') {
      const wn = nl === 'cost to complete - start' ? 1 : (parseInt(nl.replace(/\D/g, '')) || 1);
      c2cSheets.push(parseC2CSheet(ws, 'design', wn));
    } else if (/^c2c week/i.test(name)) {
      const wn = parseInt(name.replace(/\D/g, '')) || 1;
      c2cSheets.push(parseC2CSheet(ws, 'design', wn));
    } else if (/^cs c2c/i.test(name)) {
      const wn = parseInt(name.replace(/\D/g, '')) || 1;
      c2cSheets.push(parseC2CSheet(ws, 'construction', wn));
    } else if (nl === 'approvals tracker') {
      approvalsData = parseApprovals(ws);
    } else if (nl === 'critical items register') {
      critItemsData = parseCriticalItems(ws);
    } else if (nl === 'brief compliance register') {
      briefData = parseBriefCompliance(ws);
    } else if (nl === 'design change register') {
      designChgsData = parseDesignChanges(ws);
    } else if (nl === 'risk & issue register') {
      risksData = parseRisks(ws);
    } else if (nl === 'rfis') {
      rfisData = parseRFIs(ws);
    } else if (nl === 'lessons learnt') {
      lessonsData = parseLessons(ws);
    } else if (nl === 'sid register') {
      sidData = parseSiD(ws);
    } else if (nl === 'value log') {
      valueData = parseValueLog(ws);
    }
    // Skip: Risk_Matrix, TEMPCIVIL, and any other reference sheets
  });

  if (!projectData.project_number) throw Object.assign(new Error('Could not determine project number from workbook'), { status: 400 });

  // Check for duplicate
  const existing = db.prepare('SELECT id FROM projects WHERE project_number = ?').get(projectData.project_number);
  if (existing) throw Object.assign(new Error(`Project ${projectData.project_number} already exists. Use a project_number_override to import as a new project.`), { status: 409 });

  // Insert everything in one transaction
  const importAll = db.transaction(() => {
    // Project
    const projResult = db.prepare(`
      INSERT INTO projects (project_number, project_name, client, author, version, release_status, date_created)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      projectData.project_number,
      projectData.project_name || 'Imported Project',
      projectData.client || null,
      projectData.author || null,
      projectData.version || '1.0',
      projectData.release_status || 'Draft',
      projectData.date_created || new Date().toISOString().slice(0, 10)
    );
    const projectId = projResult.lastInsertRowid;

    // Drawings
    const insertDrawing = db.prepare(`
      INSERT OR IGNORE INTO drawings
        (project_id, discipline, series, drawing_number, drawing_title, scale,
         issue_1_date, issue_2_date, issue_3_date, issue_4_date, issue_5_date,
         complete_pct, residual_pct, primary_purpose, procurement_flag, ifc_flag, sort_order)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `);
    drawingsData.forEach(d => insertDrawing.run(projectId, d.discipline, d.series || null,
      d.drawing_number, d.drawing_title || d.drawing_number, d.scale || null,
      d.issue_1_date, d.issue_2_date, d.issue_3_date, d.issue_4_date, d.issue_5_date,
      d.complete_pct || 0, d.residual_pct || 0, d.primary_purpose || null,
      d.procurement_flag || 0, d.ifc_flag || 0, d.sort_order || 0));

    // C2C: collect unique resources across all sheets, then insert snapshots
    const resourceMap = {}; // key: `discipline|name|rate` → resource_id
    for (const sheet of c2cSheets) {
      for (const r of sheet.resources) {
        const key = `${r.discipline}|${r.name}|${r.hourly_rate}`;
        if (!resourceMap[key]) {
          const existing = db.prepare(
            'SELECT id FROM team_resources WHERE project_id = ? AND name = ? AND discipline = ?'
          ).get(projectId, r.name, r.discipline);
          if (existing) {
            resourceMap[key] = existing.id;
          } else {
            const res = db.prepare(
              'INSERT INTO team_resources (project_id, name, discipline, hourly_rate, sort_order) VALUES (?,?,?,?,?)'
            ).run(projectId, r.name, r.discipline, r.hourly_rate, Object.keys(resourceMap).length);
            resourceMap[key] = res.lastInsertRowid;
          }
        }
      }
    }

    // Insert snapshots
    c2cSheets.sort((a, b) => a.phase.localeCompare(b.phase) || a.week_number - b.week_number);
    for (const sheet of c2cSheets) {
      // Skip if no resources or effectively empty
      if (sheet.resources.length === 0 && Object.keys(sheet.financials).length === 0) continue;
      const snapResult = db.prepare(`
        INSERT OR IGNORE INTO c2c_snapshots (project_id, phase, week_number, snapshot_date, week_label, snapshot_locked)
        VALUES (?,?,?,?,?,1)
      `).run(projectId, sheet.phase, sheet.week_number, sheet.snapshot_date, sheet.week_label);
      const snapshotId = snapResult.lastInsertRowid;
      if (!snapshotId) continue; // already existed (IGNORE)

      // Allocations
      const insertAlloc = db.prepare(`
        INSERT OR IGNORE INTO c2c_resource_allocations
          (snapshot_id, resource_id, weekly_utilisation, remaining_weeks, cost_calculated)
        VALUES (?,?,?,?,?)
      `);
      for (const r of sheet.resources) {
        const key = `${r.discipline}|${r.name}|${r.hourly_rate}`;
        const resourceId = resourceMap[key];
        if (!resourceId) continue;
        const hours = (r.weekly_utilisation || 0) * 37.5 * (r.remaining_weeks || 0);
        const cost = hours * r.hourly_rate;
        insertAlloc.run(snapshotId, resourceId, r.weekly_utilisation || 0, r.remaining_weeks || 0, cost);
      }

      // Financials
      const insertFin = db.prepare(`
        INSERT OR IGNORE INTO c2c_discipline_financials
          (snapshot_id, discipline, agreed_fee, cost_at_close, net_to_carry,
           synergy_net_residual, total_net_to_carry, construction_doc_cost_to_complete)
        VALUES (?,?,?,?,?,?,?,?)
      `);
      for (const [disc, fin] of Object.entries(sheet.financials)) {
        insertFin.run(snapshotId, disc,
          fin.agreed_fee || 0, fin.cost_at_close || 0, fin.net_to_carry || 0,
          fin.synergy_net_residual || 0, fin.total_net_to_carry || 0,
          fin.construction_doc_cost_to_complete || 0);
      }
    }

    // All remaining registers
    insertRows(db, projectId, 'approvals', approvalsData, ['item_number','description','legislation','authority',
      'application_id','current_status','date_lodged','date_paid','date_properly_made','rfi_date','rfi_response',
      'expected_date','next_step','responsible_person','due_date','complete','category','sort_order']);
    insertRows(db, projectId, 'critical_items', critItemsData, ['item_number','details','agreed_strategy',
      'action_step','responsible_person','action_date','date_raised','resolution_required_date',
      'date_resolved','status','deliverable_affected','initiator_group']);
    insertRows(db, projectId, 'brief_compliance', briefData, ['spec_number','location','clause','brief_item',
      'discipline','compliant','deviation','comments','client_response','counter_response','source_document']);
    insertRows(db, projectId, 'design_changes', designChgsData, ['item_number','date_requested','change_type',
      'initiator_name','discipline','change_details','reason','area_location','document_reference',
      'variation_reference','status','client_cost_impact','risk_assessment_change','client_comments',
      'arch_fees','struc_fees','civil_fees','hyd_fees','certifier_fees','lscape_fees',
      'fire_eng_fees','fire_services_fees','builder_dm_fees','initiator_group']);
    insertRows(db, projectId, 'risks', risksData, ['issue_id_text','issue_type','date_raised','raised_by',
      'author','description','priority','severity','risk_likelihood','status','last_updated','closure_date']);
    insertRows(db, projectId, 'rfis', rfisData, ['rfi_number','description','date_received','client_deadline',
      'outstanding_action','status','closed_date','eot_ref','var_ref']);
    insertRows(db, projectId, 'lessons_learnt', lessonsData, ['item_number','event_details','effect','cause',
      'early_warnings','previously_identified','future_recommendation','action_step_ref','action_details',
      'logged_by','logged_date','priority','status','responsible_person']);
    insertRows(db, projectId, 'sid_hazards', sidData, ['ref_number','element_activity','hazard','potential_harm',
      'likelihood','outcome','risk_rating','action_required','action_by','status','architect_notes','category']);
    insertRows(db, projectId, 'value_log', valueData, ['file_ref','job_ref','item_number','description','date',
      'who','team','value_amount','communicated_date','communicated_how','approved']);

    return projectId;
  });

  return importAll();
}

function insertRows(db, projectId, table, rows, fields) {
  if (!rows.length) return;
  const cols = ['project_id', ...fields];
  const stmt = db.prepare(
    `INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`
  );
  rows.forEach(row => {
    const vals = [projectId, ...fields.map(f => row[f] !== undefined ? row[f] : null)];
    stmt.run(...vals);
  });
}

module.exports = { importWorkbook };
