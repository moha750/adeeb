(async () => {
  const sb = window.sbClient;
  const statusEl = document.getElementById('status');
  const form = document.getElementById('onboardingForm');
  const fullName = document.getElementById('fullName');
  const password = document.getElementById('password');
  const avatarFile = document.getElementById('avatarFile');
  const avatarPreview = document.getElementById('avatarPreview');

  function setStatus(msg, kind = 'muted') {
    if (!statusEl) return;
    statusEl.className = kind === 'error' ? 'alert error' : (kind === 'success' ? 'alert success' : 'muted');
    statusEl.textContent = msg || '';
  }

  function extFromType(type, fallback = 'jpg') {
    if (!type) return fallback;
    if (type.includes('png')) return 'png';
    if (type.includes('webp')) return 'webp';
    if (type.includes('gif')) return 'gif';
    if (type.includes('svg')) return 'svg';
    return 'jpg';
  }

  async function ensureSession() {
    if (!sb) { setStatus('لم يتم تهيئة Supabase على الصفحة', 'error'); return null; }
    // detectSessionInUrl=true in supabase-config.js will pick tokens from URL
    const { data: { session } } = await sb.auth.getSession();
    if (session) return session;
    setStatus('جاري التحقق من الدعوة وتسجيل الدخول...', 'muted');
    return new Promise((resolve) => {
      const { data: sub } = sb.auth.onAuthStateChange(async (event, sess) => {
        if (event === 'SIGNED_IN' && sess) {
          setStatus('تم تسجيل الدخول بنجاح. يمكنك متابعة تعبئة البيانات.', 'success');
          sub.subscription.unsubscribe();
          resolve(sess);
        }
      });
      // Safety timeout
      setTimeout(async () => {
        const { data: { session: s2 } } = await sb.auth.getSession();
        if (s2) {
          setStatus('تم تسجيل الدخول بنجاح. يمكنك متابعة تعبئة البيانات.', 'success');
          sub.subscription.unsubscribe();
          resolve(s2);
        } else {
          setStatus('تعذر التحقق من الدعوة. افتح رابط الدعوة من بريدك مرة أخرى.', 'error');
          resolve(null);
        }
      }, 6000);
    });
  }

  // Avatar preview
  avatarFile?.addEventListener('change', () => {
    const f = avatarFile.files?.[0];
    if (!f) { avatarPreview.removeAttribute('src'); return; }
    const url = URL.createObjectURL(f);
    avatarPreview.src = url;
  });

  const session = await ensureSession();
  if (!session) return; // cannot proceed without auth

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!sb) return;
    const name = (fullName?.value || '').trim();
    const pass = (password?.value || '').trim();
    if (!name || !pass) { setStatus('الاسم وكلمة المرور حقول مطلوبة.', 'error'); return; }

    setStatus('جارٍ حفظ البيانات...', 'muted');
    try {
      const userId = session.user?.id;
      let avatarUrl = null;

      const file = avatarFile?.files?.[0] || null;
      if (file && userId) {
        const bucket = 'adeeb-site'; // reuse existing public bucket
        const ext = extFromType(file.type, 'jpg');
        const path = `avatars/${userId}/${Date.now()}.${ext}`;
        const { error: upErr } = await sb.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type || 'image/jpeg' });
        if (upErr) throw upErr;
        const { data } = sb.storage.from(bucket).getPublicUrl(path);
        avatarUrl = data.publicUrl || null;
      }

      const { data: upd, error: updErr } = await sb.auth.updateUser({
        password: pass,
        data: {
          display_name: name,
          avatar_url: avatarUrl || session.user?.user_metadata?.avatar_url || null,
        },
      });
      if (updErr) throw updErr;

      setStatus('تم الحفظ بنجاح. سيتم تحويلك الآن...', 'success');
      setTimeout(() => {
        location.replace('admin/admin.html');
      }, 800);
    } catch (err) {
      setStatus('فشل الحفظ: ' + (err?.message || 'غير معروف'), 'error');
    }
  });
})();
