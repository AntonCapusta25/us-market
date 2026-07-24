import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense } from 'react'

// Admin (Lazy)
import AdminLogin from './pages/Admin/Login'
import AdminDashboard from './pages/Admin/Dashboard'
import AdminOutreach from './pages/Admin/Outreach'
import AdminDeals from './pages/Admin/Deals'
import AdminEmailSettings from './pages/Admin/EmailSettings'
import AuthGuard, { AdminGuard } from './components/Admin/AuthGuard'

import './styles/index.css'

const Loading = () => <div style={{ minHeight: '100vh', background: '#0F1115' }} />

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          {/* ── Redirect root to admin ── */}
          <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
          
          {/* ── Admin routes ── */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AuthGuard><AdminDashboard /></AuthGuard>} />
          <Route path="/admin/outreach" element={<AuthGuard><AdminOutreach /></AuthGuard>} />
          <Route path="/admin/deals" element={<AuthGuard><AdminDeals /></AuthGuard>} />
          <Route path="/admin/email-settings" element={<AdminGuard><AdminEmailSettings /></AdminGuard>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
