import { useEffect } from 'react'

export default function Modal({ title, onClose, children, size = 'md' }) {
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const maxWidth = { sm: 420, md: 600, lg: 800, xl: 1000 }[size] || 600

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#fff',
        borderRadius: 6,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        width: '100%', maxWidth,
        maxHeight: '90vh',
        overflow: 'auto',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px',
          background: 'var(--color-primary)',
          color: '#fff',
          borderRadius: '6px 6px 0 0',
          flexShrink: 0,
        }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{title}</span>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)',
              fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '0 4px',
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {/* Content */}
        <div style={{ padding: 20, flexGrow: 1 }}>
          {children}
        </div>
      </div>
    </div>
  )
}
