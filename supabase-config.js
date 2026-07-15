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

// مفردات member_details.academic_degree — المصدر الواحد لكل صفحات V1.
// القيمة رمز إنجليزيّ يحرسه القيد member_details_academic_degree_check في القاعدة، والتسمية عربيّة للعرض فقط.
// لا تُضِف قيمة هنا قبل توسيع القيد، ولا تكتب التسمية العربيّة في العمود — الكتابة بالرمز حصرًا.
window.ADEEB_DEGREES = [
  { value: 'high_school', label: 'ثانوية عامة' },
  { value: 'diploma',     label: 'دبلوم' },
  { value: 'bachelor',    label: 'بكالوريوس' },
  { value: 'master',      label: 'ماجستير' },
  { value: 'phd',         label: 'دكتوراه' },
  { value: 'other',       label: 'أخرى' },
];

// الرمز → التسمية؛ يرتدّ إلى الرمز الخام إن ورد ما ليس في المفردات (فلا يختفي الحقل صامتًا)
window.ADEEB_DEGREE_LABELS = Object.fromEntries(window.ADEEB_DEGREES.map((d) => [d.value, d.label]));
window.formatDegree = (v) => window.ADEEB_DEGREE_LABELS[v] || v;
