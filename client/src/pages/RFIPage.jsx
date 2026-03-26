import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { rfisApi } from '../api/register.api'
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

const STATUSES = ['Open','Closed','Pending']

function AddRFIModal({ projectId, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    rfi_number: '', description: '', date_received: new Date().toISOString().slice(0, 10), client_deadline: ''
  })
  const [error, setError] = useState(null)
  const mut = useMutation({
    mutationFn: d => rfisApi.create(projectId, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rfis', projectId] }); onClose() }
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.rfi_number) { setError('RFI number required'); return }
    mut.mutate(form, { onError: err => setError(err.response?.data?.error || err.message) })
  }

  return (
    <Modal title="Add RFI" onClose={onClose} size="md">
      <form onSubmit={handleSubmit}>
        <div className="form-row cols-2">
          <FormField label="RFI Number" required>
            <input className="form-input" value={form.rfi_number}
              onChange={e => setForm(p => ({ ...p, rfi_number: e.target.value }))} placeholder="e.g. RFI-001" />
          </FormField>
          <FormField label="Date Received">
            <input className="form-input" type="date" value={form.date_received}
              onChange={e => setForm(p => ({ ...p, date_received: e.target.value }))} />
          </FormField>
        </div>
        <FormField label="Description">
          <textarea className="form-input" rows={3} value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </FormField>
        <FormField label="Client Deadline">
          <input className="form-input" type="date" value={form.client_deadline}
            onChange={e => setForm(p => ({ ...p, client_deadline: e.target.value }))} />
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

export default function RFIPage() {
  const { projectId } = useProject()
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('Open')
  const [showAdd, setShowAdd] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['rfis', projectId, statusFilter],
    queryFn: () => rfisApi.list(projectId, { status: statusFilter || undefined }),
    enabled: !!projectId,
  })

  const updateMut = useMutation({
    mutationFn: ({ id, field, value }) => rfisApi.update(projectId, id, { [field]: value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rfis', projectId] }),
  })

  const deleteMut = useMutation({
    mutationFn: id => rfisApi.remove(projectId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rfis', projectId] }); setDeleteId(null) },
  })

  function save(row, field) {
    return value => updateMut.mutateAsync({ id: row.id, field, value })
  }

  const columns = [
    { key: 'rfi_number', header: 'RFI #', width: 80, sortable: true,
      render: row => <EditableCell value={row.rfi_number} onSave={save(row, 'rfi_number')} /> },
    { key: 'description', header: 'Description', sortable: true,
      render: row => <EditableCell value={row.description} onSave={save(row, 'description')} type="textarea" /> },
    { key: 'date_received', header: 'Received', width: 100,
      render: row => <EditableCell value={row.date_received} onSave={save(row, 'date_received')} type="date" /> },
    { key: 'client_deadline', header: 'Deadline', width: 100,
      render: row => <EditableCell value={row.client_deadline} onSave={save(row, 'client_deadline')} type="date" /> },
    { key: 'outstanding_action', header: 'Outstanding Action',
      render: row => <EditableCell value={row.outstanding_action} onSave={save(row, 'outstanding_action')} type="textarea" /> },
    { key: 'status', header: 'Status', width: 90, sortable: true,
      render: row => <EditableCell value={row.status} onSave={save(row, 'status')} type="select" options={STATUSES} /> },
    { key: 'closed_date', header: 'Closed', width: 100,
      render: row => <EditableCell value={row.closed_date} onSave={save(row, 'closed_date')} type="date" /> },
    { key: 'eot_ref', header: 'EOT Ref', width: 80,
      render: row => <EditableCell value={row.eot_ref} onSave={save(row, 'eot_ref')} /> },
    { key: 'var_ref', header: 'Var Ref', width: 80,
      render: row => <EditableCell value={row.var_ref} onSave={save(row, 'var_ref')} /> },
    { key: 'actions', header: '', width: 40, className: 'actions',
      render: row => (
        <button className="btn btn-ghost btn-xs" onClick={() => setDeleteId(row.id)}
          title="Delete" style={{ color: 'var(--color-negative)' }}>✕</button>
      )},
  ]

  if (!projectId) return <div className="empty-state">Select a project to view RFIs.</div>
  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorBanner error={error} />

  return (
    <div>
      <PageHeader
        title="RFI Register"
        subtitle={`${items.length} RFI${items.length !== 1 ? 's' : ''}`}
        actions={<>
          <ExportButton />
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add RFI</button>
        </>}
      />
      <div className="tab-strip mb-4">
        {['Open', 'Closed', 'Pending', ''].map(s => (
          <button key={s || 'all'} className={`tab${statusFilter === s ? ' active' : ''}`}
            onClick={() => setStatusFilter(s)}>
            {s || 'All'}
          </button>
        ))}
      </div>
      <DataTable
        columns={columns}
        rows={items}
        emptyMessage="No RFIs found."
      />
      {showAdd && <AddRFIModal projectId={projectId} onClose={() => setShowAdd(false)} />}
      {deleteId && (
        <ConfirmDialog
          title="Delete RFI"
          message="Are you sure you want to delete this RFI? This cannot be undone."
          onConfirm={() => deleteMut.mutate(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  )
}
