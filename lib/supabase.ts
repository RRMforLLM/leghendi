import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hmrvdkweceanxnuyuorq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtcnZka3dlY2VhbnhudXl1b3JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgwODI5NDgsImV4cCI6MjA1MzY1ODk0OH0.9oruuZ_GEsF7IRsUZErVX9y-ZR6D1utV_8TsqEfSgHM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})