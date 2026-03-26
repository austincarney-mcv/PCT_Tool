import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { risksApi } from '../api/register.api'
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
const PRIORITIES = ['Low','Med','High']
const ISSUE_TYPES = ['RFC','OS','P']

function AddRiskModal({ projectId, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    description: '', priority: 'Med', risk_likelihood: 'Possible',
    date_raised: new Date().toISOString().slice(0, 10)
  })
  const [error, setError] = useState(null)
  const mut = useMutation({
    mutationFn: d => risksApi.create(projectId, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['risks', projectId] }); onClose() }
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.description) { setError('Description required'); return }
    mut.mutate(form, { onError: err => setError(err.response?.data?.error || err.message) })
  }

  return (
    <Modal title="Add Risk / Issue" onClose={onClose} size="md">
      <form onSubmit={handleSubmit}>
        <FormField label="Description" required>
          <textarea className="form-input" rows={3} value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </FormField>
        <div className="form-row cols-2">
          <FormField label="Priority">
            <select className="form-select" value={form.priority}
              onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
              {PRIORITIES.map(v => <option key={v}>{v}</option>)}
            </select>
          </FormField>
          <FormField label="Likelihood">
            <select className="form-select" value={form.risk_likelihood}
              onChange={e => setForm(p => ({ ...p, risk_likelihood: e.target.value }))}>
              {LIKELIHOODS.map(v => <option key={v}>{v}</option>)}
            </select>
          </FormField>
        </div>
        <div className="form-row cols-2">
          <FormField label="Raised By">
            <input className="form-input" value={form.raised_by || ''}
              onChange={e => setForm(p => ({ ...p, raised_by: e.target.value }))} />
          </FormField>
          <FormField label="Date Raised">
            <input className="form-input" type="date" value={form.date_raised}
              onChange={e => setForm(p => ({ ...p, date_raised: e.target.value }))} />
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

export default function RiskIssuePage() {
  const { projectId } = useProject()
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('Open')
  const [showAdd, setShowAdd] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['risks', projectId, statusFilter],
    queryFn: () => risksApi.list(projectId, { status: statusFilter || undefined }),
    enabled: !!projectId,
  })

  const updateMut = useMutation({
    mutationFn: ({ id, field, value }) => risksApi.update(projectId, id, { [field]: value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['risks', projectId] }),
  })

  const deleteMut = useMutation({
    mutationFn: id => risksApi.remove(projectId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['risks', projectId] }); setDeleteId(null) },
  })

  function save(row, field) {
    return value => updateMut.mutateAsync({ id: row.id, field, value })
  }

  const columns = [
    { key: 'issue_id_text', header: 'ID', width: 60,
      render: row => <EditableCell value={row.issue_id_text} onSave={save(row, 'issue_id_text')} /> },
    { key: 'issue_type', header: 'Type', width: 55,
      render: row => <EditableCell value={row.issue_type} onSave={save(row, 'issue_type')} type="select" options={['', ...ISSUE_TYPES]} /> },
    { key: 'date_raised', header: 'Date', width: 95,
      render: row => <EditableCell value={row.date_raised} onSave={save(row, 'date_raised')} type="date" /> },
    { key: 'description', header: 'Description', sortable: true,
      render: row => <EditableCell value={row.description} onSave={save(row, 'description')} type="textarea" /> },
    { key: 'raised_by', header: 'Raised By', width: 100,
      render: row => <EditableCell value={row.raised_by} onSave={save(row, 'raised_by')} /> },
    { key: 'priority', header: 'Priority', width: 70, sortable: true,
      render: row => <EditableCell value={row.priority} onSave={save(row, 'priority')} type="select" options={['', ...PRIORITIES]} /> },
    { key: 'risk_likelihood', header: 'Likelihood', width: 110, sortable: true,
      render: row => <EditableCell value={row.risk_likelihood} onSave={save(row, 'risk_likelihood')} type="select" options={['', ...LIKELIHOODS]} /> },
    { key: 'severity', header: 'Severity', width: 90,
      render: row => <EditableCell value={row.severity} onSave={save(row, 'severity')} /> },
    { key: 'status', header: 'Status', width: 75, sortable: true,
      render: row => <EditableCell value={row.status} onSave={save(row, 'status')} type="select" options={['Open','Closed','Monitoring']} /> },
    { key: 'closure_date', header: 'Closed', width: 95,
      render: row => <EditableCell value={row.closure_date} onSave={save(row, 'closure_date')} type="date" /> },
    { key: 'actions', header: '', width: 40, className: 'actions',
      render: row => (
        <button className="btn btn-ghost btn-xs" onClick={() => setDeleteId(row.id)}
          title="Delete" style={{ color: 'var(--color-negative)' }}>✕</button>
      )},
  ]

  if (!projectId) return <div className="empty-state">Select a project to view risks and issues.</div>
  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorBanner error={error} />

  return (
    <div>
      <PageHeader
        title="Risk & Issue Register"
        subtitle={`${items.length} item${items.length !== 1 ? 's' : ''}`}
        actions={<>
          <ExportButton />
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add Risk</button>
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
        emptyMessage="No risks or issues found."
      />
      {showAdd && <AddRiskModal projectId={projectId} onClose={() => setShowAdd(false)} />}
      {deleteId && (
        <ConfirmDialog
          title="Delete Risk/Issue"
          message="Are you sure you want to delete this item? This cannot be undone."
          onConfirm={() => deleteMut.mutate(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  )
}
