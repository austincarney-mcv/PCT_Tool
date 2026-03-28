-- ============================================================
-- PCT DATABASE SCHEMA — SQLite via better-sqlite3
-- PRAGMA foreign_keys = ON is set on every connection open
-- All date fields: TEXT in ISO-8601 format (YYYY-MM-DD)
-- ============================================================

CREATE TABLE IF NOT EXISTS projects (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    project_number  TEXT    NOT NULL UNIQUE,
    project_name    TEXT    NOT NULL,
    client          TEXT,
    author          TEXT,
    date_created    TEXT    NOT NULL DEFAULT (date('now')),
    version         TEXT    NOT NULL DEFAULT '1.0',
    release_status  TEXT    NOT NULL DEFAULT 'Draft'
                    CHECK (release_status IN ('Draft','Issued','Archived')),
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- -------------------------------------------------------
-- TEAM RESOURCES (per project — used by C2C)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_resources (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id   INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name         TEXT    NOT NULL,
    discipline   TEXT    NOT NULL
                 CHECK (discipline IN (
                     'Architecture','Civil','Structural','Hydraulics',
                     'Landscaping','Certifier','Fire Engineering',
                     'Fire Services','Builder/CM'
                 )),
    hourly_rate  REAL    NOT NULL CHECK (hourly_rate >= 0),
    sort_order   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_team_resources_project
    ON team_resources(project_id);

-- -------------------------------------------------------
-- DRAWINGS / DELIVERABLES SCHEDULE
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS drawings (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id        INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    discipline        TEXT    NOT NULL,
    series            TEXT,
    drawing_number    TEXT    NOT NULL,
    drawing_title     TEXT    NOT NULL,
    scale             TEXT,
    issue_1_date      TEXT,
    issue_2_date      TEXT,
    issue_3_date      TEXT,
    issue_4_date      TEXT,
    issue_5_date      TEXT,
    complete_pct      REAL    DEFAULT 0 CHECK (complete_pct BETWEEN 0 AND 100),
    residual_pct      REAL    DEFAULT 0 CHECK (residual_pct BETWEEN 0 AND 100),
    primary_purpose   TEXT,
    procurement_flag  INTEGER NOT NULL DEFAULT 0 CHECK (procurement_flag IN (0,1)),
    ifc_flag          INTEGER NOT NULL DEFAULT 0 CHECK (ifc_flag IN (0,1)),
    sort_order        INTEGER NOT NULL DEFAULT 0,
    UNIQUE (project_id, drawing_number)
);
CREATE INDEX IF NOT EXISTS idx_drawings_project
    ON drawings(project_id);
CREATE INDEX IF NOT EXISTS idx_drawings_discipline
    ON drawings(project_id, discipline);

-- -------------------------------------------------------
-- C2C SNAPSHOTS (weekly, immutable once created)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS c2c_snapshots (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id       INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    phase            TEXT    NOT NULL CHECK (phase IN ('design','construction')),
    week_number      INTEGER NOT NULL CHECK (week_number >= 1),
    snapshot_date    TEXT    NOT NULL,
    week_label       TEXT    NOT NULL,
    snapshot_locked  INTEGER NOT NULL DEFAULT 1 CHECK (snapshot_locked IN (0,1)),
    created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
    submission_status TEXT    NOT NULL DEFAULT 'draft'
                      CHECK (submission_status IN ('draft','submitted')),
    submitted_at      TEXT,
    submitted_by      TEXT,
    unlock_reason     TEXT,
    UNIQUE (project_id, phase, week_number)
);
CREATE INDEX IF NOT EXISTS idx_c2c_snapshots_project
    ON c2c_snapshots(project_id, phase);

-- -------------------------------------------------------
-- C2C RESOURCE ALLOCATIONS (per snapshot, per resource)
-- hours_calculated is a SQLite STORED generated column
-- cost_calculated is set by the service (requires JOIN to team_resources.hourly_rate)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS c2c_resource_allocations (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_id          INTEGER NOT NULL REFERENCES c2c_snapshots(id) ON DELETE CASCADE,
    resource_id          INTEGER NOT NULL REFERENCES team_resources(id) ON DELETE RESTRICT,
    weekly_utilisation   REAL    NOT NULL DEFAULT 0
                         CHECK (weekly_utilisation BETWEEN 0.0 AND 1.0),
    remaining_weeks      REAL    NOT NULL DEFAULT 0 CHECK (remaining_weeks >= 0),
    hours_calculated     REAL    GENERATED ALWAYS AS
                         (weekly_utilisation * 37.5 * remaining_weeks) STORED,
    cost_calculated      REAL    NOT NULL DEFAULT 0,
    UNIQUE (snapshot_id, resource_id)
);
CREATE INDEX IF NOT EXISTS idx_c2c_alloc_snapshot
    ON c2c_resource_allocations(snapshot_id);

-- -------------------------------------------------------
-- C2C DISCIPLINE FINANCIALS (per snapshot, per discipline)
-- adjusted_net_residual and under_over are STORED generated columns
-- for immutable historical accuracy
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS c2c_discipline_financials (
    id                                INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_id                       INTEGER NOT NULL REFERENCES c2c_snapshots(id) ON DELETE CASCADE,
    discipline                        TEXT    NOT NULL
                                      CHECK (discipline IN (
                                          'Architecture','Civil','Structural','Hydraulics',
                                          'Landscaping','Certifier','Fire Engineering',
                                          'Fire Services','Builder/CM'
                                      )),
    agreed_fee                        REAL    NOT NULL DEFAULT 0,
    cost_at_close                     REAL    NOT NULL DEFAULT 0,
    net_to_carry                      REAL    NOT NULL DEFAULT 0,
    -- Design phase: Synergy system's reported remaining budget.
    -- TODO: synergy_net_residual is hidden in the CS phase view but preserved here.
    --       May be swapped with fee_less_wip or merged once the external DB link is built. Revisit.
    synergy_net_residual              REAL    NOT NULL DEFAULT 0,
    total_net_to_carry                REAL    NOT NULL DEFAULT 0,
    adjusted_net_residual             REAL    GENERATED ALWAYS AS
                                      (synergy_net_residual - total_net_to_carry) STORED,
    construction_doc_cost_to_complete REAL    NOT NULL DEFAULT 0,
    under_over                        REAL    GENERATED ALWAYS AS
                                      ((synergy_net_residual - total_net_to_carry)
                                       - construction_doc_cost_to_complete) STORED,
    -- Construction Services phase: remaining fee not yet earned (Fee minus WIP billed).
    -- TODO: Placeholder default of $1,000 per discipline. Needs to be connected to the
    --       external finance/billing database once that integration is scoped. Revisit.
    fee_less_wip                      REAL    NOT NULL DEFAULT 1000,
    UNIQUE (snapshot_id, discipline)
);
CREATE INDEX IF NOT EXISTS idx_c2c_financials_snapshot
    ON c2c_discipline_financials(snapshot_id);

-- -------------------------------------------------------
-- APPROVALS TRACKER
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS approvals (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id            INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    item_number           TEXT,
    description           TEXT    NOT NULL,
    legislation           TEXT,
    authority             TEXT,
    application_id        TEXT,
    current_status        TEXT,
    date_lodged           TEXT,
    date_paid             TEXT,
    date_properly_made    TEXT,
    rfi_date              TEXT,
    rfi_response          TEXT,
    expected_date         TEXT,
    next_step             TEXT,
    responsible_person    TEXT,
    due_date              TEXT,
    complete              INTEGER NOT NULL DEFAULT 0 CHECK (complete IN (0,1)),
    category              TEXT,
    sort_order            INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_approvals_project
    ON approvals(project_id);

-- -------------------------------------------------------
-- CRITICAL ITEMS REGISTER
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS critical_items (
    id                        INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id                INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    item_number               TEXT,
    details                   TEXT    NOT NULL,
    agreed_strategy           TEXT,
    action_step               TEXT,
    responsible_person        TEXT,
    action_date               TEXT,
    date_raised               TEXT,
    resolution_required_date  TEXT,
    date_resolved             TEXT,
    status                    TEXT    NOT NULL DEFAULT 'OPEN'
                              CHECK (status IN ('OPEN','CLOSED')),
    deliverable_affected      TEXT,
    initiator_group           TEXT
);
CREATE INDEX IF NOT EXISTS idx_critical_items_project
    ON critical_items(project_id);
CREATE INDEX IF NOT EXISTS idx_critical_items_status
    ON critical_items(project_id, status);

-- -------------------------------------------------------
-- DESIGN CHANGE REGISTER
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS design_changes (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id              INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    item_number             TEXT,
    date_requested          TEXT,
    change_type             TEXT
                            CHECK (change_type IN (
                                'Design Change','Design Development','Variation'
                            )),
    initiator_name          TEXT,
    discipline              TEXT,
    change_details          TEXT,
    reason                  TEXT,
    area_location           TEXT,
    document_reference      TEXT,
    variation_reference     TEXT,
    status                  TEXT    NOT NULL DEFAULT 'Yet to be submitted'
                            CHECK (status IN (
                                'Approved','Submitted','Rejected','Yet to be submitted'
                            )),
    client_cost_impact      INTEGER NOT NULL DEFAULT 0 CHECK (client_cost_impact IN (0,1)),
    risk_assessment_change  INTEGER NOT NULL DEFAULT 0 CHECK (risk_assessment_change IN (0,1)),
    client_comments         TEXT,
    arch_fees               REAL    DEFAULT 0,
    struc_fees              REAL    DEFAULT 0,
    civil_fees              REAL    DEFAULT 0,
    hyd_fees                REAL    DEFAULT 0,
    certifier_fees          REAL    DEFAULT 0,
    lscape_fees             REAL    DEFAULT 0,
    fire_eng_fees           REAL    DEFAULT 0,
    fire_services_fees      REAL    DEFAULT 0,
    builder_dm_fees         REAL    DEFAULT 0,
    initiator_group         TEXT
);
CREATE INDEX IF NOT EXISTS idx_design_changes_project
    ON design_changes(project_id);

-- -------------------------------------------------------
-- RISK & ISSUE REGISTER
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS risks (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id       INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    issue_id_text    TEXT,
    issue_type       TEXT    CHECK (issue_type IN ('RFC','OS','P',NULL)),
    date_raised      TEXT,
    raised_by        TEXT,
    author           TEXT,
    description      TEXT    NOT NULL,
    priority         TEXT    CHECK (priority IN ('Low','Med','High',NULL)),
    severity         TEXT,
    risk_likelihood  TEXT    CHECK (risk_likelihood IN (
                         'Almost Certain','Likely','Possible','Unlikely','Very Unlikely',NULL
                     )),
    status           TEXT    NOT NULL DEFAULT 'Open',
    last_updated     TEXT,
    closure_date     TEXT
);
CREATE INDEX IF NOT EXISTS idx_risks_project
    ON risks(project_id);

-- -------------------------------------------------------
-- RFI LOG
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS rfis (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id          INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    rfi_number          TEXT    NOT NULL,
    description         TEXT,
    date_received       TEXT,
    client_deadline     TEXT,
    outstanding_action  TEXT,
    status              TEXT    NOT NULL DEFAULT 'Open',
    closed_date         TEXT,
    eot_ref             TEXT,
    var_ref             TEXT,
    UNIQUE (project_id, rfi_number)
);
CREATE INDEX IF NOT EXISTS idx_rfis_project
    ON rfis(project_id);

-- -------------------------------------------------------
-- LESSONS LEARNT
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS lessons_learnt (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id             INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    item_number            TEXT,
    event_details          TEXT    NOT NULL,
    effect                 TEXT,
    cause                  TEXT,
    early_warnings         TEXT,
    previously_identified  INTEGER NOT NULL DEFAULT 0 CHECK (previously_identified IN (0,1)),
    future_recommendation  TEXT,
    action_step_ref        TEXT,
    action_details         TEXT,
    logged_by              TEXT,
    logged_date            TEXT,
    priority               TEXT    CHECK (priority IN ('Low','Med','High',NULL)),
    status                 TEXT    NOT NULL DEFAULT 'Open',
    responsible_person     TEXT
);
CREATE INDEX IF NOT EXISTS idx_lessons_project
    ON lessons_learnt(project_id);

-- -------------------------------------------------------
-- SiD HAZARD REGISTER (Safety in Design)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS sid_hazards (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id       INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    ref_number       TEXT,
    element_activity TEXT,
    hazard           TEXT    NOT NULL,
    potential_harm   TEXT,
    likelihood       TEXT    CHECK (likelihood IN (
                         'Almost Certain','Likely','Possible','Unlikely','Very Unlikely',NULL
                     )),
    outcome          TEXT    CHECK (outcome IN (
                         'Catastrophic','Major','Moderate','Minor','Insignificant',NULL
                     )),
    risk_rating      TEXT    CHECK (risk_rating IN (
                         'Extreme','Significant','Moderate','Low','Negligible',NULL
                     )),
    action_required  TEXT,
    action_by        TEXT,
    status           TEXT    NOT NULL DEFAULT 'Open',
    architect_notes  TEXT,
    category         TEXT
);
CREATE INDEX IF NOT EXISTS idx_sid_project
    ON sid_hazards(project_id);

-- -------------------------------------------------------
-- VALUE LOG
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS value_log (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id         INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    file_ref           TEXT,
    job_ref            TEXT,
    item_number        TEXT,
    description        TEXT    NOT NULL,
    date               TEXT,
    who                TEXT,
    team               TEXT,
    value_amount       REAL    DEFAULT 0,
    communicated_date  TEXT,
    communicated_how   TEXT,
    approved           INTEGER NOT NULL DEFAULT 0 CHECK (approved IN (0,1))
);
CREATE INDEX IF NOT EXISTS idx_value_log_project
    ON value_log(project_id);

-- -------------------------------------------------------
-- BRIEF COMPLIANCE REGISTER
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS brief_compliance (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id        INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    spec_number       TEXT,
    location          TEXT,
    clause            TEXT,
    brief_item        TEXT    NOT NULL,
    discipline        TEXT,
    compliant         INTEGER NOT NULL DEFAULT 0 CHECK (compliant IN (0,1)),
    deviation         INTEGER NOT NULL DEFAULT 0 CHECK (deviation IN (0,1)),
    comments          TEXT,
    client_response   TEXT,
    counter_response  TEXT,
    source_document   TEXT
);
CREATE INDEX IF NOT EXISTS idx_brief_compliance_project
    ON brief_compliance(project_id);
