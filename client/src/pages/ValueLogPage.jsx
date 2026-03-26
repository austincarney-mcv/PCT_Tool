import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { valueLogApi } from '../api/register.api'
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

const fmt = v => v != null && v !== 0 ? `$${Number(v).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—'

function AddValueModal({ projectId, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    description: '', value_amount: '', who: '', team: '',
    date: new Date().toISOString().slice(0, 10)
  })
  const [error, setError] = useState(null)
  const mut = useMutation({
    mutationFn: d => valueLogApi.create(projectId, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['value-log', projectId] }); onClose() }
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.description) { setError('Description required'); return }
    mut.mutate({ ...form, value_amount: parseFloat(form.value_amount) || 0 },
      { onError: err => setError(err.response?.data?.error || err.message) })
  }

  return (
    <Modal title="Add Value Log Entry" onClose={onClose} size="md">
      <form onSubmit={handleSubmit}>
        <FormField label="Description" required>
          <textarea className="form-input" rows={3} value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </FormField>
        <div className="form-row cols-2">
          <FormField label="Value ($)">
            <input className="form-input" type="number" value={form.value_amount}
              onChange={e => setForm(p => ({ ...p, value_amount: e.target.value }))} />
          </FormField>
          <FormField label="Date">
            <input className="form-input" type="date" value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
          </FormField>
        </div>
        <div className="form-row cols-2">
          <FormField label="Who">
            <input className="form-input" value={form.who}
              onChange={e => setForm(p => ({ ...p, who: e.target.value }))} />
          </FormField>
          <FormField label="Team">
            <input className="form-input" value={form.team}
              onChange={e => setForm(p => ({ ...p, team: e.target.value }))} />
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

export default function ValueLogPage() {
  const { projectId } = useProject()
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['value-log', projectId],
    queryFn: () => valueLogApi.list(projectId),
    enabled: !!projectId,
  })

  const updateMut = useMutation({
    mutationFn: ({ id, field, value }) => valueLogApi.update(projectId, id, { [field]: value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['value-log', projectId] }),
  })

  const deleteMut = useMutation({
    mutationFn: id => valueLogApi.remove(projectId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['value-log', projectId] }); setDeleteId(null) },
  })

  function save(row, field) {
    return value => updateMut.mutateAsync({ id: row.id, field, value })
  }

  const totalValue = items.reduce((s, i) => s + (i.value_amount || 0), 0)

  const columns = [
    { key: 'item_number', header: '#', width: 50,
      render: row => <EditableCell value={row.item_number} onSave={save(row, 'item_number')} /> },
    { key: 'date', header: 'Date', width: 95,
      render: row => <EditableCell value={row.date} onSave={save(row, 'date')} type="date" /> },
    { key: 'description', header: 'Description', sortable: true,
      render: row => <EditableCell value={row.description} onSave={save(row, 'description')} type="textarea" /> },
    { key: 'who', header: 'Who', width: 100,
      render: row => <EditableCell value={row.who} onSave={save(row, 'who')} /> },
    { key: 'team', header: 'Team', width: 100,
      render: row => <EditableCell value={row.team} onSave={save(row, 'team')} /> },
    { key: 'value_amount', header: 'Value', width: 100, align: 'right',
      render: row => <EditableCell value={row.value_amount} onSave={save(row, 'value_amount')} type="number" align="right" format={fmt} /> },
    { key: 'communicated_date', header: 'Communicated', width: 110,
      render: row => <EditableCell value={row.communicated_date} onSave={save(row, 'communicated_date')} type="date" /> },
    { key: 'communicated_how', header: 'How', width: 110,
      render: row => <EditableCell value={row.communicated_how} onSave={save(row, 'communicated_how')} /> },
    { key: 'approved', header: 'Approved', width: 65, align: 'center',
      render: row => (
        <input type="checkbox" checked={!!row.approved}
          onChange={e => updateMut.mutate({ id: row.id, field: 'approved', value: e.target.checked ? 1 : 0 })} />
      )},
    { key: 'file_ref', header: 'File Ref', width: 90,
      render: row => <EditableCell value={row.file_ref} onSave={save(row, 'file_ref')} /> },
    { key: 'actions', header: '', width: 40, className: 'actions',
      render: row => (
        <button className="btn btn-ghost btn-xs" onClick={() => setDeleteId(row.id)}
          title="Delete" style={{ color: 'var(--color-negative)' }}>✕</button>
      )},
  ]

  if (!projectId) return <div className="empty-state">Select a project to view the value log.</div>
  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorBanner error={error} />

  return (
    <div>
      <PageHeader
        title="Value Log"
        subtitle={`${items.length} entr${items.length !== 1 ? 'ies' : 'y'}${totalValue ? ` · Total: ${fmt(totalValue)}` : ''}`}
        actions={<>
          <ExportButton />
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add Entry</button>
        </>}
      />
      <DataTable
        columns={columns}
        rows={items}
        emptyMessage="No value log entries found."
      />
      {showAdd && <AddValueModal projectId={projectId} onClose={() => setShowAdd(false)} />}
      {deleteId && (
        <ConfirmDialog
          title="Delete Value Log Entry"
          message="Are you sure you want to delete this entry? This cannot be undone."
          onConfirm={() => deleteMut.mutate(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  )
}
