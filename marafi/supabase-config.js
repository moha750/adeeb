// Supabase configuration
// Injected by Cascade per user-provided credentials
// Security note: anon key is public; write access controlled by RLS policies

const SUPABASE_URL = 'https://ydiqgsydlmyccizhfxac.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkaXFnc3lkbG15Y2NpemhmeGFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4ODM1NDIsImV4cCI6MjA3NjQ1OTU0Mn0.2cvs9wQvbpHmHN10iXzDny801W0PsM0uOo_Q9lgYZiU';

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
        storageKey: 'marafi_auth',
      },
    })
  : null;

// Expose config for Edge Function calls
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
