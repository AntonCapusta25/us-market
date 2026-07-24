import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gvuucsammtyweehzqwjo.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2dXVjc2FtbXR5d2VlaHpxd2pvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3Mzg3NjQsImV4cCI6MjA5MzMxNDc2NH0.0RDHL9bhXaClj0lkHy6ocuquur5rjN7IaslEtia3WzE'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
  console.log('Attempting insert request to outreach_leads without logging in...')
  const start = Date.now()
  const { data, error } = await supabase.from('outreach_leads').insert([
    {
      email: 'test@example.com',
      name: 'Test Business',
      status: 'New',
      metadata: {}
    }
  ])
  const duration = Date.now() - start
  if (error) {
    console.error(`Error inserting (took ${duration}ms):`, error)
  } else {
    console.log(`Success! Inserted row (took ${duration}ms):`, data)
  }
}

run()
