import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { criticalItemsApi, criticalItemToggle } from '../api/register.api'
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

function AddItemModal({ projectId, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ details: '', agreed_strategy: '', responsible_person: '', action_date: '' })
  const [error, setError] = useState(null)
  const mut = useMutation({
    mutationFn: d => criticalItemsApi.create(projectId, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['critical-items', projectId] }); onClose() }
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.details) { setError('Details required'); return }
    mut.mutate(form, { onError: err => setError(err.response?.data?.error || err.message) })
  }

  return (
    <Modal title="Add Critical Item" onClose={onClose} size="md">
      <form onSubmit={handleSubmit}>
        <FormField label="Details" required>
          <textarea className="form-input" rows={3} value={form.details}
            onChange={e => setForm(p => ({ ...p, details: e.target.value }))} />
        </FormField>
        <FormField label="Agreed Strategy">
          <textarea className="form-input" rows={2} value={form.agreed_strategy}
            onChange={e => setForm(p => ({ ...p, agreed_strategy: e.target.value }))} />
        </FormField>
        <div className="form-row cols-2">
          <FormField label="Responsible Person">
            <input className="form-input" value={form.responsible_person}
              onChange={e => setForm(p => ({ ...p, responsible_person: e.target.value }))} />
          </FormField>
          <FormField label="Action Date">
            <input className="form-input" type="date" value={form.action_date}
              onChange={e => setForm(p => ({ ...p, action_date: e.target.value }))} />
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

export default function CriticalItemsPage() {
  const { projectId } = useProject()
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('OPEN')
  const [showAdd, setShowAdd] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['critical-items', projectId, statusFilter],
    queryFn: () => criticalItemsApi.list(projectId, { status: statusFilter || undefined }),
    enabled: !!projectId,
  })

  const updateMut = useMutation({
    mutationFn: ({ id, field, value }) => criticalItemsApi.update(projectId, id, { [field]: value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['critical-items', projectId] }),
  })

  const toggleMut = useMutation({
    mutationFn: id => criticalItemToggle(projectId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['critical-items', projectId] }),
  })

  const deleteMut = useMutation({
    mutationFn: id => criticalItemsApi.remove(projectId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['critical-items', projectId] }); setDeleteId(null) },
  })

  function save(row, field) {
    return value => updateMut.mutateAsync({ id: row.id, field, value })
  }

  const columns = [
    { key: 'item_number', header: '#', width: 50,
      render: row => <EditableCell value={row.item_number} onSave={save(row, 'item_number')} /> },
    { key: 'details', header: 'Details', sortable: true,
      render: row => <EditableCell value={row.details} onSave={save(row, 'details')} type="textarea" /> },
    { key: 'agreed_strategy', header: 'Agreed Strategy',
      render: row => <EditableCell value={row.agreed_strategy} onSave={save(row, 'agreed_strategy')} type="textarea" /> },
    { key: 'action_step', header: 'Action Step',
      render: row => <EditableCell value={row.action_step} onSave={save(row, 'action_step')} type="textarea" /> },
    { key: 'responsible_person', header: 'Responsible', width: 110,
      render: row => <EditableCell value={row.responsible_person} onSave={save(row, 'responsible_person')} /> },
    { key: 'action_date', header: 'Action Date', width: 100,
      render: row => <EditableCell value={row.action_date} onSave={save(row, 'action_date')} type="date" /> },
    { key: 'resolution_required_date', header: 'Resolve By', width: 100,
      render: row => <EditableCell value={row.resolution_required_date} onSave={save(row, 'resolution_required_date')} type="date" /> },
    { key: 'date_resolved', header: 'Resolved', width: 100,
      render: row => <EditableCell value={row.date_resolved} onSave={save(row, 'date_resolved')} type="date" /> },
    { key: 'status', header: 'Status', width: 80, align: 'center',
      render: row => (
        <span style={{ cursor: 'pointer' }} onClick={() => toggleMut.mutate(row.id)} title="Click to toggle">
          <StatusBadge status={row.status} />
        </span>
      )},
    { key: 'actions', header: '', width: 40, className: 'actions',
      render: row => (
        <button className="btn btn-ghost btn-xs" onClick={() => setDeleteId(row.id)}
          title="Delete" style={{ color: 'var(--color-negative)' }}>✕</button>
      )},
  ]

  if (!projectId) return <div className="empty-state">Select a project to view critical items.</div>
  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorBanner error={error} />

  return (
    <div>
      <PageHeader
        title="Critical Items Register"
        subtitle={`${items.length} item${items.length !== 1 ? 's' : ''}`}
        actions={<>
          <ExportButton />
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add Item</button>
        </>}
      />
      <div className="tab-strip mb-4">
        {['OPEN', 'CLOSED', ''].map(s => (
          <button key={s || 'all'} className={`tab${statusFilter === s ? ' active' : ''}`}
            onClick={() => setStatusFilter(s)}>
            {s || 'All'}
          </button>
        ))}
      </div>
      <DataTable
        columns={columns}
        rows={items}
        emptyMessage="No critical items found."
      />
      {showAdd && <AddItemModal projectId={projectId} onClose={() => setShowAdd(false)} />}
      {deleteId && (
        <ConfirmDialog
          title="Delete Critical Item"
          message="Are you sure you want to delete this item? This cannot be undone."
          onConfirm={() => deleteMut.mutate(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  )
}
