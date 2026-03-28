import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { drawingsApi } from '../api/drawings.api'
import { useProject } from '../context/ProjectContext'
import PageHeader from '../components/layout/PageHeader'
import DataTable from '../components/common/DataTable'
import EditableCell from '../components/common/EditableCell'
import Modal from '../components/common/Modal'
import FormField from '../components/common/FormField'
import ConfirmDialog from '../components/common/ConfirmDialog'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ErrorBanner from '../components/common/ErrorBanner'
import ExportButton from '../components/excel/ExportButton'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const DISCIPLINES = ['All','Architecture','Civil','Structural','Hydraulics','Landscaping','Certifier','Fire Engineering','Fire Services','Builder/CM']

function AddDrawingModal({ projectId, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ discipline: 'Architecture', drawing_number: '', drawing_title: '', scale: '' })
  const [error, setError] = useState(null)
  const mut = useMutation({
    mutationFn: d => drawingsApi.create(projectId, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['drawings', projectId] }); onClose() }
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.drawing_number || !form.drawing_title) { setError('Drawing number and title required'); return }
    mut.mutate(form, { onError: err => setError(err.response?.data?.error || err.message) })
  }

  return (
    <Modal title="Add Drawing" onClose={onClose} size="md">
      <form onSubmit={handleSubmit}>
        <div className="form-row cols-2">
          <FormField label="Discipline" required>
            <select className="form-select" value={form.discipline} onChange={e => setForm(p => ({ ...p, discipline: e.target.value }))}>
              {DISCIPLINES.slice(1).map(d => <option key={d}>{d}</option>)}
            </select>
          </FormField>
          <FormField label="Scale">
            <input className="form-input" value={form.scale} onChange={e => setForm(p => ({ ...p, scale: e.target.value }))} placeholder="e.g. 1:100" />
          </FormField>
        </div>
        <FormField label="Drawing Number" required>
          <input className="form-input" value={form.drawing_number} onChange={e => setForm(p => ({ ...p, drawing_number: e.target.value }))} placeholder="e.g. A-001" />
        </FormField>
        <FormField label="Drawing Title" required>
          <input className="form-input" value={form.drawing_title} onChange={e => setForm(p => ({ ...p, drawing_title: e.target.value }))} placeholder="e.g. Site Plan" />
        </FormField>
        {error && <div className="error-banner mb-4">{error}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={mut.isPending}>Add</button>
        </div>
      </form>
    </Modal>
  )
}

export default function DeliverableSchedulePage() {
  const { projectId } = useProject()
  const qc = useQueryClient()
  const [discipline, setDiscipline] = useState('All')
  const [showAdd, setShowAdd] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const { data: drawings = [], isLoading, error } = useQuery({
    queryKey: ['drawings', projectId, discipline],
    queryFn: () => drawingsApi.list(projectId, discipline === 'All' ? null : discipline),
    enabled: !!projectId,
  })

  const updateMut = useMutation({
    mutationFn: ({ did, field, value }) => drawingsApi.update(projectId, did, { [field]: value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drawings', projectId] }),
  })

  const deleteMut = useMutation({
    mutationFn: did => drawingsApi.remove(projectId, did),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['drawings', projectId] }); setDeleteId(null) },
  })

  function makeSaver(row, field) {
    return value => updateMut.mutateAsync({ did: row.id, field, value })
  }

  const { data: allDrawings = [] } = useQuery({
    queryKey: ['drawings', projectId, 'all'],
    queryFn: () => drawingsApi.list(projectId, null),
    enabled: !!projectId,
  })

  const DISC_SHORT = { Architecture: 'Arch', Civil: 'Civil', Structural: 'Struc', Hydraulics: 'Hyd', Landscaping: 'Lscape', Certifier: 'Cert', 'Fire Engineering': 'Fire Eng', 'Fire Services': 'Fire Svc', 'Builder/CM': 'Builder' }
  const completionChartData = DISCIPLINES.slice(1).map(disc => {
    const group = allDrawings.filter(d => d.discipline === disc)
    if (!group.length) return null
    const avg = group.reduce((s, d) => s + (d.complete_pct || 0), 0) / group.length
    return { discipline: DISC_SHORT[disc] || disc, pct: Math.round(avg) }
  }).filter(Boolean)

  const columns = [
    { key: 'discipline', header: 'Discipline', width: 110, sortable: true,
      render: row => <EditableCell value={row.discipline} onSave={makeSaver(row, 'discipline')} type="select"
        options={DISCIPLINES.slice(1)} /> },
    { key: 'drawing_number', header: 'Drawing No.', width: 100, sortable: true,
      render: row => <EditableCell value={row.drawing_number} onSave={makeSaver(row, 'drawing_number')} /> },
    { key: 'drawing_title', header: 'Drawing Title', sortable: true,
      render: row => <EditableCell value={row.drawing_title} onSave={makeSaver(row, 'drawing_title')} /> },
    { key: 'scale', header: 'Scale', width: 80,
      render: row => <EditableCell value={row.scale} onSave={makeSaver(row, 'scale')} /> },
    { key: 'issue_1_date', header: 'Issue 1 (60%)', width: 110,
      render: row => <EditableCell value={row.issue_1_date} onSave={makeSaver(row, 'issue_1_date')} type="date" /> },
    { key: 'issue_2_date', header: 'Issue 2 (70%)', width: 110,
      render: row => <EditableCell value={row.issue_2_date} onSave={makeSaver(row, 'issue_2_date')} type="date" /> },
    { key: 'issue_3_date', header: 'Issue 3 (80%)', width: 110,
      render: row => <EditableCell value={row.issue_3_date} onSave={makeSaver(row, 'issue_3_date')} type="date" /> },
    { key: 'issue_4_date', header: 'Issue 4 (90%)', width: 110,
      render: row => <EditableCell value={row.issue_4_date} onSave={makeSaver(row, 'issue_4_date')} type="date" /> },
    { key: 'issue_5_date', header: 'Issue 5 (100%)', width: 114,
      render: row => <EditableCell value={row.issue_5_date} onSave={makeSaver(row, 'issue_5_date')} type="date" /> },
    { key: 'complete_pct', header: 'Complete %', width: 90, align: 'right',
      render: row => <EditableCell value={row.complete_pct} onSave={makeSaver(row, 'complete_pct')} type="number" align="right"
        format={v => v != null ? `${v}%` : ''} /> },
    { key: 'primary_purpose', header: 'Purpose', width: 100,
      render: row => <EditableCell value={row.primary_purpose} onSave={makeSaver(row, 'primary_purpose')} /> },
    { key: 'procurement_flag', header: 'Proc.', width: 55,
      render: row => (
        <input type="checkbox" checked={!!row.procurement_flag}
          onChange={e => updateMut.mutate({ did: row.id, field: 'procurement_flag', value: e.target.checked ? 1 : 0 })} />
      )},
    { key: 'ifc_flag', header: 'IFC', width: 45,
      render: row => (
        <input type="checkbox" checked={!!row.ifc_flag}
          onChange={e => updateMut.mutate({ did: row.id, field: 'ifc_flag', value: e.target.checked ? 1 : 0 })} />
      )},
    { key: 'actions', header: '', width: 40, className: 'actions',
      render: row => (
        <button className="btn btn-ghost btn-xs" onClick={() => setDeleteId(row.id)} title="Delete" style={{ color: 'var(--color-negative)' }}>✕</button>
      )},
  ]

  if (!projectId) return <div className="empty-state">Select a project to view the deliverables schedule.</div>
  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorBanner error={error} />

  return (
    <div>
      <PageHeader
        title="Deliverables Schedule"
        subtitle={`${drawings.length} drawing${drawings.length !== 1 ? 's' : ''}`}
        actions={<>
          <ExportButton />
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add Drawing</button>
        </>}
      />

      {completionChartData.length > 0 && (
        <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 8 }}>AVG COMPLETION % BY DISCIPLINE</div>
          <div style={{ height: Math.max(90, completionChartData.length * 28) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={completionChartData} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="discipline" tick={{ fontSize: 11 }} width={52} />
                <Tooltip formatter={v => `${v}%`} />
                <Bar dataKey="pct" name="Completion" isAnimationActive radius={[0, 3, 3, 0]}>
                  {completionChartData.map(d => (
                    <Cell key={d.discipline} fill={d.pct >= 90 ? '#16a34a' : d.pct >= 70 ? '#d97706' : '#dc2626'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Discipline filter */}
      <div className="tab-strip mb-4" style={{ flexWrap: 'wrap' }}>
        {DISCIPLINES.map(d => (
          <button key={d} className={`tab${discipline === d ? ' active' : ''}`} onClick={() => setDiscipline(d)}>{d}</button>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={drawings}
        groupBy={discipline === 'All' ? 'discipline' : undefined}
        emptyMessage="No drawings found. Click '+ Add Drawing' to get started."
      />

      {showAdd && <AddDrawingModal projectId={projectId} onClose={() => setShowAdd(false)} />}
      {deleteId && (
        <ConfirmDialog
          title="Delete Drawing"
          message="Are you sure you want to delete this drawing? This cannot be undone."
          onConfirm={() => deleteMut.mutate(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  )
}
