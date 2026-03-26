export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 16,
      gap: 12,
      flexWrap: 'wrap',
    }}>
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-primary)', margin: 0 }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{subtitle}</p>
        )}
      </div>
      {actions && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </div>
  )
}
