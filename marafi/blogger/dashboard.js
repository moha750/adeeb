(function() {
  const sb = window.sbClient;
  const alertBox = document.getElementById('alert');
  const userEmailEl = document.getElementById('userEmail');
  const logoutBtn = document.getElementById('logoutBtn');
  const logoutBtnSidebar = document.getElementById('logoutBtnSidebar');
  const toggleSidebarBtn = document.getElementById('toggleSidebar');
  const closeSidebarBtn = document.getElementById('closeSidebarBtn');
  const sidebar = document.getElementById('sidebar');
  const form = document.getElementById('postForm');
  const imageFileInput = document.getElementById('image_file');
  const imageUrlHidden = document.getElementById('image_url');
  const imagePreview = document.getElementById('image_preview');
  const titleInput = document.getElementById('title');
  const excerptInput = document.getElementById('excerpt');
  const titleCounter = document.getElementById('titleCounter');
  const excerptCounter = document.getElementById('excerptCounter');
  const TITLE_MAX = 50;
  const EXCERPT_MAX = 70;
  const myPosts = document.getElementById('myPosts');
  const myDrafts = document.getElementById('myDrafts');
  const myScheduled = document.getElementById('myScheduled');
  const viewBlogLink = document.querySelector('.admin-menu__footer a[href="../blog/blog.html"]');
  // Scheduling controls
  const scheduleAtInput = document.getElementById('schedule_at');
  const scheduleBtn = document.getElementById('scheduleBtn');
  // Profile elements
  const profileForm = document.getElementById('profileForm');
  const profileEmail = document.getElementById('profileEmail');
  const displayNameInput = document.getElementById('display_name');
  const avatarFileInput = document.getElementById('avatar_file');
  const profileMsg = document.getElementById('profileMsg');
  // Change password elements
  const changePasswordForm = document.getElementById('changePasswordForm');
  const currentPasswordInput = document.getElementById('current_password');
  const newPasswordInput = document.getElementById('new_password');
  const confirmPasswordInput = document.getElementById('confirm_password');
  const passwordMsg = document.getElementById('passwordMsg');
  const forgotPwdBtn = document.getElementById('forgotPwdBtn');
  // Change email elements
  const changeEmailForm = document.getElementById('changeEmailForm');
  const currentEmailDisplay = document.getElementById('current_email_display');
  const newEmailInput = document.getElementById('new_email');
  const currentPasswordForEmailInput = document.getElementById('current_password_email');
  const emailMsg = document.getElementById('emailMsg');
  // Activity log elements
  const activityList = document.getElementById('activityList');
  const activityMsg = document.getElementById('activityMsg');
  const refreshActivityBtn = document.getElementById('refreshActivityBtn');
  // Delete account elements
  const deleteAccountForm = document.getElementById('deleteAccountForm');
  const deletePasswordInput = document.getElementById('delete_password');
  const deleteMsg = document.getElementById('deleteMsg');
  const commentsAdminList = document.getElementById('commentsAdminList');
  const commentsAdminMsg = document.getElementById('commentsAdminMsg');
  const refreshCommentsAdminBtn = document.getElementById('refreshCommentsAdminBtn');
  const selectAllCommentsBtn = document.getElementById('selectAllCommentsBtn');
  const clearSelectedCommentsBtn = document.getElementById('clearSelectedCommentsBtn');
  const deleteSelectedCommentsBtn = document.getElementById('deleteSelectedCommentsBtn');
  const commentsSelectedMsg = document.getElementById('commentsSelectedMsg');
  let selectedCommentIds = new Set();
  const manageStatus = document.getElementById('manageStatus');
  const manageAllToggle = document.getElementById('manageAllToggle');
  const managePostsList = document.getElementById('managePostsList');
  const manageMsg = document.getElementById('manageMsg');
  const manageRefreshBtn = document.getElementById('manageRefreshBtn');
  

  // Unsaved changes modal elements
  const unsavedModal = document.getElementById('unsavedDraftModal');
  const unsavedSaveDraftBtn = document.getElementById('unsavedSaveDraftBtn');
  const unsavedDiscardBtn = document.getElementById('unsavedDiscardBtn');
  const unsavedCancelBtn = document.getElementById('unsavedCancelBtn');
  let isDirty = false;
  let programmaticUpdate = false;
  let pendingAction = null; // { type: 'tab'|'logout', payload }

  // User badge helpers
  function timeGreeting() {
    const h = new Date().getHours();
    return h < 12 ? 'صباح الخير' : 'مساء الخير';
  }

  function updateCounters() {
    try {
      if (titleInput && titleCounter) {
        const len = (titleInput.value || '').length;
        const ratio = len / TITLE_MAX;
        titleCounter.innerHTML = `عدد الحروف المسموح بها: <span class="counter-values"><span class="used">${len}</span><span class="sep">/</span><span class="total">${TITLE_MAX}</span></span>`;
        titleCounter.classList.remove('ok','warn','danger');
        if (len >= TITLE_MAX) titleCounter.classList.add('danger');
        else if (ratio >= 0.8) titleCounter.classList.add('warn');
        else titleCounter.classList.add('ok');
      }
      if (excerptInput && excerptCounter) {
        const len2 = (excerptInput.value || '').length;
        const ratio2 = len2 / EXCERPT_MAX;
        excerptCounter.innerHTML = `عدد الحروف المسموح بها: <span class="counter-values"><span class="used">${len2}</span><span class="sep">/</span><span class="total">${EXCERPT_MAX}</span></span>`;
        excerptCounter.classList.remove('ok','warn','danger');
        if (len2 >= EXCERPT_MAX) excerptCounter.classList.add('danger');
        else if (ratio2 >= 0.8) excerptCounter.classList.add('warn');
        else excerptCounter.classList.add('ok');
      }
    } catch {}
  }

  function clampInputs() {
    try {
      if (titleInput && titleInput.value && titleInput.value.length > TITLE_MAX) {
        titleInput.value = titleInput.value.slice(0, TITLE_MAX);
      }
      if (excerptInput && excerptInput.value && excerptInput.value.length > EXCERPT_MAX) {
        excerptInput.value = excerptInput.value.slice(0, EXCERPT_MAX);
      }
    } catch {}
  }

  async function loadAdminComments() {
    if (!isEditor || !commentsAdminList) return;
    try {
      if (commentsAdminMsg) commentsAdminMsg.textContent = 'جاري التحميل...';
      commentsAdminList.innerHTML = '';
      const { data: rows, error } = await sb
        .from('blog_comments')
        .select('id, post_id, user_id, author_name, author_avatar, body, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      const comments = Array.isArray(rows) ? rows : [];
      let postMap = new Map();
      try {
        const ids = Array.from(new Set(comments.map(c => c.post_id).filter(v => v != null)));
        if (ids.length) {
          const { data: posts } = await sb.from('blog_posts').select('id, title').in('id', ids);
          if (Array.isArray(posts)) postMap = new Map(posts.map(p => [p.id, p.title || '(بدون عنوان)']));
        }
      } catch {}
      comments.forEach(c => {
        const item = document.createElement('div');
        item.className = 'item';
        item.setAttribute('data-cid', c.id);
        if (selectedCommentIds.has(c.id)) item.classList.add('selected');
        const title = postMap.get(c.post_id) || '(بدون عنوان)';
        const dt = c.created_at ? new Date(c.created_at).toLocaleString('ar-SA') : '';
        const body = (c.body || '').toString();
        const excerpt = body.length > 180 ? body.slice(0, 177) + '…' : body;
        const postHref = `../blog/post.html?id=${encodeURIComponent(c.post_id)}`;
        const checked = selectedCommentIds.has(c.id) ? 'checked' : '';
        item.innerHTML = `
          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
            <div class="meta">
              <strong>${c.author_name || 'مجهول'}</strong>
              <div class="muted">${dt}</div>
            </div>
            <label style="display:inline-flex; align-items:center; gap:6px;">
              <input type="checkbox" class="comment-select" data-cid="${c.id}" ${checked} />
            </label>
          </div>
          <div class="meta">
            <div class="muted">${title}</div>
          </div>
          <div class="muted" style="margin:.25rem 0 .5rem">${excerpt.replace(/</g,'&lt;').replace(/\n/g,'<br>')}</div>
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap">
            <a class="btn" href="${postHref}" target="_blank" rel="noopener"><i class="fa-solid fa-up-right-from-square"></i> فتح التدوينة</a>
            <button class="btn btn-danger" data-action="delete-comment" data-cid="${c.id}"><i class="fa-solid fa-trash"></i> حذف</button>
          </div>
        `;
        commentsAdminList.appendChild(item);
      });
      if (commentsAdminMsg) commentsAdminMsg.textContent = comments.length ? '' : 'لا توجد تعليقات.';
      updateCommentsSelectionUI();
    } catch (e) {
      if (commentsAdminMsg) commentsAdminMsg.textContent = 'تعذر تحميل التعليقات: ' + (e?.message || '');
    }
  }

  async function deleteAdminComment(cid) {
    if (!isEditor) return false;
    const ok = confirm('حذف هذا التعليق؟');
    if (!ok) return false;
    try {
      const { error } = await sb.from('blog_comments').delete().eq('id', cid);
      if (error) throw error;
      try { await logActivity('comment_delete', { comment_id: cid }); } catch {}
      return true;
    } catch (e) {
      setAlert('تعذر حذف التعليق: ' + (e?.message || 'غير معروف'), true);
      return false;
    }
  }

  function updateCommentsSelectionUI() {
    try {
      const count = selectedCommentIds.size;
      if (commentsSelectedMsg) commentsSelectedMsg.textContent = count ? `تم تحديد ${count}` : '';
      if (deleteSelectedCommentsBtn) deleteSelectedCommentsBtn.disabled = count === 0;
      document.querySelectorAll('#commentsAdminList .item[data-cid]').forEach(el => {
        const id = el.getAttribute('data-cid');
        if (!id) return;
        if (selectedCommentIds.has(id)) el.classList.add('selected');
        else el.classList.remove('selected');
      });
    } catch {}
  }

  // Helpers: safely insert/update blog_posts with optional author_name
  async function safeInsertPost(payload) {
    // Attempt with author_name, then retry without if column not present
    let res = await sb.from('blog_posts').insert(payload).select();
    if (res?.error && shouldRetryWithoutAuthorName(res.error)) {
      const { author_name, ...rest } = payload || {};
      res = await sb.from('blog_posts').insert(rest).select();
    }
    return res;
  }

  async function safeUpdatePost(id, payload) {
    let res = await sb.from('blog_posts').update(payload).eq('id', id).select();
    if (res?.error && shouldRetryWithoutAuthorName(res.error)) {
      const { author_name, ...rest } = payload || {};
      res = await sb.from('blog_posts').update(rest).eq('id', id).select();
    }
    return res;
  }

  function shouldRetryWithoutAuthorName(error) {
    const msg = (error?.message || '').toLowerCase();
    // Covers common PostgREST / Postgres messages when a column is missing
    return msg.includes('author_name') || msg.includes('column') || msg.includes('does not exist');
  }

  // دالة لعرض الصورة الرمزية في قسم الملف الشخصي ومعاينة الاسم
  function updateProfileAvatarPreview() {
    const preview = document.getElementById('avatarPreview');
    const userName = document.getElementById('profileUserName');
    if (!currentUser || !preview || !userName) return;
    const md = currentUser.user_metadata || {};
    const name = md.display_name || md.name || currentUser.email || 'مستخدم';
    const avatarUrl = md.avatar_url && String(md.avatar_url).trim() ? md.avatar_url : null;
    // تحديث الاسم
    userName.textContent = name;
    // تحديث الصورة
    if (avatarUrl) {
      preview.innerHTML = `<img src="${avatarUrl}" alt="${name}" onerror="this.remove()" />`;
    } else {
      preview.innerHTML = `
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill="#cbd5e1"/>
          <circle cx="12" cy="10" r="3.2" fill="#64748b"/>
          <path d="M5.5 18.2c1.9-3 5-4.2 6.5-4.2s4.6 1.2 6.5 4.2c-2.1 1.7-4.6 2.8-6.5 2.8s-4.4-1.1-6.5-2.8z" fill="#64748b"/>
        </svg>
      `;
    }
  }

  // Helper: upload selected avatar file to Supabase Storage and return public URL
  async function uploadAvatarFile(user) {
    const file = avatarFileInput?.files && avatarFileInput.files[0];
    if (!file) return null; // nothing to upload
    const bucket = 'avatars';
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const safeExt = ext.replace(/[^a-z0-9]/gi, '') || 'jpg';
    const path = `${user.id}/avatar-${Date.now()}-${Math.random().toString(36).slice(2,8)}.${safeExt}`;
    const { error: upErr } = await sb.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (upErr) throw upErr;
    const { data } = sb.storage.from(bucket).getPublicUrl(path);
    const publicUrl = data?.publicUrl;
    if (!publicUrl) throw new Error('تعذر الحصول على رابط الصورة');
    return publicUrl;
  }

  // Handle forgot password (send reset email)
  forgotPwdBtn?.addEventListener('click', async () => {
    if (!currentUser || !currentUser.email) {
      if (passwordMsg) passwordMsg.textContent = 'لا يمكن إرسال رابط الاستعادة بدون بريد إلكتروني.';
      return;
    }
    if (passwordMsg) passwordMsg.textContent = '';
    const btn = forgotPwdBtn;
    btn.disabled = true;
    btn.style.opacity = .7;
    try {
      const redirectTo = new URL('/marafi/blogger/reset-password.html', location.origin).href;
      const { error } = await sb.auth.resetPasswordForEmail(currentUser.email, { redirectTo });
      if (error) throw error;
      if (passwordMsg) passwordMsg.textContent = 'تم إرسال رسالة استعادة كلمة المرور إلى بريدك الإلكتروني.';
      logActivity('password_reset_request');
    } catch (err) {
      if (passwordMsg) passwordMsg.textContent = 'تعذر إرسال رسالة الاستعادة: ' + (err?.message || 'غير معروف');
    } finally {
      btn.disabled = false;
      btn.style.opacity = 1;
    }
  });

  // تحديث معاينة الصورة الرمزية عند اختيار ملف جديد في "ملفي"
  avatarFileInput?.addEventListener('change', function() {
    const file = this.files && this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      const preview = document.getElementById('avatarPreview');
      if (preview) {
        preview.innerHTML = `<img src="${e.target.result}" alt="معاينة الصورة" />`;
      }
    };
    reader.readAsDataURL(file);
  });

  // Handle change password (placed after function closes)
  changePasswordForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    if (passwordMsg) passwordMsg.textContent = '';
    const curr = (currentPasswordInput?.value || '').trim();
    const next = (newPasswordInput?.value || '').trim();
    const conf = (confirmPasswordInput?.value || '').trim();
    if (!curr || !next || !conf) return;
    if (next !== conf) {
      if (passwordMsg) passwordMsg.textContent = 'كلمتا المرور غير متطابقتين';
      return;
    }
    if (next.length < 6) {
      if (passwordMsg) passwordMsg.textContent = 'الحد الأدنى لطول كلمة المرور هو 6 أحرف';
      return;
    }
    const btn = changePasswordForm.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.style.opacity = .7; }
    try {
      // Re-authenticate with current password
      const { error: signInErr } = await sb.auth.signInWithPassword({ email: currentUser.email, password: curr });
      if (signInErr) throw new Error('كلمة المرور الحالية غير صحيحة');
      // Update password
      const { error: updErr } = await sb.auth.updateUser({ password: next });
      if (updErr) throw updErr;
      if (passwordMsg) passwordMsg.textContent = 'تم تغيير كلمة المرور بنجاح. سيتم تسجيل الخروج...';
      try { await logActivity('password_change'); } catch {}
      // Clear inputs
      try {
        currentPasswordInput && (currentPasswordInput.value = '');
        newPasswordInput && (newPasswordInput.value = '');
        confirmPasswordInput && (confirmPasswordInput.value = '');
      } catch {}
      // Sign out to require re-login with new password
      try { await sb.auth.signOut(); } catch {}
      location.replace('/marafi/blogger/login.html?redirect=/marafi/blogger/dashboard.html');
    } catch (err) {
      if (passwordMsg) passwordMsg.textContent = 'تعذر تغيير كلمة المرور: ' + (err?.message || 'غير معروف');
    } finally {
      if (btn) { btn.disabled = false; btn.style.opacity = 1; }
    }
  });

  // Handle change email
  changeEmailForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    if (emailMsg) emailMsg.textContent = '';
    const newEmail = (newEmailInput?.value || '').trim();
    const currPwd = (currentPasswordForEmailInput?.value || '').trim();
    if (!newEmail || !currPwd) return;
    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      if (emailMsg) emailMsg.textContent = 'الرجاء إدخال بريد إلكتروني صالح';
      return;
    }
    const btn = changeEmailForm.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.style.opacity = .7; }
    try {
      // Re-authenticate with current password
      const { error: signInErr } = await sb.auth.signInWithPassword({ email: currentUser.email, password: currPwd });
      if (signInErr) throw new Error('كلمة المرور الحالية غير صحيحة');
      // Update email with redirect
      const redirectTo = new URL('/marafi/blogger/login.html', location.origin).href;
      const { error: updErr } = await sb.auth.updateUser({ email: newEmail }, { emailRedirectTo: redirectTo });
      if (updErr) throw updErr;
      if (emailMsg) emailMsg.textContent = 'تم إرسال رسالة تأكيد إلى بريدك الجديد. الرجاء فتح الرابط لتأكيد التغيير.';
      try { await logActivity('email_change', { new_email: newEmail }); } catch {}
      try { if (currentPasswordForEmailInput) currentPasswordForEmailInput.value = ''; } catch {}
    } catch (err) {
      if (emailMsg) emailMsg.textContent = 'تعذر تغيير البريد: ' + (err?.message || 'غير معروف');
    } finally {
      if (btn) { btn.disabled = false; btn.style.opacity = 1; }
    }
  });

  // Clear editor if a post is loaded and no changes were made
  function clearEditorIfPristine() {
    try {
      const editorSection = document.querySelector('#section-editor');
      const isEditorVisible = editorSection && editorSection.hidden === false;
      const postIdVal = document.getElementById('postId')?.value || '';
      if (isEditorVisible && postIdVal && !isDirty) {
        clearForm();
      }
    } catch {}
  }

  // Image preview on file select
  imageFileInput?.addEventListener('change', () => {
    const file = imageFileInput.files && imageFileInput.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      if (imagePreview) {
        imagePreview.src = url;
        imagePreview.style.display = 'block';
      }
      // Do not set imageUrlHidden yet; set after upload
      if (!programmaticUpdate) isDirty = true;
    }
  });
  function renderUserBadge(user) {
    const host = document.getElementById('bloggerUserBadge');
    if (!host) return;
    if (!user) { host.innerHTML = ''; return; }
    const md = user.user_metadata || {};
    const name = md.display_name || md.name || user.email || 'مستخدم';
    const avatarUrl = md.avatar_url && String(md.avatar_url).trim() ? md.avatar_url : null;
    const svg = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="#cbd5e1"/>
        <circle cx="12" cy="10" r="3.2" fill="#64748b"/>
        <path d="M5.5 18.2c1.9-3 5-4.2 6.5-4.2s4.6 1.2 6.5 4.2c-2.1 1.7-4.6 2.8-6.5 2.8s-4.4-1.1-6.5-2.8z" fill="#64748b"/>
      </svg>`;
    host.innerHTML = `
      <div class="avatar">${avatarUrl ? `<img src="${avatarUrl}" alt="${name}" onerror="this.remove()" />` : svg}</div>
      <div class="meta">
        <span class="greet">${timeGreeting()}</span>
        <strong class="name">${name}</strong>
      </div>`;
  }

  function setAlert(text, isError = false) {
    if (!alertBox) return;
    alertBox.textContent = text || '';
    alertBox.className = isError ? 'alert error' : text ? 'alert' : 'muted';
  }

  // --- Activity log helpers ---
  async function logActivity(type, metadata) {
    try {
      if (!currentUser) return;
      await sb.from('activity_logs').insert({
        user_id: currentUser.id,
        email: currentUser.email,
        type,
        metadata: metadata || null,
      });
    } catch (_) {
      // ignore logging errors silently
    }
  }

  function iconForType(type) {
    switch (type) {
      case 'register': return 'fa-user-plus';
      case 'login': return 'fa-right-to-bracket';
      case 'logout': return 'fa-right-from-bracket';
      case 'password_reset_request': return 'fa-envelope-open-text';
      case 'password_change': return 'fa-key';
      case 'email_change': return 'fa-at';
      case 'profile_update': return 'fa-id-card';
      case 'post_create': return 'fa-file-circle-plus';
      case 'post_update': return 'fa-pen-to-square';
      case 'post_schedule': return 'fa-calendar-plus';
      case 'post_publish': return 'fa-bullhorn';
      case 'post_delete': return 'fa-trash';
      case 'comment_delete': return 'fa-comment-slash';
      case 'account_delete': return 'fa-user-xmark';
      default: return 'fa-clock';
    }
  }

  function titleForType(type) {
    switch (type) {
      case 'register': return 'تسجيل حساب جديد';
      case 'login': return 'تسجيل دخول';
      case 'logout': return 'تسجيل خروج';
      case 'password_reset_request': return 'طلب استعادة كلمة المرور';
      case 'password_change': return 'تغيير كلمة المرور';
      case 'email_change': return 'تغيير البريد الإلكتروني';
      case 'profile_update': return 'تحديث الملف الشخصي';
      case 'post_create': return 'إنشاء تدوينة';
      case 'post_update': return 'تعديل تدوينة';
      case 'post_schedule': return 'جدولة تدوينة';
      case 'post_publish': return 'نشر تدوينة';
      case 'post_delete': return 'حذف تدوينة';
      case 'comment_delete': return 'حذف تعليق';
      case 'account_delete': return 'حذف الحساب نهائيًا';
      default: return 'حدث';
    }
  }

  // Migrate legacy user_metadata.name -> display_name if needed
  async function migrateNameToDisplayNameIfNeeded() {
    try {
      if (!currentUser) return;
      const md = currentUser.user_metadata || {};
      const hasDisplay = !!(md.display_name && String(md.display_name).trim());
      const hasName = !!(md.name && String(md.name).trim());
      if (!hasDisplay && hasName) {
        await sb.auth.updateUser({ data: { display_name: md.name } });
        try {
          const { data: { user } } = await sb.auth.getUser();
          if (user) currentUser = user;
        } catch {}
      }
    } catch {}
  }

  async function loadMyActivity() {
    if (!currentUser || !activityList) return;
    try {
      activityMsg && (activityMsg.textContent = 'جاري التحميل...');
      activityList.innerHTML = '';
      const { data, error } = await sb
        .from('activity_logs')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      (data || []).forEach((row) => {
        const li = document.createElement('li');
        li.className = 'item';
        const when = row.created_at ? new Date(row.created_at).toLocaleString('ar-SA') : '';
        const t = row.type || 'event';
        const meta = row.metadata || {};
        const subtitle = meta && (meta.status || meta.new_email || meta.post_id) ? JSON.stringify(meta) : '';
        li.innerHTML = `
          <div style="display:flex; gap:8px; align-items:center; width:100%">
            <i class="fa-solid ${iconForType(t)}" aria-hidden="true"></i>
            <div style="flex:1">
              <div><strong>${titleForType(t)}</strong></div>
              ${subtitle ? `<div class="muted" style="font-size:.9em; direction:ltr">${subtitle}</div>` : ''}
            </div>
            ${when ? `<span class="badge">${when}</span>` : ''}
          </div>
        `;
        activityList.appendChild(li);
      });
      activityMsg && (activityMsg.textContent = (data && data.length) ? '' : 'لا يوجد نشاط بعد.');
    } catch (e) {
      activityMsg && (activityMsg.textContent = 'تعذر تحميل السجل: ' + (e?.message || 'غير معروف'));
    }
  }

  if (!sb) {
    setAlert('Supabase غير مفعّل. تأكد من إعداد المفاتيح.', true);
    return;
  }

  let currentUser = null;
  
  // Rich Text Editor Variables
  let richEditor = null;
  let markdownEditor = null; // legacy ref now points to hidden #content input
  let previewPane = null;
  let editorMode = 'rich'; // 'rich', 'preview'
  let undoStack = [];
  let redoStack = [];
  const MAX_UNDO_STACK = 50;
  let isEditor = false;

  async function ensureAuth() {
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) {
        const redirect = new URL('/marafi/blogger/login.html', location.origin);
        redirect.searchParams.set('redirect', '/marafi/blogger/dashboard.html');
        location.replace(redirect.href);
        return false;
      }
      currentUser = session.user;
      // Avoid crashing if #userEmail doesn't exist in the DOM
      if (userEmailEl) userEmailEl.textContent = currentUser?.email || '';
      renderUserBadge(currentUser);
      // Refresh user to ensure latest metadata (e.g., display_name) after updates
      try {
        const { data: { user } } = await sb.auth.getUser();
        if (user) {
          currentUser = user;
          if (userEmailEl) userEmailEl.textContent = currentUser?.email || '';
          renderUserBadge(currentUser);
        }
      } catch {}
      // Migrate legacy name -> display_name if needed, then re-render
      try { await migrateNameToDisplayNameIfNeeded(); renderUserBadge(currentUser); updateProfileAvatarPreview(); } catch {}
      // Optional: enforce blogger role
      const role = currentUser?.user_metadata?.role;
      isEditor = role === 'editor';
      if (!role) {
        try { await sb.auth.updateUser({ data: { role: 'blogger' } }); } catch {}
      } else if (role !== 'blogger' && role !== 'editor') {
        setAlert('حسابك ليس مدونًا. قد لا يُسمح لك بالنشر.', true);
      }
      try {
        const cmItem = document.querySelector('.admin-menu a[href="#section-comments"]');
        const cmSec = document.getElementById('section-comments');
        const show = !!isEditor;
        if (cmItem) cmItem.style.display = show ? '' : 'none';
        if (cmSec) cmSec.hidden = true;
        try {
          const manageAll = document.getElementById('manageAllToggle');
          if (manageAll && manageAll.closest) {
            const lab = manageAll.closest('label');
            if (lab) lab.style.display = isEditor ? '' : 'none';
          }
        } catch {}
      } catch {}
      return true;
    } catch (e) {
      setAlert('تعذر التحقق من الجلسة: ' + (e?.message || 'غير معروف'), true);
      return false;
    }
  }

  // Load current user data into profile form
  function loadProfileIntoForm() {
    if (!currentUser || !profileForm) return;
    profileEmail && (profileEmail.value = currentUser.email || '');
    currentEmailDisplay && (currentEmailDisplay.value = currentUser.email || '');
    const md = currentUser.user_metadata || {};
    if (displayNameInput) displayNameInput.value = md.display_name || md.name || '';
    // تحديث المعاينة (الاسم/الصورة)
    updateProfileAvatarPreview();
  }

  // Save profile changes (display name + avatar upload)
  profileForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    profileMsg && (profileMsg.textContent = '');
    const payload = {
      display_name: (displayNameInput?.value || '').trim() || null,
      role: 'blogger',
    };
    // Mirror legacy `name` for backward compatibility
    payload.name = payload.display_name;
    // Keep existing avatar unless a new file is uploaded
    let avatarUrl = currentUser?.user_metadata?.avatar_url || null;
    try {
      const newUrl = await uploadAvatarFile(currentUser);
      if (newUrl) avatarUrl = newUrl;
    } catch (upErr) {
      profileMsg && (profileMsg.textContent = 'فشل رفع الصورة: ' + (upErr?.message || 'غير معروف'));
      return;
    }
    payload.avatar_url = avatarUrl;
    const btn = profileForm.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.style.opacity = .7; }
    try {
      const { error } = await sb.auth.updateUser({ data: payload });
      if (error) throw error;
      profileMsg && (profileMsg.textContent = 'تم حفظ الملف بنجاح');
      try { await logActivity('profile_update', { display_name: payload.display_name || null, avatar_changed: !!(avatarFileInput && avatarFileInput.files && avatarFileInput.files.length) }); } catch {}
      // refresh currentUser metadata
      try {
        const { data: { user } } = await sb.auth.getUser();
        if (user) currentUser = user;
        renderUserBadge(currentUser);
      } catch {}
      // تحديث معاينة الصورة والاسم بعد الحفظ
      updateProfileAvatarPreview();
      // clear file input after successful save
      if (avatarFileInput) avatarFileInput.value = '';
    } catch (err) {
      profileMsg && (profileMsg.textContent = 'تعذر الحفظ: ' + (err?.message || 'غير معروف'));
    } finally {
      if (btn) { btn.disabled = false; btn.style.opacity = 1; }
    }
  });

  function switchToEditor() {
    // Activate editor section and show it
    const link = document.querySelector('.admin-menu__item[href="#section-editor"]');
    document.querySelectorAll('.admin-menu__item').forEach((l) => l.classList.remove('active'));
    link && link.classList.add('active');
    document.querySelectorAll('.admin-section').forEach((sec) => (sec.hidden = true));
    const target = document.querySelector('#section-editor');
    if (target) target.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (isMobile()) closeSidebar();
  }

  

  // --- Unsaved modal helpers ---
  function showUnsavedModal(action) {
    pendingAction = action || null;
    if (unsavedModal) unsavedModal.hidden = false;
  }
  function hideUnsavedModal() {
    pendingAction = null;
    if (unsavedModal) unsavedModal.hidden = true;
  }
  unsavedCancelBtn?.addEventListener('click', hideUnsavedModal);
  unsavedModal?.querySelector('.modal__backdrop')?.addEventListener('click', hideUnsavedModal);

  async function saveAsDraftFromEditor() {
    if (!currentUser || !form) return;
    const id = document.getElementById('postId').value;
    // Upload image if a new file is selected
    let uploadedUrl = null;
    try {
      uploadedUrl = await uploadSelectedImage(currentUser);
    } catch (e) {
      setAlert('فشل رفع الصورة: ' + (e?.message || 'غير معروف'), true);
      return;
    }
    // parse categories from input (supports Arabic and English commas)
    const catsRaw = (document.getElementById('categories')?.value || '').trim();
    const categories = catsRaw ? catsRaw.split(/[،,]/).map(s => s.trim()).filter(Boolean) : null;
    const payload = {
      title: (document.getElementById('title').value || '').trim(),
      image_url: (uploadedUrl || document.getElementById('image_url').value.trim() || null),
      status: 'draft',
      excerpt: (document.getElementById('excerpt').value || ''),
      categories,
      content: sanitizeHTML(document.getElementById('content').value),
      author: currentUser.email,
      author_name: (currentUser.user_metadata?.display_name || currentUser.user_metadata?.name || currentUser.email),
    };
    try { payload.user_id = currentUser.id; } catch {}
    if (id) {
      const { error } = await sb.from('blog_posts').update(payload).eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await sb.from('blog_posts').insert(payload);
      if (error) throw error;
    }
    setAlert('تم حفظ المسودة');
    isDirty = false;
    try { clearForm(); } catch {}
    await loadMyDrafts();
  }

  function performPendingAction() {
    const act = pendingAction; // copy
    hideUnsavedModal();
    if (!act) return;
    if (act.type === 'tab') {
      const id = act.payload;
      // Before switching away, clear editor if nothing changed
      clearEditorIfPristine();
      // switch to tab (same logic as click handler)
      document.querySelectorAll('.admin-menu__item').forEach((l) => l.classList.remove('active'));
      const link = document.querySelector(`.admin-menu__item[href="${id}"]`);
      link && link.classList.add('active');
      document.querySelectorAll('.admin-section').forEach((sec) => (sec.hidden = true));
      const target = document.querySelector(id);
      if (target) target.hidden = false;
      if (id === '#section-drafts') {
        loadMyDrafts();
      }
      if (id === '#section-scheduled') {
        loadMyScheduled();
      }
      if (id === '#section-manage') {
        loadManagePosts();
      }
      if (id === '#section-profile') {
        loadProfileIntoForm();
        loadMyActivity();
      }
      if (isMobile()) closeSidebar();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (act.type === 'logout') {
      // proceed with logout
      (async () => {
        try { try { await logActivity('logout'); } catch {} await sb.auth.signOut(); } catch {}
        location.replace('/marafi/blogger/login.html?redirect=/marafi/blogger/dashboard.html');
      })();
    } else if (act.type === 'external') {
      const { href, target } = act.payload || {};
      if (!href) return;
      if (target === '_blank') {
        window.open(href, '_blank');
      } else {
        location.href = href;
      }
    }
  }

  unsavedSaveDraftBtn?.addEventListener('click', async () => {
    try {
      await saveAsDraftFromEditor();
      performPendingAction();
    } catch (e) {
      setAlert('تعذر حفظ المسودة: ' + (e?.message || 'غير معروف'), true);
    }
  });
  unsavedDiscardBtn?.addEventListener('click', () => {
    isDirty = false;
    // Clear the editor form when discarding changes
    try { clearForm(); } catch {}
    performPendingAction();
  });

  logoutBtn?.addEventListener('click', async () => {
    if (isDirty) {
      showUnsavedModal({ type: 'logout' });
      return;
    }
    // Clean editor if a draft was opened but unchanged
    clearEditorIfPristine();
    try { try { await logActivity('logout'); } catch {} await sb.auth.signOut(); } catch {}
    location.replace('/marafi/blogger/login.html?redirect=/marafi/blogger/dashboard.html');
  });

  // Sidebar logout
  logoutBtnSidebar?.addEventListener('click', async () => {
    if (isDirty) {
      showUnsavedModal({ type: 'logout' });
      return;
    }
    // Clean editor if a draft was opened but unchanged
    clearEditorIfPristine();
    try { try { await logActivity('logout'); } catch {} await sb.auth.signOut(); } catch {}
    location.replace('/marafi/blogger/login.html?redirect=/marafi/blogger/dashboard.html');
  });

  // Sidebar slider (mobile) + tabs
  const sidebarBackdrop = document.createElement('div');
  sidebarBackdrop.className = 'sidebar-backdrop';
  document.body.appendChild(sidebarBackdrop);

  const isMobile = () => window.matchMedia('(max-width: 992px)').matches;
  function openSidebar() {
    if (!sidebar) return;
    sidebar.classList.add('open');
    if (isMobile()) {
      sidebarBackdrop.classList.add('show');
      document.body.classList.add('no-scroll');
    }
  }
  function closeSidebar() {
    if (!sidebar) return;
    sidebar.classList.remove('open');
    sidebarBackdrop.classList.remove('show');
    document.body.classList.remove('no-scroll');
  }
  function toggleSidebar() {
    if (!sidebar) return;
    if (sidebar.classList.contains('open')) closeSidebar();
    else openSidebar();
  }
  toggleSidebarBtn?.addEventListener('click', toggleSidebar);
  closeSidebarBtn?.addEventListener('click', closeSidebar);
  sidebarBackdrop.addEventListener('click', closeSidebar);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSidebar(); });
  window.addEventListener('resize', () => { if (!isMobile()) closeSidebar(); });

  // Tabs navigation
  document.querySelectorAll('.admin-menu__item').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const id = link.getAttribute('href');
      if (!id) return;
      if (isDirty) {
        showUnsavedModal({ type: 'tab', payload: id });
        return;
      }
      // If leaving editor without any changes, clean it up
      clearEditorIfPristine();
      document.querySelectorAll('.admin-menu__item').forEach((l) => l.classList.remove('active'));
      link.classList.add('active');
      document.querySelectorAll('.admin-section').forEach((sec) => (sec.hidden = true));
      const target = document.querySelector(id);
      if (target) target.hidden = false;
      // Lazy refresh drafts when entering the tab
      if (id === '#section-drafts') {
        loadMyDrafts();
      }
      if (id === '#section-scheduled') {
        loadMyScheduled();
      }
      if (id === '#section-manage') {
        loadManagePosts();
      }
      if (id === '#section-profile') {
        loadProfileIntoForm();
        loadMyActivity();
      }
      if (id === '#section-comments') {
        loadAdminComments();
      }
      if (isMobile()) closeSidebar();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  function card(post) {
    const el = document.createElement('div');
    el.className = 'item';
    const now = new Date();
    const isScheduled = post.status === 'published' && post.published_at && new Date(post.published_at) > now;
    const dateStr = post.published_at ? new Date(post.published_at).toLocaleString('ar-SA') : '';
    const statusClass = isScheduled ? 'status-scheduled' : (post.status === 'published' ? 'status-published' : 'status-draft');
    const statusLabel = isScheduled ? 'scheduled' : (post.status || 'draft');
    const canDelete = (function() {
      try {
        const byUserId = post.user_id && currentUser && post.user_id === currentUser.id;
        const byEmail = post.author && currentUser && post.author === currentUser.email;
        return !!(byUserId || byEmail || isEditor);
      } catch { return !!isEditor; }
    })();
    el.innerHTML = `
      <div class="meta">
        <strong>${post.title || '(بدون عنوان)'}</strong>
        
        <div style="display:flex; gap:6px; align-items:center">
          <span class="badge ${statusClass}">${statusLabel}</span>
          ${dateStr ? `<span class="badge">${dateStr}</span>` : ''}
        </div>
      </div>
      <div style="display:flex; gap:6px">
        ${post.status === 'draft' || isScheduled ? '<button class="btn btn-primary" data-action="quick-publish" title="نشر الآن"><i class="fa-solid fa-bullhorn"></i></button>' : ''}
        ${post.status === 'draft' ? '<button class="btn" data-action="schedule" title="جدولة"><i class="fa-regular fa-calendar"></i></button>' : ''}
        ${isScheduled ? '<button class="btn" data-action="unschedule" title="إلغاء الجدولة"><i class="fa-regular fa-calendar-xmark"></i></button>' : ''}
        <button class="btn" data-action="edit"><i class="fa-solid fa-pen"></i></button>
        ${canDelete ? '<button class="btn btn-danger" data-action="delete"><i class="fa-solid fa-trash"></i></button>' : ''}
      </div>
    `;
    el.querySelector('[data-action="edit"]').addEventListener('click', () => {
      fillForm(post);
      switchToEditor();
    });
    const quickBtn = el.querySelector('[data-action="quick-publish"]');
    if (quickBtn) {
      quickBtn.addEventListener('click', async () => {
        if (!confirm('نشر الآن؟')) return;
        try {
          const authorName = (currentUser?.user_metadata?.display_name || currentUser?.user_metadata?.name || currentUser?.email);
          const payload = { status: 'published', published_at: new Date().toISOString(), author_name: authorName };
          const { error } = await safeUpdatePost(post.id, payload);
          if (error) throw error;
          setAlert('تم نشر المسودة بنجاح');
          try { await logActivity('post_publish', { post_id: post.id }); } catch {}
          await loadMyDrafts();
          await loadMyPosts();
          await loadMyScheduled();
        } catch (e) {
          setAlert('تعذر النشر: ' + (e?.message || 'غير معروف'), true);
        }
      });
    }
    // Schedule from draft card
    const scheduleBtnEl = el.querySelector('[data-action="schedule"]');
    if (scheduleBtnEl) {
      scheduleBtnEl.addEventListener('click', async () => {
        try {
          let whenStr = '';
          if (typeof Swal !== 'undefined') {
            const result = await Swal.fire({
              title: 'جدولة النشر',
              html: '<input id="dtPick" type="datetime-local" class="swal2-input" />',
              focusConfirm: false,
              showCancelButton: true,
              confirmButtonText: 'جدولة',
              cancelButtonText: 'إلغاء',
              preConfirm: () => document.getElementById('dtPick').value
            });
            if (!result.isConfirmed) return;
            whenStr = result.value || '';
          } else {
            whenStr = prompt('أدخل تاريخ ووقت النشر (YYYY-MM-DDTHH:MM)');
            if (!whenStr) return;
          }
          const when = new Date(whenStr);
          if (isNaN(when.getTime())) { setAlert('تاريخ غير صالح', true); return; }
          const authorName = (currentUser?.user_metadata?.display_name || currentUser?.user_metadata?.name || currentUser?.email);
          const payload = { status: 'published', published_at: when.toISOString(), author_name: authorName };
          const { error } = await safeUpdatePost(post.id, payload);
          if (error) throw error;
          setAlert('تمت الجدولة بنجاح');
          try { await logActivity('post_schedule', { post_id: post.id, when: payload.published_at }); } catch {}
          await loadMyDrafts();
          await loadMyScheduled();
        } catch (e) {
          setAlert('تعذر الجدولة: ' + (e?.message || 'غير معروف'), true);
        }
      });
    }
    const unsBtn = el.querySelector('[data-action="unschedule"]');
    if (unsBtn) {
      unsBtn.addEventListener('click', async () => {
        if (!confirm('إلغاء الجدولة وإرجاعها لمسودة؟')) return;
        try {
          const { error } = await sb.from('blog_posts').update({ status: 'draft' }).eq('id', post.id);
          if (error) throw error;
          setAlert('تم إلغاء الجدولة');
          await loadMyScheduled();
          await loadMyDrafts();
        } catch (e) {
          setAlert('تعذر إلغاء الجدولة: ' + (e?.message || 'غير معروف'), true);
        }
      });
    }
    const delBtn = el.querySelector('[data-action="delete"]');
    if (delBtn) {
      delBtn.addEventListener('click', () => removePost(post));
    }
    return el;
  }

  function fillForm(p) {
    programmaticUpdate = true;
    document.getElementById('postId').value = p.id || '';
    document.getElementById('title').value = p.title || '';
    document.getElementById('image_url').value = p.image_url || p.image || '';
    // show preview if exists
    const url = document.getElementById('image_url').value;
    if (imagePreview) {
      if (url) {
        imagePreview.src = url;
        imagePreview.style.display = 'block';
      } else {
        imagePreview.removeAttribute('src');
        imagePreview.style.display = 'none';
      }
    }
    document.getElementById('excerpt').value = p.excerpt || '';
    updateCounters();
    // categories: supports array or comma-separated string (fallback to legacy tags)
    try {
      const catEl = document.getElementById('categories');
      if (catEl) {
        const cats = p.categories ?? p.tags ?? '';
        if (Array.isArray(cats)) catEl.value = cats.join(', ');
        else catEl.value = cats || '';
      }
    } catch {}
    // Set content in both editors (sanitized)
    const contentValue = p.content || '';
    const clean = sanitizeHTML(contentValue);
    document.getElementById('content').value = clean;
    if (richEditor) {
      richEditor.innerHTML = clean;
    }
    updateEditorStatus();
    // schedule_at: إذا كان تاريخ النشر في المستقبل، أظهره
    try {
      if (scheduleAtInput) {
        if (p.published_at) {
          const dt = new Date(p.published_at);
          if (!isNaN(dt.getTime()) && dt > new Date()) {
            const pad = (n) => String(n).padStart(2, '0');
            const val = `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
            scheduleAtInput.value = val;
          } else {
            scheduleAtInput.value = '';
          }
        } else {
          scheduleAtInput.value = '';
        }
      }
    } catch {}
    programmaticUpdate = false;
    isDirty = false;
  }

  function clearForm() {
    programmaticUpdate = true;
    form.reset();
    document.getElementById('postId').value = '';
    document.getElementById('image_preview').style.display = 'none';
    document.getElementById('image_preview').src = '';
    document.getElementById('image_url').value = '';
    
    // Clear Rich Editor
    if (richEditor) {
      richEditor.innerHTML = '';
    }
    if (markdownEditor) {
      markdownEditor.value = '';
    }
    document.getElementById('content').value = '';
    updateEditorStatus();
    
    location.hash = '#section-editor';
    isDirty = false;
    updateCharCounters();
  }

  document.getElementById('resetBtn')?.addEventListener('click', clearForm);

  // mark dirty on user edits
  if (form) {
    ['input','change'].forEach(evt => {
      form.addEventListener(evt, () => { if (!programmaticUpdate) isDirty = true; });
    });
  }
  
  // Initialize Rich Text Editor
  function initRichEditor() {
    richEditor = document.getElementById('richEditor');
    markdownEditor = document.getElementById('content');
    previewPane = document.getElementById('previewPane');
    
    if (!richEditor) return;
    
    // Setup toolbar buttons
    document.querySelectorAll('.toolbar-btn[data-command]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const command = btn.dataset.command;
        handleEditorCommand(command);
      });
    });
    
    // Heading buttons (normal / heading)
    const normalTextBtn = document.getElementById('normalTextBtn');
    const headingTextBtn = document.getElementById('headingTextBtn');
    if (normalTextBtn) {
      normalTextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        applyHeading(false);
      });
    }
    if (headingTextBtn) {
      headingTextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        applyHeading(true);
      });
    }
    
    // Toggle preview
    const togglePreview = document.getElementById('togglePreview');
    if (togglePreview) {
      togglePreview.addEventListener('click', (e) => {
        e.preventDefault();
        toggleEditorMode('preview');
      });
    }
    
    // Rich editor events
    richEditor.addEventListener('input', () => {
      sanitizeRichEditor();
      syncRichToTextarea();
      updateEditorStatus();
      if (!programmaticUpdate) isDirty = true;
    });
    
    richEditor.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, text);
    });
    
    // Keyboard shortcuts
    richEditor.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
          case 'b':
            e.preventDefault();
            document.execCommand('bold');
            break;
          case 'i':
          case 'u':
            // Disabled: italic, underline, strikethrough
            e.preventDefault();
            break;
          case 'z':
            if (!e.shiftKey) {
              e.preventDefault();
              handleUndo();
            }
            break;
          case 'y':
            e.preventDefault();
            handleRedo();
            break;
        }
      }
    });
    
    // Save undo state periodically
    richEditor.addEventListener('input', debounce(() => {
      saveUndoState();
    }, 500));

    // Reflect selection changes to toolbar (e.g., heading active state)
    document.addEventListener('selectionchange', () => {
      try {
        const sel = window.getSelection();
        const anchor = sel && sel.anchorNode;
        if (!anchor || !richEditor) return;
        if (!richEditor.contains(anchor)) return;
        updateToolbarStates();
      } catch {}
    });
  }
  
  // Handle editor commands
  function handleEditorCommand(command) {
    switch(command) {
      case 'createLink':
        const url = prompt('أدخل عنوان الرابط:');
        if (url) {
          document.execCommand('createLink', false, url);
        }
        break;
      case 'insertImage':
        const imgUrl = prompt('أدخل عنوان الصورة:');
        if (imgUrl) {
          document.execCommand('insertImage', false, imgUrl);
        }
        break;
      case 'insertQuote':
        document.execCommand('formatBlock', false, 'blockquote');
        break;
      case 'insertCode':
        break;
      case 'undo':
        handleUndo();
        break;
      case 'redo':
        handleRedo();
        break;
      default:
        if (command === 'indent' || command === 'outdent') { break; }
        document.execCommand(command, false, null);
    }
    
    // Update button states
    updateToolbarStates();
    syncRichToTextarea();
  }
  
  // Toggle editor mode
  function toggleEditorMode(mode) {
    if (mode === editorMode) {
      // If clicking the same mode, go back to rich editor
      mode = 'rich';
    }
    const prev = editorMode;
    editorMode = mode;
    
    if (mode === 'preview') {
      // Switch to preview
      richEditor.style.display = 'none';
      previewPane.style.display = 'block';
      
      // Get content based on current mode
      const html = richEditor.innerHTML;
      previewPane.innerHTML = sanitizeHTML(html);
      
      document.getElementById('togglePreview').classList.add('active');
    } else {
      // Switch to rich editor
      richEditor.style.display = 'block';
      previewPane.style.display = 'none';
      
      document.getElementById('togglePreview').classList.remove('active');
    }
    
    // Update status bar
    const modeText = mode === 'rich' ? 'محرر غني' : 'معاينة';
    document.getElementById('editorMode').textContent = modeText;
  }
  
  // Sync rich editor content to hidden textarea
  function syncRichToTextarea() {
    const contentTextarea = document.getElementById('content');
    if (richEditor && contentTextarea) {
      contentTextarea.value = sanitizeHTML(richEditor.innerHTML);
    }
  }
  
  // Update toolbar button states
  function updateToolbarStates() {
    const buttons = document.querySelectorAll('.toolbar-btn[data-command]');
    buttons.forEach(btn => {
      const command = btn.dataset.command;
      try {
        if (document.queryCommandState(command)) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      } catch(e) {
        // Some commands don't support queryCommandState
      }
    });

    // Update heading button active state based on selection
    try {
      const headingBtn = document.getElementById('headingTextBtn');
      if (headingBtn) headingBtn.classList.toggle('active', isSelectionInHeading());
    } catch {}
  }

  // Apply or remove heading style (bold + slightly larger) on current block
  function applyHeading(isHeading) {
    try {
      if (!richEditor) return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      let node = sel.anchorNode;
      if (!node) return;
      if (node.nodeType === 3) node = node.parentNode;
      let block = closestBlock(node);
      if (!block) {
        // Ensure we are inside a paragraph
        document.execCommand('formatBlock', false, 'p');
        const s2 = window.getSelection();
        node = s2 && s2.anchorNode ? (s2.anchorNode.nodeType === 3 ? s2.anchorNode.parentNode : s2.anchorNode) : node;
        block = closestBlock(node);
      }
      if (!block) return;
      if (isHeading) block.classList.add('rte-heading');
      else block.classList.remove('rte-heading');
      saveUndoState();
      syncRichToTextarea();
      updateToolbarStates();
      updateEditorStatus();
    } catch {}
  }

  function isSelectionInHeading() {
    try {
      if (!richEditor) return false;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return false;
      let node = sel.anchorNode;
      if (!node) return false;
      if (node.nodeType === 3) node = node.parentNode;
      while (node && node !== richEditor) {
        if (node.nodeType === 1 && node.classList && node.classList.contains('rte-heading')) return true;
        node = node.parentNode;
      }
      return false;
    } catch { return false; }
  }

  function closestBlock(node) {
    const blocks = new Set(['P','DIV','LI','BLOCKQUOTE','H1','H2','H3','H4','H5','H6']);
    let n = node;
    while (n && n !== richEditor) {
      if (n.nodeType === 1 && blocks.has(n.tagName)) return n;
      n = n.parentNode;
    }
    return null;
  }
  
  // Update editor status (word count, char count)
  function updateEditorStatus() {
    const text = richEditor ? (richEditor.innerText || richEditor.textContent || '') : '';
    
    // Count words
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    document.getElementById('wordCount').textContent = `${words} كلمة`;
    
    // Count characters
    const chars = text.length;
    document.getElementById('charCount').textContent = `${chars} حرف`;
  }
  
  // Undo/Redo functionality
  function saveUndoState() {
    if (richEditor) {
      undoStack.push(richEditor.innerHTML);
      if (undoStack.length > MAX_UNDO_STACK) {
        undoStack.shift();
      }
      redoStack = [];
    }
  }
  
  function handleUndo() {
    if (undoStack.length > 1) {
      redoStack.push(undoStack.pop());
      richEditor.innerHTML = undoStack[undoStack.length - 1];
      syncRichToTextarea();
      updateEditorStatus();
    }
  }
  
  function handleRedo() {
    if (redoStack.length > 0) {
      const state = redoStack.pop();
      undoStack.push(state);
      richEditor.innerHTML = state;
      syncRichToTextarea();
      updateEditorStatus();
    }
  }
  
  // Sanitize HTML: remove italic, underline, strikethrough, and code/pre tags and their styles
  function sanitizeHTML(html) {
    try {
      const container = document.createElement('div');
      container.innerHTML = String(html || '');
      // unwrap disallowed tags but keep inner HTML structure
      container.querySelectorAll('em,i,u,s,strike,del,code,pre').forEach(el => {
        const frag = document.createDocumentFragment();
        while (el.firstChild) frag.appendChild(el.firstChild);
        el.replaceWith(frag);
      });
      // remove offending styles
      container.querySelectorAll('[style]').forEach(el => {
        const style = el.getAttribute('style') || '';
        let s = style;
        s = s.replace(/font-style\s*:\s*italic\s*;?/gi, '');
        s = s.replace(/text-decoration\s*:\s*(?:underline|line-through)(?:\s*[^;]*)?;?/gi, '');
        s = s.replace(/white-space\s*:\s*pre(?:-wrap|line)?\s*;?/gi, '');
        if (s.trim()) el.setAttribute('style', s);
        else el.removeAttribute('style');
      });
      return container.innerHTML;
    } catch { return String(html || ''); }
  }

  function sanitizeRichEditor() {
    if (!richEditor) return;
    const html = sanitizeHTML(richEditor.innerHTML);
    if (html !== richEditor.innerHTML) {
      try {
        richEditor.innerHTML = html;
      } catch {}
    }
  }
  
  // Debounce utility
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  titleInput?.addEventListener('input', () => {
    if (!programmaticUpdate) { isDirty = true; }
    updateCounters();
  });
  excerptInput?.addEventListener('input', () => {
    if (!programmaticUpdate) { isDirty = true; }
    updateCounters();
  });
  
  updateCounters();

  async function loadMyPosts() {
    if (!currentUser) return;
    myPosts.innerHTML = '';
    // Try user_id then fallback to author=email
    try {
      let data = null;
      try {
        const nowIso = new Date().toISOString();
        const { data: d1 } = await sb
          .from('blog_posts')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('status', 'published')
          .lte('published_at', nowIso)
          .order('created_at', { ascending: false });
        data = d1;
      } catch {}
      if (!data) {
        const nowIso = new Date().toISOString();
        const { data: d2 } = await sb
          .from('blog_posts')
          .select('*')
          .eq('author', currentUser.email)
          .eq('status', 'published')
          .lte('published_at', nowIso)
          .order('created_at', { ascending: false });
        data = d2;
      }
      (data || []).forEach(p => myPosts.appendChild(card(p)));
    } catch (e) {
      setAlert('تعذر تحميل التدوينات: ' + (e?.message || 'غير معروف'), true);
    }
  }

  async function loadMyDrafts() {
    if (!currentUser || !myDrafts) return;
    myDrafts.innerHTML = '';
    try {
      let data = null;
      try {
        const { data: d1 } = await sb
          .from('blog_posts')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('status', 'draft')
          .order('created_at', { ascending: false });
        data = d1;
      } catch {}
      if (!data) {
        const { data: d2 } = await sb
          .from('blog_posts')
          .select('*')
          .eq('author', currentUser.email)
          .eq('status', 'draft')
          .order('created_at', { ascending: false });
        data = d2;
      }
      (data || []).forEach(p => myDrafts.appendChild(card(p)));
    } catch (e) {
      setAlert('تعذر تحميل المسودات: ' + (e?.message || 'غير معروف'), true);
    }
  }

  async function loadMyScheduled() {
    if (!currentUser || !myScheduled) return;
    myScheduled.innerHTML = '';
    try {
      const nowIso = new Date().toISOString();
      let data = null;
      try {
        const { data: d1 } = await sb
          .from('blog_posts')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('status', 'published')
          .gt('published_at', nowIso)
          .order('published_at', { ascending: true });
        data = d1;
      } catch {}
      if (!data) {
        const { data: d2 } = await sb
          .from('blog_posts')
          .select('*')
          .eq('author', currentUser.email)
          .eq('status', 'published')
          .gt('published_at', nowIso)
          .order('published_at', { ascending: true });
        data = d2;
      }
      (data || []).forEach(p => myScheduled.appendChild(card(p)));
    } catch (e) {
      setAlert('تعذر تحميل المجدولة: ' + (e?.message || 'غير معروف'), true);
    }
  }

  async function loadManagePosts() {
    if (!currentUser || !managePostsList) return;
    managePostsList.innerHTML = '';
    if (manageMsg) manageMsg.textContent = 'جاري التحميل...';
    try {
      const nowIso = new Date().toISOString();
      const st = (manageStatus?.value || 'all');
      const allUsers = !!(isEditor && manageAllToggle && manageAllToggle.checked);
      let q = sb.from('blog_posts').select('*');
      if (!allUsers) {
        const uid = currentUser.id;
        const email = currentUser.email;
        q = q.or(`user_id.eq.${uid},author.eq.${email}`);
      }
      if (st === 'draft') {
        q = q.eq('status', 'draft').order('created_at', { ascending: false });
      } else if (st === 'scheduled') {
        q = q.eq('status', 'published').gt('published_at', nowIso).order('published_at', { ascending: true });
      } else if (st === 'published') {
        q = q.eq('status', 'published').lte('published_at', nowIso).order('published_at', { ascending: false });
      } else {
        q = q.order('created_at', { ascending: false });
      }
      q = q.limit(50);
      const { data, error } = await q;
      if (error) throw error;
      (data || []).forEach(p => managePostsList.appendChild(card(p)));
      if (manageMsg) manageMsg.textContent = (data && data.length) ? '' : 'لا توجد نتائج.';
    } catch (e) {
      if (manageMsg) manageMsg.textContent = 'تعذر التحميل: ' + (e?.message || 'غير معروف');
    }
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.style.opacity = .7;

    // Upload image if a new file is selected
    let uploadedUrl = null;
    try {
      uploadedUrl = await uploadSelectedImage(currentUser);
    } catch (e) {
      setAlert('فشل رفع الصورة: ' + (e?.message || 'غير معروف'), true);
      btn.disabled = false; btn.style.opacity = 1;
      return;
    }

    // parse categories from input
    const catsRaw = (document.getElementById('categories')?.value || '').trim();
    const categories = catsRaw ? catsRaw.split(/[،,]/).map(s => s.trim()).filter(Boolean) : null;

    const payload = {
      title: (document.getElementById('title').value || '').trim(),
      image_url: (uploadedUrl || document.getElementById('image_url').value.trim() || null),
      status: 'published',
      excerpt: (document.getElementById('excerpt').value || ''),
      categories,
      content: sanitizeHTML(document.getElementById('content').value),
      author: currentUser.email,
      author_name: (currentUser.user_metadata?.display_name || currentUser.user_metadata?.name || currentUser.email),
    };
    // Always set published_at for publish-now
    payload.published_at = new Date().toISOString();

    const id = document.getElementById('postId').value;

    try {
      let res;
      let created = false;
      if (id) {
        res = await safeUpdatePost(id, payload);
      } else {
        // attach user_id if column exists via upsert try-catch
        try { payload.user_id = currentUser.id; } catch {}
        created = true;
        res = await safeInsertPost(payload);
      }
      const { error, data } = res;
      if (error) throw error;
      
      // Success message based on whether created or updated
      if (created) {
        setAlert('تم نشر التدوينة بنجاح!');
      } else {
        setAlert('تم تحديث التدوينة بنجاح!');
      }
      
      clearForm();
      await loadMyPosts();
    } catch (e) {
      setAlert('خطأ: ' + (e?.message || 'فشل الحفظ'), true);
    }
    if (btn) { btn.disabled = false; btn.style.opacity = 1; }
  });

  // Wire up the new "مسودة" button to save as draft
  document.getElementById('saveDraftBtn')?.addEventListener('click', async () => {
    try {
      await saveAsDraftFromEditor();
    } catch (e) {
      setAlert('تعذر حفظ المسودة: ' + (e?.message || 'غير معروف'), true);
    }
  });

  // Schedule button: save as published with future published_at
  scheduleBtn?.addEventListener('click', async () => {
    if (!currentUser || !form) return;
    const whenStr = (scheduleAtInput?.value || '').trim();
    if (!whenStr) { setAlert('الرجاء اختيار تاريخ ووقت للجدولة.', true); return; }
    const when = new Date(whenStr);
    if (isNaN(when.getTime())) { setAlert('تاريخ غير صالح.', true); return; }
    // Upload image if a new file is selected
    let uploadedUrl = null;
    try { uploadedUrl = await uploadSelectedImage(currentUser); } catch (e) { setAlert('فشل رفع الصورة: ' + (e?.message || 'غير معروف'), true); return; }
    // parse categories from input
    const catsRaw = (document.getElementById('categories')?.value || '').trim();
    const categories = catsRaw ? catsRaw.split(/[،,]/).map(s => s.trim()).filter(Boolean) : null;
    const payload = {
      title: (document.getElementById('title').value || '').trim(),
      image_url: (uploadedUrl || document.getElementById('image_url').value.trim() || null),
      status: 'published',
      excerpt: (document.getElementById('excerpt').value || ''),
      categories,
      content: sanitizeHTML(document.getElementById('content').value),
      author: currentUser.email,
      published_at: when.toISOString(),
      author_name: (currentUser.user_metadata?.display_name || currentUser.user_metadata?.name || currentUser.email),
    };
    try { payload.user_id = currentUser.id; } catch {}
    const id = document.getElementById('postId').value;
    try {
      if (id) {
        const { error } = await safeUpdatePost(id, payload);
        if (error) throw error;
      } else {
        const { error } = await safeInsertPost(payload);
        if (error) throw error;
      }
      setAlert('تمت الجدولة بنجاح');
      try { await logActivity('post_schedule', { when: payload.published_at }); } catch {}
      clearForm();
      await loadMyScheduled();
      await loadMyPosts();
    } catch (e) {
      setAlert('تعذر الجدولة: ' + (e?.message || 'غير معروف'), true);
    }
  });

  // Helper: upload selected image file to Supabase Storage and return public URL
  async function uploadSelectedImage(user) {
    const file = imageFileInput?.files && imageFileInput.files[0];
    if (!file) return null; // nothing to upload
    const bucket = 'blog-images';
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const safeExt = ext.replace(/[^a-z0-9]/gi, '') || 'jpg';
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${safeExt}`;
    // Upload
    const { error: upErr } = await sb.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (upErr) throw upErr;
    // Get public URL
    const { data } = sb.storage.from(bucket).getPublicUrl(path);
    const publicUrl = data?.publicUrl;
    if (!publicUrl) throw new Error('تعذر الحصول على رابط الصورة');
    // Persist in hidden field for subsequent saves
    if (imageUrlHidden) imageUrlHidden.value = publicUrl;
    return publicUrl;
  }

  // Warn before unload if there are unsaved changes
  window.addEventListener('DOMContentLoaded', async () => {
    await ensureAuth();
    initRichEditor(); // Initialize rich text editor
    await loadMyPosts();
    loadMyDrafts();
    loadMyScheduled();
    switchSection(location.hash || '#section-editor');
  });

  // Intercept "عرض المدونة" button
  viewBlogLink?.addEventListener('click', (e) => {
    const href = viewBlogLink.getAttribute('href');
    const target = viewBlogLink.getAttribute('target');
    if (!href) return;
    if (!isDirty) {
      // Before navigating away, if editor has untouched draft, clear it
      clearEditorIfPristine();
      return; // allow normal behavior
    }
    e.preventDefault();
    showUnsavedModal({ type: 'external', payload: { href, target } });
  });

  async function removePost(post) {
    const allowed = (function() {
      try {
        const byUserId = post.user_id && currentUser && post.user_id === currentUser.id;
        const byEmail = post.author && currentUser && post.author === currentUser.email;
        return !!(byUserId || byEmail || isEditor);
      } catch { return !!isEditor; }
    })();
    if (!allowed) { setAlert('لا تملك صلاحية حذف هذه التدوينة.', true); return; }
    if (!confirm('حذف التدوينة؟')) return;
    try {
      const { error } = await sb.from('blog_posts').delete().eq('id', post.id);
      if (error) throw error;
      try { await logActivity('post_delete', { post_id: post.id }); } catch {}
      loadMyPosts();
      loadMyDrafts();
    } catch (e) {
      setAlert('تعذر الحذف: ' + (e?.message || 'غير معروف'), true);
    }
  }

  (async function init() {
    const ok = await ensureAuth();
    if (!ok) return;
    loadProfileIntoForm();
    loadMyActivity();
    await loadMyPosts();
    await loadMyDrafts();
    if (isEditor) {
      await loadAdminComments();
    }
  })();

  // Refresh activity button
  refreshActivityBtn?.addEventListener('click', () => {
    loadMyActivity();
  });

  refreshCommentsAdminBtn?.addEventListener('click', async () => {
    if (!isEditor) return;
    const btn = refreshCommentsAdminBtn;
    try {
      btn.disabled = true;
      btn.style.opacity = .7;
      await loadAdminComments();
    } finally {
      btn.disabled = false;
      btn.style.opacity = 1;
    }
  });

  manageRefreshBtn?.addEventListener('click', () => { loadManagePosts(); });
  manageStatus?.addEventListener('change', () => { loadManagePosts(); });
  manageAllToggle?.addEventListener('change', () => { if (isEditor) loadManagePosts(); });

  commentsAdminList?.addEventListener('click', async (e) => {
    const t = e.target.closest && e.target.closest('[data-action="delete-comment"]');
    if (!t) return;
    if (!isEditor) return;
    const cid = t.getAttribute('data-cid');
    if (!cid) return;
    const ok = await deleteAdminComment(cid);
    if (ok) await loadAdminComments();
  });

  // Comments admin: handle selection checkbox changes
  commentsAdminList?.addEventListener('change', (e) => {
    const el = e.target;
    if (!el || !el.classList || !el.classList.contains('comment-select')) return;
    const cid = el.getAttribute('data-cid');
    if (!cid) return;
    if (el.checked) selectedCommentIds.add(cid);
    else selectedCommentIds.delete(cid);
    updateCommentsSelectionUI();
  });

  // Comments admin: select all visible comments
  selectAllCommentsBtn?.addEventListener('click', () => {
    if (!isEditor) return;
    document.querySelectorAll('#commentsAdminList .comment-select').forEach((cb) => {
      const cid = cb.getAttribute('data-cid');
      if (!cid) return;
      cb.checked = true;
      selectedCommentIds.add(cid);
    });
    updateCommentsSelectionUI();
  });

  // Comments admin: clear selection
  clearSelectedCommentsBtn?.addEventListener('click', () => {
    selectedCommentIds.clear();
    document.querySelectorAll('#commentsAdminList .comment-select').forEach((cb) => { cb.checked = false; });
    updateCommentsSelectionUI();
  });

  // Comments admin: bulk delete
  deleteSelectedCommentsBtn?.addEventListener('click', async () => {
    if (!isEditor) return;
    const ids = Array.from(selectedCommentIds);
    if (!ids.length) return;
    const confirmed = confirm(`حذف ${ids.length} تعليقًا؟`);
    if (!confirmed) return;
    const btn = deleteSelectedCommentsBtn;
    try {
      btn.disabled = true;
      btn.style.opacity = .7;
      if (commentsAdminMsg) commentsAdminMsg.textContent = 'جاري الحذف...';
      const { error } = await sb.from('blog_comments').delete().in('id', ids);
      if (error) throw error;
      try { await logActivity('comment_delete', { ids }); } catch {}
      selectedCommentIds.clear();
      await loadAdminComments();
    } catch (e) {
      setAlert('تعذر حذف التعليقات: ' + (e?.message || 'غير معروف'), true);
    } finally {
      if (commentsAdminMsg) commentsAdminMsg.textContent = '';
      btn.disabled = false;
      btn.style.opacity = 1;
    }
  });

  // Handle delete account
  deleteAccountForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    if (deleteMsg) deleteMsg.textContent = '';
    const pwd = (deletePasswordInput?.value || '').trim();
    if (!pwd) return;
    const confirmed = confirm('هل أنت متأكد أنك تريد حذف الحساب نهائيًا؟ هذا الإجراء غير قابل للاسترجاع.');
    if (!confirmed) return;
    const btn = deleteAccountForm.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.style.opacity = .7; }
    try {
      // Re-authenticate
      const { error: signInErr } = await sb.auth.signInWithPassword({ email: currentUser.email, password: pwd });
      if (signInErr) throw new Error('كلمة المرور غير صحيحة');
      // Call Edge Function to delete account hard
      try {
        const { error: fnErr } = await sb.functions.invoke('delete-account', { body: { hard: true } });
        if (fnErr) throw fnErr;
      } catch (fnError) {
        throw new Error('خدمة حذف الحساب غير مُعدة. اطلب من المسؤول تفعيل وظيفة delete-account.');
      }
      try { await logActivity('account_delete'); } catch {}
      try { await sb.auth.signOut(); } catch {}
      location.replace('/marafi/blogger/login.html');
    } catch (err) {
      if (deleteMsg) deleteMsg.textContent = 'تعذر حذف الحساب: ' + (err?.message || 'غير معروف');
    } finally {
      if (btn) { btn.disabled = false; btn.style.opacity = 1; }
    }
  });
})();
