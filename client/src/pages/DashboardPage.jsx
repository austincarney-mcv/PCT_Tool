import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsApi } from '../api/projects.api'
import { c2cApi } from '../api/c2c.api'
import { useProject } from '../context/ProjectContext'
import PageHeader from '../components/layout/PageHeader'
import Modal from '../components/common/Modal'
import FormField from '../components/common/FormField'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ErrorBanner from '../components/common/ErrorBanner'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

function NewProjectModal({ onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ project_number: '', project_name: '', client: '', author: '', version: '1.0', release_status: 'Draft' })
  const [error, setError] = useState(null)
  const mut = useMutation({ mutationFn: projectsApi.create, onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); onClose() } })

  function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!form.project_number || !form.project_name) { setError('Project number and name are required'); return }
    if (!/^\d{8}$/.test(form.project_number)) { setError('Project number must be exactly 8 digits (e.g. 00010162)'); return }
    mut.mutate(form, { onError: err => setError(err.response?.data?.error || err.message) })
  }

  return (
    <Modal title="New Project" onClose={onClose} size="md">
      <form onSubmit={handleSubmit}>
        <div className="form-row cols-2">
          <FormField label="Project Number" required hint="Exactly 8 digits (e.g. 00010162)">
            <input
              className="form-input"
              maxLength={8}
              placeholder="00000000"
              value={form.project_number}
              onChange={e => {
                // Strip non-digits and cap at 8 characters
                const val = e.target.value.replace(/\D/g, '').slice(0, 8)
                setForm(p => ({ ...p, project_number: val }))
              }}
            />
          </FormField>
          <FormField label="Release Status">
            <select className="form-select" value={form.release_status} onChange={e => setForm(p => ({ ...p, release_status: e.target.value }))}>
              <option>Draft</option><option>Issued</option><option>Archived</option>
            </select>
          </FormField>
        </div>
        <FormField label="Project Name" required>
          <input className="form-input" value={form.project_name} onChange={e => setForm(p => ({ ...p, project_name: e.target.value }))} />
        </FormField>
        <div className="form-row cols-2">
          <FormField label="Client">
            <input className="form-input" value={form.client} onChange={e => setForm(p => ({ ...p, client: e.target.value }))} />
          </FormField>
          <FormField label="Author">
            <input className="form-input" value={form.author} onChange={e => setForm(p => ({ ...p, author: e.target.value }))} />
          </FormField>
        </div>
        {error && <div className="error-banner mb-4">{error}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={mut.isPending}>
            {mut.isPending ? 'Creating…' : 'Create Project'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function C2CTrendChart({ projectId }) {
  const { data = [] } = useQuery({
    queryKey: ['c2c-trend', projectId],
    queryFn: () => c2cApi.trend(projectId),
    enabled: !!projectId,
  })
  if (!data.length) return <div className="empty-state">No C2C snapshot data yet.</div>
  const chartData = data.filter(d => d.phase === 'design').map(d => ({
    name: `W${d.week_number}`,
    'Under/Over': d.total_under_over ? Math.round(d.total_under_over) : 0,
    'CTC': d.total_ctc ? Math.round(d.total_ctc) : 0,
  }))
  if (!chartData.length) return null
  return (
    <div style={{ height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
          <Tooltip formatter={v => `$${v.toLocaleString()}`} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="Under/Over" stroke="#2A4735" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="CTC" stroke="#CEDDC3" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 2" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function DashboardPage() {
  const { projectId } = useProject()
  const qc = useQueryClient()
  const [showNew, setShowNew] = useState(false)

  const { data: projects = [], isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  })

  const deleteMut = useMutation({
    mutationFn: projectsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })

  if (isLoading) return <div className="p-4"><LoadingSpinner /></div>
  if (error) return <ErrorBanner error={error} />

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="All projects"
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}>+ New Project</button>
        }
      />

      {projects.length === 0 ? (
        <div className="empty-state card" style={{ padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>No projects yet</div>
          <div style={{ marginBottom: 16 }}>Create a new project to get started.</div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowNew(true)}>New Project</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
          {projects.map(p => (
            <div key={p.id} className="card" style={{ borderLeft: String(p.id) === String(projectId) ? '4px solid var(--color-primary)' : '' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-primary)' }}>{p.project_number}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text)', marginTop: 2 }}>{p.project_name}</div>
                  {p.client && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{p.client}</div>}
                </div>
                <span style={{
                  background: 'var(--color-tertiary)', color: 'var(--color-primary)',
                  padding: '2px 8px', borderRadius: 3, fontSize: 11, fontWeight: 600,
                }}>{p.release_status}</span>
              </div>
              {String(p.id) === String(projectId) && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                    C2C UNDER/OVER TREND (DESIGN PHASE)
                  </div>
                  <C2CTrendChart projectId={p.id} />
                </div>
              )}
              <div style={{ marginTop: 12, fontSize: 11, color: 'var(--color-text-muted)' }}>
                Created {p.date_created} {p.author && `· ${p.author}`}
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && <NewProjectModal onClose={() => setShowNew(false)} />}
    </div>
  )
}
