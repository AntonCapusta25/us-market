import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate('/admin/dashboard')
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', 
      background: '#050505', padding: '24px' 
    }}>
      <div style={{ 
        width: '100%', maxWidth: '400px', background: '#0a0a0a', border: '1px solid rgba(255, 255, 255, 0.1)', 
        borderRadius: '24px', padding: '40px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#F8FAFC', fontSize: '1.75rem', fontWeight: 800, marginBottom: '8px' }}>
            Admin <span style={{ color: '#d1bbfb' }}>Login</span>
          </h1>
          <p style={{ color: '#94A3B8', fontSize: '0.9rem' }}>Enter your credentials to access the dashboard</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', color: '#CBD5E1', fontSize: '0.85rem', marginBottom: '8px', fontWeight: 600 }}>Email Address</label>
            <input 
              type="email" required 
              style={{ 
                width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '12px', color: 'white', fontFamily: 'inherit', outline: 'none'
              }}
              value={email} onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: '#CBD5E1', fontSize: '0.85rem', marginBottom: '8px', fontWeight: 600 }}>Password</label>
            <input 
              type="password" required 
              style={{ 
                width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '12px', color: 'white', fontFamily: 'inherit', outline: 'none'
              }}
              value={password} onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', textAlign: 'center', margin: 0 }}>{error}</p>}

          <button 
            type="submit" disabled={loading}
            style={{ 
              marginTop: '8px', padding: '14px', background: 'linear-gradient(135deg, #d1bbfb, #5646e4)', color: 'white', 
              border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
