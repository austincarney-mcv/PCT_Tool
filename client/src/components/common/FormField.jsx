export default function FormField({ label, children, required, hint }) {
  return (
    <div className="form-group">
      {label && (
        <label className="form-label">
          {label}{required && <span style={{ color: 'var(--color-negative)', marginLeft: 2 }}>*</span>}
        </label>
      )}
      {children}
      {hint && <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{hint}</span>}
    </div>
  )
}
