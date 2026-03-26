import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sidApi } from '../api/register.api'
import { useProject } from '../context/ProjectContext'
import PageHeader from '../components/layout/PageHeader'
import DataTable from '../components/common/DataTable'
import EditableCell from '../components/common/EditableCell'
import Modal from '../components/common/Modal'
import FormField from '../components/common/FormField'
import ConfirmDialog from '../components/common/ConfirmDialog'
import StatusBadge from '../components/common/StatusBadge'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ErrorBanner from '../components/common/ErrorBanner'
import ExportButton from '../components/excel/ExportButton'

const LIKELIHOODS = ['Almost Certain','Likely','Possible','Unlikely','Very Unlikely']
const OUTCOMES = ['Catastrophic','Major','Moderate','Minor','Insignificant']
const RISK_RATINGS = ['Extreme','Significant','Moderate','Low','Negligible']

function AddHazardModal({ projectId, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ hazard: '', element_activity: '', potential_harm: '', likelihood: 'Possible', outcome: 'Moderate' })
  const [error, setError] = useState(null)
  const mut = useMutation({
    mutationFn: d => sidApi.create(projectId, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sid', projectId] }); onClose() }
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.hazard) { setError('Hazard description required'); return }
    mut.mutate(form, { onError: err => setError(err.response?.data?.error || err.message) })
  }

  return (
    <Modal title="Add SiD Hazard" onClose={onClose} size="md">
      <form onSubmit={handleSubmit}>
        <FormField label="Element / Activity">
          <input className="form-input" value={form.element_activity}
            onChange={e => setForm(p => ({ ...p, element_activity: e.target.value }))} />
        </FormField>
        <FormField label="Hazard" required>
          <textarea className="form-input" rows={2} value={form.hazard}
            onChange={e => setForm(p => ({ ...p, hazard: e.target.value }))} />
        </FormField>
        <FormField label="Potential Harm">
          <input className="form-input" value={form.potential_harm}
            onChange={e => setForm(p => ({ ...p, potential_harm: e.target.value }))} />
        </FormField>
        <div className="form-row cols-2">
          <FormField label="Likelihood">
            <select className="form-select" value={form.likelihood}
              onChange={e => setForm(p => ({ ...p, likelihood: e.target.value }))}>
              {LIKELIHOODS.map(v => <option key={v}>{v}</option>)}
            </select>
          </FormField>
          <FormField label="Outcome">
            <select className="form-select" value={form.outcome}
              onChange={e => setForm(p => ({ ...p, outcome: e.target.value }))}>
              {OUTCOMES.map(v => <option key={v}>{v}</option>)}
            </select>
          </FormField>
        </div>
        {error && <div className="error-banner mb-4">{error}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={mut.isPending}>Add</button>
        </div>
      </form>
    </Modal>
  )
}

export default function SiDPage() {
  const { projectId } = useProject()
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('Open')
  const [showAdd, setShowAdd] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['sid', projectId, statusFilter],
    queryFn: () => sidApi.list(projectId, { status: statusFilter || undefined }),
    enabled: !!projectId,
  })

  const updateMut = useMutation({
    mutationFn: ({ id, field, value }) => sidApi.update(projectId, id, { [field]: value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sid', projectId] }),
  })

  const deleteMut = useMutation({
    mutationFn: id => sidApi.remove(projectId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sid', projectId] }); setDeleteId(null) },
  })

  function save(row, field) {
    return value => updateMut.mutateAsync({ id: row.id, field, value })
  }

  const columns = [
    { key: 'ref_number', header: 'Ref', width: 60,
      render: row => <EditableCell value={row.ref_number} onSave={save(row, 'ref_number')} /> },
    { key: 'element_activity', header: 'Element / Activity', width: 140,
      render: row => <EditableCell value={row.element_activity} onSave={save(row, 'element_activity')} /> },
    { key: 'hazard', header: 'Hazard', sortable: true,
      render: row => <EditableCell value={row.hazard} onSave={save(row, 'hazard')} type="textarea" /> },
    { key: 'potential_harm', header: 'Potential Harm', width: 130,
      render: row => <EditableCell value={row.potential_harm} onSave={save(row, 'potential_harm')} type="textarea" /> },
    { key: 'likelihood', header: 'Likelihood', width: 110,
      render: row => <EditableCell value={row.likelihood} onSave={save(row, 'likelihood')} type="select" options={['', ...LIKELIHOODS]} /> },
    { key: 'outcome', header: 'Outcome', width: 105,
      render: row => <EditableCell value={row.outcome} onSave={save(row, 'outcome')} type="select" options={['', ...OUTCOMES]} /> },
    { key: 'risk_rating', header: 'Rating', width: 90, sortable: true,
      render: row => <EditableCell value={row.risk_rating} onSave={save(row, 'risk_rating')} type="select" options={['', ...RISK_RATINGS]} /> },
    { key: 'action_required', header: 'Action Required',
      render: row => <EditableCell value={row.action_required} onSave={save(row, 'action_required')} type="textarea" /> },
    { key: 'action_by', header: 'Action By', width: 100,
      render: row => <EditableCell value={row.action_by} onSave={save(row, 'action_by')} /> },
    { key: 'status', header: 'Status', width: 75, sortable: true,
      render: row => <EditableCell value={row.status} onSave={save(row, 'status')} type="select" options={['Open','Closed','Monitoring']} /> },
    { key: 'architect_notes', header: 'Notes', width: 130,
      render: row => <EditableCell value={row.architect_notes} onSave={save(row, 'architect_notes')} type="textarea" /> },
    { key: 'actions', header: '', width: 40, className: 'actions',
      render: row => (
        <button className="btn btn-ghost btn-xs" onClick={() => setDeleteId(row.id)}
          title="Delete" style={{ color: 'var(--color-negative)' }}>✕</button>
      )},
  ]

  if (!projectId) return <div className="empty-state">Select a project to view the SiD register.</div>
  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorBanner error={error} />

  return (
    <div>
      <PageHeader
        title="SiD Register"
        subtitle={`${items.length} hazard${items.length !== 1 ? 's' : ''}`}
        actions={<>
          <ExportButton />
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add Hazard</button>
        </>}
      />
      <div className="tab-strip mb-4">
        {['Open', 'Closed', 'Monitoring', ''].map(s => (
          <button key={s || 'all'} className={`tab${statusFilter === s ? ' active' : ''}`}
            onClick={() => setStatusFilter(s)}>
            {s || 'All'}
          </button>
        ))}
      </div>
      <DataTable
        columns={columns}
        rows={items}
        groupBy={statusFilter === '' ? 'category' : undefined}
        emptyMessage="No SiD hazards found."
      />
      {showAdd && <AddHazardModal projectId={projectId} onClose={() => setShowAdd(false)} />}
      {deleteId && (
        <ConfirmDialog
          title="Delete Hazard"
          message="Are you sure you want to delete this hazard? This cannot be undone."
          onConfirm={() => deleteMut.mutate(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  )
}
