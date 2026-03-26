const ExcelJS = require('exceljs');
const { getDb } = require('../config/database');
const { DISCIPLINES, ISSUE_MILESTONES } = require('../config/constants');

// ─── Styling constants ────────────────────────────────────────────────────────
const PRIMARY_FILL   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A4735' } };
const SECONDARY_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3E0CF' } };
const TERTIARY_FILL  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCEDDC3' } };
const WHITE_FONT     = { color: { argb: 'FFFFFFFF' }, bold: true, name: 'Arial', size: 11 };
const DARK_BOLD_FONT = { bold: true, name: 'Arial', size: 11 };
const STD_FONT       = { name: 'Arial', size: 10 };
const BORDER_THIN    = { style: 'thin', color: { argb: 'FFAAAAAA' } };
const ALL_BORDERS    = { top: BORDER_THIN, left: BORDER_THIN, bottom: BORDER_THIN, right: BORDER_THIN };
const CURRENCY_FMT   = '$#,##0;($#,##0);-';
const DATE_FMT       = 'dd-mmm-yy';

function applyHeaderRow(ws, rowNum, label, fill) {
  const row = ws.getRow(rowNum);
  row.height = 20;
  const cell = row.getCell(1);
  cell.value = label;
  cell.fill = fill;
  cell.font = WHITE_FONT;
  cell.alignment = { vertical: 'middle', horizontal: 'left' };
}

function applyProjectHeader(ws, project) {
  // Row 1: Title bar
  ws.mergeCells('A1:O1');
  const titleCell = ws.getCell('A1');
  titleCell.value = ws.name.toUpperCase();
  titleCell.fill = PRIMARY_FILL;
  titleCell.font = { ...WHITE_FONT, size: 16 };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  ws.getRow(1).height = 28;

  // Rows 2-4: Project metadata
  const metaRows = [
    ['PROJECT NUMBER', project.project_number],
    ['PROJECT NAME',   project.project_name],
    ['CLIENT',         project.client || ''],
  ];
  metaRows.forEach(([label, value], i) => {
    const row = ws.getRow(i + 2);
    row.getCell(1).value = label;
    row.getCell(1).font = DARK_BOLD_FONT;
    row.getCell(2).value = value;
    row.getCell(2).font = STD_FONT;
    row.height = 16;
  });
  ws.getRow(5).height = 8; // spacer
}

function colHeaderCell(cell, value) {
  cell.value = value;
  cell.fill = PRIMARY_FILL;
  cell.font = WHITE_FONT;
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = ALL_BORDERS;
}

function dataCell(cell, value, fmt) {
  cell.value = value;
  cell.font = STD_FONT;
  cell.border = ALL_BORDERS;
  cell.alignment = { vertical: 'middle', wrapText: true };
  if (fmt) cell.numFmt = fmt;
}

// ─── Cover Sheet ──────────────────────────────────────────────────────────────
function buildCoverSheet(wb, project) {
  const ws = wb.addWorksheet('Cover Sheet');
  ws.columns = [{ width: 25 }, { width: 40 }, { width: 20 }];

  ws.mergeCells('A1:C1');
  const t = ws.getCell('A1');
  t.value = 'PROJECT CONTROL TOOL';
  t.fill = PRIMARY_FILL;
  t.font = { ...WHITE_FONT, size: 20 };
  t.alignment = { vertical: 'middle', horizontal: 'left' };
  ws.getRow(1).height = 36;

  const fields = [
    ['Project Number', project.project_number],
    ['Project Name',   project.project_name],
    ['Client',         project.client || ''],
    ['Author',         project.author || ''],
    ['Date Created',   project.date_created || ''],
    ['Version',        project.version || '1.0'],
    ['Release Status', project.release_status || 'Draft'],
  ];
  fields.forEach(([label, value], i) => {
    const row = ws.getRow(i + 3);
    const a = row.getCell(1);
    a.value = label;
    a.font = DARK_BOLD_FONT;
    a.fill = SECONDARY_FILL;
    a.border = ALL_BORDERS;
    const b = row.getCell(2);
    b.value = value;
    b.font = STD_FONT;
    b.border = ALL_BORDERS;
    row.height = 18;
  });
}

// ─── Deliverables Schedule ────────────────────────────────────────────────────
function buildDeliverablesSheet(wb, project, drawings) {
  const ws = wb.addWorksheet('Deliverables Schedule');
  ws.columns = [
    { width: 20 }, { width: 8 },  { width: 40 }, { width: 10 },
    { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 },
    { width: 12 }, { width: 12 }, { width: 14 }, { width: 8 },
  ];

  applyProjectHeader(ws, project);

  // Column headers row
  const HDR_ROW = 6;
  const hdr = ws.getRow(HDR_ROW);
  hdr.height = 30;
  const cols = ['Drawing Number','Series','Drawing Title','Scale',
    'Issue 1 Date','Issue 2 Date','Issue 3 Date','Issue 4 Date','Issue 5 Date',
    'Complete %','Residual %','Primary Purpose','Procurement','IFC'];
  cols.forEach((h, i) => colHeaderCell(hdr.getCell(i + 1), h));

  // Milestone sub-header
  const mRow = ws.getRow(HDR_ROW + 1);
  mRow.height = 18;
  ISSUE_MILESTONES.forEach((m, i) => {
    const c = mRow.getCell(i + 5);
    c.value = `${m.pct}% — ${m.label}`;
    c.fill = TERTIARY_FILL;
    c.font = STD_FONT;
    c.border = ALL_BORDERS;
    c.alignment = { wrapText: true };
  });

  // Group drawings by discipline
  let currentRow = HDR_ROW + 2;
  const byDisc = {};
  drawings.forEach(d => {
    (byDisc[d.discipline] = byDisc[d.discipline] || []).push(d);
  });

  DISCIPLINES.forEach(disc => {
    const group = byDisc[disc];
    if (!group || group.length === 0) return;

    // Discipline header
    const dRow = ws.getRow(currentRow++);
    dRow.height = 20;
    const dCell = dRow.getCell(1);
    dCell.value = disc.toUpperCase();
    dCell.fill = SECONDARY_FILL;
    dCell.font = DARK_BOLD_FONT;
    dCell.border = ALL_BORDERS;
    ws.mergeCells(`A${dRow.number}:N${dRow.number}`);

    group.forEach(d => {
      const r = ws.getRow(currentRow++);
      r.height = 16;
      [d.drawing_number, d.series, d.drawing_title, d.scale,
        d.issue_1_date, d.issue_2_date, d.issue_3_date, d.issue_4_date, d.issue_5_date,
        d.complete_pct != null ? d.complete_pct / 100 : null,
        d.residual_pct != null ? d.residual_pct / 100 : null,
        d.primary_purpose,
        d.procurement_flag ? 'P' : '',
        d.ifc_flag ? 'IFC' : ''
      ].forEach((val, ci) => {
        const cell = r.getCell(ci + 1);
        cell.value = val;
        cell.font = STD_FONT;
        cell.border = ALL_BORDERS;
        cell.alignment = { vertical: 'middle' };
        if (ci >= 9 && ci <= 10 && val != null) cell.numFmt = '0%';
        if (ci >= 4 && ci <= 8 && val) cell.numFmt = DATE_FMT;
      });
    });
    currentRow++; // spacer row
  });
}

// ─── C2C Sheet ────────────────────────────────────────────────────────────────
function buildC2CSheet(wb, snapshot, allocations, financials, resources) {
  const label = (snapshot.week_label || `Week ${snapshot.week_number}`).slice(0, 31);
  const ws = wb.addWorksheet(label);
  ws.columns = [
    { width: 28 }, { width: 12 }, { width: 14 }, { width: 14 },
    { width: 14 }, { width: 14 },
  ];

  // Project header (rows 1-5)
  ws.mergeCells('A1:F1');
  const t = ws.getCell('A1');
  t.value = 'COSTS TO COMPLETE';
  t.fill = PRIMARY_FILL;
  t.font = { ...WHITE_FONT, size: 16 };
  t.alignment = { vertical: 'middle', horizontal: 'left' };
  ws.getRow(1).height = 28;

  ws.getCell('A2').value = 'Week Label';
  ws.getCell('B2').value = snapshot.week_label;
  ws.getCell('A3').value = 'Snapshot Date';
  ws.getCell('B3').value = snapshot.snapshot_date;
  ws.getCell('A4').value = 'Phase';
  ws.getCell('B4').value = snapshot.phase === 'design' ? 'Design Documentation' : 'Construction Services';
  [2, 3, 4].forEach(r => {
    ws.getRow(r).getCell(1).font = DARK_BOLD_FONT;
    ws.getRow(r).getCell(2).font = STD_FONT;
    ws.getRow(r).height = 16;
  });
  ws.getRow(5).height = 8;

  // Column headers
  const hdr = ws.getRow(6);
  hdr.height = 24;
  ['Resource', 'Rate ($/hr)', 'Utilisation', 'Remaining Wks', 'Hours', 'Cost to Complete'].forEach((h, i) => {
    colHeaderCell(hdr.getCell(i + 1), h);
  });

  let currentRow = 7;

  // Group allocations by discipline
  const byDisc = {};
  allocations.forEach(a => {
    (byDisc[a.discipline] = byDisc[a.discipline] || []).push(a);
  });

  DISCIPLINES.forEach(disc => {
    const group = byDisc[disc];
    if (!group || group.length === 0) return;

    // Discipline section header
    const dRow = ws.getRow(currentRow++);
    dRow.height = 20;
    ws.mergeCells(`A${dRow.number}:F${dRow.number}`);
    const dCell = dRow.getCell(1);
    dCell.value = `${disc} Resource Program`;
    dCell.fill = SECONDARY_FILL;
    dCell.font = DARK_BOLD_FONT;
    dCell.border = ALL_BORDERS;
    dCell.alignment = { vertical: 'middle' };

    group.forEach(a => {
      const r = ws.getRow(currentRow++);
      r.height = 16;
      [
        a.resource_name,
        a.hourly_rate,
        a.weekly_utilisation,
        a.remaining_weeks,
        a.hours_calculated,
        a.cost_calculated,
      ].forEach((val, ci) => {
        const cell = r.getCell(ci + 1);
        cell.value = val;
        cell.font = STD_FONT;
        cell.border = ALL_BORDERS;
        cell.alignment = { vertical: 'middle', horizontal: ci > 0 ? 'right' : 'left' };
        if (ci === 1 || ci === 5) cell.numFmt = CURRENCY_FMT;
        if (ci === 2) cell.numFmt = '0.0';
        if (ci === 3 || ci === 4) cell.numFmt = '0.0';
      });
    });

    // Financial summary for this discipline
    const fin = financials.find(f => f.discipline === disc);
    if (fin) {
      currentRow++; // spacer
      const finRows = [
        ['Agreed Fee', fin.agreed_fee],
        ['Cost at Close (Actual to Date)', fin.cost_at_close],
        ['Net to Carry', fin.net_to_carry],
        ['Construction Doc Cost to Complete', fin.construction_doc_cost_to_complete],
        ['Synergy Net Residual', fin.synergy_net_residual],
        ['Total Net to Carry', fin.total_net_to_carry],
        ['Adjusted Net Residual', fin.adjusted_net_residual],
        ['Under / Over', fin.under_over],
      ];
      finRows.forEach(([label, value]) => {
        const fr = ws.getRow(currentRow++);
        fr.height = 16;
        const la = fr.getCell(1);
        la.value = label;
        la.fill = TERTIARY_FILL;
        la.font = { ...STD_FONT, italic: true };
        la.border = ALL_BORDERS;
        const va = fr.getCell(2);
        va.value = value;
        va.numFmt = CURRENCY_FMT;
        va.font = STD_FONT;
        va.border = ALL_BORDERS;
        va.alignment = { horizontal: 'right' };
      });
      currentRow++; // spacer
    }
  });
}

// ─── Generic register sheet helper ───────────────────────────────────────────
function buildRegisterSheet(wb, sheetName, project, rows, columns) {
  const ws = wb.addWorksheet(sheetName);
  ws.columns = columns.map(c => ({ width: c.width || 20 }));
  applyProjectHeader(ws, project);

  const hdr = ws.getRow(6);
  hdr.height = 26;
  columns.forEach((c, i) => colHeaderCell(hdr.getCell(i + 1), c.header));

  rows.forEach((row, ri) => {
    const r = ws.getRow(7 + ri);
    r.height = 16;
    columns.forEach((c, i) => {
      let val = row[c.key];
      if (c.bool) val = val ? 'Y' : '';
      if (c.currency && val != null) {
        r.getCell(i + 1).numFmt = CURRENCY_FMT;
      }
      dataCell(r.getCell(i + 1), val !== undefined ? val : '');
    });
  });
}

// ─── Approvals Sheet ──────────────────────────────────────────────────────────
function buildApprovalsSheet(wb, project, approvals) {
  buildRegisterSheet(wb, 'Approvals Tracker', project, approvals, [
    { header: 'Item', key: 'item_number', width: 8 },
    { header: 'Description', key: 'description', width: 30 },
    { header: 'Legislation', key: 'legislation', width: 28 },
    { header: 'Authority', key: 'authority', width: 18 },
    { header: 'Application ID', key: 'application_id', width: 16 },
    { header: 'Status', key: 'current_status', width: 16 },
    { header: 'Date Lodged', key: 'date_lodged', width: 14 },
    { header: 'Date Paid', key: 'date_paid', width: 14 },
    { header: 'Properly Made', key: 'date_properly_made', width: 14 },
    { header: 'RFI Date', key: 'rfi_date', width: 12 },
    { header: 'RFI Response', key: 'rfi_response', width: 20 },
    { header: 'Expected', key: 'expected_date', width: 12 },
    { header: 'Next Step', key: 'next_step', width: 28 },
    { header: 'By Who', key: 'responsible_person', width: 16 },
    { header: 'When', key: 'due_date', width: 12 },
    { header: 'Complete', key: 'complete', width: 10, bool: true },
  ]);
}

// ─── Critical Items Sheet ─────────────────────────────────────────────────────
function buildCriticalItemsSheet(wb, project, items) {
  buildRegisterSheet(wb, 'Critical Items Register', project, items, [
    { header: 'Item #', key: 'item_number', width: 8 },
    { header: 'Details', key: 'details', width: 36 },
    { header: 'Agreed Strategy', key: 'agreed_strategy', width: 28 },
    { header: 'Action Step', key: 'action_step', width: 24 },
    { header: 'Responsible', key: 'responsible_person', width: 16 },
    { header: 'Action Date', key: 'action_date', width: 14 },
    { header: 'Date Raised', key: 'date_raised', width: 14 },
    { header: 'Resolution Required', key: 'resolution_required_date', width: 18 },
    { header: 'Date Resolved', key: 'date_resolved', width: 14 },
    { header: 'Status', key: 'status', width: 10 },
    { header: 'Deliverable', key: 'deliverable_affected', width: 20 },
    { header: 'Group', key: 'initiator_group', width: 20 },
  ]);
}

// ─── Design Change Sheet ──────────────────────────────────────────────────────
function buildDesignChangeSheet(wb, project, items) {
  buildRegisterSheet(wb, 'Design Change Register', project, items, [
    { header: 'Item #', key: 'item_number', width: 8 },
    { header: 'Date Requested', key: 'date_requested', width: 14 },
    { header: 'Type', key: 'change_type', width: 18 },
    { header: 'Initiator', key: 'initiator_name', width: 18 },
    { header: 'Discipline', key: 'discipline', width: 14 },
    { header: 'Change Details', key: 'change_details', width: 36 },
    { header: 'Reason', key: 'reason', width: 28 },
    { header: 'Area/Location', key: 'area_location', width: 18 },
    { header: 'Doc Ref', key: 'document_reference', width: 14 },
    { header: 'Var Ref', key: 'variation_reference', width: 12 },
    { header: 'Status', key: 'status', width: 18 },
    { header: 'Client Cost?', key: 'client_cost_impact', width: 12, bool: true },
    { header: 'Risk Change?', key: 'risk_assessment_change', width: 12, bool: true },
    { header: 'Client Comments', key: 'client_comments', width: 28 },
    { header: 'Arch Fees', key: 'arch_fees', width: 12, currency: true },
    { header: 'Struc Fees', key: 'struc_fees', width: 12, currency: true },
    { header: 'Civil Fees', key: 'civil_fees', width: 12, currency: true },
    { header: 'Hyd Fees', key: 'hyd_fees', width: 12, currency: true },
    { header: 'Certifier', key: 'certifier_fees', width: 12, currency: true },
    { header: 'L\'scape', key: 'lscape_fees', width: 12, currency: true },
    { header: 'Fire Eng', key: 'fire_eng_fees', width: 12, currency: true },
    { header: 'Fire Svcs', key: 'fire_services_fees', width: 12, currency: true },
    { header: 'Builder DM', key: 'builder_dm_fees', width: 12, currency: true },
    { header: 'Group', key: 'initiator_group', width: 22 },
  ]);
}

// ─── Risk Sheet ───────────────────────────────────────────────────────────────
function buildRiskSheet(wb, project, items) {
  buildRegisterSheet(wb, 'Risk & Issue Register', project, items, [
    { header: 'Issue ID', key: 'issue_id_text', width: 12 },
    { header: 'Type', key: 'issue_type', width: 10 },
    { header: 'Date Raised', key: 'date_raised', width: 14 },
    { header: 'Raised By', key: 'raised_by', width: 16 },
    { header: 'Author', key: 'author', width: 16 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Priority', key: 'priority', width: 10 },
    { header: 'Severity', key: 'severity', width: 12 },
    { header: 'Likelihood', key: 'risk_likelihood', width: 16 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Last Updated', key: 'last_updated', width: 14 },
    { header: 'Closure Date', key: 'closure_date', width: 14 },
  ]);
}

// ─── RFI Sheet ────────────────────────────────────────────────────────────────
function buildRFISheet(wb, project, items) {
  buildRegisterSheet(wb, 'RFIs', project, items, [
    { header: 'RFI No.', key: 'rfi_number', width: 10 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Date Received', key: 'date_received', width: 14 },
    { header: 'Client Deadline', key: 'client_deadline', width: 14 },
    { header: 'Outstanding Action', key: 'outstanding_action', width: 30 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Closed Date', key: 'closed_date', width: 14 },
    { header: 'EOT Ref', key: 'eot_ref', width: 12 },
    { header: 'VAR Ref', key: 'var_ref', width: 12 },
  ]);
}

// ─── Lessons Sheet ────────────────────────────────────────────────────────────
function buildLessonsSheet(wb, project, items) {
  buildRegisterSheet(wb, 'Lessons Learnt', project, items, [
    { header: 'Item', key: 'item_number', width: 8 },
    { header: 'Event Details', key: 'event_details', width: 36 },
    { header: 'Effect', key: 'effect', width: 20 },
    { header: 'Cause', key: 'cause', width: 24 },
    { header: 'Early Warnings?', key: 'early_warnings', width: 18 },
    { header: 'Prev. Identified?', key: 'previously_identified', width: 16, bool: true },
    { header: 'Future Recommendation', key: 'future_recommendation', width: 32 },
    { header: 'Action Step Ref', key: 'action_step_ref', width: 14 },
    { header: 'Action Details', key: 'action_details', width: 28 },
    { header: 'Logged By', key: 'logged_by', width: 14 },
    { header: 'Logged Date', key: 'logged_date', width: 14 },
    { header: 'Priority', key: 'priority', width: 10 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Responsible', key: 'responsible_person', width: 16 },
  ]);
}

// ─── SiD Sheet ────────────────────────────────────────────────────────────────
function buildSiDSheet(wb, project, items) {
  buildRegisterSheet(wb, 'SiD Register', project, items, [
    { header: 'Ref #', key: 'ref_number', width: 10 },
    { header: 'Element/Activity', key: 'element_activity', width: 24 },
    { header: 'Hazard', key: 'hazard', width: 28 },
    { header: 'Potential Harm', key: 'potential_harm', width: 24 },
    { header: 'Likelihood', key: 'likelihood', width: 16 },
    { header: 'Outcome', key: 'outcome', width: 14 },
    { header: 'Risk Rating', key: 'risk_rating', width: 14 },
    { header: 'Action Required', key: 'action_required', width: 30 },
    { header: 'Action By', key: 'action_by', width: 16 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Architect Notes', key: 'architect_notes', width: 30 },
    { header: 'Category', key: 'category', width: 18 },
  ]);
}

// ─── Value Log Sheet ──────────────────────────────────────────────────────────
function buildValueLogSheet(wb, project, items) {
  buildRegisterSheet(wb, 'Value Log', project, items, [
    { header: 'File', key: 'file_ref', width: 12 },
    { header: 'Job', key: 'job_ref', width: 12 },
    { header: 'Item', key: 'item_number', width: 8 },
    { header: 'Description', key: 'description', width: 36 },
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Who', key: 'who', width: 14 },
    { header: 'Team', key: 'team', width: 16 },
    { header: 'Value ($)', key: 'value_amount', width: 14, currency: true },
    { header: 'Communicated Date', key: 'communicated_date', width: 18 },
    { header: 'How', key: 'communicated_how', width: 20 },
    { header: 'Approved', key: 'approved', width: 10, bool: true },
  ]);
}

// ─── Brief Compliance Sheet ───────────────────────────────────────────────────
function buildBriefComplianceSheet(wb, project, items) {
  buildRegisterSheet(wb, 'Brief Compliance Register', project, items, [
    { header: 'Spec No.', key: 'spec_number', width: 10 },
    { header: 'Location', key: 'location', width: 20 },
    { header: 'Clause', key: 'clause', width: 16 },
    { header: 'Brief Item', key: 'brief_item', width: 40 },
    { header: 'Discipline', key: 'discipline', width: 14 },
    { header: 'Compliant', key: 'compliant', width: 10, bool: true },
    { header: 'Deviation', key: 'deviation', width: 10, bool: true },
    { header: 'Comments', key: 'comments', width: 30 },
    { header: 'Client Response', key: 'client_response', width: 28 },
    { header: 'Counter Response', key: 'counter_response', width: 28 },
    { header: 'Source Document', key: 'source_document', width: 28 },
  ]);
}

// ─── Main workbook builder ────────────────────────────────────────────────────
async function buildWorkbook(projectId) {
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  const drawings = db.prepare('SELECT * FROM drawings WHERE project_id = ? ORDER BY discipline, sort_order').all(projectId);
  const resources = db.prepare('SELECT * FROM team_resources WHERE project_id = ? ORDER BY discipline, sort_order').all(projectId);
  const snapshots = db.prepare('SELECT * FROM c2c_snapshots WHERE project_id = ? ORDER BY phase, week_number').all(projectId);
  const approvals = db.prepare('SELECT * FROM approvals WHERE project_id = ? ORDER BY sort_order, id').all(projectId);
  const critItems = db.prepare('SELECT * FROM critical_items WHERE project_id = ? ORDER BY initiator_group, id').all(projectId);
  const designChgs = db.prepare('SELECT * FROM design_changes WHERE project_id = ? ORDER BY initiator_group, id').all(projectId);
  const risks = db.prepare('SELECT * FROM risks WHERE project_id = ? ORDER BY id').all(projectId);
  const rfis = db.prepare('SELECT * FROM rfis WHERE project_id = ? ORDER BY rfi_number').all(projectId);
  const lessons = db.prepare('SELECT * FROM lessons_learnt WHERE project_id = ? ORDER BY id').all(projectId);
  const sidItems = db.prepare('SELECT * FROM sid_hazards WHERE project_id = ? ORDER BY category, id').all(projectId);
  const valueItems = db.prepare('SELECT * FROM value_log WHERE project_id = ? ORDER BY date, id').all(projectId);
  const briefItems = db.prepare('SELECT * FROM brief_compliance WHERE project_id = ? ORDER BY source_document, id').all(projectId);

  const wb = new ExcelJS.Workbook();
  wb.creator = project.author || 'PCT App';
  wb.created = new Date();

  buildCoverSheet(wb, project);
  buildDeliverablesSheet(wb, project, drawings);

  // C2C sheets — one per snapshot
  for (const snap of snapshots) {
    const allocations = db.prepare(`
      SELECT cra.*, tr.name as resource_name, tr.discipline, tr.hourly_rate
      FROM c2c_resource_allocations cra
      JOIN team_resources tr ON tr.id = cra.resource_id
      WHERE cra.snapshot_id = ?
      ORDER BY tr.discipline, tr.sort_order
    `).all(snap.id);
    const financials = db.prepare('SELECT * FROM c2c_discipline_financials WHERE snapshot_id = ?').all(snap.id);
    buildC2CSheet(wb, snap, allocations, financials, resources);
  }

  buildApprovalsSheet(wb, project, approvals);
  buildCriticalItemsSheet(wb, project, critItems);
  buildBriefComplianceSheet(wb, project, briefItems);
  buildDesignChangeSheet(wb, project, designChgs);
  buildRiskSheet(wb, project, risks);
  buildRFISheet(wb, project, rfis);
  buildLessonsSheet(wb, project, lessons);
  buildSiDSheet(wb, project, sidItems);
  buildValueLogSheet(wb, project, valueItems);

  return wb;
}

module.exports = { buildWorkbook };
