import { useState, useRef, useCallback } from 'react'

/**
 * Provides drag-to-resize column widths for data tables.
 *
 * @param {number[]} initialWidths - initial pixel width per column
 * @param {string} [storageKey]    - optional localStorage key to persist widths
 * @returns {{ widths: number[], startResize: (colIdx, MouseEvent) => void }}
 */
export function useColumnResize(initialWidths, storageKey) {
  const [widths, setWidths] = useState(() => {
    if (storageKey) {
      try {
        const stored = localStorage.getItem(storageKey)
        if (stored) {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed) && parsed.length === initialWidths.length) return parsed
        }
      } catch {}
    }
    return initialWidths
  })
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
      if (storageKey) {
        try { localStorage.setItem(storageKey, JSON.stringify(widthsRef.current)) } catch {}
      }
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [])

  return { widths, startResize }
}
