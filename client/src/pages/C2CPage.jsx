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

const DISCIPLINES = ['Architecture','Civil','Structural','Hydraulics','Landscaping','Certifier','Fire Engineering','Fire Services','Builder/CM']
const fmt = v => v != null ? `$${Number(v).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—'

function NewSnapshotModal({ projectId, onClose }) {
  const qc = useQueryClient()
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({ phase: 'design', week_number: 1, snapshot_date: today, week_label: '' })
  const [error, setError] = useState(null)
  const mut = useMutation({
    mutationFn: d => c2cApi.createSnapshot(projectId, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['c2c-snapshots', projectId] }); onClose() }
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.week_label) { setError('Week label required'); return }
    mut.mutate({ ...form, week_number: Number(form.week_number) }, { onError: err => setError(err.response?.data?.error || err.message) })
  }

  return (
    <Modal title="New C2C Snapshot" onClose={onClose} size="sm">
      <form onSubmit={handleSubmit}>
        <div className="form-row cols-2">
          <FormField label="Phase">
            <select className="form-select" value={form.phase} onChange={e => setForm(p => ({ ...p, phase: e.target.value }))}>
              <option value="design">Design</option>
              <option value="construction">Construction</option>
            </select>
          </FormField>
          <FormField label="Week Number">
            <input className="form-input" type="number" min="1" value={form.week_number} onChange={e => setForm(p => ({ ...p, week_number: e.target.value }))} />
          </FormField>
        </div>
        <FormField label="Week Label" required hint="Shown as the sheet name in Excel export">
          <input className="form-input" value={form.week_label} placeholder="e.g. Week 3 — 15 Oct 2025" onChange={e => setForm(p => ({ ...p, week_label: e.target.value }))} />
        </FormField>
        <FormField label="Snapshot Date">
          <input className="form-input" type="date" value={form.snapshot_date} onChange={e => setForm(p => ({ ...p, snapshot_date: e.target.value }))} />
        </FormField>
        {error && <div className="error-banner mb-4">{error}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={mut.isPending}>Create Snapshot</button>
        </div>
      </form>
    </Modal>
  )
}

function AllocationTable({ snapshot, allocations, onUpdateAllocation, locked }) {
  // Group by discipline
  const grouped = DISCIPLINES.reduce((acc, disc) => {
    acc[disc] = allocations.filter(a => a.discipline === disc)
    return acc
  }, {})

  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: 200 }}>Resource</th>
            <th style={{ width: 90, textAlign: 'right' }}>Rate ($/hr)</th>
            <th style={{ width: 90, textAlign: 'right' }}>Utilisation</th>
            <th style={{ width: 100, textAlign: 'right' }}>Remaining Wks</th>
            <th style={{ width: 80, textAlign: 'right' }}>Hours</th>
            <th style={{ width: 110, textAlign: 'right' }}>Cost to Complete</th>
          </tr>
        </thead>
        <tbody>
          {DISCIPLINES.map(disc => {
            const group = grouped[disc]
            if (!group || group.length === 0) return null
            return [
              <tr key={`hdr-${disc}`} className="group-header">
                <td colSpan={6}>{disc} Resource Program</td>
              </tr>,
              ...group.map(a => (
                <tr key={a.id}>
                  <td>{a.resource_name}</td>
                  <td className="num">{fmt(a.hourly_rate)}</td>
                  <td className="num">
                    {locked ? a.weekly_utilisation?.toFixed(2) : (
                      <input
                        type="number" step="0.05" min="0" max="1"
                        defaultValue={a.weekly_utilisation ?? 0}
                        style={{ width: 60, textAlign: 'right', border: '1px solid var(--color-border)', borderRadius: 2, padding: '1px 4px', fontSize: 12 }}
                        onBlur={e => onUpdateAllocation({ id: a.id, weekly_utilisation: parseFloat(e.target.value) || 0, remaining_weeks: a.remaining_weeks })}
                      />
                    )}
                  </td>
                  <td className="num">
                    {locked ? a.remaining_weeks?.toFixed(1) : (
                      <input
                        type="number" step="0.5" min="0"
                        defaultValue={a.remaining_weeks ?? 0}
                        style={{ width: 60, textAlign: 'right', border: '1px solid var(--color-border)', borderRadius: 2, padding: '1px 4px', fontSize: 12 }}
                        onBlur={e => onUpdateAllocation({ id: a.id, weekly_utilisation: a.weekly_utilisation, remaining_weeks: parseFloat(e.target.value) || 0 })}
                      />
                    )}
                  </td>
                  <td className="num">{a.hours_calculated?.toFixed(1) ?? '—'}</td>
                  <td className="num">{fmt(a.cost_calculated)}</td>
                </tr>
              ))
            ]
          })}
        </tbody>
      </table>
    </div>
  )
}

function FinancialsTable({ financials, snapshot, onUpdateFinancial, locked }) {
  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)', marginBottom: 8 }}>Financial Summary</h3>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 160 }}>Discipline</th>
              <th style={{ width: 110, textAlign: 'right' }}>Agreed Fee</th>
              <th style={{ width: 120, textAlign: 'right' }}>Cost at Close</th>
              <th style={{ width: 100, textAlign: 'right' }}>Net to Carry</th>
              <th style={{ width: 130, textAlign: 'right' }}>Synergy Net Res.</th>
              <th style={{ width: 120, textAlign: 'right' }}>Tot. Net to Carry</th>
              <th style={{ width: 130, textAlign: 'right' }}>CTC (Design Doc)</th>
              <th style={{ width: 120, textAlign: 'right' }}>Adj. Net Res.</th>
              <th style={{ width: 100, textAlign: 'right' }}>Under / Over</th>
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
                  {['agreed_fee','cost_at_close','net_to_carry','synergy_net_residual','total_net_to_carry','construction_doc_cost_to_complete'].map(field => (
                    <td key={field} className="num">
                      {locked ? fmt(fin[field]) : (
                        <input
                          type="number" step="100"
                          defaultValue={fin[field] ?? 0}
                          style={{ width: 90, textAlign: 'right', border: '1px solid var(--color-border)', borderRadius: 2, padding: '1px 4px', fontSize: 12 }}
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
                {['agreed_fee','cost_at_close','net_to_carry','synergy_net_residual','total_net_to_carry','construction_doc_cost_to_complete'].map(field => (
                  <td key={field} className="num">{fmt(financials.reduce((s, f) => s + (f[field] || 0), 0))}</td>
                ))}
                <td className="num">{fmt(financials.reduce((s, f) => s + (f.adjusted_net_residual || 0), 0))}</td>
                <td className="num" style={{ color: financials.reduce((s, f) => s + (f.under_over || 0), 0) >= 0 ? 'var(--color-positive)' : 'var(--color-negative)', fontWeight: 700 }}>
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
          <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}>+ New Snapshot</button>
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
        <div className="empty-state card" style={{ padding: 32 }}>No {phaseFilter} snapshots yet. Click "+ New Snapshot" to create the first weekly entry.</div>
      )}

      {activeSnap && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{activeSnap.week_label}</span>
            <span style={{ marginLeft: 12, fontSize: 12, color: 'var(--color-text-muted)' }}>{activeSnap.snapshot_date}</span>
            {locked && <span style={{ marginLeft: 8, background: 'var(--color-tertiary)', color: 'var(--color-primary)', padding: '2px 8px', borderRadius: 3, fontSize: 11, fontWeight: 600 }}>LOCKED</span>}
          </div>
          {!locked && (
            <button className="btn btn-secondary btn-sm" onClick={() => lockMut.mutate()}>🔒 Lock Snapshot</button>
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
          <FinancialsTable
            financials={financials}
            snapshot={activeSnap}
            locked={locked}
            onUpdateFinancial={item => updateFinMut.mutate(item)}
          />
        </>
      )}

      {showNew && <NewSnapshotModal projectId={projectId} onClose={() => setShowNew(false)} />}
    </div>
  )
}
