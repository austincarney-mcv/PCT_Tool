import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { c2cApi } from '../api/c2c.api'
import { useProject } from '../context/ProjectContext'
import PageHeader from '../components/layout/PageHeader'
import Modal from '../components/common/Modal'
import FormField from '../components/common/FormField'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ErrorBanner from '../components/common/ErrorBanner'
import ExportButton from '../components/excel/ExportButton'
import { useColumnResize } from '../hooks/useColumnResize'

const DISCIPLINES = ['Architecture','Civil','Structural','Hydraulics','Landscaping','Certifier','Fire Engineering','Fire Services','Builder/CM']
// fmt — whole-dollar amounts (financial summary, agreed fee, etc.)
const fmt = v => v != null ? `$${Number(v).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—'
// fmtCents — cent-precision display used for Cost/Wk; truncates to 2dp, no rounding beyond the cent
const fmtCents = v => {
  if (v == null) return '—'
  const truncated = Math.trunc(Number(v) * 100) / 100
  return `$${truncated.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ─── Date helpers ────────────────────────────────────────────────────────────

/** Returns the Monday (YYYY-MM-DD) of the current calendar week. */
function getCurrentMonday() {
  const d = new Date()
  const day = d.getDay() // 0=Sun, 1=Mon …
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

/** Snaps any date string to the Monday of its ISO week. */
function toMonday(dateStr) {
  const d = new Date(dateStr + 'T12:00:00') // noon avoids DST shifts
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

/** Formats a week label, e.g. "Week 3 - 23 March" */
function makeWeekLabel(weekNum, dateStr) {
  if (!dateStr || !weekNum) return ''
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDate()
  const month = d.toLocaleString('en-AU', { month: 'long' })
  return `Week ${weekNum} - ${day} ${month}`
}

// ─── Add Week Modal ───────────────────────────────────────────────────────────

// Immutable field style — darker background signals the field cannot be edited
const IMMUTABLE_STYLE = {
  background: '#dde3e8',
  color: 'var(--color-text)',
  cursor: 'not-allowed',
}

function AddWeekModal({ projectId, initialPhase, allSnapshots, onClose }) {
  const qc = useQueryClient()
  const [phase, setPhase] = useState(initialPhase)
  const [snapshotDate, setSnapshotDate] = useState(getCurrentMonday)
  const [error, setError] = useState(null)

  // Recompute week number and duplicate check whenever phase or date changes
  const phaseSnaps = allSnapshots.filter(s => s.phase === phase)
  const nextWeekNumber = phaseSnaps.length > 0
    ? Math.max(...phaseSnaps.map(s => s.week_number)) + 1
    : 1
  const weekLabel = makeWeekLabel(nextWeekNumber, snapshotDate)
  const isDuplicate = phaseSnaps.some(s => s.snapshot_date === snapshotDate)

  const mut = useMutation({
    mutationFn: d => c2cApi.createSnapshot(projectId, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['c2c-snapshots', projectId] }); onClose() },
  })

  function handleDateChange(e) {
    if (!e.target.value) return
    setSnapshotDate(toMonday(e.target.value))
    setError(null)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (isDuplicate) { setError('Date range already exists in the C2C'); return }
    mut.mutate(
      { phase, week_number: nextWeekNumber, snapshot_date: snapshotDate, week_label: weekLabel },
      { onError: err => setError(err.response?.data?.error || err.message) }
    )
  }

  return (
    <Modal title="Add Week" onClose={onClose} size="sm">
      <form onSubmit={handleSubmit}>
        <div className="form-row cols-2">
          <FormField label="Phase">
            <select
              className="form-select"
              value={phase}
              onChange={e => { setPhase(e.target.value); setError(null) }}
            >
              <option value="design">Design Documentation</option>
              <option value="construction">Construction Services</option>
            </select>
          </FormField>
          <FormField label="Week Number">
            <input className="form-input" type="number" value={nextWeekNumber} readOnly style={IMMUTABLE_STYLE} />
          </FormField>
        </div>
        <FormField label="Week Label">
          <input className="form-input" value={weekLabel || '—'} readOnly style={IMMUTABLE_STYLE} />
        </FormField>
        <FormField label="Week Starting (Monday)" hint="Select any date — it will snap to the Monday of that week">
          <input
            className={`form-input${isDuplicate ? ' input-error' : ''}`}
            type="date"
            value={snapshotDate}
            onChange={handleDateChange}
          />
          {isDuplicate && (
            <div style={{ color: 'var(--color-negative)', fontSize: 12, marginTop: 4 }}>
              Date range already exists in the C2C
            </div>
          )}
        </FormField>
        {error && !isDuplicate && <div className="error-banner mb-4">{error}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={mut.isPending || isDuplicate}
          >
            {mut.isPending ? 'Adding…' : 'Add Week'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Allocation Table ─────────────────────────────────────────────────────────
// Columns: Resource | Rate ($/hr) | Utilisation | Hrs/Wk | Cost/Wk
// "Remaining Wks" is intentionally hidden; the value is still passed through
// for allocation updates so the server calculation stays correct.
// "Cost/Wk" = rate × (utilisation × 37.5) — the dollar cost for this resource
// in the current week at their forecast utilisation. The discipline-level CTC
// (shown in the Financial Summary below) is the full remaining cost and is
// derived server-side as sum(rate × util × 37.5 × remaining_weeks).

const ALLOC_COL_WIDTHS = [200, 90, 90, 80, 120]

function AllocationTable({ snapshot, allocations, onUpdateAllocation, locked }) {
  const { widths, startResize } = useColumnResize(ALLOC_COL_WIDTHS)

  // Group by discipline
  const grouped = DISCIPLINES.reduce((acc, disc) => {
    acc[disc] = allocations.filter(a => a.discipline === disc)
    return acc
  }, {})

  const NCOLS = 5

  return (
    <div className="data-table-wrap">
      <table className="data-table" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          {widths.map((w, i) => <col key={i} style={{ width: w }} />)}
        </colgroup>
        <thead>
          <tr>
            {[
              { label: 'Resource',    align: 'left' },
              { label: 'Rate ($/hr)', align: 'right' },
              { label: 'Utilisation', align: 'right' },
              { label: 'Hrs/Wk',     align: 'right' },
              { label: 'Cost/Wk',    align: 'right' },
            ].map((col, ci) => (
              <th key={ci} style={{ textAlign: col.align }}>
                {col.label}
                <div
                  className="col-resize-handle"
                  onMouseDown={e => startResize(ci, e)}
                  onClick={e => e.stopPropagation()}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DISCIPLINES.map(disc => {
            const group = grouped[disc]
            if (!group || group.length === 0) return null
            return [
              <tr key={`hdr-${disc}`} className="group-header">
                <td colSpan={NCOLS}>{disc} Resource Program</td>
              </tr>,
              ...group.map(a => (
                <tr key={a.id}>
                  <td>{a.resource_name}</td>
                  <td className="num">{fmt(a.hourly_rate)}</td>
                  <td className="num">
                    {locked ? (
                      (a.weekly_utilisation != null ? (a.weekly_utilisation * 100).toFixed(0) + '%' : '—')
                    ) : (
                      <input
                        type="number" step="0.05" min="0" max="1"
                        defaultValue={a.weekly_utilisation ?? 0}
                        style={{ width: 60, textAlign: 'right', border: '1px solid var(--color-border)', borderRadius: 2, padding: '1px 4px', fontSize: 12 }}
                        onBlur={e => onUpdateAllocation({ id: a.id, weekly_utilisation: parseFloat(e.target.value) || 0, remaining_weeks: a.remaining_weeks })}
                      />
                    )}
                  </td>
                  {/* Hours for the week = utilisation × 37.5 */}
                  <td className="num">
                    {a.weekly_utilisation != null ? (a.weekly_utilisation * 37.5).toFixed(1) : '—'}
                  </td>
                  {/* Cost/Wk = rate × (utilisation × 37.5) — weekly dollar cost at this utilisation, shown to cent precision */}
                  <td className="num">
                    {a.weekly_utilisation != null && a.hourly_rate != null
                      ? fmtCents(a.hourly_rate * a.weekly_utilisation * 37.5)
                      : '—'}
                  </td>
                </tr>
              )),
            ]
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Financials Table — Construction Services (simplified) ───────────────────
// Shows 3 columns only: Fee less WIP | CTC | Residual
//
// TODO: Fee less WIP is a $1,000 placeholder per discipline pending connection
//       to the external finance/billing database. Revisit when that integration
//       is scoped.
// TODO: synergy_net_residual is preserved in the DB but hidden from the CS view.
//       May be swapped with fee_less_wip or repurposed once the external DB link
//       is built. Revisit.

const CS_FIN_COL_WIDTHS = [160, 130, 130, 120]

function CSFinancialsTable({ financials, locked, onUpdateFinancial }) {
  const { widths, startResize } = useColumnResize(CS_FIN_COL_WIDTHS)

  const headers = [
    { label: 'Discipline',    align: 'left' },
    { label: 'Fee less WIP',  align: 'right' },
    { label: 'CTC',           align: 'right' },
    { label: 'Residual',      align: 'right' },
  ]

  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)', marginBottom: 8 }}>Financial Summary</h3>
      <div className="data-table-wrap">
        <table className="data-table" style={{ tableLayout: 'fixed' }}>
          <colgroup>{widths.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
          <thead>
            <tr>
              {headers.map((h, ci) => (
                <th key={ci} style={{ textAlign: h.align }}>
                  {h.label}
                  <div className="col-resize-handle" onMouseDown={e => startResize(ci, e)} onClick={e => e.stopPropagation()} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DISCIPLINES.map(disc => {
              const fin = financials.find(f => f.discipline === disc)
              if (!fin) return null
              const feeLessWip = fin.fee_less_wip ?? 1000
              const ctc = fin.construction_doc_cost_to_complete ?? 0
              const residual = feeLessWip - ctc
              const residualColor = residual > 0 ? 'var(--color-positive)' : residual < 0 ? 'var(--color-negative)' : undefined
              return (
                <tr key={disc}>
                  <td style={{ fontWeight: 500 }}>{disc}</td>
                  <td className="num">
                    {locked ? fmt(feeLessWip) : (
                      <input
                        type="number" step="100"
                        defaultValue={feeLessWip}
                        style={{ width: '100%', textAlign: 'right', border: '1px solid var(--color-border)', borderRadius: 2, padding: '1px 4px', fontSize: 12, boxSizing: 'border-box' }}
                        onBlur={e => onUpdateFinancial({ ...fin, fee_less_wip: parseFloat(e.target.value) || 0 })}
                      />
                    )}
                  </td>
                  <td className="num">{fmt(ctc)}</td>
                  <td className="num" style={{ color: residualColor, fontWeight: 600 }}>{fmt(residual)}</td>
                </tr>
              )
            })}
            {financials.length > 0 && (() => {
              const totFlw = financials.reduce((s, f) => s + (f.fee_less_wip ?? 1000), 0)
              const totCtc = financials.reduce((s, f) => s + (f.construction_doc_cost_to_complete || 0), 0)
              const totRes = totFlw - totCtc
              return (
                <tr style={{ background: 'var(--color-secondary)', fontWeight: 700 }}>
                  <td>TOTAL</td>
                  <td className="num">{fmt(totFlw)}</td>
                  <td className="num">{fmt(totCtc)}</td>
                  <td className="num" style={{ color: totRes >= 0 ? 'var(--color-positive)' : 'var(--color-negative)', fontWeight: 700 }}>{fmt(totRes)}</td>
                </tr>
              )
            })()}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Financials Table — Design Documentation (full) ──────────────────────────

const FIN_COL_WIDTHS = [160, 110, 120, 100, 130, 120, 130, 120, 100]

function DesignFinancialsTable({ financials, onUpdateFinancial, locked }) {
  const { widths, startResize } = useColumnResize(FIN_COL_WIDTHS)

  const headers = [
    { label: 'Discipline',           align: 'left' },
    { label: 'Agreed Fee',           align: 'right' },
    { label: 'Cost at Close',        align: 'right' },
    { label: 'Net to Carry',         align: 'right' },
    { label: 'Synergy Net Res.',     align: 'right' },
    { label: 'Tot. Net to Carry',    align: 'right' },
    { label: 'CTC (Design Doc)',     align: 'right' },
    { label: 'Adj. Net Res.',        align: 'right' },
    { label: 'Under / Over',         align: 'right' },
  ]

  const editableFields = ['agreed_fee','cost_at_close','net_to_carry','synergy_net_residual','total_net_to_carry','construction_doc_cost_to_complete']

  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)', marginBottom: 8 }}>Financial Summary</h3>
      <div className="data-table-wrap">
        <table className="data-table" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            {widths.map((w, i) => <col key={i} style={{ width: w }} />)}
          </colgroup>
          <thead>
            <tr>
              {headers.map((h, ci) => (
                <th key={ci} style={{ textAlign: h.align }}>
                  {h.label}
                  <div
                    className="col-resize-handle"
                    onMouseDown={e => startResize(ci, e)}
                    onClick={e => e.stopPropagation()}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DISCIPLINES.map(disc => {
              const fin = financials.find(f => f.discipline === disc)
              if (!fin) return null
              const underOverColor = fin.under_over > 0 ? 'var(--color-positive)' : fin.under_over < 0 ? 'var(--color-negative)' : undefined
              return (
                <tr key={disc}>
                  <td style={{ fontWeight: 500 }}>{disc}</td>
                  {editableFields.map(field => (
                    <td key={field} className="num">
                      {locked ? fmt(fin[field]) : (
                        <input
                          type="number" step="100"
                          defaultValue={fin[field] ?? 0}
                          style={{ width: '100%', textAlign: 'right', border: '1px solid var(--color-border)', borderRadius: 2, padding: '1px 4px', fontSize: 12, boxSizing: 'border-box' }}
                          onBlur={e => onUpdateFinancial({ ...fin, [field]: parseFloat(e.target.value) || 0 })}
                        />
                      )}
                    </td>
                  ))}
                  <td className="num">{fmt(fin.adjusted_net_residual)}</td>
                  <td className="num" style={{ color: underOverColor, fontWeight: 600 }}>{fmt(fin.under_over)}</td>
                </tr>
              )
            })}
            {/* Totals row */}
            {financials.length > 0 && (
              <tr style={{ background: 'var(--color-secondary)', fontWeight: 700 }}>
                <td>TOTAL</td>
                {editableFields.map(field => (
                  <td key={field} className="num">{fmt(financials.reduce((s, f) => s + (f[field] || 0), 0))}</td>
                ))}
                <td className="num">{fmt(financials.reduce((s, f) => s + (f.adjusted_net_residual || 0), 0))}</td>
                <td className="num" style={{
                  color: financials.reduce((s, f) => s + (f.under_over || 0), 0) >= 0 ? 'var(--color-positive)' : 'var(--color-negative)',
                  fontWeight: 700,
                }}>
                  {fmt(financials.reduce((s, f) => s + (f.under_over || 0), 0))}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main C2C Page ────────────────────────────────────────────────────────────

export default function C2CPage() {
  const { projectId } = useProject()
  const qc = useQueryClient()
  const [selectedSnapshotId, setSelectedSnapshotId] = useState(null)
  const [phaseFilter, setPhaseFilter] = useState('design')
  const [showNew, setShowNew] = useState(false)

  const { data: snapshots = [], isLoading: loadingSnaps } = useQuery({
    queryKey: ['c2c-snapshots', projectId],
    queryFn: () => c2cApi.listSnapshots(projectId),
    enabled: !!projectId,
    onSuccess: data => {
      if (!selectedSnapshotId && data.length > 0) {
        const first = data.filter(s => s.phase === phaseFilter)[0] || data[0]
        setSelectedSnapshotId(first?.id)
      }
    }
  })

  const filteredSnaps = snapshots.filter(s => s.phase === phaseFilter)
  const activeSnap = snapshots.find(s => s.id === selectedSnapshotId)

  // Auto-compute next week number (max + 1 for the active phase)
  const nextWeekNumber = filteredSnaps.length > 0
    ? Math.max(...filteredSnaps.map(s => s.week_number)) + 1
    : 1

  const { data: snapDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ['c2c-snapshot', selectedSnapshotId],
    queryFn: () => c2cApi.getSnapshot(projectId, selectedSnapshotId),
    enabled: !!projectId && !!selectedSnapshotId,
  })

  const lockMut = useMutation({
    mutationFn: () => c2cApi.lockSnapshot(projectId, selectedSnapshotId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['c2c-snapshots', projectId] }),
  })

  const updateAllocMut = useMutation({
    mutationFn: item => c2cApi.updateAllocations(projectId, selectedSnapshotId, [item]),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['c2c-snapshot', selectedSnapshotId] }),
  })

  const updateFinMut = useMutation({
    mutationFn: item => c2cApi.updateFinancials(projectId, selectedSnapshotId, [item]),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['c2c-snapshot', selectedSnapshotId] }),
  })

  if (!projectId) return <div className="empty-state">Select a project to view the C2C tracker.</div>

  const locked = activeSnap?.snapshot_locked === 1
  const allocations = snapDetail?.allocations || []
  const financials = snapDetail?.financials || []

  return (
    <div>
      <PageHeader
        title="Cost to Complete"
        subtitle="Weekly fee burn and remaining cost to complete"
        actions={<>
          <ExportButton />
          <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}>+ Add Week</button>
        </>}
      />

      {/* Phase toggle */}
      <div className="tab-strip mb-4">
        {['design','construction'].map(phase => (
          <button
            key={phase}
            className={`tab${phaseFilter === phase ? ' active' : ''}`}
            onClick={() => { setPhaseFilter(phase); setSelectedSnapshotId(null) }}
          >
            {phase === 'design' ? 'Design Documentation' : 'Construction Services'}
          </button>
        ))}
      </div>

      {/* Snapshot selector */}
      {filteredSnaps.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>WEEK:</span>
          {filteredSnaps.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedSnapshotId(s.id)}
              style={{
                padding: '3px 12px',
                borderRadius: 3,
                border: '1px solid var(--color-border-dk)',
                background: s.id === selectedSnapshotId ? 'var(--color-primary)' : '#fff',
                color: s.id === selectedSnapshotId ? '#fff' : 'var(--color-text)',
                fontSize: 12, cursor: 'pointer',
                fontWeight: s.id === selectedSnapshotId ? 600 : 400,
              }}
            >
              W{s.week_number} {s.snapshot_locked ? '🔒' : ''}
            </button>
          ))}
        </div>
      )}

      {filteredSnaps.length === 0 && (
        <div className="empty-state card" style={{ padding: 32 }}>
          No {phaseFilter} weeks yet. Click &ldquo;+ Add Week&rdquo; to create the first weekly entry.
        </div>
      )}

      {activeSnap && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{activeSnap.week_label}</span>
            <span style={{ marginLeft: 12, fontSize: 12, color: 'var(--color-text-muted)' }}>{activeSnap.snapshot_date}</span>
            {locked && <span style={{ marginLeft: 8, background: 'var(--color-tertiary)', color: 'var(--color-primary)', padding: '2px 8px', borderRadius: 3, fontSize: 11, fontWeight: 600 }}>LOCKED</span>}
          </div>
          {!locked && (
            <button className="btn btn-secondary btn-sm" onClick={() => lockMut.mutate()}>🔒 Lock Week</button>
          )}
        </div>
      )}

      {loadingDetail && <LoadingSpinner />}

      {snapDetail && !loadingDetail && (
        <>
          <AllocationTable
            snapshot={activeSnap}
            allocations={allocations}
            locked={locked}
            onUpdateAllocation={item => updateAllocMut.mutate(item)}
          />
          {/* Both phases use the simplified 3-column view (Fee less WIP | CTC | Residual).
              DesignFinancialsTable (8 columns) is preserved below for future reinstatement
              once the Synergy/net-to-carry workflow is confirmed. */}
          <CSFinancialsTable
            financials={financials}
            locked={locked}
            onUpdateFinancial={item => updateFinMut.mutate(item)}
          />
        </>
      )}

      {showNew && (
        <AddWeekModal
          projectId={projectId}
          initialPhase={phaseFilter}
          allSnapshots={snapshots}
          onClose={() => setShowNew(false)}
        />
      )}
    </div>
  )
}
