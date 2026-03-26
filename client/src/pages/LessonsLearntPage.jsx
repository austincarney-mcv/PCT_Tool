import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { lessonsApi } from '../api/register.api'
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

const PRIORITIES = ['Low','Med','High']
const STATUSES = ['Open','Closed','In Progress']

function AddLessonModal({ projectId, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    event_details: '', priority: 'Med', logged_by: '',
    logged_date: new Date().toISOString().slice(0, 10)
  })
  const [error, setError] = useState(null)
  const mut = useMutation({
    mutationFn: d => lessonsApi.create(projectId, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lessons', projectId] }); onClose() }
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.event_details) { setError('Event details required'); return }
    mut.mutate(form, { onError: err => setError(err.response?.data?.error || err.message) })
  }

  return (
    <Modal title="Add Lesson Learnt" onClose={onClose} size="md">
      <form onSubmit={handleSubmit}>
        <FormField label="Event Details" required>
          <textarea className="form-input" rows={3} value={form.event_details}
            onChange={e => setForm(p => ({ ...p, event_details: e.target.value }))} />
        </FormField>
        <div className="form-row cols-2">
          <FormField label="Priority">
            <select className="form-select" value={form.priority}
              onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
              {PRIORITIES.map(v => <option key={v}>{v}</option>)}
            </select>
          </FormField>
          <FormField label="Logged Date">
            <input className="form-input" type="date" value={form.logged_date}
              onChange={e => setForm(p => ({ ...p, logged_date: e.target.value }))} />
          </FormField>
        </div>
        <FormField label="Logged By">
          <input className="form-input" value={form.logged_by}
            onChange={e => setForm(p => ({ ...p, logged_by: e.target.value }))} />
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

export default function LessonsLearntPage() {
  const { projectId } = useProject()
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('Open')
  const [showAdd, setShowAdd] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['lessons', projectId, statusFilter],
    queryFn: () => lessonsApi.list(projectId, { status: statusFilter || undefined }),
    enabled: !!projectId,
  })

  const updateMut = useMutation({
    mutationFn: ({ id, field, value }) => lessonsApi.update(projectId, id, { [field]: value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lessons', projectId] }),
  })

  const deleteMut = useMutation({
    mutationFn: id => lessonsApi.remove(projectId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lessons', projectId] }); setDeleteId(null) },
  })

  function save(row, field) {
    return value => updateMut.mutateAsync({ id: row.id, field, value })
  }

  const columns = [
    { key: 'item_number', header: '#', width: 50,
      render: row => <EditableCell value={row.item_number} onSave={save(row, 'item_number')} /> },
    { key: 'logged_date', header: 'Date', width: 95,
      render: row => <EditableCell value={row.logged_date} onSave={save(row, 'logged_date')} type="date" /> },
    { key: 'event_details', header: 'Event Details', sortable: true,
      render: row => <EditableCell value={row.event_details} onSave={save(row, 'event_details')} type="textarea" /> },
    { key: 'effect', header: 'Effect', width: 140,
      render: row => <EditableCell value={row.effect} onSave={save(row, 'effect')} type="textarea" /> },
    { key: 'cause', header: 'Cause', width: 130,
      render: row => <EditableCell value={row.cause} onSave={save(row, 'cause')} type="textarea" /> },
    { key: 'future_recommendation', header: 'Recommendation',
      render: row => <EditableCell value={row.future_recommendation} onSave={save(row, 'future_recommendation')} type="textarea" /> },
    { key: 'logged_by', header: 'Logged By', width: 100,
      render: row => <EditableCell value={row.logged_by} onSave={save(row, 'logged_by')} /> },
    { key: 'responsible_person', header: 'Responsible', width: 110,
      render: row => <EditableCell value={row.responsible_person} onSave={save(row, 'responsible_person')} /> },
    { key: 'priority', header: 'Priority', width: 70, sortable: true,
      render: row => <EditableCell value={row.priority} onSave={save(row, 'priority')} type="select" options={['', ...PRIORITIES]} /> },
    { key: 'status', header: 'Status', width: 90, sortable: true,
      render: row => <EditableCell value={row.status} onSave={save(row, 'status')} type="select" options={STATUSES} /> },
    { key: 'previously_identified', header: 'Prev.', width: 50, align: 'center',
      render: row => (
        <input type="checkbox" checked={!!row.previously_identified}
          onChange={e => updateMut.mutate({ id: row.id, field: 'previously_identified', value: e.target.checked ? 1 : 0 })} />
      )},
    { key: 'actions', header: '', width: 40, className: 'actions',
      render: row => (
        <button className="btn btn-ghost btn-xs" onClick={() => setDeleteId(row.id)}
          title="Delete" style={{ color: 'var(--color-negative)' }}>✕</button>
      )},
  ]

  if (!projectId) return <div className="empty-state">Select a project to view lessons learnt.</div>
  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorBanner error={error} />

  return (
    <div>
      <PageHeader
        title="Lessons Learnt"
        subtitle={`${items.length} lesson${items.length !== 1 ? 's' : ''}`}
        actions={<>
          <ExportButton />
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add Lesson</button>
        </>}
      />
      <div className="tab-strip mb-4">
        {['Open', 'Closed', 'In Progress', ''].map(s => (
          <button key={s || 'all'} className={`tab${statusFilter === s ? ' active' : ''}`}
            onClick={() => setStatusFilter(s)}>
            {s || 'All'}
          </button>
        ))}
      </div>
      <DataTable
        columns={columns}
        rows={items}
        emptyMessage="No lessons learnt found."
      />
      {showAdd && <AddLessonModal projectId={projectId} onClose={() => setShowAdd(false)} />}
      {deleteId && (
        <ConfirmDialog
          title="Delete Lesson"
          message="Are you sure you want to delete this lesson? This cannot be undone."
          onConfirm={() => deleteMut.mutate(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  )
}
