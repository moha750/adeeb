// Supabase configuration
// Injected by Cascade per user-provided credentials
// Security note: anon key is public; write access controlled by RLS policies

const SUPABASE_URL = 'https://xniaivonejocibhspfhu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuaWFpdm9uZWpvY2liaHNwZmh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNDg4MjYsImV4cCI6MjA3MTYyNDgyNn0.3ejhi7bFSVB33ngCz1CvbXQNAJOhPL-krI-F8DMq9lk';

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
