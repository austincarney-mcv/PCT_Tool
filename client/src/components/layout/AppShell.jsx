import Sidebar from './Sidebar'
import ProjectHeader from './ProjectHeader'
import { Outlet } from 'react-router-dom'

export default function AppShell() {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <ProjectHeader />
        <main style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', background: 'var(--color-bg)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
