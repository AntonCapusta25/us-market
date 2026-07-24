import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminProvider, useAdmin } from './AdminContext'

function AuthGuardContent({ children }) {
  const { user, loading } = useAdmin()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) {
      navigate('/admin/login')
    }
  }, [user, loading, navigate])

  if (loading) {
    const letters = "Finder admin".split("");
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: '#050505', 
        color: '#F8FAFC', 
        fontFamily: "'Space Grotesk', sans-serif",
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Self-contained premium animations */}
        <style>{`
          @keyframes letter-bounce {
            0%, 100% {
              transform: translateY(0);
              text-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
            }
            50% {
              transform: translateY(-12px);
              text-shadow: 0 10px 15px rgba(209, 187, 251, 0.3), 0 0 25px rgba(156, 39, 176, 0.2);
            }
          }
          @keyframes bar-sweep {
            0% {
              left: -40%;
              width: 30%;
            }
            50% {
              width: 45%;
            }
            100% {
              left: 110%;
              width: 30%;
            }
          }
          @keyframes glow-pulse {
            0%, 100% {
              opacity: 0.25;
              transform: scale(1);
            }
            50% {
              opacity: 0.45;
              transform: scale(1.1);
            }
          }
          @keyframes text-pulse {
            0%, 100% {
              opacity: 0.4;
              letter-spacing: 0.18em;
            }
            50% {
              opacity: 0.9;
              letter-spacing: 0.22em;
            }
          }
        `}</style>



        {/* Loading Content */}
        <div style={{ textAlign: 'center', zIndex: 1, position: 'relative' }}>
          
          {/* Logo with Bouncing Wave Letters */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '2px', 
            marginBottom: '24px' 
          }}>
            {letters.map((char, index) => {
              const isFlow = index >= 7; // "admin" (index 7,8,9,10,11)
              return (
                <span
                  key={index}
                  style={{
                    display: 'inline-block',
                    fontWeight: 800,
                    fontSize: '2.75rem',
                    letterSpacing: '1px',
                    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                    color: isFlow ? '#d1bbfb' : '#F8FAFC',
                    // Apply gradient text effect to the "Flow" part
                    background: isFlow ? 'linear-gradient(135deg, #d1bbfb, #5646e4)' : 'none',
                    WebkitBackgroundClip: isFlow ? 'text' : 'none',
                    WebkitTextFillColor: isFlow ? 'transparent' : 'none',
                    animation: 'letter-bounce 1.6s ease-in-out infinite',
                    animationDelay: `${index * 0.08}s`
                  }}
                >
                  {char}
                </span>
              );
            })}
          </div>

          {/* Glowing Premium Sweep Progress Bar */}
          <div style={{
            width: '200px',
            height: '4px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '10px',
            overflow: 'hidden',
            position: 'relative',
            margin: '0 auto 20px',
            boxShadow: '0 0 15px rgba(0,0,0,0.5)'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              height: '100%',
              background: 'linear-gradient(90deg, transparent, #d1bbfb, #5646e4, transparent)',
              borderRadius: '10px',
              animation: 'bar-sweep 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite'
            }} />
          </div>

          {/* Secure verification status text */}
          <p style={{ 
            margin: 0, 
            color: '#94A3B8', 
            fontSize: '0.75rem', 
            fontWeight: 700, 
            letterSpacing: '0.2em', 
            textTransform: 'uppercase', 
            animation: 'text-pulse 2s ease-in-out infinite',
            textShadow: '0 0 10px rgba(255,255,255,0.05)'
          }}>
            Verifying secure session...
          </p>

        </div>
      </div>
    )
  }

  return user ? children : null
}

export default function AuthGuard({ children }) {
  return (
    <AdminProvider>
      <AuthGuardContent>{children}</AuthGuardContent>
    </AdminProvider>
  )
}

function AdminRequiredGuardContent({ children }) {
  const { isAdmin, loading } = useAdmin()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/admin/dashboard')
    }
  }, [isAdmin, loading, navigate])

  if (loading || !isAdmin) return null
  return children
}

export function AdminGuard({ children }) {
  return (
    <AuthGuard>
      <AdminRequiredGuardContent>{children}</AdminRequiredGuardContent>
    </AuthGuard>
  )
}

