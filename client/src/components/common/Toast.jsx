import { useState, useEffect } from 'react'
import { onToast } from '../../lib/toast'

let nextId = 0

export default function Toast() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    return onToast(msg => {
      const id = ++nextId
      setToasts(prev => [...prev, { id, msg, exiting: false }])
      setTimeout(() => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t))
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== id))
        }, 260)
      }, 2000)
    })
  }, [])

  if (!toasts.length) return null

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast${t.exiting ? ' toast-exit' : ''}`}>
          {t.msg}
        </div>
      ))}
    </div>
  )
}
