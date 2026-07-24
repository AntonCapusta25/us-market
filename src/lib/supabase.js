// Mock Supabase Client

const mockUser = {
  id: 'admin-id',
  email: 'admin@finderadmin.com',
  user_metadata: {
    role: 'admin',
    name: 'Admin User'
  }
}

const mockSession = {
  user: mockUser,
  access_token: 'mock-token'
}

// Dummy data stores
const db = {
  profiles: [
    { id: 'admin-id', email: 'admin@finderadmin.com', role: 'admin', name: 'Admin User' },
    { id: 'user-1', email: 'sales@finderadmin.com', role: 'sales', name: 'Sales Agent' }
  ],
  outreach_leads: [
    { id: 1, name: 'John Doe', email: 'john@example.com', status: 'New', created_at: new Date().toISOString(), industry: 'HVAC' }
  ],
  segments: [
    { id: 1, name: 'B2B', description: 'Business to Business leads' },
    { id: 2, name: 'Enterprise', description: 'Large enterprise leads' }
  ],
  campaigns: [
    { id: 1, name: 'Q3 Outreach', status: 'active', sent: 150, opened: 45, replied: 10 }
  ],
  deals: [
    { id: 1, lead_id: 1, amount: 5000, stage: 'negotiation' }
  ],
  chat_messages: [],
  marketing_kpis: [],
  marketing_tasks: []
}

class MockQueryBuilder {
  constructor(table) {
    this.table = table
    this.query = [...(db[table] || [])]
  }

  select() { return this }
  insert(data) {
    if (Array.isArray(data)) {
      const newItems = data.map(d => ({ id: d.id || Date.now() + Math.random(), ...d }))
      if (db[this.table]) db[this.table] = [...db[this.table], ...newItems]
      return Promise.resolve({ data: newItems, error: null })
    } else {
      const newItem = { id: data.id || Date.now() + Math.random(), ...data }
      if (db[this.table]) db[this.table].push(newItem)
      return Promise.resolve({ data: [newItem], error: null })
    }
  }
  update(data) {
    this.isUpdate = true
    this.updateData = data
    return this
  }
  delete() {
    this.isDelete = true
    return this
  }
  
  eq(column, value) {
    this.query = this.query.filter(item => item[column] === value)
    return this
  }
  neq(column, value) {
    this.query = this.query.filter(item => item[column] !== value)
    return this
  }
  in(column, values) {
    if (Array.isArray(values)) {
      this.query = this.query.filter(item => values.includes(item[column]))
    }
    return this
  }
  ilike(column, pattern) {
    const regex = new RegExp(pattern.replace(/%/g, '.*'), 'i')
    this.query = this.query.filter(item => regex.test(item[column]))
    return this
  }
  contains() { return this }
  order() { return this }
  limit(n) {
    this.query = this.query.slice(0, n)
    return this
  }
  range() { return this }
  single() {
    return Promise.resolve({ data: this.query[0] || null, error: null })
  }

  then(resolve) {
    if (this.isDelete) {
      const matchedIds = this.query.map(item => item.id)
      if (db[this.table]) {
        db[this.table] = db[this.table].filter(item => !matchedIds.includes(item.id))
      }
      resolve({ data: this.query, error: null })
    } else if (this.isUpdate) {
      const matchedIds = this.query.map(item => item.id)
      if (db[this.table]) {
        db[this.table] = db[this.table].map(item => {
          if (matchedIds.includes(item.id)) {
            return { ...item, ...this.updateData }
          }
          return item
        })
      }
      resolve({ data: this.query, error: null })
    } else {
      resolve({ data: this.query, error: null })
    }
  }
}

export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: mockSession }, error: null }),
    onAuthStateChange: (cb) => {
      cb('SIGNED_IN', mockSession)
      return { data: { subscription: { unsubscribe: () => {} } } }
    },
    signInWithPassword: async () => ({ data: { user: mockUser }, error: null }),
    signOut: async () => ({ error: null }),
    getUser: async () => ({ data: { user: mockUser }, error: null })
  },
  from: (table) => new MockQueryBuilder(table),
  channel: () => ({
    on: () => ({ subscribe: () => {} }),
    subscribe: () => {},
    unsubscribe: () => {}
  }),
  removeChannel: () => {},
  functions: {
    invoke: async () => ({ data: { success: true }, error: null })
  }
}

if (typeof window !== 'undefined') {
  window.supabase = supabase
}

export async function sendEmailNotification(payload) {
  console.log('📨 Mock email sent:', payload)
}
