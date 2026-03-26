export default function LoadingSpinner({ size = 'md' }) {
  const sz = size === 'sm' ? 14 : size === 'lg' ? 28 : 18
  return (
    <span
      className="loading-spinner"
      style={{ width: sz, height: sz }}
      aria-label="Loading"
    />
  )
}
