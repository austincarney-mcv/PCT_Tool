import { createContext, useContext, useState, useCallback } from 'react'

const ProjectContext = createContext(null)

export function ProjectProvider({ children }) {
  const [projectId, setProjectId] = useState(() => {
    return localStorage.getItem('pct_project_id') || null
  })
  const [projectMeta, setProjectMeta] = useState(null)

  const selectProject = useCallback((id, meta) => {
    setProjectId(id ? String(id) : null)
    setProjectMeta(meta || null)
    if (id) localStorage.setItem('pct_project_id', id)
    else localStorage.removeItem('pct_project_id')
  }, [])

  return (
    <ProjectContext.Provider value={{ projectId, projectMeta, selectProject, setProjectMeta }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  return useContext(ProjectContext)
}
