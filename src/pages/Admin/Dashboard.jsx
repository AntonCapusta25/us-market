import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AdminLayout from '../../components/Admin/AdminLayout'
import { useAdmin } from '../../components/Admin/AdminContext'

export default function AdminDashboard() {
  const { user, isAdmin, profile, salespeople } = useAdmin()
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [stats, setStats] = useState({ 
    totalLeads: 0, 
    bookingLeads: 0, 
    contactLeads: 0, 
    newsletterSubs: 0,
    allLeads: [],
    activityLeads: []
  })

  const [recentActivity, setRecentActivity] = useState([])
  const [coreLoading, setCoreLoading] = useState(true)
  const [growthLoading, setGrowthLoading] = useState(false)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('activity')
  const [dailyData, setDailyData] = useState({ dailyLeads: [], dailyCalls: [] })
  const [statusDistribution, setStatusDistribution] = useState([])
  const [segmentDistribution, setSegmentDistribution] = useState([])
  const [positionDistribution, setPositionDistribution] = useState([])
  const [stateDistribution, setStateDistribution] = useState([])
  const [leaderboard, setLeaderboard] = useState([])

  // 1. Fetch Core Stats (Total counts & recent activity feed)
  useEffect(() => {
    async function fetchCoreData() {
      setCoreLoading(true)
      try {
        let bQuery = supabase.from('booking_leads').select('*', { count: 'exact', head: true })
        let cQuery = supabase.from('contact_leads').select('*', { count: 'exact', head: true })
        let oQuery = supabase.from('outreach_leads').select('*', { count: 'exact', head: true })
        let subsQuery = supabase.from('newsletter_subs').select('*', { count: 'exact', head: true })
        const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        // Exclude activity logged by Oleksandr (admin account, hidden from team view)
        const HIDDEN_EMAIL = 'bangalexf@gmail.com'
        const { data: hiddenProfile } = await supabase.from('profiles').select('id').eq('email', HIDDEN_EMAIL).maybeSingle()
        let hQuery = supabase.from('lead_history').select('*').gte('created_at', sevenDaysAgo.toISOString()).order('created_at', { ascending: false }).limit(20)
        if (hiddenProfile?.id) hQuery = hQuery.neq('admin_id', hiddenProfile.id)

        // Apply assignee filters
        if (isAdmin) {
          if (assigneeFilter === 'unassigned') {
            bQuery = bQuery.is('assignee_id', null)
            cQuery = cQuery.is('assignee_id', null)
            oQuery = oQuery.is('assignee_id', null)
          } else if (assigneeFilter !== 'all') {
            bQuery = bQuery.eq('assignee_id', assigneeFilter)
            cQuery = cQuery.eq('assignee_id', assigneeFilter)
            oQuery = oQuery.eq('assignee_id', assigneeFilter)
          }
        } else {
          if (user?.id) {
            bQuery = bQuery.eq('assignee_id', user.id)
            cQuery = cQuery.eq('assignee_id', user.id)
            oQuery = oQuery.eq('assignee_id', user.id)
          } else {
            // Empty state placeholder
            bQuery = bQuery.eq('assignee_id', '00000000-0000-0000-0000-000000000000')
            cQuery = cQuery.eq('assignee_id', '00000000-0000-0000-0000-000000000000')
            oQuery = oQuery.eq('assignee_id', '00000000-0000-0000-0000-000000000000')
          }
        }

        const [bookings, contacts, outreach, subs, history] = await Promise.all([
          bQuery,
          cQuery,
          oQuery,
          subsQuery,
          hQuery
        ])

        const leadIds = [...new Set(history.data?.map(h => h.lead_id).filter(Boolean) || [])]
        let activityLeads = []
        if (leadIds.length > 0) {
          const [bLeads, oLeads] = await Promise.all([
            supabase.from('booking_leads').select('id, name').in('id', leadIds),
            supabase.from('outreach_leads').select('id, name, email').in('id', leadIds)
          ])
          activityLeads = [...(bLeads.data || []), ...(oLeads.data || []).map(l => ({ ...l, name: l.name || l.email }))]
        }

        const totalLeadsCount = (bookings.count || 0) + (contacts.count || 0) + (outreach.count || 0)

        setStats({
          bookingLeads: bookings.count || 0,
          contactLeads: contacts.count || 0,
          newsletterSubs: subs.count || 0,
          totalLeads: totalLeadsCount,
          allLeads: [],
          activityLeads: activityLeads
        })
        
        setRecentActivity(history.data || [])
      } catch (err) {
        console.error('Error fetching core dashboard data:', err)
      } finally {
        setCoreLoading(false)
      }
    }

    fetchCoreData()
  }, [assigneeFilter, isAdmin, user])

  // 2. Fetch Growth Data (Daily Counts) lazily when the Growth tab is active
  useEffect(() => {
    if (activeTab !== 'growth') return

    async function fetchGrowthData() {
      setGrowthLoading(true)
      try {
        const last7Days = [...Array(7)].map((_, i) => {
          const d = new Date()
          d.setDate(d.getDate() - i)
          const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())
          const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
          const label = `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`
          return { label, dayStart: dayStart.toISOString(), dayEnd: dayEnd.toISOString() }
        }).reverse()

        const dailyLeadResults = await Promise.all(last7Days.map(({ dayStart, dayEnd }) => {
          let q = supabase.from('outreach_leads').select('*', { count: 'exact', head: true }).gte('created_at', dayStart).lt('created_at', dayEnd)
          if (isAdmin) {
            if (assigneeFilter === 'unassigned') q = q.is('assignee_id', null)
            else if (assigneeFilter !== 'all') q = q.eq('assignee_id', assigneeFilter)
          } else if (user?.id) {
            q = q.eq('assignee_id', user.id)
          } else {
            q = q.eq('assignee_id', '00000000-0000-0000-0000-000000000000')
          }
          return q
        }))

        const dailyCallResults = await Promise.all(last7Days.map(({ dayStart, dayEnd }) => {
          let q = supabase.from('lead_history').select('*', { count: 'exact', head: true }).eq('event_type', 'call').gte('created_at', dayStart).lt('created_at', dayEnd)
          if (isAdmin) {
            if (assigneeFilter !== 'all' && assigneeFilter !== 'unassigned') {
              q = q.eq('admin_id', assigneeFilter)
            }
          } else if (user?.id) {
            q = q.eq('admin_id', user.id)
          } else {
            q = q.eq('admin_id', '00000000-0000-0000-0000-000000000000')
          }
          return q
        }))

        const dailyLeads = last7Days.map((day, i) => ({ date: day.label, count: dailyLeadResults[i].count || 0 }))
        const dailyCalls = last7Days.map((day, i) => ({ date: day.label, count: dailyCallResults[i].count || 0 }))

        setDailyData({ dailyLeads, dailyCalls })
      } catch (err) {
        console.error('Error fetching growth data:', err)
      } finally {
        setGrowthLoading(false)
      }
    }

    fetchGrowthData()
  }, [activeTab, assigneeFilter, isAdmin, user])

  // 3. Fetch Analytics Data (Status distribution) lazily when Analytics tab is active
  useEffect(() => {
    if (activeTab !== 'analytics') return

    async function fetchAnalyticsData() {
      setAnalyticsLoading(true)
      try {
        let allStatuses = []
        let fromIdx = 0
        const pageSize = 1000
        let hasMore = true

        while (hasMore) {
          let statusQuery = supabase.from('outreach_leads').select('status, industry, position, location')
          if (isAdmin) {
            if (assigneeFilter === 'unassigned') statusQuery = statusQuery.is('assignee_id', null)
            else if (assigneeFilter !== 'all') statusQuery = statusQuery.eq('assignee_id', assigneeFilter)
          } else if (user?.id) {
            statusQuery = statusQuery.eq('assignee_id', user.id)
          } else {
            statusQuery = statusQuery.eq('assignee_id', '00000000-0000-0000-0000-000000000000')
          }

          const { data: statusChunk } = await statusQuery.range(fromIdx, fromIdx + pageSize - 1)
          
          if (statusChunk && statusChunk.length > 0) {
            allStatuses = [...allStatuses, ...statusChunk]
            fromIdx += pageSize
            if (statusChunk.length < pageSize) hasMore = false
          } else {
            hasMore = false
          }
          if (fromIdx > 50000) hasMore = false 
        }

        const statusDist = {}
        const segmentDist = {}
        const positionDist = {}
        const stateDist = {}

        allStatuses.forEach(lead => {
          const status = lead.status || 'New'
          statusDist[status] = (statusDist[status] || 0) + 1

          const industry = lead.industry || 'Unknown'
          segmentDist[industry] = (segmentDist[industry] || 0) + 1

          const position = lead.position || 'Unknown'
          positionDist[position] = (positionDist[position] || 0) + 1

          const state = lead.location || 'Unknown'
          stateDist[state] = (stateDist[state] || 0) + 1
        })

        setStatusDistribution(Object.entries(statusDist).map(([name, value]) => ({ name, value })))
        setSegmentDistribution(Object.entries(segmentDist).map(([name, value]) => ({ name, value })))
        setPositionDistribution(Object.entries(positionDist).map(([name, value]) => ({ name, value })))
        setStateDistribution(Object.entries(stateDist).map(([name, value]) => ({ name, value })))
      } catch (err) {
        console.error('Error fetching analytics data:', err)
      } finally {
        setAnalyticsLoading(false)
      }
    }

    fetchAnalyticsData()
  }, [activeTab, assigneeFilter, isAdmin, user])

  // 4. Fetch Leaderboard Data lazily when Leaderboard tab is active
  useEffect(() => {
    if (activeTab !== 'leaderboard') return

    async function fetchLeaderboardData() {
      setLeaderboardLoading(true)
      try {
        let boardData = []
        if (salespeople && salespeople.length > 0) {
          const boardResults = await Promise.all(salespeople.map(async (sp) => {
            const { count: totalLeads } = await supabase
              .from('outreach_leads')
              .select('*', { count: 'exact', head: true })
              .eq('assignee_id', sp.id)

            const { count: convertedLeads } = await supabase
              .from('outreach_leads')
              .select('*', { count: 'exact', head: true })
              .eq('assignee_id', sp.id)
              .eq('status', 'Converted')

            const { count: callsLogged } = await supabase
              .from('lead_history')
              .select('*', { count: 'exact', head: true })
              .eq('admin_id', sp.id)
              .eq('event_type', 'call')

            return {
              id: sp.id,
              name: sp.name || sp.email.split('@')[0],
              email: sp.email,
              role: sp.role,
              totalLeads: totalLeads || 0,
              convertedLeads: convertedLeads || 0,
              callsLogged: callsLogged || 0,
              conversionRate: totalLeads ? Math.round((convertedLeads / totalLeads) * 100) : 0
            }
          }))
          boardData = boardResults.sort((a, b) => b.convertedLeads - a.convertedLeads || b.callsLogged - a.callsLogged)
        }
        setLeaderboard(boardData)
      } catch (err) {
        console.error('Error fetching leaderboard data:', err)
      } finally {
        setLeaderboardLoading(false)
      }
    }

    fetchLeaderboardData()
  }, [activeTab, salespeople])

  const StatCard = ({ title, value, icon, color }) => (
    <div className="stat-card" style={{ 
      background: '#0a0a0a', border: '1px solid rgba(255, 255, 255, 0.1)', 
      borderRadius: '24px', padding: '32px', display: 'flex', alignItems: 'center', gap: '24px'
    }}>
      <div style={{ 
        width: '64px', height: '64px', borderRadius: '16px', background: `${color}20`, 
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        {icon}
      </div>
      <div>
        <p style={{ color: '#94A3B8', fontSize: '0.9rem', fontWeight: 500, margin: '0 0 4px' }}>{title}</p>
        <h3 style={{ color: 'white', fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>{value}</h3>
      </div>
    </div>
  )

  const PieChart = ({ data }) => {
    const [hoveredIndex, setHoveredIndex] = useState(null)
    const total = data.reduce((sum, d) => sum + d.value, 0)
    let cumulativePercent = 0
    
    function getCoordinatesForPercent(percent) {
      const x = Math.cos(2 * Math.PI * percent)
      const y = Math.sin(2 * Math.PI * percent)
      return [x, y]
    }

    const colors = ['#C99F4A', '#3b82f6', '#10b981', '#f59e0b', '#1B365D']

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <div style={{ position: 'relative', width: '200px', height: '200px' }}>
          <svg viewBox="-1 -1 2 2" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
            {data.length === 0 ? <circle cx="0" cy="0" r="1" fill="rgba(255,255,255,0.05)" /> : data.map((slice, i) => {
              const [startX, startY] = getCoordinatesForPercent(cumulativePercent)
              cumulativePercent += slice.value / total
              const [endX, endY] = getCoordinatesForPercent(cumulativePercent)
              const largeArcFlag = slice.value / total > 0.5 ? 1 : 0
              const pathData = [
                `M ${startX} ${startY}`,
                `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                `L 0 0`,
              ].join(' ')
              return (
                <path 
                  key={i} d={pathData} fill={colors[i % colors.length]} 
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{ cursor: 'pointer', transition: 'all 0.2s', opacity: hoveredIndex === null || hoveredIndex === i ? 1 : 0.6, transform: hoveredIndex === i ? 'scale(1.05)' : 'scale(1)' }}
                />
              )
            })}
            <circle cx="0" cy="0" r="0.65" fill="#0a0a0a" />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            {hoveredIndex !== null ? (
              <>
                <p style={{ margin: 0, color: colors[hoveredIndex % colors.length], fontSize: '1.2rem', fontWeight: 800 }}>{data[hoveredIndex].value}</p>
                <p style={{ margin: 0, color: '#94A3B8', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>{data[hoveredIndex].name}</p>
              </>
            ) : (
              <>
                <p style={{ margin: 0, color: 'white', fontSize: '1.2rem', fontWeight: 800 }}>{total}</p>
                <p style={{ margin: 0, color: '#94A3B8', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>Total</p>
              </>
            )}
          </div>
        </div>
        <div style={{ display: 'grid', gap: '10px' }}>
          {data.map((slice, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: hoveredIndex === null || hoveredIndex === i ? 1 : 0.4, transition: 'all 0.2s' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: colors[i % colors.length] }} />
              <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>{slice.name}: <strong>{slice.value}</strong></span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const BarChart = ({ data, color }) => {
    const [hoveredIndex, setHoveredIndex] = useState(null)
    const maxCount = Math.max(...data.map(d => d.count), 0)
    const gridMax = maxCount <= 4 ? 6 : Math.max(maxCount + 2, 10)
    
    return (
      <div style={{ height: '220px', position: 'relative', padding: '30px 0 20px' }}>
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
          <div key={i} style={{ 
            position: 'absolute', bottom: `${p * 180 + 20}px`, left: 0, right: 0, 
            borderTop: '1px dashed rgba(255,255,255,0.05)', pointerEvents: 'none' 
          }} />
        ))}

        <div style={{ height: '180px', display: 'flex', alignItems: 'flex-end', gap: '12px', position: 'relative', zIndex: 1 }}>
          {data.map((d, i) => (
            <div key={i} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', position: 'relative' }}>
              <span style={{ 
                color: hoveredIndex === i ? 'white' : '#475569', fontSize: '0.7rem', fontWeight: 800, transition: 'all 0.2s' 
              }}>{d.count}</span>
              <div 
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{ 
                  width: '100%', height: `${(d.count / gridMax) * 100}%`, background: color, borderRadius: '4px 4px 0 0', 
                  opacity: hoveredIndex === null || hoveredIndex === i ? 1 : 0.4, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'pointer',
                  boxShadow: hoveredIndex === i ? `0 0 20px ${color}40` : 'none',
                  minHeight: d.count > 0 ? '2px' : '0'
                }} 
              />
              <span style={{ color: '#64748B', fontSize: '0.65rem', fontWeight: 600, marginTop: '4px' }}>{d.date}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <AdminLayout>
      {coreLoading ? (
        <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
          <div style={{ textAlign: 'center' }}>
            <style>{`
              @keyframes dash-bar-sweep {
                0% { left: -40%; width: 30%; }
                50% { width: 45%; }
                100% { left: 110%; width: 30%; }
              }
            `}</style>
            <div style={{
              width: '160px',
              height: '4px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              overflow: 'hidden',
              position: 'relative',
              margin: '0 auto 16px'
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                height: '100%',
                background: 'linear-gradient(90deg, transparent, #C99F4A, #1B365D, transparent)',
                borderRadius: '10px',
                animation: 'dash-bar-sweep 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite'
              }} />
            </div>
            <p style={{ fontWeight: 600, fontSize: '0.8rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#64748B' }}>PREPARING DASHBOARD...</p>
          </div>
        </div>
      ) : (
        <>
          <style>{`
            .dashboard-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-bottom: 48px;
              gap: 20px;
            }
            .dashboard-controls {
              display: flex;
              gap: 20px;
              align-items: center;
            }
            .dashboard-tabs {
              display: flex;
              background: rgba(255,255,255,0.03);
              padding: 6px;
              border-radius: 16px;
              border: 1px solid rgba(255,255,255,0.05);
              overflow-x: auto;
            }
            .stat-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 24px;
              margin-bottom: 48px;
            }
            .growth-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
            }
            @media (max-width: 1024px) {
              .stat-grid { grid-template-columns: repeat(2, 1fr); }
            }
            @media (max-width: 768px) {
              .dashboard-header {
                flex-direction: column;
                align-items: flex-start;
                margin-bottom: 24px;
                gap: 20px;
                width: 100%;
                box-sizing: border-box;
              }
              .dashboard-controls {
                flex-direction: column;
                align-items: flex-start;
                width: 100%;
                gap: 16px;
                box-sizing: border-box;
                max-width: 100vw;
              }
              .dashboard-controls > div {
                width: 100%;
                box-sizing: border-box;
              }
              .stat-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 12px;
                margin-bottom: 32px;
                width: 100%;
              }
              .stat-card {
                padding: 16px !important;
                gap: 12px !important;
                flex-direction: column !important;
                align-items: flex-start !important;
              }
              .stat-card h3 {
                font-size: 1.5rem !important;
              }
              .growth-grid {
                grid-template-columns: minmax(0, 1fr);
                gap: 24px;
                width: 100%;
              }
              .dashboard-tabs {
                width: 100%;
                max-width: 100%;
                white-space: nowrap;
                -webkit-overflow-scrolling: touch;
                box-sizing: border-box;
              }
              .dashboard-tabs button {
                padding: 10px 16px !important;
                font-size: 0.85rem !important;
              }
              .activity-item {
                flex-direction: column;
                align-items: flex-start !important;
                gap: 12px !important;
                padding: 16px !important;
              }
              .activity-time {
                text-align: left !important;
              }
            }
          `}</style>

          <div className="dashboard-header">
            <div>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 900, margin: '0 0 8px', letterSpacing: '-0.02em' }}>Dashboard</h1>
              <p style={{ color: '#94A3B8', fontSize: '1.1rem', fontWeight: 500 }}>Real-time growth analytics and activity.</p>
            </div>
            <div className="dashboard-controls">
              {isAdmin && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>Filter Agent:</span>
                  <select
                    value={assigneeFilter}
                    onChange={e => setAssigneeFilter(e.target.value)}
                    style={{
                      padding: '10px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                      color: 'white', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 600, outline: 'none', cursor: 'pointer', flex: 1
                    }}
                  >
                    <option value="all" style={{ background: '#0a0a0a', color: 'white' }}>All Agents</option>
                    <option value="unassigned" style={{ background: '#0a0a0a', color: 'white' }}>Unassigned Leads</option>
                    {salespeople.map(sp => (
                      <option key={sp.id} value={sp.id} style={{ background: '#0a0a0a', color: 'white' }}>{sp.name || sp.email}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="dashboard-tabs">
                {['activity', 'growth', 'analytics', 'leaderboard'].map(tab => (
                  <button 
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{ 
                      padding: '10px 24px', borderRadius: '12px', border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                      background: activeTab === tab ? '#d1bbfb' : 'transparent',
                      color: activeTab === tab ? 'white' : '#94A3B8',
                      fontWeight: 700, fontSize: '0.9rem', textTransform: 'capitalize'
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="stat-grid">
            <StatCard title="Total Leads" value={stats.totalLeads} color="#d1bbfb" icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d1bbfb" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>} />
            <StatCard title="Booking Leads" value={stats.bookingLeads} color="#3b82f6" icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>} />
            <StatCard title="Contact Leads" value={stats.contactLeads} color="#10b981" icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>} />
            <StatCard title="Newsletters" value={stats.newsletterSubs} color="#f59e0b" icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>} />
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
            <div style={{ padding: '40px' }}>
              {activeTab === 'activity' && (
                <div style={{ display: 'grid', gap: '16px' }}>
                  {recentActivity.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#475569', padding: '40px' }}>No activity in the last 7 days.</p>
                  ) : recentActivity.map((item, i) => {
                    const lead = stats.activityLeads.find(l => l.id === item.lead_id)
                    const agent = salespeople?.find(sp => sp.id === item.admin_id) || (item.admin_id === user?.id ? profile : null)
                    const agentName = agent?.name || agent?.email?.split('@')[0]
                    return (
                      <div key={item.id} className="activity-item" style={{ 
                        display: 'flex', alignItems: 'center', gap: '20px', padding: '20px', 
                        background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.03)',
                        transition: 'all 0.2s'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%' }}>
                          <div style={{ 
                            width: '44px', height: '44px', borderRadius: '12px', background: item.event_type === 'call' ? 'rgba(209, 187, 251, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                          }}>
                            {item.event_type === 'call' ? (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d1bbfb" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                            ) : (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: '0 0 4px', color: 'white', fontWeight: 700, wordWrap: 'break-word', overflowWrap: 'break-word' }}>{lead ? lead.name : 'Unknown Lead'}</p>
                            <p style={{ margin: 0, color: '#94A3B8', fontSize: '0.9rem', wordWrap: 'break-word', overflowWrap: 'break-word' }}>{item.content}</p>
                          </div>
                        </div>
                        <div className="activity-time" style={{ textAlign: 'right' }}>
                          <p style={{ margin: 0, color: '#475569', fontSize: '0.8rem', fontWeight: 600 }}>
                            {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {agentName && (
                            <p style={{ margin: '4px 0 0', color: '#d1bbfb', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              by {agentName}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {activeTab === 'growth' && (
                growthLoading ? (
                  <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        width: '100px',
                        height: '3px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        position: 'relative',
                        margin: '0 auto 12px'
                      }}>
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          height: '100%',
                          width: '40%',
                          background: 'linear-gradient(90deg, transparent, #d1bbfb, #3b82f6, transparent)',
                          borderRadius: '10px',
                          animation: 'dash-bar-sweep 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite'
                        }} />
                      </div>
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.15em' }}>LOADING METRICS...</p>
                    </div>
                  </div>
                ) : (
                  <div className="growth-grid">
                    <div style={{ background: 'rgba(255,255,255,0.01)', padding: '32px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <h4 style={{ color: 'white', marginBottom: '24px', fontSize: '1.1rem', fontWeight: 800 }}>Leads Added (7 Days)</h4>
                      <BarChart data={dailyData.dailyLeads} color="#d1bbfb" />
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.01)', padding: '32px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <h4 style={{ color: 'white', marginBottom: '24px', fontSize: '1.1rem', fontWeight: 800 }}>Calls Logged (7 Days)</h4>
                      <BarChart data={dailyData.dailyCalls} color="#3b82f6" />
                    </div>
                  </div>
                )
              )}

              {activeTab === 'analytics' && (
                analyticsLoading ? (
                  <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        width: '100px',
                        height: '3px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        position: 'relative',
                        margin: '0 auto 12px'
                      }}>
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          height: '100%',
                          width: '40%',
                          background: 'linear-gradient(90deg, transparent, #d1bbfb, #10b981, transparent)',
                          borderRadius: '10px',
                          animation: 'dash-bar-sweep 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite'
                        }} />
                      </div>
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.15em' }}>ANALYZING DISTRIBUTION...</p>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '40px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.01)', padding: '32px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <h4 style={{ color: 'white', marginBottom: '24px', fontSize: '1.1rem', fontWeight: 800, textAlign: 'center' }}>Status Distribution</h4>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <PieChart data={statusDistribution} />
                      </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.01)', padding: '32px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <h4 style={{ color: 'white', marginBottom: '24px', fontSize: '1.1rem', fontWeight: 800, textAlign: 'center' }}>Segment Distribution</h4>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <PieChart data={segmentDistribution} />
                      </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.01)', padding: '32px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <h4 style={{ color: 'white', marginBottom: '24px', fontSize: '1.1rem', fontWeight: 800, textAlign: 'center' }}>Position Distribution</h4>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <PieChart data={positionDistribution} />
                      </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.01)', padding: '32px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <h4 style={{ color: 'white', marginBottom: '24px', fontSize: '1.1rem', fontWeight: 800, textAlign: 'center' }}>Location (State) Distribution</h4>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <PieChart data={stateDistribution} />
                      </div>
                    </div>
                  </div>
                )
              )}

              {activeTab === 'leaderboard' && (
                leaderboardLoading ? (
                  <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        width: '100px',
                        height: '3px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        position: 'relative',
                        margin: '0 auto 12px'
                      }}>
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          height: '100%',
                          width: '40%',
                          background: 'linear-gradient(90deg, transparent, #fbbf24, #d1bbfb, transparent)',
                          borderRadius: '10px',
                          animation: 'dash-bar-sweep 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite'
                        }} />
                      </div>
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.15em' }}>COMPILING LEADERBOARD...</p>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: 'rgba(255,255,255,0.01)', padding: '32px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <h4 style={{ color: 'white', marginBottom: '24px', fontSize: '1.2rem', fontWeight: 800 }}>Team Leaderboard</h4>
                    {leaderboard.length === 0 ? (
                      <p style={{ color: '#64748B', fontSize: '0.9rem', textAlign: 'center', padding: '20px' }}>No salespeople stats available.</p>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              <th style={{ padding: '12px 10px', fontWeight: 600 }}>Rank</th>
                              <th style={{ padding: '12px 10px', fontWeight: 600 }}>Agent Name</th>
                              <th style={{ padding: '12px 10px', fontWeight: 600 }}>Total Leads</th>
                              <th style={{ padding: '12px 10px', fontWeight: 600 }}>Converted Leads</th>
                              <th style={{ padding: '12px 10px', fontWeight: 600 }}>Calls Logged</th>
                              <th style={{ padding: '12px 10px', fontWeight: 600 }}>Conversion Rate</th>
                            </tr>
                          </thead>
                          <tbody>
                            {leaderboard.map((item, idx) => {
                              const isCurrentUser = item.id === user?.id
                              return (
                                <tr key={item.id} style={{ 
                                  borderBottom: '1px solid rgba(255,255,255,0.04)', 
                                  fontSize: '0.9rem', 
                                  background: isCurrentUser ? 'rgba(201, 159, 74, 0.05)' : 'transparent',
                                  fontWeight: isCurrentUser ? 700 : 500,
                                  transition: 'all 0.2s'
                                }}>
                                  <td style={{ padding: '16px 10px', fontSize: '1.1rem', color: idx === 0 ? '#fbbf24' : idx === 1 ? '#cbd5e1' : idx === 2 ? '#cd7f32' : '#64748B' }}>
                                    {idx === 0 ? '🏆 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `${idx + 1}`}
                                  </td>
                                  <td style={{ padding: '16px 10px', color: isCurrentUser ? '#C99F4A' : 'white' }}>
                                    {item.name} {isCurrentUser && <span style={{ fontSize: '0.7rem', background: '#C99F4A', color: 'white', padding: '2px 8px', borderRadius: '20px', marginLeft: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>You</span>}
                                  </td>
                                  <td style={{ padding: '16px 10px', color: '#cbd5e1' }}>{item.totalLeads}</td>
                                  <td style={{ padding: '16px 10px', color: '#10b981', fontWeight: 700 }}>{item.convertedLeads}</td>
                                  <td style={{ padding: '16px 10px', color: '#3b82f6' }}>{item.callsLogged}</td>
                                  <td style={{ padding: '16px 10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      <span style={{ color: '#C99F4A', fontWeight: 700, width: '40px' }}>{item.conversionRate}%</span>
                                      <div style={{ width: '80px', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                                        <div style={{ width: `${item.conversionRate}%`, height: '100%', background: 'linear-gradient(90deg, #C99F4A, #1B365D)', borderRadius: '10px' }} />
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  )
}
