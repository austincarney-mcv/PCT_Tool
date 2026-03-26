import { useRef, useState } from 'react'
import { excelApi } from '../../api/register.api'
import { useProject } from '../../context/ProjectContext'
import { useQueryClient } from '@tanstack/react-query'

export default function ImportDropzone({ onSuccess }) {
  const { projectId } = useProject()
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef()
  const qc = useQueryClient()

  async function handleFile(file) {
    if (!file || !file.name.endsWith('.xlsx')) {
      setError('Please select a .xlsx file')
      return
    }
    setLoading(true)
    setError(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const result = await excelApi.import(projectId, fd)
      qc.invalidateQueries({ queryKey: ['projects'] })
      onSuccess?.(result)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--color-primary)' : 'var(--color-border-dk)'}`,
          borderRadius: 6,
          padding: '28px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? 'var(--color-tertiary)' : '#fafafa',
          transition: 'all 0.15s',
        }}
      >
        {loading ? (
          <div>Importing… please wait</div>
        ) : (
          <>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Drop .xlsx file here or click to browse</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Imports project data from an existing PCT workbook</div>
          </>
        )}
      </div>
      {error && <div className="error-banner mt-2">{error}</div>}
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files[0])}
      />
    </div>
  )
}
