// Supabase configuration
// Injected by Cascade per user-provided credentials
// Security note: anon key is public; write access controlled by RLS policies

const SUPABASE_URL = 'https://nnlhkfeybyhvlinbqqfa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ubGhrZmV5YnlodmxpbmJxcWZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1ODIyODcsImV4cCI6MjA4NDE1ODI4N30.VhQgdxHt6YOQu8IJ-eni6_9qIeua1ZM3hx8hVe3YgZg';

// Ensure supabase-js is loaded before this file
if (typeof window.supabase === 'undefined') {
  console.warn('Supabase library not loaded yet. Include supabase-js CDN before this file.');
}

window.sbClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'adeeb_blogger_auth',
      },
    })
  : null;

// Expose config for Edge Function calls
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
