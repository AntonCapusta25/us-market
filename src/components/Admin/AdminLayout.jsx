import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAdmin } from './AdminContext'

export default function AdminLayout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [segments, setSegments] = useState([])
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [toasts, setToasts] = useState([])
  const { profile, isAdmin, isImpersonating, stopImpersonating, notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useAdmin()

  useEffect(() => {
    async function fetchSegments() {
      const { data } = await supabase.from('segments').select('id, name').order('name')
      if (data) setSegments(data)
    }
    fetchSegments()
  }, [])

  useEffect(() => {
    const handleNewNotif = (e) => {
      const newNotif = e.detail
      setToasts(prev => [...prev, newNotif])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== newNotif.id))
      }, 4000)
    }
    window.addEventListener('new-notification', handleNewNotif)
    return () => window.removeEventListener('new-notification', handleNewNotif)
  }, [])

  useEffect(() => {
    if (!isNotifOpen) return
    const handleOutsideClick = () => setIsNotifOpen(false)
    window.addEventListener('click', handleOutsideClick)
    return () => window.removeEventListener('click', handleOutsideClick)
  }, [isNotifOpen])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  const getPageTitle = () => {
    const path = location.pathname
    if (path === '/admin/dashboard') return 'Dashboard Overview'
    if (path === '/admin/leads') return 'Inbound Lead Bank'
    if (path === '/admin/outreach') return 'Outbound Campaign CRM'
    if (path === '/admin/chat') return 'Team Collaborator Chat'
    if (path === '/admin/calendar') return 'Shared Appointment Calendar'
    if (path === '/admin/deals') return 'Revenue Pipeline & Splits'
    if (path === '/admin/team') return 'Team Member Settings'
    if (path === '/admin/email-settings') return 'Email Outreach Settings'
    if (path.startsWith('/admin/segments/')) return 'Lead Segment Explorer'
    if (path === '/admin/segments') return 'Lead Segments Manager'
    if (path === '/admin/campaigns') return 'Outbound Campaigns'
    if (path === '/admin/marketing') return 'Marketing KPI Tracker'
    return 'Admin Console'
  }

  const timeAgo = (dateStr) => {
    const now = new Date()
    const diffMs = now - new Date(dateStr)
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return new Date(dateStr).toLocaleDateString([], { dateStyle: 'short' })
  }

  const menu = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg> },
    { to: '/admin/outreach', label: 'Outbound', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg> },
    { to: '/admin/deals', label: 'Deals & Revenue', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg> },
    ...(isAdmin ? [
      { to: '/admin/email-settings', label: 'Email Settings', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"><circle cx="18" cy="18" r="3" fill="currentColor" stroke="none"></circle></polyline><line x1="21" y1="18" x2="23" y2="18" stroke="currentColor"></line><line x1="15" y1="18" x2="13" y2="18" stroke="currentColor"></line><line x1="18" y1="21" x2="18" y2="23" stroke="currentColor"></line><line x1="18" y1="15" x2="18" y2="13" stroke="currentColor"></line></svg> },
    ] : []),
  ]


  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#050505', color: '#F8FAFC', fontFamily: '"Space Grotesk", sans-serif' }}>
      <style>{`
        @media (max-width: 768px) {
          .admin-sidebar {
            position: fixed !important;
            top: 0;
            left: 0;
            height: 100vh;
            z-index: 10001;
            transform: translateX(-100%);
            width: 280px !important;
          }
          .admin-sidebar.mobile-open {
            transform: translateX(0);
          }
          .admin-mobile-overlay {
            display: block !important;
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0.6);
            backdrop-filter: blur(4px);
            z-index: 10000;
          }
          .admin-header {
            padding: 0 20px !important;
          }
          .admin-header-title {
            font-size: 1.1rem !important;
          }
          .admin-main-content {
            padding: 20px !important;
          }
          .mobile-menu-btn {
            display: flex !important;
          }
        }
      `}</style>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="admin-mobile-overlay"
          style={{ display: 'none' }}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Toast Alert Popups Container */}
      <div style={{
        position: 'fixed',
        top: '80px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        pointerEvents: 'none'
      }}>
        <style>{`
          @keyframes slideIn {
            from { transform: translateX(120%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        `}</style>
        {toasts.map(toast => (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              background: 'rgba(10, 10, 10, 0.95)',
              border: '1px solid rgba(209, 187, 251, 0.3)',
              borderRadius: '16px',
              padding: '16px 20px',
              width: '320px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 15px rgba(209, 187, 251, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              cursor: 'pointer',
              animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={() => {
              markAsRead(toast.id)
              if (toast.link) {
                navigate(toast.link)
              }
              setToasts(prev => prev.filter(t => t.id !== toast.id))
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#d1bbfb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {toast.title}
              </span>
              <span style={{ fontSize: '0.7rem', color: '#64748B' }}>Just now</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#CBD5E1', lineHeight: 1.4 }}>
              {toast.content}
            </p>
          </div>
        ))}
      </div>

      {isImpersonating && (
        <div style={{
          background: 'linear-gradient(90deg, #1B365D, #C99F4A)',
          color: 'white',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 4px 20px rgba(201, 159, 74, 0.15)',
          zIndex: 1000,
          fontFamily: "'Space Grotesk', 'Inter', sans-serif"
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, letterSpacing: '0.01em' }}>
              Impersonating salesperson: <strong style={{ textDecoration: 'underline' }}>{profile?.name || 'No Name'}</strong> ({profile?.email}) &bull; <span style={{ opacity: 0.9 }}>Views and queries are restricted to their profile.</span>
            </span>
          </div>
          <button
            onClick={stopImpersonating}
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              color: 'white',
              padding: '8px 18px',
              borderRadius: '20px',
              fontWeight: 700,
              fontSize: '0.75rem',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = 'white'
              e.currentTarget.style.color = '#d1bbfb'
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'
              e.currentTarget.style.color = 'white'
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            Exit Impersonation
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar */}
        <aside className={`admin-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`} style={{
          width: isCollapsed ? '80px' : '260px', background: '#0a0a0a', borderRight: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex', flexDirection: 'column', padding: isCollapsed ? '24px 12px' : '24px',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative'
        }}>
          <div style={{ marginBottom: '40px', display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between' }}>
            {!isCollapsed && (
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                Finder<span style={{ color: '#d1bbfb' }}> admin</span>
              </h2>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              style={{
                background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94A3B8',
                cursor: 'pointer', padding: '8px', borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {isCollapsed ? <polyline points="13 17 18 12 13 7"></polyline> : <polyline points="11 17 6 12 11 7"></polyline>}
                {isCollapsed ? <line x1="6" y1="12" x2="18" y2="12"></line> : <line x1="18" y1="12" x2="6" y2="12"></line>}
              </svg>
            </button>
          </div>

          <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', paddingRight: '4px' }}>
            {menu.map(item => (
              <div key={item.to}>
                <Link
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: isCollapsed ? '0' : '12px', padding: '12px',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    borderRadius: '12px', textDecoration: 'none', color: location.pathname.startsWith(item.to) ? 'white' : '#94A3B8',
                    background: location.pathname.startsWith(item.to) ? 'rgba(209, 187, 251, 0.1)' : 'transparent',
                    transition: 'all 0.2s',
                    overflow: 'hidden'
                  }}
                  title={isCollapsed ? item.label : ''}
                >
                  <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{item.icon}</span>
                  {!isCollapsed && <span style={{ fontWeight: 600, fontSize: '0.95rem', whiteSpace: 'nowrap' }}>{item.label}</span>}
                </Link>
                {!isCollapsed && item.children && location.pathname.startsWith(item.to) && (
                  <div style={{ marginLeft: '42px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                    {item.children.map(child => (
                      <Link
                        key={child.to} to={child.to}
                        onClick={() => setIsMobileMenuOpen(false)}
                        style={{
                          padding: '8px 12px', color: location.pathname === child.to ? 'white' : '#64748B',
                          fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', borderRadius: '8px',
                          background: location.pathname === child.to ? 'rgba(255,255,255,0.03)' : 'transparent',
                          transition: 'all 0.2s'
                        }}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {!isCollapsed && profile && (
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '16px',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: profile?.role === 'admin' ? 'linear-gradient(135deg, #C99F4A, #1B365D)' : profile?.role === 'Napoleon' ? 'linear-gradient(135deg, #C99F4A, #ffffff)' : 'linear-gradient(135deg, #3b82f6, #10b981)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.85rem',
                color: 'white',
                flexShrink: 0
              }}>
                {(profile?.name || profile?.email || 'User').charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {profile?.name || profile?.email?.split('@')[0] || 'User'}
                </p>
                <p style={{
                  margin: 0,
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: profile?.role === 'admin' ? '#d1bbfb' : profile?.role === 'Napoleon' ? '#c084fc' : '#4ade80',
                  letterSpacing: '0.05em'
                }}>
                  {profile?.role || 'salesperson'}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            style={{
              marginTop: 'auto', padding: '12px', background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px', color: '#ef4444', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            {!isCollapsed && <span>Logout</span>}
          </button>
        </aside>

        {/* Main Content Pane with Top Bar */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
          {/* Header Bar */}
          <header className="admin-header" style={{
            height: '70px',
            background: '#0a0a0a',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '0 40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                className="mobile-menu-btn"
                onClick={() => setIsMobileMenuOpen(true)}
                style={{
                  display: 'none',
                  background: 'rgba(255,255,255,0.05)',
                  border: 'none',
                  color: 'white',
                  padding: '8px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              </button>
              <h2 className="admin-header-title" style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'white' }}>
                {getPageTitle()}
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', position: 'relative' }}>
              <button
                onClick={(e) => { e.stopPropagation(); setIsNotifOpen(!isNotifOpen); }}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  padding: '10px',
                  borderRadius: '12px',
                  color: unreadCount > 0 ? '#d1bbfb' : '#94A3B8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: 'linear-gradient(135deg, #C99F4A, #1B365D)',
                    color: 'white',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    borderRadius: '10px',
                    padding: '2px 6px',
                    border: '2px solid #0a0a0a',
                    boxShadow: '0 0 10px rgba(201, 159, 74, 0.4)'
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Bell Dropdown Overlay */}
              {isNotifOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    top: '55px',
                    right: 0,
                    width: '360px',
                    background: '#0a0a0a',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'white', fontFamily: "'Space Grotesk', sans-serif" }}>Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        style={{ background: 'none', border: 'none', color: '#d1bbfb', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748B', fontSize: '0.85rem' }}>
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <div
                          key={notif.id}
                          onClick={() => {
                            markAsRead(notif.id)
                            setIsNotifOpen(false)
                            if (notif.link) navigate(notif.link)
                          }}
                          style={{
                            padding: '14px 20px',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                            background: notif.is_read ? 'transparent' : 'rgba(209, 187, 251, 0.03)',
                            cursor: 'pointer',
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-start',
                            transition: 'background 0.2s'
                          }}
                          onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                          onMouseOut={e => e.currentTarget.style.background = notif.is_read ? 'transparent' : 'rgba(201, 159, 74, 0.03)'}
                        >
                          <div style={{
                            width: '8px', height: '8px', borderRadius: '50%',
                            background: notif.is_read ? 'transparent' : 'linear-gradient(135deg, #C99F4A, #1B365D)',
                            marginTop: '6px', flexShrink: 0
                          }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '2px' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {notif.title}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                <span style={{ fontSize: '0.7rem', color: '#64748B' }}>{timeAgo(notif.created_at)}</span>

                                {/* Quick Mark As Read */}
                                {!notif.is_read && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      markAsRead(notif.id)
                                    }}
                                    style={{
                                      background: 'none', border: 'none', color: '#10b981', padding: '2px', cursor: 'pointer',
                                      opacity: 0.6, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '8px'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                    onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
                                    title="Mark as read"
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                      <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                  </button>
                                )}

                                {/* Delete Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    deleteNotification(notif.id)
                                  }}
                                  style={{
                                    background: 'none', border: 'none', color: '#ef4444', padding: '2px', cursor: 'pointer',
                                    opacity: 0.6, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '6px'
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                  onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
                                  title="Delete notification"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                  </svg>
                                </button>
                              </div>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94A3B8', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                              {notif.content}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </header>

          <main className="admin-main-content" style={{ flex: 1, padding: '40px', overflowY: 'auto', background: '#050505' }}>
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
