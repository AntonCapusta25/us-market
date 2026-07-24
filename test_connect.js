import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gvuucsammtyweehzqwjo.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2dXVjc2FtbXR5d2VlaHpxd2pvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3Mzg3NjQsImV4cCI6MjA5MzMxNDc2NH0.0RDHL9bhXaClj0lkHy6ocuquur5rjN7IaslEtia3WzE'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
  console.log('Sending select request to Supabase outreach_leads count...')
  const start = Date.now()
  const { count, error } = await supabase.from('outreach_leads').select('*', { count: 'exact', head: true })
  const duration = Date.now() - start
  if (error) {
    console.error('Error fetching count:', error)
  } else {
    console.log(`Success! Total outreach leads in DB: ${count}. Took ${duration}ms.`)
  }
}

run()
