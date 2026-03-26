const STATUS_STYLES = {
  // Critical items
  OPEN:    { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
  CLOSED:  { bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
  // Approvals / changes
  Approved:          { bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
  Submitted:         { bg: '#eff6ff', color: '#2563eb', border: '#93c5fd' },
  Rejected:          { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
  'Yet to be submitted': { bg: '#fafafa', color: '#6b7280', border: '#e5e7eb' },
  // RFI / risk / generic
  Open:   { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
  Closed: { bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
  // Risk ratings
  Extreme:     { bg: '#7f1d1d', color: '#fff', border: '#7f1d1d' },
  Significant: { bg: '#dc2626', color: '#fff', border: '#dc2626' },
  Moderate:    { bg: '#d97706', color: '#fff', border: '#d97706' },
  Low:         { bg: '#16a34a', color: '#fff', border: '#16a34a' },
  Negligible:  { bg: '#9ca3af', color: '#fff', border: '#9ca3af' },
}

export default function StatusBadge({ status }) {
  if (!status) return null
  const style = STATUS_STYLES[status] || { bg: '#f5f5f4', color: '#374151', border: '#d1d5db' }
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 3,
      fontSize: 11,
      fontWeight: 600,
      lineHeight: '18px',
      background: style.bg,
      color: style.color,
      border: `1px solid ${style.border}`,
      whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  )
}
