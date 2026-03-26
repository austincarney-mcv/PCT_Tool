import { useState, useEffect } from 'react'
import { useProject } from '../../context/ProjectContext'
import { projectsApi } from '../../api/projects.api'
import { useQuery } from '@tanstack/react-query'

export default function ProjectHeader() {
  const { projectId, projectMeta, selectProject } = useProject()
  const [open, setOpen] = useState(false)

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  })

  // Auto-select first project if none selected
  useEffect(() => {
    if (!projectId && projects.length > 0) {
      selectProject(projects[0].id, projects[0])
    }
  }, [projectId, projects, selectProject])

  // Keep projectMeta in sync when projects list loads
  useEffect(() => {
    if (projectId && projects.length > 0) {
      const p = projects.find(p => String(p.id) === String(projectId))
      if (p) selectProject(projectId, p)
    }
  }, [projects]) // eslint-disable-line

  const active = projects.find(p => String(p.id) === String(projectId))

  return (
    <header style={{
      height: 'var(--topbar-height)',
      background: '#fff',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: 16,
      flexShrink: 0,
      position: 'relative',
      zIndex: 10,
    }}>
      {/* Project selector */}
      <div style={{ position: 'relative' }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setOpen(v => !v)}
          style={{ minWidth: 180, justifyContent: 'space-between' }}
        >
          {active ? active.project_number : 'Select Project'}
          <span style={{ opacity: 0.5 }}>▾</span>
        </button>
        {open && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, zIndex: 100,
            background: '#fff', border: '1px solid var(--color-border)',
            borderRadius: 4, boxShadow: 'var(--shadow-md)',
            minWidth: 260, maxHeight: 320, overflowY: 'auto',
            marginTop: 4,
          }}>
            {projects.length === 0 && (
              <div style={{ padding: '10px 14px', color: 'var(--color-text-muted)', fontSize: 12 }}>No projects</div>
            )}
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => { selectProject(p.id, p); setOpen(false) }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '8px 14px', background: String(p.id) === String(projectId) ? 'var(--color-secondary)' : 'transparent',
                  border: 'none', cursor: 'pointer', fontSize: 12,
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <strong>{p.project_number}</strong>
                <span style={{ color: 'var(--color-text-muted)', marginLeft: 8 }}>{p.project_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Project metadata */}
      {active && (
        <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--color-text-muted)' }}>
          <span><strong style={{ color: 'var(--color-text)' }}>{active.project_name}</strong></span>
          {active.client && <span>Client: <strong style={{ color: 'var(--color-text)' }}>{active.client}</strong></span>}
          <span style={{
            background: 'var(--color-tertiary)',
            color: 'var(--color-primary)',
            padding: '1px 8px',
            borderRadius: 3,
            fontWeight: 600,
            fontSize: 11,
          }}>{active.release_status}</span>
        </div>
      )}

      {/* Close dropdown on outside click */}
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setOpen(false)} />
      )}
    </header>
  )
}
