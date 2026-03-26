import { useState, useRef, useEffect } from 'react'

/**
 * A table cell that activates an input on single-click.
 * Submits on blur or Enter; cancels on Escape.
 *
 * Props:
 *   value        - current value
 *   onSave(v)    - called with the new value (string) when committed
 *   type         - 'text' | 'number' | 'date' | 'select' | 'textarea' (default: 'text')
 *   options      - array of {value, label} for type='select'
 *   className    - extra class names
 *   align        - 'left' | 'right' | 'center'
 *   readOnly     - disables editing
 *   format(v)    - display formatter
 */
export default function EditableCell({
  value,
  onSave,
  type = 'text',
  options,
  className = '',
  align = 'left',
  readOnly = false,
  format,
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus()
  }, [editing])

  function startEdit() {
    if (readOnly) return
    setDraft(value != null ? String(value) : '')
    setEditing(true)
    setError(false)
  }

  async function commit() {
    if (!editing) return
    setEditing(false)
    if (draft === String(value ?? '')) return // no change
    setSaving(true)
    try {
      await onSave(type === 'number' ? (draft === '' ? null : Number(draft)) : draft)
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && type !== 'textarea') { e.preventDefault(); commit() }
    if (e.key === 'Escape') { setEditing(false); setDraft('') }
  }

  const display = format ? format(value) : (value != null ? String(value) : '')

  return (
    <div
      className={`editable-cell${editing ? ' editing' : ''}${error ? ' error' : ''} ${className}`}
      style={{ textAlign: align, opacity: saving ? 0.6 : 1, cursor: readOnly ? 'default' : 'text' }}
      onClick={!editing ? startEdit : undefined}
      title={readOnly ? undefined : 'Click to edit'}
    >
      {editing ? (
        type === 'select' ? (
          <select
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
          >
            <option value="">—</option>
            {options?.map(o => (
              <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
            ))}
          </select>
        ) : type === 'textarea' ? (
          <textarea
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <input
            ref={inputRef}
            type={type}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
          />
        )
      ) : (
        <span style={{ display: 'block', minHeight: 18 }}>{display}</span>
      )}
    </div>
  )
}
