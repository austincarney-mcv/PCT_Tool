export default function ErrorBanner({ error, onRetry }) {
  const msg = error?.response?.data?.error || error?.message || 'An error occurred'
  return (
    <div className="error-banner" role="alert">
      {msg}
      {onRetry && (
        <button
          onClick={onRetry}
          style={{ marginLeft: 12, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
        >
          Retry
        </button>
      )}
    </div>
  )
}
