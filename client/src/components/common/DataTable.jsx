import { useState, useMemo } from 'react'
import '../../styles/table.css'

/**
 * Reusable dense data table.
 *
 * columns: [{ key, header, width, align, sortable, render(row), className }]
 * rows: array of data objects
 * onSort: optional callback(key, dir)
 * rowKey: function(row) → unique key (defaults to row.id)
 * groupBy: key name to group rows by (optional)
 * emptyMessage: string (optional)
 */
export default function DataTable({
  columns = [],
  rows = [],
  rowKey = r => r.id,
  groupBy,
  emptyMessage = 'No records found.',
  onRowClick,
  selectedId,
  stickyHeader = true,
}) {
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  function handleSort(col) {
    if (!col.sortable) return
    if (sortKey === col.key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(col.key); setSortDir('asc') }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return rows
    return [...rows].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      if (av == null) return 1
      if (bv == null) return -1
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [rows, sortKey, sortDir])

  // Group rows if groupBy specified
  const groups = useMemo(() => {
    if (!groupBy) return null
    const map = new Map()
    sorted.forEach(row => {
      const g = row[groupBy] || '(Ungrouped)'
      if (!map.has(g)) map.set(g, [])
      map.get(g).push(row)
    })
    return map
  }, [sorted, groupBy])

  function renderRows(rowList) {
    return rowList.map(row => (
      <tr
        key={rowKey(row)}
        onClick={onRowClick ? () => onRowClick(row) : undefined}
        className={selectedId != null && rowKey(row) === selectedId ? 'selected' : ''}
        style={onRowClick ? { cursor: 'pointer' } : {}}
      >
        {columns.map(col => (
          <td
            key={col.key}
            className={[col.className, col.align === 'right' ? 'num' : ''].filter(Boolean).join(' ')}
            style={{ width: col.width }}
          >
            {col.render ? col.render(row) : (row[col.key] != null ? String(row[col.key]) : '')}
          </td>
        ))}
      </tr>
    ))
  }

  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className={[
                  col.sortable ? 'sortable' : '',
                  sortKey === col.key ? 'sorted' : '',
                ].filter(Boolean).join(' ')}
                style={{ width: col.width, textAlign: col.align || 'left' }}
                onClick={() => handleSort(col)}
              >
                {col.header}
                {col.sortable && <span className="sort-icon">{sortKey === col.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)', fontSize: 13 }}>
                {emptyMessage}
              </td>
            </tr>
          )}
          {groups
            ? Array.from(groups.entries()).map(([group, groupRows]) => (
                <>
                  <tr key={`grp-${group}`} className="group-header">
                    <td colSpan={columns.length}>{group}</td>
                  </tr>
                  {renderRows(groupRows)}
                </>
              ))
            : renderRows(sorted)
          }
        </tbody>
      </table>
    </div>
  )
}
