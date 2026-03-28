import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { resourcesApi } from '../api/teamResources.api'
import { useProject } from '../context/ProjectContext'
import PageHeader from '../components/layout/PageHeader'
import Modal from '../components/common/Modal'
import FormField from '../components/common/FormField'
import ConfirmDialog from '../components/common/ConfirmDialog'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ErrorBanner from '../components/common/ErrorBanner'
import EditableCell from '../components/common/EditableCell'
import DataTable from '../components/common/DataTable'

const DISCIPLINES = ['Architecture','Civil','Structural','Hydraulics','Landscaping','Certifier','Fire Engineering','Fire Services','Builder/CM']
const fmt = v => v != null ? `$${Number(v).toFixed(2)}/hr` : '—'

function AddResourceModal({ projectId, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', discipline: 'Architecture', hourly_rate: '' })
  const [error, setError] = useState(null)
  const mut = useMutation({
    mutationFn: d => resourcesApi.create(projectId, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['resources', projectId] }); onClose() },
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name || form.hourly_rate === '') { setError('Name and hourly rate are required'); return }
    mut.mutate({ ...form, hourly_rate: Number(form.hourly_rate) }, {
      onError: err => setError(err.response?.data?.error || err.message),
    })
  }

  return (
    <Modal title="Add Team Resource" onClose={onClose} size="sm">
      <form onSubmit={handleSubmit}>
        <FormField label="Name" required>
          <input className="form-input" value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
        </FormField>
        <FormField label="Discipline" required>
          <select className="form-select" value={form.discipline}
            onChange={e => setForm(p => ({ ...p, discipline: e.target.value }))}>
            {DISCIPLINES.map(d => <option key={d}>{d}</option>)}
          </select>
        </FormField>
        <FormField label="Hourly Rate ($)" required>
          <input className="form-input" type="number" step="0.01" min="0"
            value={form.hourly_rate}
            onChange={e => setForm(p => ({ ...p, hourly_rate: e.target.value }))} />
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

export default function TeamResourcesPage() {
  const { projectId } = useProject()
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const { data: resources = [], isLoading, error } = useQuery({
    queryKey: ['resources', projectId],
    queryFn: () => resourcesApi.list(projectId),
    enabled: !!projectId,
  })

  const updateMut = useMutation({
    mutationFn: ({ id, field, value }) => resourcesApi.update(projectId, id, { [field]: value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resources', projectId] }),
  })

  const deleteMut = useMutation({
    mutationFn: id => resourcesApi.remove(projectId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['resources', projectId] }); setDeleteId(null) },
  })

  function save(row, field) {
    return value => updateMut.mutateAsync({ id: row.id, field, value })
  }

  const columns = [
    { key: 'name', header: 'Name', sortable: true,
      render: row => <EditableCell value={row.name} onSave={save(row, 'name')} /> },
    { key: 'discipline', header: 'Discipline', width: 140, sortable: true,
      render: row => <EditableCell value={row.discipline} onSave={save(row, 'discipline')} type="select" options={DISCIPLINES} /> },
    { key: 'hourly_rate', header: 'Hourly Rate', width: 120, align: 'right',
      render: row => <EditableCell value={row.hourly_rate} onSave={save(row, 'hourly_rate')} type="number" align="right" format={fmt} /> },
    { key: 'actions', header: '', width: 40, className: 'actions',
      render: row => (
        <button className="btn btn-ghost btn-xs" onClick={() => setDeleteId(row.id)}
          title="Delete" style={{ color: 'var(--color-negative)' }}>✕</button>
      )},
  ]

  if (!projectId) return <div className="empty-state">Select a project to manage team resources.</div>
  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorBanner error={error} />

  return (
    <div>
      <PageHeader
        title="Team Resources"
        subtitle={`${resources.length} resource${resources.length !== 1 ? 's' : ''}`}
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add Resource</button>
        }
      />
      <DataTable
        columns={columns}
        rows={resources}
        groupBy="discipline"
        emptyMessage="No team resources yet. Click '+ Add Resource' to get started."
      />
      {showAdd && <AddResourceModal projectId={projectId} onClose={() => setShowAdd(false)} />}
      {deleteId && (
        <ConfirmDialog
          title="Remove Resource"
          message="Are you sure you want to remove this team resource? This may affect C2C allocations."
          onConfirm={() => deleteMut.mutate(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  )
}
