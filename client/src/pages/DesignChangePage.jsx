import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { designChangesApi } from '../api/register.api'
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
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const DISCIPLINES = ['Architecture','Civil','Structural','Hydraulics','Landscaping','Certifier','Fire Engineering','Fire Services','Builder/CM']
const CHANGE_TYPES = ['Design Change','Design Development','Variation']
const STATUSES = ['Yet to be submitted','Submitted','Approved','Rejected']
const FEE_FIELDS = ['arch_fees','struc_fees','civil_fees','hyd_fees','certifier_fees','lscape_fees','fire_eng_fees','fire_services_fees','builder_dm_fees']
const fmt = v => v != null && v !== 0 ? `$${Number(v).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—'

function AddChangeModal({ projectId, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    change_type: 'Design Change', discipline: 'Architecture',
    change_details: '', initiator_name: '', date_requested: new Date().toISOString().slice(0, 10)
  })
  const [error, setError] = useState(null)
  const mut = useMutation({
    mutationFn: d => designChangesApi.create(projectId, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['design-changes', projectId] }); onClose() }
  })

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.change_details) { setError('Change details required'); return }
    mut.mutate(form, { onError: err => setError(err.response?.data?.error || err.message) })
  }

  return (
    <Modal title="Add Design Change" onClose={onClose} size="md">
      <form onSubmit={handleSubmit}>
        <div className="form-row cols-2">
          <FormField label="Change Type">
            <select className="form-select" value={form.change_type}
              onChange={e => setForm(p => ({ ...p, change_type: e.target.value }))}>
              {CHANGE_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </FormField>
          <FormField label="Discipline">
            <select className="form-select" value={form.discipline}
              onChange={e => setForm(p => ({ ...p, discipline: e.target.value }))}>
              {DISCIPLINES.map(d => <option key={d}>{d}</option>)}
            </select>
          </FormField>
        </div>
        <FormField label="Change Details" required>
          <textarea className="form-input" rows={3} value={form.change_details}
            onChange={e => setForm(p => ({ ...p, change_details: e.target.value }))} />
        </FormField>
        <div className="form-row cols-2">
          <FormField label="Initiator">
            <input className="form-input" value={form.initiator_name}
              onChange={e => setForm(p => ({ ...p, initiator_name: e.target.value }))} />
          </FormField>
          <FormField label="Date Requested">
            <input className="form-input" type="date" value={form.date_requested}
              onChange={e => setForm(p => ({ ...p, date_requested: e.target.value }))} />
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

export default function DesignChangePage() {
  const { projectId } = useProject()
  const qc = useQueryClient()
  const [typeFilter, setTypeFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['design-changes', projectId, typeFilter],
    queryFn: () => designChangesApi.list(projectId, { change_type: typeFilter || undefined }),
    enabled: !!projectId,
  })

  const updateMut = useMutation({
    mutationFn: ({ id, field, value }) => designChangesApi.update(projectId, id, { [field]: value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['design-changes', projectId] }),
  })

  const deleteMut = useMutation({
    mutationFn: id => designChangesApi.remove(projectId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['design-changes', projectId] }); setDeleteId(null) },
  })

  function save(row, field) {
    return value => updateMut.mutateAsync({ id: row.id, field, value })
  }

  const { data: allItems = [] } = useQuery({
    queryKey: ['design-changes', projectId, 'all'],
    queryFn: () => designChangesApi.list(projectId),
    enabled: !!projectId,
  })

  const totalFees = FEE_FIELDS.reduce((sum, f) => sum + items.reduce((s, i) => s + (i[f] || 0), 0), 0)

  // Chart: fee impact per discipline, stacked by change_type
  const DISC_SHORT = { Architecture: 'Arch', Civil: 'Civil', Structural: 'Struc', Hydraulics: 'Hyd', Landscaping: 'Lscape', Certifier: 'Cert', 'Fire Engineering': 'Fire Eng', 'Fire Services': 'Fire Svc', 'Builder/CM': 'Builder' }
  const DISC_FEE = { Architecture: 'arch_fees', Civil: 'civil_fees', Structural: 'struc_fees', Hydraulics: 'hyd_fees', Landscaping: 'lscape_fees', Certifier: 'certifier_fees', 'Fire Engineering': 'fire_eng_fees', 'Fire Services': 'fire_services_fees', 'Builder/CM': 'builder_dm_fees' }
  const feeChartData = DISCIPLINES.map(disc => {
    const row = { discipline: DISC_SHORT[disc] || disc }
    CHANGE_TYPES.forEach(ct => {
      const feeField = DISC_FEE[disc]
      row[ct] = allItems.filter(i => i.discipline === disc && i.change_type === ct).reduce((s, i) => s + (i[feeField] || 0), 0)
    })
    return row
  }).filter(r => CHANGE_TYPES.some(ct => r[ct] !== 0))

  const columns = [
    { key: 'item_number', header: '#', width: 45,
      render: row => <EditableCell value={row.item_number} onSave={save(row, 'item_number')} /> },
    { key: 'date_requested', header: 'Date', width: 95,
      render: row => <EditableCell value={row.date_requested} onSave={save(row, 'date_requested')} type="date" /> },
    { key: 'change_type', header: 'Type', width: 120, sortable: true,
      render: row => <EditableCell value={row.change_type} onSave={save(row, 'change_type')} type="select" options={CHANGE_TYPES} /> },
    { key: 'discipline', header: 'Discipline', width: 110, sortable: true,
      render: row => <EditableCell value={row.discipline} onSave={save(row, 'discipline')} type="select" options={DISCIPLINES} /> },
    { key: 'initiator_name', header: 'Initiator', width: 100,
      render: row => <EditableCell value={row.initiator_name} onSave={save(row, 'initiator_name')} /> },
    { key: 'change_details', header: 'Details',
      render: row => <EditableCell value={row.change_details} onSave={save(row, 'change_details')} type="textarea" /> },
    { key: 'reason', header: 'Reason', width: 140,
      render: row => <EditableCell value={row.reason} onSave={save(row, 'reason')} type="textarea" /> },
    { key: 'status', header: 'Status', width: 120, sortable: true,
      render: row => <EditableCell value={row.status} onSave={save(row, 'status')} type="select" options={STATUSES} /> },
    { key: 'arch_fees', header: 'Arch Fees', width: 80, align: 'right',
      render: row => <EditableCell value={row.arch_fees} onSave={save(row, 'arch_fees')} type="number" align="right" format={fmt} /> },
    { key: 'struc_fees', header: 'Struc Fees', width: 80, align: 'right',
      render: row => <EditableCell value={row.struc_fees} onSave={save(row, 'struc_fees')} type="number" align="right" format={fmt} /> },
    { key: 'civil_fees', header: 'Civil Fees', width: 80, align: 'right',
      render: row => <EditableCell value={row.civil_fees} onSave={save(row, 'civil_fees')} type="number" align="right" format={fmt} /> },
    { key: 'variation_reference', header: 'Var Ref', width: 80,
      render: row => <EditableCell value={row.variation_reference} onSave={save(row, 'variation_reference')} /> },
    { key: 'actions', header: '', width: 40, className: 'actions',
      render: row => (
        <button className="btn btn-ghost btn-xs" onClick={() => setDeleteId(row.id)}
          title="Delete" style={{ color: 'var(--color-negative)' }}>✕</button>
      )},
  ]

  if (!projectId) return <div className="empty-state">Select a project to view design changes.</div>
  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorBanner error={error} />

  return (
    <div>
      <PageHeader
        title="Design Change Register"
        subtitle={`${items.length} item${items.length !== 1 ? 's' : ''}${totalFees ? ` · Total fee impact: ${fmt(totalFees)}` : ''}`}
        actions={<>
          <ExportButton />
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add Change</button>
        </>}
      />
      {feeChartData.length > 0 && (
        <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 8 }}>FEE IMPACT BY DISCIPLINE</div>
          <div style={{ height: Math.max(90, feeChartData.length * 30) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={feeChartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => v === 0 ? '0' : `$${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="discipline" tick={{ fontSize: 11 }} width={52} />
                <Tooltip formatter={v => `$${Number(v).toLocaleString('en-AU', { maximumFractionDigits: 0 })}`} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Design Change" stackId="a" fill="#2A4735" isAnimationActive />
                <Bar dataKey="Design Development" stackId="a" fill="#CEDDC3" isAnimationActive />
                <Bar dataKey="Variation" stackId="a" fill="#d97706" isAnimationActive />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      <div className="tab-strip mb-4">
        {[['', 'All'], ...CHANGE_TYPES.map(t => [t, t])].map(([val, label]) => (
          <button key={val || 'all'} className={`tab${typeFilter === val ? ' active' : ''}`}
            onClick={() => setTypeFilter(val)}>{label}</button>
        ))}
      </div>
      <DataTable
        columns={columns}
        rows={items}
        emptyMessage="No design changes found."
      />
      {showAdd && <AddChangeModal projectId={projectId} onClose={() => setShowAdd(false)} />}
      {deleteId && (
        <ConfirmDialog
          title="Delete Design Change"
          message="Are you sure you want to delete this item? This cannot be undone."
          onConfirm={() => deleteMut.mutate(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  )
}
