import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { briefComplianceApi } from '../api/register.api'
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

const DISCIPLINES = ['Architecture','Civil','Structural','Hydraulics','Landscaping','Certifier','Fire Engineering','Fire Services','Builder/CM']

function AddItemModal({ projectId, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ brief_item: '', discipline: 'Architecture', spec_number: '', location: '', clause: '' })
  const [error, setError] = useState(null)
  const mut = useMutation({
    mutationFn: d => briefComplianceApi.create(projectId, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['brief-compliance', projectId] }); onClose() }
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.brief_item) { setError('Brief item required'); return }
    mut.mutate(form, { onError: err => setError(err.response?.data?.error || err.message) })
  }

  return (
    <Modal title="Add Brief Item" onClose={onClose} size="md">
      <form onSubmit={handleSubmit}>
        <FormField label="Brief Item" required>
          <textarea className="form-input" rows={3} value={form.brief_item}
            onChange={e => setForm(p => ({ ...p, brief_item: e.target.value }))} />
        </FormField>
        <div className="form-row cols-2">
          <FormField label="Discipline">
            <select className="form-select" value={form.discipline}
              onChange={e => setForm(p => ({ ...p, discipline: e.target.value }))}>
              {DISCIPLINES.map(d => <option key={d}>{d}</option>)}
            </select>
          </FormField>
          <FormField label="Spec Number">
            <input className="form-input" value={form.spec_number}
              onChange={e => setForm(p => ({ ...p, spec_number: e.target.value }))} />
          </FormField>
        </div>
        <div className="form-row cols-2">
          <FormField label="Location">
            <input className="form-input" value={form.location}
              onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
          </FormField>
          <FormField label="Clause">
            <input className="form-input" value={form.clause}
              onChange={e => setForm(p => ({ ...p, clause: e.target.value }))} />
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

export default function BriefCompliancePage() {
  const { projectId } = useProject()
  const qc = useQueryClient()
  const [discipline, setDiscipline] = useState('All')
  const [showAdd, setShowAdd] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['brief-compliance', projectId, discipline],
    queryFn: () => briefComplianceApi.list(projectId, { discipline: discipline === 'All' ? undefined : discipline }),
    enabled: !!projectId,
  })

  const updateMut = useMutation({
    mutationFn: ({ id, field, value }) => briefComplianceApi.update(projectId, id, { [field]: value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['brief-compliance', projectId] }),
  })

  const deleteMut = useMutation({
    mutationFn: id => briefComplianceApi.remove(projectId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['brief-compliance', projectId] }); setDeleteId(null) },
  })

  function save(row, field) {
    return value => updateMut.mutateAsync({ id: row.id, field, value })
  }

  const compliantCount = items.filter(i => i.compliant).length
  const deviationCount = items.filter(i => i.deviation).length

  const columns = [
    { key: 'spec_number', header: 'Spec #', width: 70,
      render: row => <EditableCell value={row.spec_number} onSave={save(row, 'spec_number')} /> },
    { key: 'location', header: 'Location', width: 100,
      render: row => <EditableCell value={row.location} onSave={save(row, 'location')} /> },
    { key: 'clause', header: 'Clause', width: 80,
      render: row => <EditableCell value={row.clause} onSave={save(row, 'clause')} /> },
    { key: 'brief_item', header: 'Brief Item', sortable: true,
      render: row => <EditableCell value={row.brief_item} onSave={save(row, 'brief_item')} type="textarea" /> },
    { key: 'discipline', header: 'Discipline', width: 110, sortable: true,
      render: row => <EditableCell value={row.discipline} onSave={save(row, 'discipline')} type="select" options={DISCIPLINES} /> },
    { key: 'compliant', header: 'Compliant', width: 70, align: 'center',
      render: row => (
        <input type="checkbox" checked={!!row.compliant}
          onChange={e => updateMut.mutate({ id: row.id, field: 'compliant', value: e.target.checked ? 1 : 0 })} />
      )},
    { key: 'deviation', header: 'Deviation', width: 70, align: 'center',
      render: row => (
        <input type="checkbox" checked={!!row.deviation}
          onChange={e => updateMut.mutate({ id: row.id, field: 'deviation', value: e.target.checked ? 1 : 0 })} />
      )},
    { key: 'comments', header: 'Comments', width: 150,
      render: row => <EditableCell value={row.comments} onSave={save(row, 'comments')} type="textarea" /> },
    { key: 'client_response', header: 'Client Response', width: 140,
      render: row => <EditableCell value={row.client_response} onSave={save(row, 'client_response')} type="textarea" /> },
    { key: 'source_document', header: 'Source Doc', width: 110,
      render: row => <EditableCell value={row.source_document} onSave={save(row, 'source_document')} /> },
    { key: 'actions', header: '', width: 40, className: 'actions',
      render: row => (
        <button className="btn btn-ghost btn-xs" onClick={() => setDeleteId(row.id)}
          title="Delete" style={{ color: 'var(--color-negative)' }}>✕</button>
      )},
  ]

  if (!projectId) return <div className="empty-state">Select a project to view brief compliance.</div>
  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorBanner error={error} />

  return (
    <div>
      <PageHeader
        title="Brief Compliance Register"
        subtitle={`${items.length} item${items.length !== 1 ? 's' : ''} · ${compliantCount} compliant · ${deviationCount} deviation${deviationCount !== 1 ? 's' : ''}`}
        actions={<>
          <ExportButton />
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add Item</button>
        </>}
      />
      <div className="tab-strip mb-4" style={{ flexWrap: 'wrap' }}>
        {['All', ...DISCIPLINES].map(d => (
          <button key={d} className={`tab${discipline === d ? ' active' : ''}`}
            onClick={() => setDiscipline(d)}>{d}</button>
        ))}
      </div>
      <DataTable
        columns={columns}
        rows={items}
        groupBy={discipline === 'All' ? 'discipline' : undefined}
        emptyMessage="No brief compliance items found."
      />
      {showAdd && <AddItemModal projectId={projectId} onClose={() => setShowAdd(false)} />}
      {deleteId && (
        <ConfirmDialog
          title="Delete Brief Item"
          message="Are you sure you want to delete this item? This cannot be undone."
          onConfirm={() => deleteMut.mutate(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  )
}
