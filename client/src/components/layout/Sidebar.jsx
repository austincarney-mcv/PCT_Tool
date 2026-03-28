import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useProject } from '../../context/ProjectContext'

const NAV_ITEMS = [
  { path: '/',              label: 'Dashboard',          icon: '⊞' },
  { path: '/c2c',           label: 'Cost to Complete',   icon: '$' },
  { path: '/deliverables',  label: 'Deliverables',       icon: '⊟' },
  { path: '/approvals',     label: 'Approvals',          icon: '✓' },
  { path: '/critical-items',label: 'Critical Items',     icon: '!' },
  { path: '/design-changes',label: 'Design Changes',     icon: '△' },
  { path: '/brief-compliance', label: 'Brief Compliance',icon: '≡' },
  { path: '/rfis',          label: 'RFIs',               icon: '?' },
  { path: '/risks',         label: 'Risk & Issues',      icon: '⚠' },
  { path: '/sid',           label: 'SiD Register',       icon: '⛨' },
  { path: '/value-log',     label: 'Value Log',          icon: '◈' },
  { path: '/lessons',       label: 'Lessons Learnt',     icon: '✎' },
  { path: '/team',          label: 'Team Resources',     icon: '◉' },
]

export default function Sidebar() {
  const { logout, user } = useAuth()
  const { projectMeta } = useProject()
  const navigate = useNavigate()

  return (
    <nav style={{
      width: 'var(--sidebar-width)',
      background: 'var(--color-primary)',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      overflow: 'hidden',
    }}>
      {/* Logo/title */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.12)',
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: '0.04em',
        lineHeight: 1.3,
      }}>
        <div style={{ opacity: 0.7, fontSize: 10, fontWeight: 400, marginBottom: 2 }}>PROJECT CONTROL</div>
        <div>PCT App</div>
      </div>

      {/* Navigation */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '7px 16px',
              color: isActive ? '#fff' : 'rgba(255,255,255,0.72)',
              background: isActive ? 'rgba(255,255,255,0.14)' : 'transparent',
              fontWeight: isActive ? 600 : 400,
              fontSize: 13,
              textDecoration: 'none',
              borderLeft: isActive ? '3px solid rgba(255,255,255,0.8)' : '3px solid transparent',
              transition: 'all 0.1s',
            })}
          >
            <span style={{ width: 16, textAlign: 'center', fontSize: 14, lineHeight: 1 }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </div>

      {/* User/logout footer */}
      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid rgba(255,255,255,0.12)',
        fontSize: 11,
        color: 'rgba(255,255,255,0.6)',
      }}>
        <div style={{ marginBottom: 6 }}>{user?.username} ({user?.role})</div>
        <button
          onClick={() => { logout(); navigate('/login') }}
          style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)',
            cursor: 'pointer', fontSize: 11, padding: 0, textDecoration: 'underline',
          }}
        >
          Log out
        </button>
      </div>
    </nav>
  )
}
