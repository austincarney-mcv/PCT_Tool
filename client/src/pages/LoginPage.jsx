import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{ width: 360 }}>
        {/* Header */}
        <div style={{
          background: 'var(--color-primary)',
          color: '#fff',
          padding: '24px 28px',
          borderRadius: '6px 6px 0 0',
        }}>
          <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: '0.06em', marginBottom: 4 }}>ARCHITECTURAL + ENGINEERING</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Project Control Tool</div>
        </div>

        {/* Form */}
        <div style={{
          background: '#fff',
          border: '1px solid var(--color-border)',
          borderTop: 'none',
          borderRadius: '0 0 6px 6px',
          padding: '28px',
        }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                className="form-input"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoFocus
                autoComplete="username"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="form-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {error && <div className="error-banner mb-4">{error}</div>}
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
