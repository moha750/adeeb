(async () => {
  const sb = window.sbClient;
  const $ = (sel, root = document) => root.querySelector(sel);

  const obCard = $('#obCard');
  const obGate = $('#obGate');
  const obForm = $('#obForm');
  const fullName = $('#fullName');
  const password = $('#password');
  const avatarFile = $('#avatarFile');
  const avatarPreview = $('#avatarPreview');
  const avatarFileName = $('#avatarFileName');
  const statusEl = $('#status');
  const submitBtn = $('#submitBtn');

  function setStatus(type, msg) {
    if (!statusEl) return;
    statusEl.className = type ? `alert ${type}` : 'muted';
    statusEl.textContent = msg || '';
  }

  function humanFileSize(bytes) {
    if (!bytes && bytes !== 0) return '';
    const thresh = 1024;
    if (Math.abs(bytes) < thresh) return bytes + ' B';
    const units = ['KB','MB','GB','TB'];
    let u = -1;
    do { bytes /= thresh; ++u; } while (Math.abs(bytes) >= thresh && u < units.length - 1);
    return bytes.toFixed(1)+' '+units[u];
  }

  function getExtFromName(name, fallback = 'jpg') {
    const m = /\.([a-zA-Z0-9]+)$/.exec(name || '');
    return (m && m[1]) ? m[1].toLowerCase() : fallback;
  }

  function previewAvatar(file) {
    if (!file) { avatarPreview.src = ''; avatarFileName.textContent = ''; return; }
    const url = URL.createObjectURL(file);
    avatarPreview.src = url;
    avatarFileName.textContent = `${file.name} • ${humanFileSize(file.size)}`;
  }

  avatarFile?.addEventListener('change', () => {
    const f = avatarFile.files && avatarFile.files[0];
    previewAvatar(f || null);
  });

  async function ensureSession() {
    if (!sb) return null;
    const { data: { session } } = await sb.auth.getSession();
    return session || null;
  }

  async function uploadAvatarIfAny(userId) {
    const f = avatarFile?.files?.[0];
    if (!sb || !f) return null;
    const ext = getExtFromName(f.name, 'jpg');
    const path = `avatars/${userId}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await sb.storage.from('avatars').upload(path, f, {
      cacheControl: '3600',
      upsert: true,
    });
    if (upErr) throw upErr;
    const { data: pub } = sb.storage.from('avatars').getPublicUrl(path);
    return pub?.publicUrl || null;
  }

  async function init() {
    if (!sb) {
      obGate.hidden = false;
      return;
    }
    try {
      const session = await ensureSession();
      if (!session) {
        obGate.hidden = false;
        return;
      }
      // Have session -> show form and prefill name from metadata/email
      const md = session.user?.user_metadata || {};
      fullName.value = md.display_name || '';
      if (!avatarPreview.src) {
        const avatar = md.avatar_url || '';
        if (avatar) avatarPreview.src = avatar;
      }
      obCard.hidden = false;
    } catch {
      obGate.hidden = false;
    }
  }

  async function isAdmin() {
    try {
      const { data: { session } } = await sb.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) return false;
      const { data, error } = await sb.from('admins').select('user_id,is_admin').eq('user_id', uid).eq('is_admin', true).maybeSingle();
      if (error || !data) return false;
      return !!data.is_admin;
    } catch { return false; }
  }

  async function handleSubmit(e) {
    e?.preventDefault?.();
    if (!sb) return;
    const name = fullName.value.trim();
    const pwd = password.value;
    if (!name || !pwd) {
      setStatus('error', 'يرجى تعبئة الاسم وكلمة المرور');
      return;
    }
    submitBtn.disabled = true;
    setStatus('', 'جارٍ الحفظ...');
    try {
      const { data: { session } } = await sb.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) { setStatus('error', 'انتهت الجلسة. افتح رابط الدعوة من جديد.'); submitBtn.disabled = false; return; }

      // Upload avatar if chosen
      let avatarUrl = null;
      try { avatarUrl = await uploadAvatarIfAny(uid); } catch (e) {
        // Non-fatal: continue without avatar
        console.warn('avatar upload failed', e);
      }

      // Update user profile: password + metadata
      const meta = { display_name: name };
      if (avatarUrl) meta.avatar_url = avatarUrl;
      const { error: updErr } = await sb.auth.updateUser({ password: pwd, data: meta });
      if (updErr) throw updErr;

      // Decide destination
      const admin = await isAdmin();
      const dest = admin ? 'admin.html' : '../blogger/dashboard.html';
      setStatus('success', 'تم حفظ البيانات. سيتم تحويلك الآن...');
      setTimeout(() => { location.replace(dest); }, 600);
    } catch (err) {
      setStatus('error', 'فشل الحفظ: ' + (err?.message || 'غير معروف'));
      submitBtn.disabled = false;
    }
  }

  submitBtn?.addEventListener('click', handleSubmit);
  obForm?.addEventListener('submit', handleSubmit);

  await init();
})();
