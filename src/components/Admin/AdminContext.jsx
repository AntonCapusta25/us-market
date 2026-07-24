import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

const AdminContext = createContext(null)

export function AdminProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [salespeople, setSalespeople] = useState([])
  const [loading, setLoading] = useState(true)
  const [impersonatedProfile, setImpersonatedProfile] = useState(() => {
    try {
      const stored = sessionStorage.getItem('finderadmin_impersonated_profile')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const impersonate = useCallback((prof) => {
    setImpersonatedProfile(prof)
    try {
      sessionStorage.setItem('finderadmin_impersonated_profile', JSON.stringify(prof))
    } catch (e) {
      console.error('Failed to save impersonated profile:', e)
    }
  }, [])

  const stopImpersonating = useCallback(() => {
    setImpersonatedProfile(null)
    try {
      sessionStorage.removeItem('finderadmin_impersonated_profile')
    } catch (e) {
      console.error('Failed to remove impersonated profile:', e)
    }
  }, [])

  const refreshProfile = useCallback(async (userId, email) => {
    if (!userId) return null
    try {
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code === 'PGRST116') {
        // Fallback: create profile if trigger hasn't run
        const fallbackEmail = email || ''
        const fallbackName = fallbackEmail ? fallbackEmail.split('@')[0] : 'User'
        const { data: newProf, error: insError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: fallbackEmail,
            role: 'salesperson',
            name: fallbackName
          })
          .select()
          .single()

        if (!insError && newProf) {
          data = newProf
        }
      }

      if (data) {
        setProfile(data)
        return data
      }
    } catch (err) {
      console.error('Error loading user profile:', err)
    }
    return null
  }, [])

  const fetchSalespeople = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('name')
      if (data) {
        setSalespeople(data)
      }
    } catch (err) {
      console.error('Error fetching salespeople:', err)
    }
  }, [])

  useEffect(() => {
    let active = true

    async function applySession(session) {
      if (!active) return
      if (session?.user) {
        setUser(session.user)
        try {
          await Promise.all([
            refreshProfile(session.user.id, session.user.email),
            fetchSalespeople()
          ])
        } catch (err) {
          console.error('Auth background fetch error:', err)
        } finally {
          setLoading(false)
        }
      } else {
        setUser(null)
        setProfile(null)
        setSalespeople([])
        setLoading(false)
        setImpersonatedProfile(null)
        try {
          sessionStorage.removeItem('finderadmin_impersonated_profile')
        } catch {}
      }
    }

    // getSession() waits for token refresh to complete before returning.
    // This guarantees a fresh JWT so page queries don't hang.
    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session)
    })

    // Subscribe to subsequent auth changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setImpersonatedProfile(null)
        try {
          sessionStorage.removeItem('finderadmin_impersonated_profile')
        } catch {}
      }
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        applySession(session)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [refreshProfile, fetchSalespeople])

  const [notifications, setNotifications] = useState([])

  const fetchNotifications = useCallback(async (userId) => {
    if (!userId) return
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (data) {
        setNotifications(data)
      }
    } catch (err) {
      console.error('Error fetching notifications:', err)
    }
  }, [])

  const markAsRead = useCallback(async (id) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
      if (!error) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      }
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
      if (!error) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err)
    }
  }, [user?.id])

  const deleteNotification = useCallback(async (id) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
      if (!error) {
        setNotifications(prev => prev.filter(n => n.id !== id))
      }
    } catch (err) {
      console.error('Error deleting notification:', err)
    }
  }, [])

  useEffect(() => {
    if (!user?.id) {
      setNotifications([])
      return
    }

    fetchNotifications(user.id)

    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setNotifications(prev => [payload.new, ...prev].slice(0, 50))
          window.dispatchEvent(new CustomEvent('new-notification', { detail: payload.new }))
        } else if (payload.eventType === 'UPDATE') {
          setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new : n))
        } else if (payload.eventType === 'DELETE') {
          setNotifications(prev => prev.filter(n => n.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, fetchNotifications])

  const unreadCount = notifications.filter(n => !n.is_read).length

  const realUser = user
  const realProfile = profile
  const realIsAdmin = profile?.role === 'admin' || profile?.role === 'Napoleon'

  const activeUser = impersonatedProfile 
    ? (realUser ? { ...realUser, id: impersonatedProfile.id, email: impersonatedProfile.email } : { id: impersonatedProfile.id, email: impersonatedProfile.email })
    : realUser

  const activeProfile = impersonatedProfile ? impersonatedProfile : realProfile
  const activeIsAdmin = impersonatedProfile ? false : realIsAdmin

  const value = {
    user: activeUser,
    profile: activeProfile,
    isAdmin: activeIsAdmin,
    realUser,
    realProfile,
    realIsAdmin,
    isImpersonating: !!impersonatedProfile,
    impersonate,
    stopImpersonating,
    salespeople,
    loading,
    refreshProfile: () => refreshProfile(realUser?.id, realUser?.email),
    refreshSalespeople: () => fetchSalespeople(),
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
  }

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  const context = useContext(AdminContext)
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider')
  }
  return context
}
