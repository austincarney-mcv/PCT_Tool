import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { approvalsApi, approvalsToggle } from '../api/register.api'
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

const STATUS_OPTIONS = ['','In Progress','Approved','Pending','Not Required','Lodged','Issued']

function AddApprovalModal({ projectId, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ description: '', category: '', legislation: '', authority: '' })
  const [error, setError] = useState(null)
  const mut = useMutation({
    mutationFn: d => approvalsApi.create(projectId, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['approvals', projectId] }); onClose() }
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.description) { setError('Description required'); return }
    mut.mutate(form, { onError: err => setError(err.response?.data?.error || err.message) })
  }

  return (
    <Modal title="Add Approval Item" onClose={onClose} size="md">
      <form onSubmit={handleSubmit}>
        <FormField label="Description" required>
          <textarea className="form-input" rows={3} value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </FormField>
        <div className="form-row cols-2">
          <FormField label="Category">
            <input className="form-input" value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))} />
          </FormField>
          <FormField label="Authority">
            <input className="form-input" value={form.authority}
              onChange={e => setForm(p => ({ ...p, authority: e.target.value }))} />
          </FormField>
        </div>
        <FormField label="Legislation">
          <input className="form-input" value={form.legislation}
            onChange={e => setForm(p => ({ ...p, legislation: e.target.value }))} />
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

export default function ApprovalsPage() {
  const { projectId } = useProject()
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['approvals', projectId],
    queryFn: () => approvalsApi.list(projectId),
    enabled: !!projectId,
  })

  const updateMut = useMutation({
    mutationFn: ({ id, field, value }) => approvalsApi.update(projectId, id, { [field]: value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approvals', projectId] }),
  })

  const toggleMut = useMutation({
    mutationFn: id => approvalsToggle(projectId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approvals', projectId] }),
  })

  const deleteMut = useMutation({
    mutationFn: id => approvalsApi.remove(projectId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['approvals', projectId] }); setDeleteId(null) },
  })

  function save(row, field) {
    return value => updateMut.mutateAsync({ id: row.id, field, value })
  }

  const columns = [
    { key: 'item_number', header: '#', width: 50,
      render: row => <EditableCell value={row.item_number} onSave={save(row, 'item_number')} /> },
    { key: 'description', header: 'Description', sortable: true,
      render: row => <EditableCell value={row.description} onSave={save(row, 'description')} type="textarea" /> },
    { key: 'legislation', header: 'Legislation', width: 130,
      render: row => <EditableCell value={row.legislation} onSave={save(row, 'legislation')} /> },
    { key: 'authority', header: 'Authority', width: 130,
      render: row => <EditableCell value={row.authority} onSave={save(row, 'authority')} /> },
    { key: 'application_id', header: 'Application ID', width: 110,
      render: row => <EditableCell value={row.application_id} onSave={save(row, 'application_id')} /> },
    { key: 'current_status', header: 'Status', width: 110, sortable: true,
      render: row => <EditableCell value={row.current_status} onSave={save(row, 'current_status')} type="select" options={STATUS_OPTIONS} /> },
    { key: 'date_lodged', header: 'Lodged', width: 100,
      render: row => <EditableCell value={row.date_lodged} onSave={save(row, 'date_lodged')} type="date" /> },
    { key: 'expected_date', header: 'Expected', width: 100,
      render: row => <EditableCell value={row.expected_date} onSave={save(row, 'expected_date')} type="date" /> },
    { key: 'due_date', header: 'Due Date', width: 100,
      render: row => <EditableCell value={row.due_date} onSave={save(row, 'due_date')} type="date" /> },
    { key: 'responsible_person', header: 'Responsible', width: 110,
      render: row => <EditableCell value={row.responsible_person} onSave={save(row, 'responsible_person')} /> },
    { key: 'next_step', header: 'Next Step', width: 160,
      render: row => <EditableCell value={row.next_step} onSave={save(row, 'next_step')} type="textarea" /> },
    { key: 'complete', header: 'Done', width: 50, align: 'center',
      render: row => (
        <input type="checkbox" checked={!!row.complete}
          onChange={() => toggleMut.mutate(row.id)} />
      )},
    { key: 'actions', header: '', width: 40, className: 'actions',
      render: row => (
        <button className="btn btn-ghost btn-xs" onClick={() => setDeleteId(row.id)}
          title="Delete" style={{ color: 'var(--color-negative)' }}>✕</button>
      )},
  ]

  if (!projectId) return <div className="empty-state">Select a project to view approvals.</div>
  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorBanner error={error} />

  return (
    <div>
      <PageHeader
        title="Approvals Tracker"
        subtitle={`${items.length} item${items.length !== 1 ? 's' : ''}`}
        actions={<>
          <ExportButton />
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add Item</button>
        </>}
      />
      <DataTable
        columns={columns}
        rows={items}
        groupBy="category"
        emptyMessage="No approval items yet. Click '+ Add Item' to get started."
      />
      {showAdd && <AddApprovalModal projectId={projectId} onClose={() => setShowAdd(false)} />}
      {deleteId && (
        <ConfirmDialog
          title="Delete Approval Item"
          message="Are you sure you want to delete this item? This cannot be undone."
          onConfirm={() => deleteMut.mutate(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  )
}
