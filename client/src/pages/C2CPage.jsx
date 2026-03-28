import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { c2cApi } from '../api/c2c.api'
import { useProject } from '../context/ProjectContext'
import PageHeader from '../components/layout/PageHeader'
import Modal from '../components/common/Modal'
import FormField from '../components/common/FormField'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ErrorBanner from '../components/common/ErrorBanner'
import ExportButton from '../components/excel/ExportButton'
import C2CTrendChart from '../components/c2c/C2CTrendChart'
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

/** Adds n weeks (n*7 days) to a YYYY-MM-DD string and returns YYYY-MM-DD. */
function addWeeks(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n * 7)
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
  const [startDate, setStartDate] = useState(getCurrentMonday)
  const [numWeeks, setNumWeeks] = useState(1)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState(null)

  const phaseSnaps = allSnapshots.filter(s => s.phase === phase)
  const nextWeekNumber = phaseSnaps.length > 0
    ? Math.max(...phaseSnaps.map(s => s.week_number)) + 1
    : 1

  // Build the list of dates this submission would create
  const weekDates = Array.from({ length: numWeeks }, (_, i) => addWeeks(startDate, i))
  const conflictDate = weekDates.find(d => phaseSnaps.some(s => s.snapshot_date === d))

  // Preview label(s)
  const previewStart = makeWeekLabel(nextWeekNumber, startDate)
  const previewEnd   = numWeeks > 1 ? makeWeekLabel(nextWeekNumber + numWeeks - 1, weekDates[numWeeks - 1]) : null

  function handleDateChange(e) {
    if (!e.target.value) return
    setStartDate(toMonday(e.target.value))
    setError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (conflictDate) { setError(`A week starting ${conflictDate} already exists`); return }
    setIsPending(true)
    try {
      for (let i = 0; i < numWeeks; i++) {
        const weekNum  = nextWeekNumber + i
        const weekDate = weekDates[i]
        await c2cApi.createSnapshot(projectId, {
          phase, week_number: weekNum, snapshot_date: weekDate, week_label: makeWeekLabel(weekNum, weekDate),
        })
      }
      qc.invalidateQueries({ queryKey: ['c2c-snapshots', projectId] })
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setIsPending(false)
    }
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
          <FormField label="Number of Weeks">
            <input
              className="form-input"
              type="number" min="1" max="52"
              value={numWeeks}
              onChange={e => { setNumWeeks(Math.max(1, parseInt(e.target.value) || 1)); setError(null) }}
            />
          </FormField>
        </div>
        <FormField label={numWeeks > 1 ? 'Range Start (Monday)' : 'Week Starting (Monday)'} hint="Select any date — it will snap to the Monday of that week">
          <input
            className={`form-input${conflictDate ? ' input-error' : ''}`}
            type="date"
            value={startDate}
            onChange={handleDateChange}
          />
          {conflictDate && (
            <div style={{ color: 'var(--color-negative)', fontSize: 12, marginTop: 4 }}>
              A week starting {conflictDate} already exists in the C2C
            </div>
          )}
        </FormField>
        <FormField label={numWeeks > 1 ? 'Weeks to be created' : 'Week Label'}>
          <input
            className="form-input"
            value={numWeeks > 1 ? `${previewStart}  →  ${previewEnd}` : (previewStart || '—')}
            readOnly
            style={IMMUTABLE_STYLE}
          />
        </FormField>
        {error && !conflictDate && <div className="error-banner mb-4">{error}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={isPending || !!conflictDate}
          >
            {isPending ? 'Adding…' : numWeeks > 1 ? `Add ${numWeeks} Weeks` : 'Add Week'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Delete Week Modal ────────────────────────────────────────────────────────

function DeleteWeekModal({ projectId, lastSnap, selectedSnapshotId, onDeleted, onClose }) {
  const qc = useQueryClient()
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState(null)

  const mut = useMutation({
    mutationFn: () => c2cApi.deleteSnapshot(projectId, lastSnap.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['c2c-snapshots', projectId] })
      qc.invalidateQueries({ queryKey: ['c2c-stage-view', projectId, lastSnap.phase] })
      if (selectedSnapshotId === lastSnap.id) onDeleted()
      onClose()
    },
    onError: err => setError(err.response?.data?.error || err.message),
  })

  return (
    <Modal title="Delete Last Week" onClose={onClose} size="sm">
      <p style={{ marginBottom: 12 }}>
        This will permanently delete <strong>{lastSnap.week_label}</strong> and all its resource allocations and financial data.
      </p>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, cursor: 'pointer', fontSize: 13 }}>
        <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
        I confirm I want to delete <strong style={{ marginLeft: 4 }}>{lastSnap.week_label}</strong>
      </label>
      {error && <div className="error-banner mb-4">{error}</div>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
        <button
          className="btn btn-sm"
          style={{ background: 'var(--color-negative)', color: '#fff', border: 'none' }}
          disabled={!confirmed || mut.isPending}
          onClick={() => mut.mutate()}
        >
          {mut.isPending ? 'Deleting…' : 'Delete Week'}
        </button>
      </div>
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

// ─── Stage View ───────────────────────────────────────────────────────────────
// Pivot table: all weeks of a phase as columns, one row per resource.
//
// Formulas:
//   Total Hours (resource)  = SUM(utilisation_w × 37.5)  across all phase snapshots
//   Phase CTC (resource)    = Total Hours × hourly_rate
//   CTC Phase (discipline)  = SUM(Phase CTC) for all resources in that discipline
//   Residual                = Fee less WIP − CTC Phase
//
// TODO: Fee less WIP is a $1,000 placeholder pending external finance DB integration. Revisit.

function StageFinancialsTable({ snapshots, resources, financials }) {
  const colWidths = [160, 130, 130, 120]
  const { widths, startResize } = useColumnResize(colWidths)

  const headers = [
    { label: 'Discipline',   align: 'left' },
    { label: 'Fee less WIP', align: 'right' },
    { label: 'CTC Phase',    align: 'right' },
    { label: 'Residual',     align: 'right' },
  ]

  // CTC Phase per discipline = sum of (total_hours × rate) across all resources
  const discCtcMap = {}
  for (const res of resources) {
    const totalHours = snapshots.reduce((sum, snap) =>
      sum + (res.allocation_by_snapshot[snap.id]?.weekly_utilisation ?? 0) * 37.5, 0)
    discCtcMap[res.discipline] = (discCtcMap[res.discipline] || 0) + totalHours * res.hourly_rate
  }
  const discFinMap = Object.fromEntries(financials.map(f => [f.discipline, f]))

  // Only show disciplines that have resources or financials
  const activeDiscs = DISCIPLINES.filter(d => discCtcMap[d] || discFinMap[d])

  const totFlw = activeDiscs.reduce((s, d) => s + (discFinMap[d]?.fee_less_wip ?? 1000), 0)
  const totCtc = activeDiscs.reduce((s, d) => s + (discCtcMap[d] || 0), 0)
  const totRes = totFlw - totCtc

  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)', marginBottom: 8 }}>Financial Summary</h3>
      <div className="data-table-wrap">
        <table className="data-table" style={{ tableLayout: 'fixed' }}>
          <colgroup>{colWidths.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
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
            {activeDiscs.map(disc => {
              const feeLessWip = discFinMap[disc]?.fee_less_wip ?? 1000
              const ctcPhase   = discCtcMap[disc] || 0
              const residual   = feeLessWip - ctcPhase
              const resColor   = residual > 0 ? 'var(--color-positive)' : residual < 0 ? 'var(--color-negative)' : undefined
              return (
                <tr key={disc}>
                  <td style={{ fontWeight: 500 }}>{disc}</td>
                  <td className="num">{fmt(feeLessWip)}</td>
                  <td className="num">{fmt(ctcPhase)}</td>
                  <td className="num" style={{ color: resColor, fontWeight: 600 }}>{fmt(residual)}</td>
                </tr>
              )
            })}
            {activeDiscs.length > 0 && (
              <tr style={{ background: 'var(--color-secondary)', fontWeight: 700 }}>
                <td>TOTAL</td>
                <td className="num">{fmt(totFlw)}</td>
                <td className="num">{fmt(totCtc)}</td>
                <td className="num" style={{ color: totRes >= 0 ? 'var(--color-positive)' : 'var(--color-negative)', fontWeight: 700 }}>{fmt(totRes)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StageView({ data, onToggleLock, onUpdateAllocation }) {
  const { snapshots, resources, financials } = data
  const nFixed = 2  // Resource + Rate
  const nTrail = 2  // Total Hrs + Phase CTC
  const colWidths = [200, 90, ...snapshots.map(() => 80), 100, 120]
  const { widths, startResize } = useColumnResize(colWidths)

  const NCOLS = nFixed + snapshots.length + nTrail

  // Group resources by discipline preserving DISCIPLINES order
  const grouped = DISCIPLINES.reduce((acc, disc) => {
    acc[disc] = resources.filter(r => r.discipline === disc)
    return acc
  }, {})

  return (
    <>
      <div className="data-table-wrap data-table-wrap--scrollable">
        <table className="data-table data-table--sticky-col" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            {widths.map((w, i) => <col key={i} style={{ width: w }} />)}
          </colgroup>
          <thead>
            <tr>
              {/* Fixed: Resource, Rate */}
              {[{ label: 'Resource', align: 'left' }, { label: 'Rate ($/hr)', align: 'right' }].map((h, ci) => (
                <th key={ci} style={{ textAlign: h.align }}>
                  {h.label}
                  <div className="col-resize-handle" onMouseDown={e => startResize(ci, e)} onClick={e => e.stopPropagation()} />
                </th>
              ))}
              {/* Dynamic: one column per week snapshot — click header to toggle lock */}
              {snapshots.map((snap, si) => (
                <th
                  key={snap.id}
                  style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => onToggleLock(snap.id)}
                  title={snap.snapshot_locked ? 'Click to unlock week' : 'Click to lock week'}
                >
                  W{snap.week_number} {snap.snapshot_locked ? '🔒' : '🔓'}
                  <div className="col-resize-handle" onMouseDown={e => { e.stopPropagation(); startResize(nFixed + si, e) }} onClick={e => e.stopPropagation()} />
                </th>
              ))}
              {/* Trailing: Total Hrs + Phase CTC — right-frozen so always visible */}
              {[
                { label: 'Total Hrs', ci: nFixed + snapshots.length, right: widths[widths.length - 1] },
                { label: 'Phase CTC', ci: nFixed + snapshots.length + 1, right: 0 },
              ].map((h, i) => (
                <th
                  key={h.label}
                  className={`sticky-right${i === 0 ? ' sticky-right-shadow' : ''}`}
                  style={{ textAlign: 'right', right: h.right }}
                >
                  {h.label}
                  <div className="col-resize-handle" onMouseDown={e => startResize(h.ci, e)} onClick={e => e.stopPropagation()} />
                </th>
              ))}
            </tr>
          </thead>

          {/* Each discipline gets its own <tbody> so sticky group headers
              push each other off naturally as you scroll through groups */}
          {DISCIPLINES.map(disc => {
            const group = grouped[disc]
            if (!group || group.length === 0) return null

            const discTotalHrs = group.reduce((sum, res) =>
              sum + snapshots.reduce((s2, snap) => s2 + (res.allocation_by_snapshot[snap.id]?.weekly_utilisation ?? 0) * 37.5, 0), 0)
            const discPhaseCTC = group.reduce((sum, res) => {
              const hrs = snapshots.reduce((s2, snap) => s2 + (res.allocation_by_snapshot[snap.id]?.weekly_utilisation ?? 0) * 37.5, 0)
              return sum + hrs * res.hourly_rate
            }, 0)

            return (
              <tbody key={disc}>
                {/* Sticky group sub-header — sticks below thead within this tbody */}
                <tr className="group-header">
                  <td colSpan={NCOLS}>{disc} Resource Program</td>
                </tr>

                {group.map(res => {
                  const totalHours = snapshots.reduce((sum, snap) =>
                    sum + (res.allocation_by_snapshot[snap.id]?.weekly_utilisation ?? 0) * 37.5, 0)
                  const phaseCTC = totalHours * res.hourly_rate
                  return (
                    <tr key={res.resource_id}>
                      {/* Sticky first column — resource name */}
                      <td>{res.resource_name}</td>
                      <td className="num">{fmt(res.hourly_rate)}</td>
                      {snapshots.map(snap => {
                        const alloc = res.allocation_by_snapshot[snap.id]
                        const util  = alloc?.weekly_utilisation ?? 0
                        const locked = snap.snapshot_locked
                        return (
                          <td key={snap.id} className="num">
                            {locked ? (
                              util > 0 ? `${(util * 100).toFixed(0)}%` : '0%'
                            ) : (
                              <input
                                type="number" step="0.05" min="0" max="1"
                                defaultValue={util}
                                style={{ width: 56, textAlign: 'right', border: '1px solid var(--color-border)', borderRadius: 2, padding: '1px 4px', fontSize: 12 }}
                                onBlur={e => {
                                  if (!alloc?.allocation_id) return
                                  onUpdateAllocation({
                                    snapshotId: snap.id,
                                    allocationId: alloc.allocation_id,
                                    weekly_utilisation: parseFloat(e.target.value) || 0,
                                    remaining_weeks: alloc.remaining_weeks ?? 0,
                                  })
                                }}
                              />
                            )}
                          </td>
                        )
                      })}
                      {/* Right-frozen totals — always visible */}
                      <td className="num sticky-right sticky-right-shadow" style={{ right: widths[widths.length - 1] }}>{totalHours.toFixed(1)}</td>
                      <td className="num sticky-right" style={{ right: 0 }}>{fmtCents(phaseCTC)}</td>
                    </tr>
                  )
                })}

                {/* Discipline subtotal row.
                    Label floats near the viewport center (sticky left: ~50%)
                    so it stays readable no matter how far left/right you scroll.
                    Total Hrs + Phase CTC are frozen to the right edge. */}
                <tr className="group-subtotal" style={{ background: 'var(--color-tertiary)', fontWeight: 600, fontSize: 12 }}>
                  <td
                    colSpan={nFixed + snapshots.length}
                    style={{
                      position: 'sticky',
                      left: 'calc(50% - 80px)',
                      zIndex: 2,
                      background: 'var(--color-tertiary)',
                      whiteSpace: 'nowrap',
                      color: 'var(--color-primary)',
                    }}
                  >
                    {disc} Total
                  </td>
                  <td
                    className="num sticky-right sticky-right-shadow"
                    style={{ right: widths[widths.length - 1], background: 'var(--color-tertiary)', zIndex: 2 }}
                  >{discTotalHrs.toFixed(1)}</td>
                  <td
                    className="num sticky-right"
                    style={{ right: 0, background: 'var(--color-tertiary)', zIndex: 2 }}
                  >{fmtCents(discPhaseCTC)}</td>
                </tr>
              </tbody>
            )
          })}
        </table>
      </div>
      <StageFinancialsTable snapshots={snapshots} resources={resources} financials={financials} />
    </>
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
  const [showDelete, setShowDelete] = useState(false)
  const [stageView, setStageView] = useState(true)
  const [showTrend, setShowTrend] = useState(false)

  const { data: snapshots = [] } = useQuery({
    queryKey: ['c2c-snapshots', projectId],
    queryFn: () => c2cApi.listSnapshots(projectId),
    enabled: !!projectId,
  })

  // Auto-select week 1 of the current phase whenever the selection is empty
  useEffect(() => {
    if (!selectedSnapshotId && snapshots.length > 0) {
      const target = snapshots.find(s => s.phase === phaseFilter && s.week_number === 1)
        ?? snapshots.find(s => s.phase === phaseFilter)
      setSelectedSnapshotId(target?.id ?? null)
    }
  }, [snapshots, selectedSnapshotId, phaseFilter])

  const filteredSnaps = snapshots.filter(s => s.phase === phaseFilter)
  const activeSnap = snapshots.find(s => s.id === selectedSnapshotId)

  // Auto-compute next week number (max + 1 for the active phase)
  const nextWeekNumber = filteredSnaps.length > 0
    ? Math.max(...filteredSnaps.map(s => s.week_number)) + 1
    : 1

  const { data: stageData, isPending: loadingStage, isError: stageError, error: stageErrorObj } = useQuery({
    queryKey: ['c2c-stage-view', projectId, phaseFilter],
    queryFn: () => c2cApi.getStageView(projectId, phaseFilter),
    enabled: !!projectId,
  })

  const { data: snapDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ['c2c-snapshot', selectedSnapshotId],
    queryFn: () => c2cApi.getSnapshot(projectId, selectedSnapshotId),
    enabled: !!projectId && !!selectedSnapshotId,
  })

  const toggleLockMut = useMutation({
    mutationFn: sid => {
      const snap = snapshots.find(s => s.id === sid)
      return snap?.snapshot_locked
        ? c2cApi.unlockSnapshot(projectId, sid)
        : c2cApi.lockSnapshot(projectId, sid)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['c2c-snapshots', projectId] })
      qc.invalidateQueries({ queryKey: ['c2c-snapshot', selectedSnapshotId] })
      qc.invalidateQueries({ queryKey: ['c2c-stage-view', projectId, phaseFilter] })
    },
  })

  const updateAllocMut = useMutation({
    mutationFn: item => c2cApi.updateAllocations(projectId, selectedSnapshotId, [item]),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['c2c-snapshot', selectedSnapshotId] }),
  })

  const stageUpdateAllocMut = useMutation({
    mutationFn: ({ snapshotId, allocationId, weekly_utilisation, remaining_weeks }) =>
      c2cApi.updateAllocations(projectId, snapshotId, [{ id: allocationId, weekly_utilisation, remaining_weeks }]),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['c2c-stage-view', projectId, phaseFilter] }),
  })

  const updateFinMut = useMutation({
    mutationFn: item => c2cApi.updateFinancials(projectId, selectedSnapshotId, [item]),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['c2c-snapshot', selectedSnapshotId] }),
  })

  if (!projectId) return <div className="empty-state">Select a project to view the C2C tracker.</div>

  const locked = activeSnap?.snapshot_locked === 1
  const allocations = snapDetail?.allocations || []
  const financials = snapDetail?.financials || []
  const lastPhaseSnap = filteredSnaps.length > 0 ? filteredSnaps[filteredSnaps.length - 1] : null

  return (
    <div>
      <PageHeader
        title="Cost to Complete"
        subtitle="Weekly fee burn and remaining cost to complete"
        actions={<>
          <ExportButton />
          {lastPhaseSnap && (
            <button className="btn btn-secondary btn-sm" onClick={() => setShowDelete(true)}>Delete Last Week</button>
          )}
          <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}>+ Add Week</button>
        </>}
      />

      {/* ── Row 1: View mode — larger toggle, independent of phase ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {[
          { key: true,  label: 'Stage View' },
          { key: false, label: 'Week View' },
        ].map(({ key, label }) => (
          <button
            key={String(key)}
            onClick={() => setStageView(key)}
            style={{
              padding: '7px 20px',
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 4,
              border: '2px solid var(--color-primary)',
              background: stageView === key ? 'var(--color-primary)' : 'transparent',
              color: stageView === key ? '#fff' : 'var(--color-primary)',
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Collapsible trend chart ── */}
      <div style={{ marginBottom: 10 }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setShowTrend(v => !v)}
          style={{ fontSize: 12 }}
        >
          {showTrend ? '▲ Hide Trend' : '▼ Show Trend'}
        </button>
        {showTrend && (
          <div className="card" style={{ marginTop: 8, padding: '12px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>
              C2C TREND — {phaseFilter === 'design' ? 'DESIGN DOCUMENTATION' : 'CONSTRUCTION SERVICES'}
            </div>
            <C2CTrendChart projectId={projectId} phase={phaseFilter} height={180} />
          </div>
        )}
      </div>

      {/* ── Row 2: Phase selector — standard tab style, independent of view mode ── */}
      <div className="tab-strip mb-4">
        {['design', 'construction'].map(phase => (
          <button
            key={phase}
            className={`tab${phaseFilter === phase ? ' active' : ''}`}
            onClick={() => { setPhaseFilter(phase); setSelectedSnapshotId(null) }}
          >
            {phase === 'design' ? 'Design Documentation' : 'Construction Services'}
          </button>
        ))}
      </div>

      {/* ── Stage View ── */}
      {stageView && (
        loadingStage
          ? <LoadingSpinner />
          : stageError
            ? <div className="error-banner">{stageErrorObj?.response?.data?.error || stageErrorObj?.message || 'Failed to load Stage View'}</div>
            : stageData && stageData.snapshots?.length > 0
              ? <StageView
                  key={`${phaseFilter}-${stageData.snapshots.length}`}
                  data={stageData}
                  onToggleLock={sid => toggleLockMut.mutate(sid)}
                  onUpdateAllocation={item => stageUpdateAllocMut.mutate(item)}
                />
              : <div className="empty-state card" style={{ padding: 32 }}>No {phaseFilter} weeks found. Add a week first.</div>
      )}

      {/* ── Per-Week Snapshot View ── */}
      {!stageView && (
        <>
          {/* Snapshot selector */}
          {filteredSnaps.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>WEEK:</span>
              {filteredSnaps.map(s => {
                const isSelected = s.id === selectedSnapshotId
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      if (isSelected) {
                        toggleLockMut.mutate(s.id)
                      } else {
                        setSelectedSnapshotId(s.id)
                      }
                    }}
                    title={isSelected ? (s.snapshot_locked ? 'Click to unlock week' : 'Click to lock week') : `Switch to W${s.week_number}`}
                    style={{
                      padding: '3px 12px',
                      borderRadius: 3,
                      border: '1px solid var(--color-border-dk)',
                      background: isSelected ? 'var(--color-primary)' : '#fff',
                      color: isSelected ? '#fff' : 'var(--color-text)',
                      fontSize: 12, cursor: 'pointer',
                      fontWeight: isSelected ? 600 : 400,
                    }}
                  >
                    W{s.week_number} {s.snapshot_locked ? '🔒' : '🔓'}
                  </button>
                )
              })}
            </div>
          )}

          {filteredSnaps.length === 0 && (
            <div className="empty-state card" style={{ padding: 32 }}>
              No {phaseFilter} weeks yet. Click &ldquo;+ Add Week&rdquo; to create the first weekly entry.
            </div>
          )}

          {activeSnap && (
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{activeSnap.week_label}</span>
              <span style={{ marginLeft: 12, fontSize: 12, color: 'var(--color-text-muted)' }}>{activeSnap.snapshot_date}</span>
              <span style={{ marginLeft: 8, background: 'var(--color-tertiary)', color: 'var(--color-primary)', padding: '2px 8px', borderRadius: 3, fontSize: 11, fontWeight: 600 }}>
                {locked ? '🔒 LOCKED' : '🔓 UNLOCKED'}
              </span>
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

      {showDelete && lastPhaseSnap && (
        <DeleteWeekModal
          projectId={projectId}
          lastSnap={lastPhaseSnap}
          selectedSnapshotId={selectedSnapshotId}
          onDeleted={() => setSelectedSnapshotId(null)}
          onClose={() => setShowDelete(false)}
        />
      )}
    </div>
  )
}
