import Modal from './Modal'

export default function ConfirmDialog({ title = 'Confirm', message, onConfirm, onCancel, danger = true }) {
  return (
    <Modal title={title} onClose={onCancel} size="sm">
      <p style={{ marginBottom: 20, fontSize: 14, color: 'var(--color-text)' }}>{message}</p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
        <button className={`btn btn-sm ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
          Confirm
        </button>
      </div>
    </Modal>
  )
}
