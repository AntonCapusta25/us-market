import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gvuucsammtyweehzqwjo.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2dXVjc2FtbXR5d2VlaHpxd2pvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3Mzg3NjQsImV4cCI6MjA5MzMxNDc2NH0.0RDHL9bhXaClj0lkHy6ocuquur5rjN7IaslEtia3WzE'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
  console.log('Signing in anonymously...')
  const { data: authData, error: authError } = await supabase.auth.signInAnonymously()

  if (authError) {
    console.error('Anonymous sign in error:', authError)
    return
  }

  console.log('Fetching profiles...')
  const { data, error } = await supabase.from('profiles').select('*')
  if (error) {
    console.error('Error fetching profiles:', error)
  } else {
    console.log('Profiles in DB:')
    console.log(JSON.stringify(data.map(d => ({ id: d.id, name: d.name, email: d.email, role: d.role })), null, 2))
  }
}

run()
