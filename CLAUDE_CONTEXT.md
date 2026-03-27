# Project Control Tool (PCT) — Claude Code Context Document

## Overview

This project is a **web application** (or desktop tool) that digitises and modernises an existing Excel-based Project Control Tool used by an architectural/engineering consultancy. The source file is:

```
C:\Users\austin.carney\Projects\014_PCT_App\10162 - Project Control Tool.xlsx
```

The Excel workbook was built to manage a single construction project (Project 10162 — Lot 31, The Hub, Heathwood, for client Prekaro Projects). The app should generalise this into a **multi-project platform** that replicates all the functionality of the Excel tool in a more usable, scalable form.

---

## Source Excel File Structure

The workbook contains **32 sheets**. They fall into the following functional groups:

### 1. Project Identity Sheets
| Sheet | Purpose |
|-------|---------|
| `Cover Sheet` | Project metadata: name, number, client, author, version, date |

### 2. Deliverables Schedule
| Sheet | Purpose |
|-------|---------|
| `Deliverables Schedule` | Master drawing register. Lists every drawing by number, title, and scale across disciplines (Architecture, Civil, Structural, etc.). Tracks 5 planned issue rounds with dates and % complete milestones (60%, 70%, 80%, 90%, 100%). Columns include: Drawing Number, Drawing Title, Scale, Issue No., Issue Date, Primary Purpose, Procurement flag, IFC flag, Complete %, Residual % |

### 3. Cost to Complete (C2C) — Design Phase
These sheets track **weekly fee burn and remaining cost to complete** during the design documentation phase (Sept–Nov 2025).

| Sheet | Purpose |
|-------|---------|
| `Cost to Complete - Start` | Baseline/Week 1 snapshot |
| `C2C Week 2` through `C2C Week 12` | Weekly snapshots (weeks 2, 3, 4, 5, 6, 9, 10, 11, 12) |

**Each C2C sheet contains:**
- Project header (number, name, client)
- Issue schedule header: Issue No., % Complete, Issue Date, Primary Purpose, Procurement milestones, IFC milestones
- **Team Resourcing table** broken down by discipline (Architecture, Civil, Structural, Hydraulics, Landscaping, etc.):
  - Resource name (e.g. Michael McVeigh, Sonya Butt, Elliot Blucher)
  - Hourly rate (e.g. $488, $244, $284)
  - Weekly utilisation fraction (0.0 to 1.0, where 1.0 = full week)
  - Auto-calculated: Total Hours remaining, Cost to Complete
- **Financial summary** per discipline:
  - Agreed Fee
  - Cost at Close (actual spent to date)
  - Net to Carry (fee surplus/deficit from previous phases)
  - Construction Documentation Cost to Complete (sum of remaining resource costs)
  - Synergy Net Residual (fee balance)
  - Total Net to Carry
  - Adjusted Net Residual
  - Under/Over (variance)

### 4. Cost to Complete (C2C) — Construction Services Phase
| Sheet | Purpose |
|-------|---------|
| `CS C2C Week 1` through `CS C2C Week 12` | Same structure as design C2C but for the construction administration phase (Dec 2026–May 2027, W1–W21) |

These sheets are largely unpopulated (template stage), indicating the construction phase had not yet begun at the time of the file snapshot.

### 5. Approvals Tracker
| Sheet | Purpose |
|-------|---------|
| `Approvals Tracker` | Tracks all statutory approvals required under Queensland legislation |

**Columns:** Item No., Description, Governing Legislation & Relevant Act, Authority, Application ID, Current Status, Date Application Lodged, Date Application Paid, Date Application Properly Made, RFI Date, RFI Response, Expected, Next Step, By Who, When, Complete

**Approval categories tracked:**
1. Development Approval (Planning Act)
2. Operational Works — Earthworks, Stormwater
3. Building Approval — QFES, QLEAVE, Building Approval, Build Over Sewer/Stormwater, Certificate of Occupancy
4. Plumbing Approval
5. UU/UW Water & Sewer Connections (Unity Water)
6. NBN
7. Telstra

### 6. Critical Items Register
| Sheet | Purpose |
|-------|---------|
| `Critical Items Register` | Action log for unresolved or high-priority design/coordination issues |

**Columns:** Item No., Details, Agreed Strategy Moving Forward, Action Step, Action Item Person Responsible, Action Item Date, Date Issue Raised, Date Issue Resolution Required, Date Resolved, Status (OPEN/CLOSED), Deliverable Issue Affected

Items are grouped by initiator: Prekaro Projects Critical Issues, Architectural Critical Issues, etc.

### 7. Brief Compliance Register
| Sheet | Purpose |
|-------|---------|
| `Brief Compliance Register` | Checks each item from the original client design brief against actual design decisions |

**Columns:** Spec No., Location, Clause, Brief Item, Discipline, Compliant (Y/blank), Deviation (Y/blank), Comments, Client Response, McVeigh Counter Response

Items are sourced from named brief documents (e.g. "Design Meeting 10.09.2025 - email from Robert Walsh").

### 8. Design Change Register
| Sheet | Purpose |
|-------|---------|
| `Design Change Register` | Logs all changes to the design after the original brief was set |

**Columns:** Item #, Date Requested, Type of Change (Design Change / Design Development / Variation), Change Initiator (Name), Discipline, Design Change Details, Reason for Change, Area/Location, Document Reference, Variation Reference, Status (Approved/Submitted/Rejected/Yet to be submitted), Client Cost Impact?, Project Risk Assessment Change?, Client/Design Comments & Acceptance/Approval, Fee Impact columns: Arch Fees, Struc Fees, Civil Fees, Hyd Fees, Certifier Fees, L'scape Fees, Fire Eng Fees, Fire Services, McNab DM

Items grouped into: Prekaro Design Changes, Design Team Design Changes, Client Design Changes.

### 9. Risk & Issue Register
| Sheet | Purpose |
|-------|---------|
| `Risk & Issue Register` | Structured project risk log |

**Columns:** Issue ID, Issue Type (RFC/OS/P), Date Raised, Raised By, Issue Report Author, Description, Priority, Severity, Risk Likelihood, Status, Date of Last Update, Closure Date

Mostly template/unpopulated — ready for use.

### 10. RFIs (Requests for Information)
| Sheet | Purpose |
|-------|---------|
| `RFIs` | Tracks contractor RFIs during construction |

**Columns:** RFI No., Description, Date Received, Client Deadline, Current Outstanding Action, Status, Closed Date, EOT Ref, VAR Ref

### 11. Lessons Learnt
| Sheet | Purpose |
|-------|---------|
| `Lessons Learnt` | Documents design/project issues for future quality improvement |

**Columns:** Item, Client Ref, Details of the Event, Effect (time/cost/design/reputation), Causes/Trigger, Early Warnings?, Previously Identified?, Future Recommendation, Action Step Ref, Action Step Details, Logged By, Logged Date, Priority, Status, Person Responsible (follow-up)

One entry exists: Fire rating issue for structural steel (Type A construction requirement identified late).

### 12. SiD Register (Safety in Design)
| Sheet | Purpose |
|-------|---------|
| `SiD Register` | WHS design-phase hazard register — required under Australian safety law |

**Columns:** Ref #, Element/Activity, Hazard, Potential Harm, Likelihood, Outcome, Risk Rating, Action Required, Action By, Status, Architect Notes/DWG & Doc Ref

Hazard categories: Site (Ground Conditions, Existing Services, Flooding, etc.), Structure, Materials, Mechanical/Electrical, etc.

Risk ratings calculated from a 5×5 matrix (Likelihood × Consequence):
- Likelihood: Almost Certain / Likely / Possible / Unlikely / Very Unlikely
- Outcome: Catastrophic / Major / Moderate / Minor / Insignificant
- Rating: Extreme / Significant / Moderate / Low / Negligible

### 13. Value Log
| Sheet | Purpose |
|-------|---------|
| `Value Log` | Captures value-engineering opportunities and savings communicated to the client |

**Columns:** File, Job, Item, Description, Date, Who, Team, Value ($), When Communicated to Client, How, Approved

### 14. Reference Sheets
| Sheet | Purpose |
|-------|---------|
| `Risk_Matrix - reference only` | 5×5 risk matrix used by SiD and Risk registers |
| `TEMPCIVIL` | Staging area for civil drawing register — lists civil drawings by number and title |

---

## Key Data Entities

When building the app, these are the core data models to implement:

### Project
```
id, project_number, project_name, client, author, date_created, version, release_status
```

### Drawing (Deliverable)
```
id, project_id, discipline, series, drawing_number, drawing_title, scale,
issue_1_date, issue_2_date, issue_3_date, issue_4_date, issue_5_date,
complete_pct, residual_pct, primary_purpose, procurement_flag, ifc_flag
```

### Team Resource
```
id, project_id, name, discipline, hourly_rate
```

### C2C Snapshot (weekly fee tracking)
```
id, project_id, phase (design|construction), week_number, snapshot_date,
resource_id, weekly_utilisation (0.0-1.0), remaining_hours, cost_to_complete,
agreed_fee, cost_at_close, net_to_carry, synergy_net_residual, adjusted_net_residual, under_over
```

### Approval
```
id, project_id, item_number, description, legislation, authority, application_id,
current_status, date_lodged, date_paid, date_properly_made,
rfi_date, rfi_response, expected_date, next_step, responsible_person, due_date, complete
```

### Critical Item
```
id, project_id, item_number, details, agreed_strategy, action_step,
responsible_person, action_date, date_raised, resolution_required_date,
date_resolved, status (OPEN|CLOSED), deliverable_affected
```

### Design Change
```
id, project_id, item_number, date_requested, change_type (Design Change|Design Development|Variation),
initiator_name, discipline, change_details, reason, area_location, document_reference,
variation_reference, status (Approved|Submitted|Rejected|Pending),
client_cost_impact (bool), risk_assessment_change (bool), client_comments,
arch_fees, struc_fees, civil_fees, hyd_fees, certifier_fees, lscape_fees,
fire_eng_fees, fire_services_fees, builder_dm_fees
```

### Risk / Issue
```
id, project_id, issue_id, issue_type, date_raised, raised_by, author,
description, priority (Low|Med|High), severity, risk_likelihood, status, 
last_updated, closure_date
```

### RFI
```
id, project_id, rfi_number, description, date_received, client_deadline,
outstanding_action, status, closed_date, eot_ref, var_ref
```

### Lesson Learnt
```
id, project_id, item_number, event_details, effect, cause, early_warnings,
previously_identified, future_recommendation, action_step_ref, action_details,
logged_by, logged_date, priority, status, responsible_person
```

### SiD Hazard
```
id, project_id, ref_number, element_activity, hazard, potential_harm,
likelihood, outcome, risk_rating, action_required, action_by, status, architect_notes
```

### Value Log Entry
```
id, project_id, file_ref, job_ref, item_number, description, date,
who, team, value_amount, communicated_date, communicated_how, approved (bool)
```

### Brief Compliance Item
```
id, project_id, spec_number, location, clause, brief_item, discipline,
compliant (bool), deviation (bool), comments, client_response, counter_response
```

---

## Business Logic Notes

### C2C Cost Calculation
- Each resource has a fixed hourly rate
- Weekly utilisation is a fraction of a standard week (assumed 37.5 hrs)
- Hours = utilisation × 37.5 × remaining_weeks
- Cost to Complete = sum(hours × rate) per resource per discipline
- Adjusted Net Residual = Synergy Net Residual − Total Net to Carry
- Under/Over = Adjusted Net Residual − Cost to Complete

### Issue Milestones
5 planned drawing issue rounds:
- Issue 1: 60% complete — Design Development
- Issue 2: 70% complete — Coordination
- Issue 3: 80% complete — BA & Coordination / Structural & Civil Procurement
- Issue 4: 90% complete — Final Coordination / Fitout Procurement / Struc & Civil IFC
- Issue 5: 100% complete — Final IFC (Issued for Construction)

### Disciplines Tracked
Architecture, Civil, Structural, Hydraulics, Landscaping, Certifier, Fire Engineering, Fire Services, Builder/Construction Manager

### Queensland Regulatory Context
This tool is designed for Queensland, Australia construction projects. Approvals reference:
- Planning Act (Development Approval)
- Building Act / Building Regulation / National Construction Code / Queensland Development Code
- Plumbing and Drainage Act
- Water Supply Act (Unity Water)

---

## Suggested App Architecture

### Recommended Tech Stack
- **Frontend:** React + TypeScript, Tailwind CSS
- **Backend:** Node.js/Express or Python/FastAPI
- **Database:** PostgreSQL (relational data with strong FK relationships)
- **File Import:** xlsx/openpyxl for initial Excel import
- **Auth:** Simple JWT or session-based for multi-user access

### Core Feature Modules (priority order)
1. **Project Dashboard** — summary view of all active projects with key status indicators
2. **C2C Fee Tracker** — weekly resourcing and fee burn with charts (under/over trend)
3. **Deliverables Schedule** — drawing register with issue tracking
4. **Approvals Tracker** — status board for statutory approvals
5. **Critical Items Register** — kanban or table view with OPEN/CLOSED filter
6. **Design Change Register** — with fee impact rollup per discipline
7. **Brief Compliance Register** — checklist view
8. **RFI Log** — with deadline tracking
9. **SiD Register** — hazard register with risk matrix integration
10. **Risk & Issue Register**
11. **Value Log**
12. **Lessons Learnt**

### Data Import
The app should be able to **import the existing Excel file** to seed a project. Parse each sheet and map to the corresponding data model above. This is the migration path for existing projects.

---

## File Locations
```
Source Excel:   C:\Users\austin.carney\Projects\014_PCT_App\10162 - Project Control Tool.xlsx
Project Root:   C:\Users\austin.carney\Projects\014_PCT_App\
This file:      C:\Users\austin.carney\Projects\014_PCT_App\CLAUDE_CONTEXT.md
```

---

## Notes for Claude Code
- When generating code, assume the Excel file may be re-imported for each new project — don't hardcode project-specific data
- The C2C weekly snapshots are **immutable historical records** — each week's snapshot should be preserved, not overwritten
- The "CS C2C" sheets (Construction Services) use a longer time horizon (W1–W21) vs design phase (W1–W12)
- Many sheets are partially populated — the app should handle sparse/empty data gracefully
- The tool is used by a **small team** of architects and engineers, so UX should prioritise speed of data entry over complexity
- "Synergy" references in the C2C sheets refer to an internal financial tracking system — this is a fee management context, not a third-party software integration requirement
