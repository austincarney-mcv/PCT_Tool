import { useState, useRef, useCallback } from 'react'

/**
 * Provides drag-to-resize column widths for data tables.
 *
 * @param {number[]} initialWidths - initial pixel width per column
 * @returns {{ widths: number[], startResize: (colIdx, MouseEvent) => void }}
 */
export function useColumnResize(initialWidths) {
  const [widths, setWidths] = useState(initialWidths)
  // Keep a ref in sync so startResize (stable callback) can always read latest widths
  const widthsRef = useRef(widths)
  widthsRef.current = widths

  const startResize = useCallback((colIdx, e) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startWidth = widthsRef.current[colIdx]

    function onMouseMove(ev) {
      const newWidth = Math.max(40, startWidth + ev.clientX - startX)
      setWidths(prev => {
        const next = [...prev]
        next[colIdx] = newWidth
        return next
      })
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [])

  return { widths, startResize }
}
