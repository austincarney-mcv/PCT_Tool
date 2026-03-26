import { useProject } from '../../context/ProjectContext'

export default function ExportButton() {
  const { projectId } = useProject()
  if (!projectId) return null

  function handleExport() {
    // Navigate to the download URL — browser handles the file download
    const token = localStorage.getItem('pct_token')
    // Create a temporary link with the token as a query param or use fetch + blob
    fetch(`/api/projects/${projectId}/export`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        const cd = res.headers.get('content-disposition')
        const filename = cd
          ? cd.split('filename=')[1]?.replace(/"/g, '') || 'export.xlsx'
          : 'export.xlsx'
        return res.blob().then(blob => ({ blob, filename }))
      })
      .then(({ blob, filename }) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
      })
      .catch(err => alert('Export failed: ' + err.message))
  }

  return (
    <button className="btn btn-secondary btn-sm" onClick={handleExport} title="Export to Excel">
      ↓ Export .xlsx
    </button>
  )
}
