// Admin Panel Logic (moved under /admin)
// - Stores data in localStorage under keys: adeeb_works, adeeb_sponsors, adeeb_board
// - Provides basic CRUD via <dialog> forms
// - Export/Import JSON of all data

(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // List container elements (must be declared before attaching listeners)
  const worksList = $('#worksList');
  const sponsorsList = $('#sponsorsList');
  const achievementsList = $('#achievementsList');
  const boardList = $('#boardList');
  const faqList = $('#faqList');
  const blogList = $('#blogList');

  const KEYS = {
    works: 'adeeb_works',
    sponsors: 'adeeb_sponsors',
    board: 'adeeb_board',
    faq: 'adeeb_faq',
    achievements: 'adeeb_achievements',
    blog: 'adeeb_blog_posts',
  };

  // Supabase client (if configured)
  const sb = window.sbClient || null;

  // Edge Functions base URL (derived from project URL)
  const FUNCTIONS_BASE = (window.SUPABASE_URL || '').replace('.supabase.co', '.functions.supabase.co');

  async function callFunction(name, { method = 'GET', body = null } = {}) {
    if (!sb) throw new Error('Supabase not initialized');
    if (!FUNCTIONS_BASE) throw new Error('Functions base URL not configured');
    const { data: { session } } = await sb.auth.getSession();
    if (!session) throw new Error('not-authenticated');
    const headers = {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    };
    const res = await fetch(`${FUNCTIONS_BASE}/${name}`, { method, headers, body: body ? JSON.stringify(body) : null });
    const text = await res.text();
    let json = null; try { json = text ? JSON.parse(text) : null; } catch {}
    if (!res.ok) {
      const msg = json?.error || res.statusText || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return json;
  }

  // User badge helpers
  function timeGreeting() {
    const h = new Date().getHours();
    // Arabic greeting to match UI language
    return h < 12 ? 'صباح الخير' : 'مساء الخير';
  }
  function renderUserBadge(user) {
    const host = document.getElementById('adminUserBadge');
    if (!host) return;
    if (!user) { host.innerHTML = ''; return; }
    const md = user.user_metadata || {};
    const name = md.display_name || user.email || 'مستخدم';
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

  function load(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Failed to parse localStorage for', key, e);
      return [];
    }

  // Blog (Marafe) CRUD + renderer
  function renderBlog() {
    if (!blogList) return;
    blogList.innerHTML = '';
    const sorted = [...blogPosts].sort((a, b) => {
      const da = new Date(a.published_at || a.created_at || 0).getTime();
      const db = new Date(b.published_at || b.created_at || 0).getTime();
      return db - da;
    });

  // ===== Change Password (Admin) =====
  const adminChangePasswordForm = document.getElementById('adminChangePasswordForm');
  const adminCurrentPasswordInput = document.getElementById('admin_current_password');
  const adminNewPasswordInput = document.getElementById('admin_new_password');
  const adminConfirmPasswordInput = document.getElementById('admin_confirm_password');
  const adminPasswordMsg = document.getElementById('adminPasswordMsg');

  adminChangePasswordForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!sb) return;
    adminPasswordMsg && (adminPasswordMsg.textContent = '');
    const curr = (adminCurrentPasswordInput?.value || '').trim();
    const next = (adminNewPasswordInput?.value || '').trim();
    const conf = (adminConfirmPasswordInput?.value || '').trim();
    if (!curr || !next || !conf) { adminPasswordMsg && (adminPasswordMsg.textContent = 'يرجى تعبئة جميع الحقول'); return; }
    if (next !== conf) { adminPasswordMsg && (adminPasswordMsg.textContent = 'كلمتا المرور غير متطابقتين'); return; }
    if (next.length < 6) { adminPasswordMsg && (adminPasswordMsg.textContent = 'الحد الأدنى 6 أحرف'); return; }
    const btn = adminChangePasswordForm.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.style.opacity = .7; }
    try {
      const { data: { user } } = await sb.auth.getUser();
      if (!user || !user.email) throw new Error('لا يوجد بريد مسجل');
      const { error: signInErr } = await sb.auth.signInWithPassword({ email: user.email, password: curr });
      if (signInErr) throw new Error('كلمة المرور الحالية غير صحيحة');
      const { error: updErr } = await sb.auth.updateUser({ password: next });
      if (updErr) throw updErr;
      adminPasswordMsg && (adminPasswordMsg.textContent = 'تم تغيير كلمة المرور. سيتم تسجيل الخروج...');
      // تنظيف الحقول
      try { adminCurrentPasswordInput.value = ''; adminNewPasswordInput.value = ''; adminConfirmPasswordInput.value = ''; } catch {}
      // تسجيل الخروج لإعادة الدخول بالكلمة الجديدة
      try { await sb.auth.signOut(); } catch {}
      location.replace('../login.html?redirect=admin/admin.html');
    } catch (err) {
      adminPasswordMsg && (adminPasswordMsg.textContent = 'تعذر التغيير: ' + (err?.message || 'غير معروف'));
    } finally {
      if (btn) { btn.disabled = false; btn.style.opacity = 1; }
    }
  });

  // ===== Change Email (Admin) =====
  const adminChangeEmailForm = document.getElementById('adminChangeEmailForm');
  const adminNewEmailInput = document.getElementById('admin_new_email');
  const adminCurrentPasswordEmailInput = document.getElementById('admin_current_password_email');
  const adminEmailMsg = document.getElementById('adminEmailMsg');

  adminChangeEmailForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!sb) return;
    adminEmailMsg && (adminEmailMsg.textContent = '');
    const newEmail = (adminNewEmailInput?.value || '').trim();
    const currPwd = (adminCurrentPasswordEmailInput?.value || '').trim();
    if (!newEmail || !currPwd) { adminEmailMsg && (adminEmailMsg.textContent = 'يرجى إدخال البريد وكلمة المرور'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) { adminEmailMsg && (adminEmailMsg.textContent = 'صيغة البريد غير صحيحة'); return; }
    const btn = adminChangeEmailForm.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.style.opacity = .7; }
    try {
      const { data: { user } } = await sb.auth.getUser();
      if (!user || !user.email) throw new Error('لا يوجد بريد مسجل');
      const { error: signInErr } = await sb.auth.signInWithPassword({ email: user.email, password: currPwd });
      if (signInErr) throw new Error('كلمة المرور الحالية غير صحيحة');
      const redirectTo = new URL('../login.html', location.origin).href;
      const { error: updErr } = await sb.auth.updateUser({ email: newEmail }, { emailRedirectTo: redirectTo });
      if (updErr) throw updErr;
      adminEmailMsg && (adminEmailMsg.textContent = 'تم إرسال رسالة تأكيد إلى بريدك الجديد. الرجاء فتح الرابط لتأكيد التغيير.');
      try { adminCurrentPasswordEmailInput.value = ''; } catch {}
    } catch (err) {
      adminEmailMsg && (adminEmailMsg.textContent = 'تعذر تغيير البريد: ' + (err?.message || 'غير معروف'));
    } finally {
      if (btn) { btn.disabled = false; btn.style.opacity = 1; }
    }
  });

  // Sponsors: up/down and drag-n-drop
    sorted.forEach((item) => {
      const idx = blogPosts.indexOf(item);
      const status = item.status || 'draft';
      const badge = status === 'published' ? 'منشور' : 'مسودة';
      const node = el(`
        <div class="card">
          <div class="card__media">
            <img src="${(item.image || item.image_url) || ''}" alt="${item.title || ''}" />
            <span class="card__badge">${badge}</span>
          </div>
          <div class="card__body">
            <div class="card__title">${item.title || ''}</div>
            ${item.excerpt ? `<p class="card__text">${item.excerpt}</p>` : ''}
            <div class="card__actions">
              <button class="btn btn-outline" data-act="edit" data-idx="${idx}"><i class="fa-solid fa-pen"></i> تعديل</button>
              <button class="btn btn-outline" data-act="del" data-idx="${idx}"><i class="fa-solid fa-trash"></i> حذف</button>
            </div>
          </div>
        </div>`);
      blogList.appendChild(node);
    });
  }

  const blogDialog = $('#blogDialog');
  const blogForm = $('#blogForm');
  let blogEditingIndex = null;

  $('#addPostBtn')?.addEventListener('click', () => {
    blogEditingIndex = null;
    blogForm.reset();
    openDialog(blogDialog);
  });

  blogList?.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const act = btn.dataset.act;
    if (act === 'edit') {
      blogEditingIndex = idx;
      const cur = blogPosts[idx];
      blogForm.title.value = cur.title || '';
      blogForm.image.value = (cur.image || cur.image_url) || '';
      blogForm.author.value = cur.author || '';
      blogForm.published_at.value = (cur.published_at ? cur.published_at.substring(0, 10) : '');
      blogForm.status.value = cur.status || 'draft';
      blogForm.excerpt.value = cur.excerpt || '';
      blogForm.content.value = cur.content || '';
      // categories: support array or comma-separated, fallback to legacy tags
      try {
        if (blogForm.categories) {
          const cats = cur.categories ?? cur.tags ?? '';
          blogForm.categories.value = Array.isArray(cats) ? cats.join(', ') : (cats || '');
        }
      } catch {}
      openDialog(blogDialog);
    } else if (act === 'del') {
      if (!confirm('تأكيد الحذف؟')) return;
      const cur = blogPosts[idx];
      if (sb && cur.id) {
        sb.from('blog_posts').delete().eq('id', cur.id).then(({ error }) => {
          if (error) return alert('فشل الحذف: ' + error.message);
          blogPosts.splice(idx, 1);
          renderBlog();
        });
      } else {
        blogPosts.splice(idx, 1);
        save(KEYS.blog, blogPosts);
        renderBlog();
      }
    }
  });

  blogForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      title: blogForm.title.value.trim(),
      image: blogForm.image.value.trim(),
      author: blogForm.author.value.trim() || null,
      published_at: blogForm.published_at.value ? new Date(blogForm.published_at.value).toISOString() : null,
      status: blogForm.status.value || 'draft',
      excerpt: blogForm.excerpt.value.trim() || null,
      content: blogForm.content.value.trim() || null,
      // parse categories from input (Arabic/English commas)
      categories: (() => {
        const raw = (blogForm.categories?.value || '').trim();
        if (!raw) return null;
        const arr = raw.split(/[،,]/).map(s => s.trim()).filter(Boolean);
        return arr.length ? arr : null;
      })(),
    };
    if (sb) {
      sb.auth.getSession().then(({ data: { session } }) => {
        if (!session) return alert('يلزم تسجيل الدخول لإجراء التعديلات');
        const payload = {
          title: data.title,
          image_url: data.image || null,
          author: data.author,
          published_at: data.published_at,
          status: data.status,
          excerpt: data.excerpt,
          content: data.content,
          categories: data.categories,
        };
        const payloadNoCats = { ...payload }; delete payloadNoCats.categories;
        if (blogEditingIndex === null) {
          sb.from('blog_posts').insert(payload).select('*').single().then(async ({ data: row, error }) => {
            if (error) {
              // retry without categories if column doesn't exist
              if (/(column\s+categories|unknown column|invalid input)/i.test(error.message || '')) {
                const { data: row2, error: e2 } = await sb.from('blog_posts').insert(payloadNoCats).select('*').single();
                if (e2) return alert('فشل الحفظ: ' + e2.message);
                blogPosts.unshift({ ...row2, categories: data.categories || null });
              } else {
                return alert('فشل الحفظ: ' + error.message);
              }
            } else {
              blogPosts.unshift(row);
            }
            renderBlog();
            closeDialog(blogDialog);
          });
        } else {
          const id = blogPosts[blogEditingIndex]?.id;
          if (!id) { alert('عنصر بدون معرف، لا يمكن التحديث'); return; }
          sb.from('blog_posts').update(payload).eq('id', id).select('*').single().then(async ({ data: row, error }) => {
            if (error) {
              if (/(column\s+categories|unknown column|invalid input)/i.test(error.message || '')) {
                const { data: row2, error: e2 } = await sb.from('blog_posts').update(payloadNoCats).eq('id', id).select('*').single();
                if (e2) return alert('فشل التحديث: ' + e2.message);
                blogPosts[blogEditingIndex] = { ...row2, categories: data.categories || null };
              } else {
                return alert('فشل التحديث: ' + error.message);
              }
            } else {
              blogPosts[blogEditingIndex] = row;
            }
            renderBlog();
            closeDialog(blogDialog);
          });
        }
      });
    } else {
      if (blogEditingIndex === null) blogPosts.unshift(data);
      else blogPosts[blogEditingIndex] = data;
      save(KEYS.blog, blogPosts);
      renderBlog();
      closeDialog(blogDialog);
    }
  });

  }

  function renderAchievements() {
    if (!achievementsList) return;
    achievementsList.innerHTML = '';
    const sorted = [...achievements].sort((a, b) => (a.order || 999) - (b.order || 999));
    sorted.forEach((item, sortedIndex) => {
      const originalIdx = achievements.indexOf(item);
      const iconClass = item.icon || item.icon_class || 'fa-solid fa-trophy';
      const rawCount = (item.count ?? item.count_number ?? 0);
      const number = typeof rawCount === 'number' ? rawCount : Number(rawCount || 0);
      const plus = 'plus' in item ? !!item.plus : ('plus_flag' in item ? !!item.plus_flag : true);
      const displayOrder = (item.order ? Number(item.order) : (sortedIndex + 1));
      const node = el(`
        <div class="card draggable-card" data-idx="${originalIdx}" draggable="true">
          <span class="order-chip">#${displayOrder}</span>
          <div class="card__body" style="display:flex;gap:14px;align-items:center;">
            <div class="card__media" style="width:auto">
              <i class="${iconClass}" style="font-size:28px;color:#0ea5e9"></i>
            </div>
            <div style="flex:1">
              <div class="card__title">${item.label || ''}</div>
              <p class="card__text" style="margin:6px 0;color:#64748b">${number}${plus ? '+' : ''}</p>
              <div class="card__actions" style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;">
                <button class="btn btn-outline" data-act="up" data-idx="${originalIdx}" title="تحريك لأعلى"><i class="fa-solid fa-arrow-up"></i></button>
                <button class="btn btn-outline" data-act="down" data-idx="${originalIdx}" title="تحريك لأسفل"><i class="fa-solid fa-arrow-down"></i></button>
                <button class="btn btn-outline drag-handle" title="سحب لإعادة الترتيب"><i class="fa-solid fa-grip-vertical"></i></button>
                <button class="btn btn-outline" data-act="edit" data-idx="${originalIdx}"><i class="fa-solid fa-pen"></i> تعديل</button>
                <button class="btn btn-outline" data-act="del" data-idx="${originalIdx}"><i class="fa-solid fa-trash"></i> حذف</button>
              </div>
            </div>
          </div>
        </div>`);
      achievementsList.appendChild(node);
    });
    setupListDnD(achievementsList, achievements, KEYS.achievements, 'achievements', renderAchievements);
  }

  function save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // Initial Data
  let works = load(KEYS.works);
  let sponsors = load(KEYS.sponsors);
  let board = load(KEYS.board);
  let faq = load(KEYS.faq);
  let achievements = load(KEYS.achievements);
  let blogPosts = load(KEYS.blog);

  // Auth UI controls
  const loginBtn = $('#loginBtn');
  const sidebarLogoutBtn = document.querySelector('[data-logout]');

  async function refreshAuthUI() {
    if (!sb) return; // no supabase
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      loginBtn && (loginBtn.style.display = 'none');
      renderUserBadge(session.user);
    } else {
      loginBtn && (loginBtn.style.display = 'inline-flex');
      renderUserBadge(null);
    }
  }

  loginBtn?.addEventListener('click', () => {
    // Navigate to dedicated login page with redirect back to admin
    const url = new URL('../login.html', location.href);
    url.searchParams.set('redirect', 'admin/admin.html');
    location.href = url.toString();
  });

  // Achievements CRUD
  const achievementDialog = $('#achievementDialog');
  const achievementForm = $('#achievementForm');
  let achievementEditingIndex = null;

  $('#addAchievementBtn')?.addEventListener('click', () => {
    achievementEditingIndex = null;
    achievementForm.reset();
    // defaults
    achievementForm.plus.checked = true;
    openDialog(achievementDialog);
  });

  achievementsList?.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const act = btn.dataset.act;
    if (act === 'up' || act === 'down') {
      if (!Number.isInteger(idx) || idx < 0 || idx >= achievements.length) return;
      const newIndex = act === 'up' ? Math.max(0, idx - 1) : Math.min(achievements.length - 1, idx + 1);
      if (newIndex === idx) return;
      const [moved] = achievements.splice(idx, 1);
      achievements.splice(newIndex, 0, moved);
      normalizeAndPersistOrder(achievements, KEYS.achievements, 'achievements').then(() => {
        renderAchievements();
      });
      return;
    }
    if (act === 'edit') {
      achievementEditingIndex = idx;
      const cur = achievements[idx];
      achievementForm.label.value = cur.label || '';
      achievementForm.icon.value = cur.icon || cur.icon_class || '';
      const rawCount = (cur.count ?? cur.count_number ?? 0);
      achievementForm.count.value = typeof rawCount === 'number' ? rawCount : Number(rawCount || 0);
      achievementForm.plus.checked = 'plus' in cur ? !!cur.plus : ('plus_flag' in cur ? !!cur.plus_flag : true);
      openDialog(achievementDialog);
    } else if (act === 'del') {
      if (!confirm('تأكيد الحذف؟')) return;
      const cur = achievements[idx];
      if (sb && cur.id) {
        sb.from('achievements').delete().eq('id', cur.id).then(({ error }) => {
          if (error) return alert('فشل الحذف: ' + error.message);
          achievements.splice(idx, 1);
          renderAchievements();
        });
      } else {
        achievements.splice(idx, 1);
        save(KEYS.achievements, achievements);
        renderAchievements();
      }
    }
  });

  achievementForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      label: achievementForm.label.value.trim(),
      icon: achievementForm.icon.value.trim(),
      count: achievementForm.count.value ? Number(achievementForm.count.value) : 0,
      plus: !!achievementForm.plus.checked,
    };
    if (sb) {
      sb.auth.getSession().then(({ data: { session } }) => {
        if (!session) return alert('يلزم تسجيل الدخول لإجراء التعديلات');
        const payload = {
          label: data.label,
          icon_class: data.icon || null,
          count_number: data.count,
          plus_flag: data.plus,
        };
        if (achievementEditingIndex === null) {
          sb.from('achievements').insert(payload).select('*').single().then(({ data: row, error }) => {
            if (error) return alert('فشل الحفظ: ' + error.message);
            achievements.unshift(row);
            renderAchievements();
            closeDialog(achievementDialog);
          });
        } else {
          const id = achievements[achievementEditingIndex]?.id;
          if (!id) { alert('عنصر بدون معرف، لا يمكن التحديث'); return; }
          sb.from('achievements').update(payload).eq('id', id).select('*').single().then(({ data: row, error }) => {
            if (error) return alert('فشل التحديث: ' + error.message);
            achievements[achievementEditingIndex] = row;
            renderAchievements();
            closeDialog(achievementDialog);
          });
        }
      });
    } else {
      if (achievementEditingIndex === null) achievements.unshift(data);
      else achievements[achievementEditingIndex] = data;
      save(KEYS.achievements, achievements);
      renderAchievements();
      closeDialog(achievementDialog);
    }
  });

  async function doLogout() {
    if (!sb) {
      // Fallback: just go to login
      const url = new URL('../login.html', location.href);
      url.searchParams.set('redirect', 'admin/admin.html');
      location.replace(url.toString());
      return;
    }
    await sb.auth.signOut();
    await refreshAuthUI();
    const url = new URL('../login.html', location.href);
    url.searchParams.set('redirect', 'admin/admin.html');
    location.replace(url.toString());
  }

  sidebarLogoutBtn?.addEventListener('click', doLogout);

  // Sidebar toggle (mobile)
  const sidebar = $('#sidebar');
  const toggleSidebarBtn = $('#toggleSidebar');
  const closeSidebarBtn = $('#closeSidebarBtn');
  // Backdrop element for off-canvas sidebar (mobile only styles)
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
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
  });
  window.addEventListener('resize', () => {
    if (!isMobile()) closeSidebar();
  });

  // Menu navigation
  $$('.admin-menu__item').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const id = link.getAttribute('href');
      if (!id) return;

      // set active
      $$('.admin-menu__item').forEach((l) => l.classList.remove('active'));
      link.classList.add('active');

      // show/hide sections
      $$('.admin-section').forEach((sec) => (sec.hidden = true));
      const target = $(id);
      if (target) target.hidden = false;

      // If admins tab is opened, load admins list
      if (id === '#section-admins') {
        try { fetchAdmins?.(); } catch {}
      }

      // If profile tab is opened, load admin profile info
      if (id === '#section-profile') {
        try { adminLoadProfileIntoForm?.(); } catch {}
      }

      // Close sidebar after navigating on mobile
      if (isMobile()) closeSidebar();
    });
  });

  // Dashboard card navigation (from إدارة الموقع cards)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-go]');
    if (!btn) return;
    const id = btn.getAttribute('data-go');
    if (!id) return;
    // hide all and show target
    $$('.admin-section').forEach((sec) => (sec.hidden = true));
    const target = $(id);
    if (target) target.hidden = false;
    // keep sidebar active on the single Home tab
    if (isMobile()) closeSidebar();
    // optional: scroll to top for better context
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Renderers

  function el(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstElementChild;
  }

  // Reordering helpers
  async function normalizeAndPersistOrder(list, storageKey, tableName) {
    // Normalize order to 1..N
    list.forEach((item, i) => { item.order = i + 1; });
    // Save locally
    save(storageKey, list);
    // Persist to Supabase if available and ids exist
    if (sb && tableName) {
      try {
        const updates = list
          .filter(it => it && typeof it.id !== 'undefined' && it.id !== null)
          .map(it => sb.from(tableName).update({ order: it.order }).eq('id', it.id));
        if (updates.length) await Promise.all(updates);
      } catch (e) {
        console.warn('Failed to persist order to Supabase for', tableName, e);
      }
    }
  }

  function setupListDnD(containerEl, arrayRef, storageKey, tableName, renderFn) {
    if (!containerEl) return;
    if (containerEl._dndSetup) return; // avoid double-binding
    containerEl._dndSetup = true;
    let dragIdx = null;

    containerEl.addEventListener('dragstart', (e) => {
      const card = e.target.closest('.draggable-card');
      if (!card) return;
      // allow dragging only from handle if exists
      const handle = e.target.closest('.drag-handle');
      if (!handle && e.target.closest('.card__actions')) {
        // If started from actions but not handle, block to avoid unintended drags when clicking buttons
        e.preventDefault();
        return;
      }
      dragIdx = Number(card.dataset.idx);
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', dragIdx.toString()); } catch {}
    });

    containerEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      const overCard = e.target.closest('.draggable-card');
      if (!overCard) return;
      overCard.classList.add('drag-over');
      e.dataTransfer.dropEffect = 'move';
    });

    containerEl.addEventListener('dragleave', (e) => {
      const card = e.target.closest('.draggable-card');
      if (card) card.classList.remove('drag-over');
    });

    containerEl.addEventListener('drop', async (e) => {
      e.preventDefault();
      const targetCard = e.target.closest('.draggable-card');
      containerEl.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      const from = dragIdx;
      const to = targetCard ? Number(targetCard.dataset.idx) : null;
      dragIdx = null;
      if (!Number.isInteger(from) || !Number.isInteger(to)) return;
      if (from === to) return;
      const [moved] = arrayRef.splice(from, 1);
      const insertAt = to >= arrayRef.length ? arrayRef.length : (to < 0 ? 0 : to);
      arrayRef.splice(insertAt, 0, moved);
      await normalizeAndPersistOrder(arrayRef, storageKey, tableName);
      renderFn();
    });

    containerEl.addEventListener('dragend', () => {
      containerEl.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
      containerEl.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      dragIdx = null;
    });
  }

  function renderWorks() {
    if (!worksList) return;
    worksList.innerHTML = '';
    const sorted = [...works].sort((a, b) => (a.order ?? 1_000_000) - (b.order ?? 1_000_000));
    sorted.forEach((item, sortedIndex) => {
      const idx = works.indexOf(item);
      const displayOrder = (item.order ? Number(item.order) : (sortedIndex + 1));
      const node = el(`
        <div class="card draggable-card" data-idx="${idx}" draggable="true">
          <span class="order-chip">#${displayOrder}</span>
          <div class="card__media">
            <img src="${(item.image || item.image_url) || ''}" alt="${item.title || ''}" />
            ${(item.category) ? `<span class=\"card__badge\">${item.category}</span>` : ''}
          </div>
          <div class="card__body">
            <div class="card__title">${item.title || ''}</div>
            ${(item.link || item.link_url) ? `<a class=\"btn btn-outline\" target=\"_blank\" href=\"${item.link || item.link_url}\"><i class=\"fa-solid fa-link\"></i> رابط</a>` : ''}
            <div class="card__actions">
              <button class="btn btn-outline" data-act="up" data-idx="${idx}" title="تحريك لأعلى"><i class="fa-solid fa-arrow-up"></i></button>
              <button class="btn btn-outline" data-act="down" data-idx="${idx}" title="تحريك لأسفل"><i class="fa-solid fa-arrow-down"></i></button>
              <button class="btn btn-outline drag-handle" title="سحب لإعادة الترتيب"><i class="fa-solid fa-grip-vertical"></i></button>
              <button class="btn btn-outline" data-act="edit" data-idx="${idx}"><i class="fa-solid fa-pen"></i> تعديل</button>
              <button class="btn btn-outline" data-act="del" data-idx="${idx}"><i class="fa-solid fa-trash"></i> حذف</button>
            </div>
          </div>
        </div>`);
      worksList.appendChild(node);
    });
    setupListDnD(worksList, works, KEYS.works, 'works', renderWorks);
  }

  // ===== Admin Profile (My Profile) =====
  const adminProfileForm = document.getElementById('adminProfileForm');
  const adminDisplayNameInput = document.getElementById('admin_display_name');
  const adminPositionInput = document.getElementById('admin_position');
  const adminPhoneInput = document.getElementById('admin_phone');
  const adminAvatarFileInput = document.getElementById('admin_avatar_file');
  const adminProfileMsg = document.getElementById('adminProfileMsg');
  const adminAvatarPreview = document.getElementById('adminAvatarPreview');
  const adminProfileUserName = document.getElementById('adminProfileUserName');
  const adminProfileEmail = document.getElementById('adminProfileEmail');

  function updateAdminProfilePreview() {
    if (!sb) return;
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const md = user.user_metadata || {};
      const name = md.display_name || user.email || 'مستخدم';
      const avatarUrl = md.avatar_url && String(md.avatar_url).trim() ? md.avatar_url : null;
      if (adminProfileUserName) adminProfileUserName.textContent = name;
      if (adminProfileEmail) adminProfileEmail.textContent = user.email || '';
      if (adminAvatarPreview) {
        if (avatarUrl) {
          adminAvatarPreview.innerHTML = `<img src="${avatarUrl}" alt="${name}" onerror="this.remove()" />`;
        } else {
          adminAvatarPreview.innerHTML = `
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="12" cy="12" r="10" fill="#cbd5e1"/>
              <circle cx="12" cy="10" r="3.2" fill="#64748b"/>
              <path d="M5.5 18.2c1.9-3 5-4.2 6.5-4.2s4.6 1.2 6.5 4.2c-2.1 1.7-4.6 2.8-6.5 2.8s-4.4-1.1-6.5-2.8z" fill="#64748b"/>
            </svg>`;
        }
      }
    }).catch(() => {});
  }

  function adminLoadProfileIntoForm() {
    if (!sb) return;
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const md = user.user_metadata || {};
      if (adminDisplayNameInput) adminDisplayNameInput.value = md.display_name || md.name || '';
      if (adminPositionInput) adminPositionInput.value = md.position || '';
      if (adminPhoneInput) adminPhoneInput.value = md.phone || '';
      if (adminProfileEmail) adminProfileEmail.textContent = user.email || '';
      // Fill current email in the change-email panel
      const adminCurrentEmailDisplay = document.getElementById('admin_current_email_display');
      if (adminCurrentEmailDisplay) adminCurrentEmailDisplay.value = user.email || '';
      updateAdminProfilePreview();
    }).catch(() => {});
  }

  // Local preview for avatar file selection
  adminAvatarFileInput?.addEventListener('change', function () {
    const file = this.files && this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      if (adminAvatarPreview) {
        adminAvatarPreview.innerHTML = `<img src="${e.target.result}" alt="معاينة الصورة" />`;
      }
    };
    reader.readAsDataURL(file);
  });

  async function uploadAdminAvatarFile(user) {
    const file = adminAvatarFileInput?.files && adminAvatarFileInput.files[0];
    if (!file) return null;
    if (!sb || !user) return null;
    const bucket = 'avatars';
    const ext = (file.name.split('.').pop() || getExtFromType(file.type, 'jpg')).toLowerCase();
    const safeExt = ext.replace(/[^a-z0-9]/gi, '') || 'jpg';
    const path = `${user.id}/avatar-${Date.now()}-${Math.random().toString(36).slice(2,8)}.${safeExt}`;
    const { error: upErr } = await sb.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: false });
    if (upErr) throw upErr;
    const { data } = sb.storage.from(bucket).getPublicUrl(path);
    const publicUrl = data?.publicUrl;
    if (!publicUrl) throw new Error('تعذر الحصول على رابط الصورة');
    return publicUrl;
  }

  adminProfileForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!sb) return;
    if (adminProfileMsg) adminProfileMsg.textContent = '';
    try {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { alert('يلزم تسجيل الدخول'); return; }
      const payload = {
        display_name: (adminDisplayNameInput?.value || '').trim() || null,
        // position is locked by admin; don't allow updating here
        phone: (adminPhoneInput?.value || '').trim() || null,
      };
      payload.name = payload.display_name; // Back-compat
      let avatarUrl = user.user_metadata?.avatar_url || null;
      try {
        const newUrl = await uploadAdminAvatarFile(user);
        if (newUrl) avatarUrl = newUrl;
      } catch (upErr) {
        if (adminProfileMsg) adminProfileMsg.textContent = 'فشل رفع الصورة: ' + (upErr?.message || 'غير معروف');
        return;
      }
      payload.avatar_url = avatarUrl;
      const btn = adminProfileForm.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.style.opacity = .7; }
      const { error } = await sb.auth.updateUser({ data: payload });
      if (error) throw error;
      // Refresh and update UI
      try {
        const { data: { user: fresh } } = await sb.auth.getUser();
        if (fresh) renderUserBadge(fresh);
      } catch {}
      updateAdminProfilePreview();
      if (adminAvatarFileInput) adminAvatarFileInput.value = '';
      if (adminProfileMsg) adminProfileMsg.textContent = 'تم حفظ الملف بنجاح';
    } catch (err) {
      if (adminProfileMsg) adminProfileMsg.textContent = 'تعذر الحفظ: ' + (err?.message || 'غير معروف');
    } finally {
      const btn = adminProfileForm?.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = false; btn.style.opacity = 1; }
    }
  });

  // Image cropping helpers (Cropper.js)
  const imageCropDialog = document.getElementById('imageCropDialog');
  const cropperImage = document.getElementById('cropperImage');
  const cropConfirmBtn = document.getElementById('cropConfirmBtn');
  const cropCancelBtn = document.getElementById('cropCancelBtn');
  const cropAspectSelect = document.getElementById('cropAspectSelect');
  const cropZoomIn = document.getElementById('cropZoomIn');
  const cropZoomOut = document.getElementById('cropZoomOut');
  const cropRotateL = document.getElementById('cropRotateL');
  const cropRotateR = document.getElementById('cropRotateR');
  const cropFlipH = document.getElementById('cropFlipH');
  const cropFlipV = document.getElementById('cropFlipV');
  const cropReset = document.getElementById('cropReset');
  const cropBusy = document.getElementById('cropBusy');
  let activeCropper = null;
  let flipState = { x: 1, y: 1 };

  function destroyActiveCropper() {
    try { activeCropper?.destroy?.(); } catch {}
    activeCropper = null;
  }

  function dataUrlFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function getExtFromType(type, fallbackExt = 'jpg') {
    if (!type) return fallbackExt;
    if (type.includes('png')) return 'png';
    if (type.includes('webp')) return 'webp';
    if (type.includes('gif')) return 'gif';
    if (type.includes('svg')) return 'svg';
    return 'jpg';
  }

  function openImageCropper(file, opts = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!imageCropDialog || !cropperImage || typeof Cropper === 'undefined') {
          // If Cropper not loaded for any reason, fallback: resolve original file
          resolve(file);
          return;
        }
        // Load image preview
        cropperImage.src = await dataUrlFromFile(file);
        // Open dialog
        if (!imageCropDialog.open) imageCropDialog.showModal();
        // Init Cropper
        destroyActiveCropper();
        flipState = { x: 1, y: 1 };
        const initialAspect = (opts.aspectRatio && !Number.isNaN(opts.aspectRatio)) ? opts.aspectRatio : NaN;
        const lockAspect = !!opts.lockAspect;
        if (cropAspectSelect) {
          // preset dropdown based on requested aspect
          const map = { 1: '1', [4/3]: '4/3', [16/9]: '16/9' };
          const val = map[initialAspect] || 'auto';
          cropAspectSelect.value = val;
          // lock aspect selection if requested
          cropAspectSelect.disabled = lockAspect;
        }
        activeCropper = new Cropper(cropperImage, {
          viewMode: 1,
          aspectRatio: initialAspect,
          dragMode: 'move',
          autoCropArea: 1,
          responsive: true,
          background: false,
        });

        const onCancel = () => {
          cleanup();
          reject(new Error('crop-cancelled'));
        };
        const onConfirm = async (e) => {
          e?.preventDefault?.();
          try {
            cropBusy && (cropBusy.style.display = 'inline');
            const cropData = activeCropper.getData(true);
            const naturalW = Math.round(cropData.width);
            const naturalH = Math.round(cropData.height);
            const maxW = Number.isFinite(opts.maxWidth) ? opts.maxWidth : naturalW;
            const maxH = Number.isFinite(opts.maxHeight) ? opts.maxHeight : naturalH;
            // Scale to fit within maxW x maxH
            const scale = Math.min(1, maxW / naturalW, maxH / naturalH);
            const targetW = Math.max(1, Math.round(naturalW * scale));
            const targetH = Math.max(1, Math.round(naturalH * scale));
            const canvas = activeCropper.getCroppedCanvas({
              width: targetW,
              height: targetH,
              imageSmoothingEnabled: true,
              imageSmoothingQuality: 'high',
            });
            const type = opts.mimeType || (file.type && /^image\//.test(file.type) ? file.type : 'image/jpeg');
            const quality = typeof opts.quality === 'number' ? opts.quality : 0.92;
            canvas.toBlob((blob) => {
              if (!blob) {
                onCancel();
                return;
              }
              // Create a File-like object for upload
              const ext = getExtFromType(type);
              const croppedFile = new File([blob], `crop-${Date.now()}.${ext}`, { type });
              cleanup();
              resolve(croppedFile);
            }, type, quality);
          } catch (err) {
            cleanup();
            reject(err);
          }
        };
        function cleanup() {
          try { imageCropDialog.close(); } catch {}
          destroyActiveCropper();
          cropConfirmBtn?.removeEventListener('click', onConfirm);
          cropCancelBtn?.removeEventListener('click', onCancel);
          cropAspectSelect?.removeEventListener('change', onAspectChange);
          cropZoomIn?.removeEventListener('click', onZoomIn);
          cropZoomOut?.removeEventListener('click', onZoomOut);
          cropRotateL?.removeEventListener('click', onRotateL);
          cropRotateR?.removeEventListener('click', onRotateR);
          cropFlipH?.removeEventListener('click', onFlipH);
          cropFlipV?.removeEventListener('click', onFlipV);
          cropReset?.removeEventListener('click', onReset);
          if (cropBusy) cropBusy.style.display = 'none';
        }
        const onAspectChange = () => {
          if (!activeCropper) return;
          const val = cropAspectSelect.value;
          let ar = NaN;
          if (val === '1') ar = 1;
          else if (val === '4/3') ar = 4/3;
          else if (val === '16/9') ar = 16/9;
          activeCropper.setAspectRatio(ar);
        };
        const onZoomIn = () => activeCropper && activeCropper.zoom(0.1);
        const onZoomOut = () => activeCropper && activeCropper.zoom(-0.1);
        const onRotateL = () => activeCropper && activeCropper.rotate(-90);
        const onRotateR = () => activeCropper && activeCropper.rotate(90);
        const onFlipH = () => { if (!activeCropper) return; flipState.x *= -1; activeCropper.scaleX(flipState.x); };
        const onFlipV = () => { if (!activeCropper) return; flipState.y *= -1; activeCropper.scaleY(flipState.y); };
        const onReset = () => { if (!activeCropper) return; activeCropper.reset(); flipState = { x: 1, y: 1 }; };
        if (!lockAspect) cropAspectSelect?.addEventListener('change', onAspectChange);
        cropZoomIn?.addEventListener('click', onZoomIn);
        cropZoomOut?.addEventListener('click', onZoomOut);
        cropRotateL?.addEventListener('click', onRotateL);
        cropRotateR?.addEventListener('click', onRotateR);
        cropFlipH?.addEventListener('click', onFlipH);
        cropFlipV?.addEventListener('click', onFlipV);
        cropReset?.addEventListener('click', onReset);
        cropConfirmBtn?.addEventListener('click', onConfirm);
        cropCancelBtn?.addEventListener('click', onCancel);
        imageCropDialog.addEventListener('close', () => {
          // Ensure cropper destroyed
          destroyActiveCropper();
        }, { once: true });
      } catch (err) {
        reject(err);
      }
    });
  }

  function renderSponsors() {
    if (!sponsorsList) return;
    sponsorsList.innerHTML = '';
    const sorted = [...sponsors].sort((a, b) => (a.order ?? 1_000_000) - (b.order ?? 1_000_000));
    sorted.forEach((item, sortedIndex) => {
      const idx = sponsors.indexOf(item);
      const displayOrder = (item.order ? Number(item.order) : (sortedIndex + 1));
      const node = el(`
        <div class="card draggable-card" data-idx="${idx}" draggable="true">
          <span class="order-chip">#${displayOrder}</span>
          <div class="card__media">
            <img src="${(item.logo || item.logo_url) || ''}" alt="${item.name || ''}" />
            ${item.badge ? `<span class="card__badge">${item.badge}</span>` : ''}
          </div>
          <div class="card__body">
            <div class="card__title">${item.name || ''}</div>
            ${item.description ? `<p class="card__text">${item.description}</p>` : ''}
            ${(item.link || item.link_url) ? `<a class=\"btn btn-outline\" target=\"_blank\" href=\"${item.link || item.link_url}\"><i class=\"fa-solid fa-arrow-up-right-from-square\"></i> موقع</a>` : ''}
            <div class="card__actions">
              <button class="btn btn-outline" data-act="up" data-idx="${idx}" title="تحريك لأعلى"><i class="fa-solid fa-arrow-up"></i></button>
              <button class="btn btn-outline" data-act="down" data-idx="${idx}" title="تحريك لأسفل"><i class="fa-solid fa-arrow-down"></i></button>
              <button class="btn btn-outline drag-handle" title="سحب لإعادة الترتيب"><i class="fa-solid fa-grip-vertical"></i></button>
              <button class="btn btn-outline" data-act="edit" data-idx="${idx}"><i class="fa-solid fa-pen"></i> تعديل</button>
              <button class="btn btn-outline" data-act="del" data-idx="${idx}"><i class="fa-solid fa-trash"></i> حذف</button>
            </div>
          </div>
        </div>`);
      sponsorsList.appendChild(node);
    });
    setupListDnD(sponsorsList, sponsors, KEYS.sponsors, 'sponsors', renderSponsors);
  }

  function renderBoard() {
    if (!boardList) return;
    boardList.innerHTML = '';
    const sorted = [...board].sort((a, b) => (a.order ?? 1_000_000) - (b.order ?? 1_000_000));
    sorted.forEach((item, sortedIndex) => {
      const idx = board.indexOf(item);
      const displayOrder = (item.order ? Number(item.order) : (sortedIndex + 1));
      const node = el(`
        <div class="card draggable-card" data-idx="${idx}" draggable="true">
          <span class="order-chip">#${displayOrder}</span>
          <div class="card__media">
            <img src="${(item.image || item.image_url) || ''}" alt="${item.name || ''}" />
            ${(item.position) ? `<span class="card__badge">${item.position}</span>` : ''}
          </div>
          <div class="card__body">
            <div class="card__title">${item.name || ''}</div>
            <div class="card__actions">
              ${(item.twitter || item.twitter_url) ? `<a class="btn btn-outline" target="_blank" href="${item.twitter || item.twitter_url}"><i class="fab fa-twitter"></i> تويتر</a>` : ''}
              ${(item.linkedin || item.linkedin_url) ? `<a class="btn btn-outline" target="_blank" href="${item.linkedin || item.linkedin_url}"><i class="fab fa-linkedin"></i> لينكدإن</a>` : ''}
              ${item.email ? `<a class="btn btn-outline" href="mailto:${item.email}"><i class="fa-solid fa-envelope"></i> بريد</a>` : ''}
            </div>
            <div class="card__actions">
              <button class="btn btn-outline" data-act="up" data-idx="${idx}" title="تحريك لأعلى"><i class="fa-solid fa-arrow-up"></i></button>
              <button class="btn btn-outline" data-act="down" data-idx="${idx}" title="تحريك لأسفل"><i class="fa-solid fa-arrow-down"></i></button>
              <button class="btn btn-outline drag-handle" title="سحب لإعادة الترتيب"><i class="fa-solid fa-grip-vertical"></i></button>
              <button class="btn btn-outline" data-act="edit" data-idx="${idx}"><i class="fa-solid fa-pen"></i> تعديل</button>
              <button class="btn btn-outline" data-act="del" data-idx="${idx}"><i class="fa-solid fa-trash"></i> حذف</button>
            </div>
          </div>
        </div>`);
      boardList.appendChild(node);
    });
    setupListDnD(boardList, board, KEYS.board, 'board_members', renderBoard);
  }

  function renderFaq() {
    if (!faqList) return;
    faqList.innerHTML = '';
    const sorted = [...faq].sort((a, b) => (a.order ?? 1_000_000) - (b.order ?? 1_000_000));
    sorted.forEach((item, sortedIndex) => {
      const idx = faq.indexOf(item);
      const node = el(`
        <div class="card draggable-card" data-idx="${idx}" draggable="true">
          <span class="order-chip">#${item.order ? Number(item.order) : (sortedIndex + 1)}</span>
          <div class="card__body">
            <div class="card__title">${item.question || ''}</div>
            <p class="card__text" style="margin: 10px 0; color: #666; line-height: 1.5;">${(item.answer || '').substring(0, 150)}${(item.answer || '').length > 150 ? '...' : ''}</p>
            <div class="card__actions">
              <button class="btn btn-outline" data-act="up" data-idx="${idx}" title="تحريك لأعلى"><i class="fa-solid fa-arrow-up"></i></button>
              <button class="btn btn-outline" data-act="down" data-idx="${idx}" title="تحريك لأسفل"><i class="fa-solid fa-arrow-down"></i></button>
              <button class="btn btn-outline drag-handle" title="سحب لإعادة الترتيب"><i class="fa-solid fa-grip-vertical"></i></button>
              <button class="btn btn-outline" data-act="edit" data-idx="${idx}"><i class="fa-solid fa-pen"></i> تعديل</button>
              <button class="btn btn-outline" data-act="del" data-idx="${idx}"><i class="fa-solid fa-trash"></i> حذف</button>
            </div>
          </div>
        </div>`);
      faqList.appendChild(node);
    });
    setupListDnD(faqList, faq, KEYS.faq, 'faq', renderFaq);
  }

  // Dialog helpers
  function openDialog(dialog) {
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    // prevent background scroll while any dialog is open
    document.body.classList.add('no-scroll');
  }
  function closeDialog(dialog) {
    if (!dialog) return;
    if (dialog.open) dialog.close();
    // remove no-scroll only if no other dialogs are still open
    const anyOpen = Array.from(document.querySelectorAll('.admin-dialog')).some(d => d.open);
    if (!anyOpen) document.body.classList.remove('no-scroll');
  }

  // Ensure no-scroll is removed when dialogs are closed directly (e.g., via inline close buttons)
  Array.from(document.querySelectorAll('.admin-dialog')).forEach(dlg => {
    dlg.addEventListener('close', () => {
      const anyOpen = Array.from(document.querySelectorAll('.admin-dialog')).some(d => d.open);
      if (!anyOpen) document.body.classList.remove('no-scroll');
    });
  });

  // Works CRUD
  const workDialog = $('#workDialog');
  const workForm = $('#workForm');
  let workEditingIndex = null; // number | null
  // Works image upload elements
  const workImageFile = document.getElementById('work_image_file');
  const workImageUrl = document.getElementById('work_image_url');
  const workImagePreview = document.getElementById('work_image_preview');
  const workDropzone = document.getElementById('workDropzone');
  const workBrowseBtn = document.getElementById('workBrowseBtn');
  const workImageHelp = document.getElementById('work_image_help');
  const workImageActions = document.getElementById('workImageActions');
  const workEditImageBtn = document.getElementById('work_edit_image_btn');
  const workChangeImageBtn = document.getElementById('work_change_image_btn');
  let workCroppedFile = null; // File | null

  // Reusable: handle a selected/dropped file -> crop -> preview
  async function handleWorkImageFile(file) {
    if (!file) return;
    // Basic validation (type + size hint ~5MB)
    if (!(file.type || '').startsWith('image/')) {
      alert('الملف ليس صورة');
      return;
    }
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      if (!confirm('حجم الصورة يتجاوز 5MB. هل تريد المتابعة على أي حال؟')) return;
    }
    try {
      const cropped = await openImageCropper(file, { aspectRatio: 16/9, lockAspect: true, maxWidth: 1600, maxHeight: 1600, mimeType: 'image/webp', quality: 0.9 });
      workCroppedFile = cropped;
      const url = URL.createObjectURL(cropped);
      if (workImagePreview) {
        workImagePreview.src = url;
        workImagePreview.style.display = 'block';
      }
      // When a new file is chosen, prefer showing actions instead of dropzone (useful during edit)
      if (workImageActions) workImageActions.style.display = 'flex';
      if (workDropzone) workDropzone.style.display = 'none';
      if (workImageHelp) workImageHelp.style.display = 'none';
    } catch (err) {
      // if cancelled, clear selection
      if (workImageFile) workImageFile.value = '';
    }
  }

  // Utility: fetch an image URL and return a File for cropping
  async function fetchUrlAsFile(url, filenameBase = 'image') {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const blob = await res.blob();
    const ext = getExtFromType(blob.type || 'image/jpeg', 'jpg');
    return new File([blob], `${filenameBase}.${ext}`, { type: blob.type || 'image/jpeg' });
  }

  // Input change -> handle
  workImageFile?.addEventListener('change', async () => {
    const file = workImageFile.files && workImageFile.files[0];
    await handleWorkImageFile(file);
  });

  // Dropzone interactions (click, keyboard, drag & drop)
  // Explicit browse click (span with id=workBrowseBtn)
  workBrowseBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    workImageFile?.click();
  });
  // Clicking the dropzone itself
  workDropzone?.addEventListener('click', (e) => {
    // Prevent implicit label->file input activation to avoid double dialogs
    e.preventDefault();
    e.stopPropagation();
    // If clicking the inner browse span, the handler above already runs, so no need here
    if ((e.target instanceof HTMLElement) && e.target.closest('#workBrowseBtn')) return;
    workImageFile?.click();
  });
  workDropzone?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      workImageFile?.click();
    }
  });
  workDropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    workDropzone.classList.add('dragover');
  });
  workDropzone?.addEventListener('dragleave', () => {
    workDropzone.classList.remove('dragover');
  });
  workDropzone?.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    workDropzone.classList.remove('dragover');
    const dt = e.dataTransfer;
    if (!dt) return;
    let file = null;
    if (dt.files && dt.files.length) file = dt.files[0];
    if (!file && dt.items && dt.items.length) {
      const item = Array.from(dt.items).find(i => i.kind === 'file');
      if (item) file = item.getAsFile();
    }
    await handleWorkImageFile(file);
  });

  // Image actions in edit mode
  workChangeImageBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    workImageFile?.click();
  });

  workEditImageBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      const src = (workImagePreview && workImagePreview.src) || (workImageUrl && workImageUrl.value) || '';
      if (!src) { alert('لا توجد صورة لتحريرها'); return; }
      const file = await fetchUrlAsFile(src, 'current');
      const cropped = await openImageCropper(file, { aspectRatio: 16/9, lockAspect: true, maxWidth: 1600, maxHeight: 1600, mimeType: 'image/webp', quality: 0.9 });
      workCroppedFile = cropped;
      const url = URL.createObjectURL(cropped);
      if (workImagePreview) { workImagePreview.src = url; workImagePreview.style.display = 'block'; }
      if (workImageActions) workImageActions.style.display = 'flex';
      if (workDropzone) workDropzone.style.display = 'none';
      if (workImageHelp) workImageHelp.style.display = 'none';
    } catch (err) {
      if (String(err?.message || '').includes('crop-cancelled')) return; // ignore cancel
      alert('تعذر تحرير الصورة الحالية. جرّب تغيير الصورة بدلًا من ذلك.');
    }
  });

  // Helper: upload selected Works image file to Supabase Storage and return public URL
  async function uploadSelectedWorkImage() {
    const file = workCroppedFile || (workImageFile?.files && workImageFile.files[0]);
    if (!file) return null; // nothing to upload
    if (!sb) return null; // cannot upload without Supabase
    const bucket = 'adeeb-site'; // dedicated site bucket
    const ext = (file.name.split('.').pop() || getExtFromType(file.type, 'jpg')).toLowerCase();
    const safeExt = ext.replace(/[^a-z0-9]/gi, '') || 'jpg';
    const path = `works/work-${Date.now()}-${Math.random().toString(36).slice(2,8)}.${safeExt}`; // store under works/
    const { error: upErr } = await sb.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: false });
    if (upErr) throw upErr;
    const { data } = sb.storage.from(bucket).getPublicUrl(path);
    const publicUrl = data?.publicUrl;
    if (!publicUrl) throw new Error('تعذر الحصول على رابط الصورة');
    return publicUrl;
  }

  $('#addWorkBtn')?.addEventListener('click', () => {
    workEditingIndex = null;
    workForm.reset();
    // clear preview and hidden url when adding
    if (workImagePreview) { workImagePreview.src = ''; workImagePreview.style.display = 'none'; }
    if (workImageUrl) workImageUrl.value = '';
    workCroppedFile = null;
    // Show dropzone in add mode, hide actions
    if (workDropzone) workDropzone.style.display = '';
    if (workImageActions) workImageActions.style.display = 'none';
    if (workImageHelp) workImageHelp.style.display = '';
    openDialog(workDialog);
  });

  worksList?.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const act = btn.dataset.act;
    if (act === 'up' || act === 'down') {
      if (!Number.isInteger(idx) || idx < 0 || idx >= works.length) return;
      const newIndex = act === 'up' ? Math.max(0, idx - 1) : Math.min(works.length - 1, idx + 1);
      if (newIndex === idx) return;
      const [moved] = works.splice(idx, 1);
      works.splice(newIndex, 0, moved);
      normalizeAndPersistOrder(works, KEYS.works, 'works').then(() => {
        renderWorks();
      });
      return;
    }
    if (act === 'edit') {
      workEditingIndex = idx;
      const cur = works[idx];
      workForm.title.value = cur.title || '';
      workForm.category.value = cur.category || '';
      if (workForm.order) workForm.order.value = cur.order || '';
      // fill hidden url and preview instead of URL input
      const imgUrl = (cur.image || cur.image_url) || '';
      if (workImageUrl) workImageUrl.value = imgUrl;
      if (workImagePreview) {
        if (imgUrl) { workImagePreview.src = imgUrl; workImagePreview.style.display = 'block'; }
        else { workImagePreview.src = ''; workImagePreview.style.display = 'none'; }
      }
      // clear any selected file
      if (workImageFile) workImageFile.value = '';
      workCroppedFile = null;
      workForm.link.value = (cur.link || cur.link_url) || '';
      // In edit mode: if we have an image, hide dropzone and show actions; otherwise, show dropzone
      if (imgUrl) {
        if (workDropzone) workDropzone.style.display = 'none';
        if (workImageActions) workImageActions.style.display = 'flex';
        if (workImageHelp) workImageHelp.style.display = 'none';
      } else {
        if (workDropzone) workDropzone.style.display = '';
        if (workImageActions) workImageActions.style.display = 'none';
        if (workImageHelp) workImageHelp.style.display = '';
      }
      openDialog(workDialog);
    } else if (act === 'del') {
      if (!confirm('تأكيد الحذف؟')) return;
      const cur = works[idx];
      if (sb && cur.id) {
        sb.from('works').delete().eq('id', cur.id).then(({ error }) => {
          if (error) return alert('فشل الحذف: ' + error.message);
          works.splice(idx, 1);
          renderWorks();
        });
      } else {
        works.splice(idx, 1);
        save(KEYS.works, works);
        renderWorks();
      }
    }
  });

  workForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Determine final image URL: upload if a new file is selected, else use hidden value
    let finalImageUrl = (workImageUrl?.value || '').trim();
    try {
      const uploaded = await uploadSelectedWorkImage();
      if (uploaded) finalImageUrl = uploaded;
    } catch (upErr) {
      return alert('فشل رفع الصورة: ' + (upErr?.message || 'غير معروف'));
    }
    workCroppedFile = null;
    // Determine order to keep when editing: if item has no order, compute from current sorted position
    let orderToKeep = null;
    if (workEditingIndex !== null) {
      const existingOrder = works[workEditingIndex]?.order ?? null;
      if (existingOrder === null || existingOrder === undefined) {
        const sortedForOrder = [...works].sort((a, b) => (a.order ?? 1_000_000) - (b.order ?? 1_000_000));
        const curItem = works[workEditingIndex];
        const pos = sortedForOrder.indexOf(curItem);
        orderToKeep = pos >= 0 ? (pos + 1) : null;
      } else {
        orderToKeep = existingOrder;
      }
    }
    const data = {
      title: workForm.title.value.trim(),
      category: workForm.category.value.trim(),
      image: finalImageUrl,
      link: workForm.link.value.trim(),
      order: orderToKeep,
    };
    if (sb) {
      // require auth for write
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return alert('يلزم تسجيل الدخول لإجراء التعديلات');
      const payload = { title: data.title, category: data.category || null, image_url: data.image || null, link_url: data.link || null, order: data.order };
      const payloadNoOrder = { title: data.title, category: data.category || null, image_url: data.image || null, link_url: data.link || null };
      if (workEditingIndex === null) {
        let row, error;
        ({ data: row, error } = await sb.from('works').insert(payload).select('*').single());
        if (error && /(column\s+order|unknown column|invalid input)/i.test(error.message || '')) {
          const res2 = await sb.from('works').insert(payloadNoOrder).select('*').single();
          if (res2.error) return alert('فشل الحفظ: ' + res2.error.message);
          works.unshift({ ...res2.data, order: data.order });
        } else if (error) {
          return alert('فشل الحفظ: ' + error.message);
        } else {
          works.unshift(row);
        }
        renderWorks();
        closeDialog(workDialog);
      } else {
        const id = works[workEditingIndex]?.id;
        if (!id) { alert('عنصر بدون معرف، لا يمكن التحديث'); return; }
        let row, error;
        ({ data: row, error } = await sb.from('works').update(payload).eq('id', id).select('*').single());
        if (error && /(column\s+order|unknown column|invalid input)/i.test(error.message || '')) {
          const res2 = await sb.from('works').update(payloadNoOrder).eq('id', id).select('*').single();
          if (res2.error) return alert('فشل التحديث: ' + res2.error.message);
          works[workEditingIndex] = { ...res2.data, order: data.order };
        } else if (error) {
          return alert('فشل التحديث: ' + error.message);
        } else {
          works[workEditingIndex] = row;
        }
        renderWorks();
        closeDialog(workDialog);
      }
    } else {
      if (workEditingIndex === null) {
        works.unshift(data);
      } else {
        works[workEditingIndex] = data;
      }
      save(KEYS.works, works);
      renderWorks();
      closeDialog(workDialog);
    }
  });

  // Sponsors CRUD
  const sponsorDialog = $('#sponsorDialog');
  const sponsorForm = $('#sponsorForm');
  let sponsorEditingIndex = null;
  // Sponsor logo upload elements
  const sponsorLogoFile = document.getElementById('sponsor_logo_file');
  const sponsorLogoUrl = document.getElementById('sponsor_logo_url');
  const sponsorLogoPreview = document.getElementById('sponsor_logo_preview');
  const sponsorDropzone = document.getElementById('sponsorDropzone');
  const sponsorBrowseBtn = document.getElementById('sponsorBrowseBtn');
  const sponsorImageActions = document.getElementById('sponsorImageActions');
  const sponsorEditLogoBtn = document.getElementById('sponsor_edit_logo_btn');
  const sponsorChangeLogoBtn = document.getElementById('sponsor_change_logo_btn');
  let sponsorCroppedFile = null;

  // Reusable: handle sponsor logo file (crop 1:1) -> preview
  async function handleSponsorLogoFile(file) {
    if (!file) return;
    if (!(file.type || '').startsWith('image/')) { alert('الملف ليس صورة'); return; }
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) { if (!confirm('حجم الشعار يتجاوز 5MB. المتابعة؟')) return; }
    try {
      const preferPng = /png/i.test(file.type || '') || /\.(png)$/i.test(file.name || '');
      const cropped = await openImageCropper(file, { aspectRatio: 1, lockAspect: true, maxWidth: 800, maxHeight: 800, mimeType: preferPng ? 'image/png' : 'image/webp', quality: preferPng ? 1.0 : 0.9 });
      sponsorCroppedFile = cropped;
      const url = URL.createObjectURL(cropped);
      if (sponsorLogoPreview) { sponsorLogoPreview.src = url; sponsorLogoPreview.style.display = 'block'; }
      // Toggle UI like Works: show actions, hide dropzone
      if (sponsorImageActions) sponsorImageActions.style.display = 'flex';
      if (sponsorDropzone) sponsorDropzone.style.display = 'none';
    } catch (err) {
      if (sponsorLogoFile) sponsorLogoFile.value = '';
    }
  }
  // Input change -> handle
  sponsorLogoFile?.addEventListener('change', async () => {
    const file = sponsorLogoFile.files && sponsorLogoFile.files[0];
    await handleSponsorLogoFile(file);
  });

  // Dropzone interactions for sponsor
  sponsorBrowseBtn?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); sponsorLogoFile?.click(); });
  sponsorDropzone?.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    if ((e.target instanceof HTMLElement) && e.target.closest('#sponsorBrowseBtn')) return;
    sponsorLogoFile?.click();
  });
  sponsorDropzone?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sponsorLogoFile?.click(); }
  });
  sponsorDropzone?.addEventListener('dragover', (e) => { e.preventDefault(); sponsorDropzone.classList.add('dragover'); });
  sponsorDropzone?.addEventListener('dragleave', () => { sponsorDropzone.classList.remove('dragover'); });
  sponsorDropzone?.addEventListener('drop', async (e) => {
    e.preventDefault(); e.stopPropagation(); sponsorDropzone.classList.remove('dragover');
    const dt = e.dataTransfer; if (!dt) return;
    let file = null;
    if (dt.files && dt.files.length) file = dt.files[0];
    if (!file && dt.items && dt.items.length) { const item = Array.from(dt.items).find(i => i.kind === 'file'); if (item) file = item.getAsFile(); }
    await handleSponsorLogoFile(file);
  });

  // Sponsor image actions
  sponsorChangeLogoBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    sponsorLogoFile?.click();
  });

  sponsorEditLogoBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      const src = (sponsorLogoPreview && sponsorLogoPreview.src) || (sponsorLogoUrl && sponsorLogoUrl.value) || '';
      if (!src) { alert('لا يوجد شعار لتحريره'); return; }
      const file = await fetchUrlAsFile(src, 'current-logo');
      const preferPng = /png/i.test(file.type || '') || /\.(png)$/i.test(file.name || '');
      const cropped = await openImageCropper(file, { aspectRatio: 1, lockAspect: true, maxWidth: 800, maxHeight: 800, mimeType: preferPng ? 'image/png' : 'image/webp', quality: preferPng ? 1.0 : 0.9 });
      sponsorCroppedFile = cropped;
      const url = URL.createObjectURL(cropped);
      if (sponsorLogoPreview) { sponsorLogoPreview.src = url; sponsorLogoPreview.style.display = 'block'; }
      if (sponsorImageActions) sponsorImageActions.style.display = 'flex';
      if (sponsorDropzone) sponsorDropzone.style.display = 'none';
    } catch (err) {
      if (String(err?.message || '').includes('crop-cancelled')) return;
      alert('تعذر تحرير الشعار الحالي. جرّب تغيير الشعار بدلًا من ذلك.');
    }
  });

  // Upload sponsor logo to Supabase Storage
  async function uploadSponsorLogo() {
    const file = sponsorCroppedFile || (sponsorLogoFile?.files && sponsorLogoFile.files[0]);
    if (!file) return null;
    if (!sb) return null;
    const bucket = 'adeeb-site';
    const ext = (file.name.split('.').pop() || getExtFromType(file.type, 'png')).toLowerCase();
    const safeExt = ext.replace(/[^a-z0-9]/gi, '') || 'png';
    const path = `sponsors/sponsor-${Date.now()}-${Math.random().toString(36).slice(2,8)}.${safeExt}`;
    const { error: upErr } = await sb.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: false });
    if (upErr) throw upErr;
    const { data } = sb.storage.from(bucket).getPublicUrl(path);
    const publicUrl = data?.publicUrl;
    if (!publicUrl) throw new Error('تعذر الحصول على رابط الشعار');
    return publicUrl;
  }

  $('#addSponsorBtn')?.addEventListener('click', () => {
    sponsorEditingIndex = null;
    sponsorForm.reset();
    if (sponsorLogoPreview) { sponsorLogoPreview.src = ''; sponsorLogoPreview.style.display = 'none'; }
    if (sponsorLogoUrl) sponsorLogoUrl.value = '';
    sponsorCroppedFile = null;
    // Show dropzone in add mode, hide actions
    if (sponsorDropzone) sponsorDropzone.style.display = '';
    if (sponsorImageActions) sponsorImageActions.style.display = 'none';
    openDialog(sponsorDialog);
  });

  sponsorsList?.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const act = btn.dataset.act;
    if (act === 'up' || act === 'down') {
      if (!Number.isInteger(idx) || idx < 0 || idx >= sponsors.length) return;
      const newIndex = act === 'up' ? Math.max(0, idx - 1) : Math.min(sponsors.length - 1, idx + 1);
      if (newIndex === idx) return;
      const [moved] = sponsors.splice(idx, 1);
      sponsors.splice(newIndex, 0, moved);
      normalizeAndPersistOrder(sponsors, KEYS.sponsors, 'sponsors').then(() => {
        renderSponsors();
      });
      return;
    }
    if (act === 'edit') {
      sponsorEditingIndex = idx;
      const cur = sponsors[idx];
      sponsorForm.name.value = cur.name || '';
      sponsorForm.badge.value = cur.badge || '';
      sponsorForm.description.value = cur.description || '';
      if (sponsorForm.order) sponsorForm.order.value = cur.order || '';
      const logoUrl = (cur.logo || cur.logo_url) || '';
      if (sponsorLogoUrl) sponsorLogoUrl.value = logoUrl;
      if (sponsorLogoPreview) {
        if (logoUrl) { sponsorLogoPreview.src = logoUrl; sponsorLogoPreview.style.display = 'block'; }
        else { sponsorLogoPreview.src = ''; sponsorLogoPreview.style.display = 'none'; }
      }
      if (sponsorLogoFile) sponsorLogoFile.value = '';
      sponsorCroppedFile = null;
      sponsorForm.link.value = (cur.link || cur.link_url) || '';
      // Toggle actions/dropzone depending on existing image
      if (logoUrl) {
        if (sponsorDropzone) sponsorDropzone.style.display = 'none';
        if (sponsorImageActions) sponsorImageActions.style.display = 'flex';
      } else {
        if (sponsorDropzone) sponsorDropzone.style.display = '';
        if (sponsorImageActions) sponsorImageActions.style.display = 'none';
      }
      openDialog(sponsorDialog);
    } else if (act === 'del') {
      if (!confirm('تأكيد الحذف؟')) return;
      const cur = sponsors[idx];
      if (sb && cur.id) {
        sb.from('sponsors').delete().eq('id', cur.id).then(({ error }) => {
          if (error) return alert('فشل الحذف: ' + error.message);
          sponsors.splice(idx, 1);
          renderSponsors();
        });
      } else {
        sponsors.splice(idx, 1);
        save(KEYS.sponsors, sponsors);
        renderSponsors();
      }
    }
  });

  sponsorForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    // determine final logo url
    let finalLogoUrl = (sponsorLogoUrl?.value || '').trim();
    try {
      const uploaded = await uploadSponsorLogo();
      if (uploaded) finalLogoUrl = uploaded;
    } catch (err) {
      return alert('فشل رفع الشعار: ' + (err?.message || 'غير معروف'));
    }
    sponsorCroppedFile = null;
    const data = {
      name: sponsorForm.name.value.trim(),
      badge: sponsorForm.badge.value.trim(),
      description: sponsorForm.description.value.trim(),
      logo: finalLogoUrl,
      link: sponsorForm.link.value.trim(),
      // Keep existing order when editing so we don't reset it to null
      order: (sponsorEditingIndex !== null)
        ? (sponsors[sponsorEditingIndex]?.order ?? null)
        : null,
    };
    if (sb) {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return alert('يلزم تسجيل الدخول لإجراء التعديلات');
      const payload = { name: data.name, badge: data.badge || null, description: data.description || null, logo_url: data.logo || null, link_url: data.link || null, order: data.order };
      const payloadNoDesc = { name: data.name, badge: data.badge || null, logo_url: data.logo || null, link_url: data.link || null, order: data.order };
      const payloadNoDescNoOrder = { name: data.name, badge: data.badge || null, logo_url: data.logo || null, link_url: data.link || null };
      if (sponsorEditingIndex === null) {
        let row, error;
        ({ data: row, error } = await sb.from('sponsors').insert(payload).select('*').single());
        if (error && /(column\s+description|invalid input|unknown column)/i.test(error.message || '')) {
          const res2 = await sb.from('sponsors').insert(payloadNoDesc).select('*').single();
          if (res2.error) return alert('فشل الحفظ: ' + res2.error.message);
          sponsors.unshift({ ...res2.data, description: data.description || '' });
        } else if (error && /(column\s+order|unknown column|invalid input)/i.test(error.message || '')) {
          const res3 = await sb.from('sponsors').insert(payloadNoDescNoOrder).select('*').single();
          if (res3.error) return alert('فشل الحفظ: ' + res3.error.message);
          sponsors.unshift({ ...res3.data, description: data.description || '', order: data.order });
        } else if (error) {
          return alert('فشل الحفظ: ' + error.message);
        } else {
          sponsors.unshift({ ...row, description: data.description || '' });
        }
        renderSponsors();
        closeDialog(sponsorDialog);
      } else {
        const id = sponsors[sponsorEditingIndex]?.id;
        if (!id) { alert('عنصر بدون معرف، لا يمكن التحديث'); return; }
        let row, error;
        ({ data: row, error } = await sb.from('sponsors').update(payload).eq('id', id).select('*').single());
        if (error && /(column\s+description|invalid input|unknown column)/i.test(error.message || '')) {
          const res2 = await sb.from('sponsors').update(payloadNoDesc).eq('id', id).select('*').single();
          if (res2.error) return alert('فشل التحديث: ' + res2.error.message);
          sponsors[sponsorEditingIndex] = { ...res2.data, description: data.description || '' };
        } else if (error && /(column\s+order|unknown column|invalid input)/i.test(error.message || '')) {
          const res3 = await sb.from('sponsors').update(payloadNoDescNoOrder).eq('id', id).select('*').single();
          if (res3.error) return alert('فشل التحديث: ' + res3.error.message);
          sponsors[sponsorEditingIndex] = { ...res3.data, description: data.description || '', order: data.order };
        } else if (error) {
          return alert('فشل التحديث: ' + error.message);
        } else {
          sponsors[sponsorEditingIndex] = { ...row, description: data.description || '' };
        }
        renderSponsors();
        closeDialog(sponsorDialog);
      }
    } else {
      if (sponsorEditingIndex === null) sponsors.unshift(data);
      else sponsors[sponsorEditingIndex] = data;
      save(KEYS.sponsors, sponsors);
      renderSponsors();
      closeDialog(sponsorDialog);
    }
  });

  // Board CRUD
  const boardDialog = $('#boardDialog');
  const boardForm = $('#boardForm');
  let boardEditingIndex = null;
  // Board image upload elements
  const boardImageFile = document.getElementById('board_image_file');
  const boardImageUrl = document.getElementById('board_image_url');
  const boardImagePreview = document.getElementById('board_image_preview');
  const boardDropzone = document.getElementById('boardDropzone');
  const boardBrowseBtn = document.getElementById('boardBrowseBtn');
  const boardImageActions = document.getElementById('boardImageActions');
  const boardEditImageBtn = document.getElementById('board_edit_image_btn');
  const boardChangeImageBtn = document.getElementById('board_change_image_btn');
  let boardCroppedFile = null;

  // Reusable: handle board image file (crop 1:1) -> preview
  async function handleBoardImageFile(file) {
    if (!file) return;
    if (!(file.type || '').startsWith('image/')) { alert('الملف ليس صورة'); return; }
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) { if (!confirm('حجم الصورة يتجاوز 5MB. المتابعة؟')) return; }
    try {
      const cropped = await openImageCropper(file, { aspectRatio: 1, lockAspect: true, maxWidth: 1200, maxHeight: 1200, mimeType: 'image/webp', quality: 0.9 });
      boardCroppedFile = cropped;
      const url = URL.createObjectURL(cropped);
      if (boardImagePreview) { boardImagePreview.src = url; boardImagePreview.style.display = 'block'; }
      if (boardImageActions) boardImageActions.style.display = 'flex';
      if (boardDropzone) boardDropzone.style.display = 'none';
    } catch (err) {
      if (boardImageFile) boardImageFile.value = '';
    }
  }
  // Input change -> handle
  boardImageFile?.addEventListener('change', async () => {
    const file = boardImageFile.files && boardImageFile.files[0];
    await handleBoardImageFile(file);
  });
  // Dropzone interactions for board
  boardBrowseBtn?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); boardImageFile?.click(); });
  boardDropzone?.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    if ((e.target instanceof HTMLElement) && e.target.closest('#boardBrowseBtn')) return;
    boardImageFile?.click();
  });
  boardDropzone?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); boardImageFile?.click(); }
  });
  boardDropzone?.addEventListener('dragover', (e) => { e.preventDefault(); boardDropzone.classList.add('dragover'); });
  boardDropzone?.addEventListener('dragleave', () => { boardDropzone.classList.remove('dragover'); });
  boardDropzone?.addEventListener('drop', async (e) => {
    e.preventDefault(); e.stopPropagation(); boardDropzone.classList.remove('dragover');
    const dt = e.dataTransfer; if (!dt) return;
    let file = null;
    if (dt.files && dt.files.length) file = dt.files[0];
    if (!file && dt.items && dt.items.length) { const item = Array.from(dt.items).find(i => i.kind === 'file'); if (item) file = item.getAsFile(); }
    await handleBoardImageFile(file);
  });

  // Board image actions
  boardChangeImageBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    boardImageFile?.click();
  });

  boardEditImageBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      const src = (boardImagePreview && boardImagePreview.src) || (boardImageUrl && boardImageUrl.value) || '';
      if (!src) { alert('لا توجد صورة لتحريرها'); return; }
      const file = await fetchUrlAsFile(src, 'current');
      const cropped = await openImageCropper(file, { aspectRatio: 1, lockAspect: true, maxWidth: 1200, maxHeight: 1200, mimeType: 'image/webp', quality: 0.9 });
      boardCroppedFile = cropped;
      const url = URL.createObjectURL(cropped);
      if (boardImagePreview) { boardImagePreview.src = url; boardImagePreview.style.display = 'block'; }
      if (boardImageActions) boardImageActions.style.display = 'flex';
      if (boardDropzone) boardDropzone.style.display = 'none';
    } catch (err) {
      if (String(err?.message || '').includes('crop-cancelled')) return;
      alert('تعذر تحرير الصورة الحالية. جرّب تغيير الصورة بدلًا من ذلك.');
    }
  });

  // Upload board member image to Supabase Storage
  async function uploadBoardImage() {
    const file = boardCroppedFile || (boardImageFile?.files && boardImageFile.files[0]);
    if (!file) return null;
    if (!sb) return null;
    const bucket = 'adeeb-site';
    const ext = (file.name.split('.').pop() || getExtFromType(file.type, 'jpg')).toLowerCase();
    const safeExt = ext.replace(/[^a-z0-9]/gi, '') || 'jpg';
    const path = `board/member-${Date.now()}-${Math.random().toString(36).slice(2,8)}.${safeExt}`;
    const { error: upErr } = await sb.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: false });
    if (upErr) throw upErr;
    const { data } = sb.storage.from(bucket).getPublicUrl(path);
    const publicUrl = data?.publicUrl;
    if (!publicUrl) throw new Error('تعذر الحصول على رابط الصورة');
    return publicUrl;
  }

  $('#addBoardBtn')?.addEventListener('click', () => {
    boardEditingIndex = null;
    boardForm.reset();
    if (boardImagePreview) { boardImagePreview.src = ''; boardImagePreview.style.display = 'none'; }
    if (boardImageUrl) boardImageUrl.value = '';
    boardCroppedFile = null;
    if (boardDropzone) boardDropzone.style.display = '';
    if (boardImageActions) boardImageActions.style.display = 'none';
    openDialog(boardDialog);
  });

  boardList?.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const act = btn.dataset.act;
    if (act === 'up' || act === 'down') {
      if (!Number.isInteger(idx) || idx < 0 || idx >= board.length) return;
      const newIndex = act === 'up' ? Math.max(0, idx - 1) : Math.min(board.length - 1, idx + 1);
      if (newIndex === idx) return;
      const [moved] = board.splice(idx, 1);
      board.splice(newIndex, 0, moved);
      normalizeAndPersistOrder(board, KEYS.board, 'board_members').then(() => {
        renderBoard();
      });
      return;
    }
    if (act === 'edit') {
      boardEditingIndex = idx;
      const cur = board[idx];
      boardForm.name.value = cur.name || '';
      boardForm.position.value = cur.position || '';
      if (boardForm.order) boardForm.order.value = cur.order || '';
      const imgUrl = (cur.image || cur.image_url) || '';
      if (boardImageUrl) boardImageUrl.value = imgUrl;
      if (boardImagePreview) {
        if (imgUrl) { boardImagePreview.src = imgUrl; boardImagePreview.style.display = 'block'; }
        else { boardImagePreview.src = ''; boardImagePreview.style.display = 'none'; }
      }
      if (boardImageFile) boardImageFile.value = '';
      boardCroppedFile = null;
      boardForm.twitter.value = (cur.twitter || cur.twitter_url) || '';
      boardForm.linkedin.value = (cur.linkedin || cur.linkedin_url) || '';
      boardForm.email.value = cur.email || '';
      if (imgUrl) {
        if (boardDropzone) boardDropzone.style.display = 'none';
        if (boardImageActions) boardImageActions.style.display = 'flex';
      } else {
        if (boardDropzone) boardDropzone.style.display = '';
        if (boardImageActions) boardImageActions.style.display = 'none';
      }
      openDialog(boardDialog);
    } else if (act === 'del') {
      if (!confirm('تأكيد الحذف؟')) return;
      const cur = board[idx];
      if (sb && cur.id) {
        sb.from('board_members').delete().eq('id', cur.id).then(({ error }) => {
          if (error) return alert('فشل الحذف: ' + error.message);
          board.splice(idx, 1);
          renderBoard();
        });
      } else {
        board.splice(idx, 1);
        save(KEYS.board, board);
        renderBoard();
      }
    }
  });

  boardForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    // determine final image url
    let finalImgUrl = (boardImageUrl?.value || '').trim();
    try {
      const uploaded = await uploadBoardImage();
      if (uploaded) finalImgUrl = uploaded;
    } catch (err) {
      return alert('فشل رفع الصورة: ' + (err?.message || 'غير معروف'));
    }
    boardCroppedFile = null;
    const data = {
      name: boardForm.name.value.trim(),
      position: boardForm.position.value.trim(),
      image: finalImgUrl,
      twitter: boardForm.twitter.value.trim(),
      linkedin: boardForm.linkedin.value.trim(),
      email: boardForm.email.value.trim(),
      // Keep existing order when editing so we don't reset it to null
      order: (boardEditingIndex !== null)
        ? (board[boardEditingIndex]?.order ?? null)
        : null,
    };
    if (sb) {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return alert('يلزم تسجيل الدخول لإجراء التعديلات');
      const payload = {
        name: data.name,
        position: data.position,
        image_url: data.image || null,
        twitter_url: data.twitter || null,
        linkedin_url: data.linkedin || null,
        email: data.email || null,
        order: data.order,
      };
      const payloadNoOrder = { ...payload }; delete payloadNoOrder.order;
      if (boardEditingIndex === null) {
        let row, error;
        ({ data: row, error } = await sb.from('board_members').insert(payload).select('*').single());
        if (error && /(column\s+order|unknown column|invalid input)/i.test(error.message || '')) {
          const res2 = await sb.from('board_members').insert(payloadNoOrder).select('*').single();
          if (res2.error) return alert('فشل الحفظ: ' + res2.error.message);
          board.unshift({ ...res2.data, order: data.order });
        } else if (error) {
          return alert('فشل الحفظ: ' + error.message);
        } else {
          board.unshift(row);
        }
        renderBoard();
        closeDialog(boardDialog);
      } else {
        const id = board[boardEditingIndex]?.id;
        if (!id) { alert('عنصر بدون معرف، لا يمكن التحديث'); return; }
        let row, error;
        ({ data: row, error } = await sb.from('board_members').update(payload).eq('id', id).select('*').single());
        if (error && /(column\s+order|unknown column|invalid input)/i.test(error.message || '')) {
          const res2 = await sb.from('board_members').update(payloadNoOrder).eq('id', id).select('*').single();
          if (res2.error) return alert('فشل التحديث: ' + res2.error.message);
          board[boardEditingIndex] = { ...res2.data, order: data.order };
        } else if (error) {
          return alert('فشل التحديث: ' + error.message);
        } else {
          board[boardEditingIndex] = row;
        }
        renderBoard();
        closeDialog(boardDialog);
      }
    } else {
      if (boardEditingIndex === null) board.unshift(data);
      else board[boardEditingIndex] = data;
      save(KEYS.board, board);
      renderBoard();
      closeDialog(boardDialog);
    }
  });

  // FAQ CRUD
  const faqDialog = $('#faqDialog');
  const faqForm = $('#faqForm');
  let faqEditingIndex = null;

  $('#addFaqBtn')?.addEventListener('click', () => {
    faqEditingIndex = null;
    faqForm.reset();
    openDialog(faqDialog);
  });

  faqList?.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const act = btn.dataset.act;
    if (act === 'up' || act === 'down') {
      if (!Number.isInteger(idx) || idx < 0 || idx >= faq.length) return;
      const newIndex = act === 'up' ? Math.max(0, idx - 1) : Math.min(faq.length - 1, idx + 1);
      if (newIndex === idx) return;
      const [moved] = faq.splice(idx, 1);
      faq.splice(newIndex, 0, moved);
      normalizeAndPersistOrder(faq, KEYS.faq, 'faq').then(() => {
        renderFaq();
      });
      return;
    }
    if (act === 'edit') {
      faqEditingIndex = idx;
      const cur = faq[idx];
      faqForm.question.value = cur.question || '';
      faqForm.answer.value = cur.answer || '';
      if (faqForm.order) faqForm.order.value = cur.order || '';
      openDialog(faqDialog);
    } else if (act === 'del') {
      if (!confirm('تأكيد الحذف؟')) return;
      const cur = faq[idx];
      if (sb && cur.id) {
        sb.from('faq').delete().eq('id', cur.id).then(({ error }) => {
          if (error) return alert('فشل الحذف: ' + error.message);
          faq.splice(idx, 1);
          renderFaq();
        });
      } else {
        faq.splice(idx, 1);
        save(KEYS.faq, faq);
        renderFaq();
      }
    }
  });

  faqForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      question: faqForm.question.value.trim(),
      answer: faqForm.answer.value.trim(),
      // Keep existing order when editing so we don't reset it to null
      order: (faqEditingIndex !== null)
        ? (faq[faqEditingIndex]?.order ?? null)
        : null,
    };
    if (sb) {
      sb.auth.getSession().then(({ data: { session } }) => {
        if (!session) return alert('يلزم تسجيل الدخول لإجراء التعديلات');
        const payload = {
          question: data.question,
          answer: data.answer,
          order: data.order,
        };
        const payloadNoOrder = { question: data.question, answer: data.answer };
        if (faqEditingIndex === null) {
          sb.from('faq').insert(payload).select('*').single().then(async ({ data: row, error }) => {
            if (error && /(column\s+order|unknown column|invalid input)/i.test(error.message || '')) {
              const { data: row2, error: e2 } = await sb.from('faq').insert(payloadNoOrder).select('*').single();
              if (e2) return alert('فشل الحفظ: ' + e2.message);
              faq.unshift({ ...row2, order: data.order });
            } else if (error) {
              return alert('فشل الحفظ: ' + error.message);
            } else {
              faq.unshift(row);
            }
            renderFaq();
            closeDialog(faqDialog);
          });
        } else {
          const id = faq[faqEditingIndex]?.id;
          if (!id) { alert('عنصر بدون معرف، لا يمكن التحديث'); return; }
          sb.from('faq').update(payload).eq('id', id).select('*').single().then(async ({ data: row, error }) => {
            if (error && /(column\s+order|unknown column|invalid input)/i.test(error.message || '')) {
              const { data: row2, error: e2 } = await sb.from('faq').update(payloadNoOrder).eq('id', id).select('*').single();
              if (e2) return alert('فشل التحديث: ' + e2.message);
              faq[faqEditingIndex] = { ...row2, order: data.order };
            } else if (error) {
              return alert('فشل التحديث: ' + error.message);
            } else {
              faq[faqEditingIndex] = row;
            }
            renderFaq();
            closeDialog(faqDialog);
          });
        }
      });
    } else {
      if (faqEditingIndex === null) faq.unshift(data);
      else faq[faqEditingIndex] = data;
      save(KEYS.faq, faq);
      renderFaq();
      closeDialog(faqDialog);
    }
  });

  // Export / Import
  $('#exportData')?.addEventListener('click', () => {
    const data = {
      works,
      sponsors,
      achievements,
      board,
      faq,
      blogPosts,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'adeeb-data.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  $('#importData')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (Array.isArray(data.works)) {
        works = data.works; save(KEYS.works, works); renderWorks();
      }
      if (Array.isArray(data.sponsors)) {
        sponsors = data.sponsors; save(KEYS.sponsors, sponsors); renderSponsors();
      }
      if (Array.isArray(data.achievements)) {
        achievements = data.achievements; save(KEYS.achievements, achievements); renderAchievements();
      }
      if (Array.isArray(data.board)) {
        board = data.board; save(KEYS.board, board); renderBoard();
      }
      if (Array.isArray(data.faq)) {
        faq = data.faq; save(KEYS.faq, faq); renderFaq();
      }
      if (Array.isArray(data.blogPosts)) {
        blogPosts = data.blogPosts; save(KEYS.blog, blogPosts); renderBlog();
      }
      alert('تم الاستيراد بنجاح');
    } catch (err) {
      alert('فشل الاستيراد: ملف غير صالح');
      console.error(err);
    } finally {
      e.target.value = '';
    }
  });
  // تم إزالة منطق الترحيل/الترصيد من لوحة التحكم

  // ========== Admins Management (list/add/remove) ==========
  const adminsTable = document.getElementById('adminsTable');
  const addAdminForm = document.getElementById('addAdminForm');
  const newAdminEmail = document.getElementById('newAdminEmail');
  const adminsStatus = document.getElementById('adminsStatus');
  let adminsList = [];

  function renderAdmins() {
    if (!adminsTable) return;
    adminsTable.innerHTML = '';
    adminsList.forEach((row) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="padding:12px" data-label="البريد">${row.email || '<span class="muted">بدون بريد</span>'}</td>
        <td style="padding:12px" data-label="منذ">${row.created_at ? new Date(row.created_at).toLocaleString('ar') : '-'}</td>
        <td style="padding:12px" data-label="إجراءات">
          <button class="btn btn-outline" data-act="remove" data-id="${row.user_id}"><i class="fa-solid fa-user-minus"></i> إزالة كإداري</button>
        </td>`;
      adminsTable.appendChild(tr);
    });
  }

  async function fetchAdmins() {
    if (!adminsStatus) return;
    adminsStatus.className = 'muted';
    adminsStatus.textContent = 'جاري تحميل قائمة الإداريين...';
    try {
      const data = await callFunction('list-admins', { method: 'GET' });
      adminsList = Array.isArray(data) ? data : [];
      adminsStatus.className = 'muted';
      adminsStatus.textContent = `عدد الإداريين: ${adminsList.length}`;
      renderAdmins();
    } catch (err) {
      adminsStatus.className = 'alert error';
      adminsStatus.textContent = 'فشل تحميل الإداريين: ' + (err?.message || 'غير معروف');
    }
  }

  addAdminForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = (newAdminEmail?.value || '').trim();
    const name = (document.getElementById('newAdminName')?.value || '').trim();
    const position = (document.getElementById('newAdminPosition')?.value || '').trim();
    if (!email) return;
    adminsStatus && (adminsStatus.className = 'muted', adminsStatus.textContent = 'جاري إرسال الدعوة...');
    try {
      await callFunction('invite-admin', { method: 'POST', body: { email, name: name || null, position: position || null } });
      if (newAdminEmail) newAdminEmail.value = '';
      const nameEl = document.getElementById('newAdminName'); if (nameEl) nameEl.value = '';
      const posEl = document.getElementById('newAdminPosition'); if (posEl) posEl.value = '';
      await fetchAdmins();
      if (adminsStatus) { adminsStatus.className = 'alert success'; adminsStatus.textContent = 'تم إرسال الدعوة مع الاسم والمنصب. سيكتمل التفعيل بعد قبول الدعوة.'; }
    } catch (err) {
      if (adminsStatus) { adminsStatus.className = 'alert error'; adminsStatus.textContent = 'فشل إرسال الدعوة: ' + (err?.message || 'غير معروف'); }
    }
  });

  adminsTable?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const act = btn.getAttribute('data-act');
    const userId = btn.getAttribute('data-id');
    if (!userId) return;
    if (act === 'remove') {
      if (!confirm('هل تريد إزالة صلاحية الإداري؟')) return;
      adminsStatus && (adminsStatus.className = 'muted', adminsStatus.textContent = 'جاري التنفيذ...');
      try {
        await callFunction('toggle-admin', { method: 'POST', body: { user_id: userId, make_admin: false } });
        await fetchAdmins();
        if (adminsStatus) { adminsStatus.className = 'alert success'; adminsStatus.textContent = 'تمت إزالة الصلاحية'; }
      } catch (err) {
        if (adminsStatus) { adminsStatus.className = 'alert error'; adminsStatus.textContent = 'فشل العملية: ' + (err?.message || 'غير معروف'); }
      }
    }
  });

  // Fetch from Supabase on load if available
  async function loadFromSupabase() {
    if (!sb) return false;
    try {
      const [
        { data: w, error: ew },
        { data: s, error: es },
        { data: b, error: eb },
        { data: f, error: ef },
        { data: posts, error: eposts }
      ] = await Promise.all([
        sb.from('works').select('*').order('order', { ascending: true, nullsFirst: true }).order('created_at', { ascending: false }),
        sb.from('sponsors').select('*').order('order', { ascending: true, nullsFirst: true }).order('created_at', { ascending: false }),
        sb.from('board_members').select('*').order('order', { ascending: true, nullsFirst: true }).order('created_at', { ascending: false }),
        sb.from('faq').select('*').order('order', { ascending: true }),
        sb.from('blog_posts').select('*').order('published_at', { ascending: false }),
      ]);
      if (ew) throw ew; if (es) throw es; if (eb) throw eb; if (ef) throw ef; if (eposts) throw eposts;
      works = w || [];
      sponsors = s || [];
      board = b || [];
      faq = f || [];
      blogPosts = posts || [];

      // Try achievements separately; ignore 404 table-not-found
      try {
        const { data: a, error: ea } = await sb.from('achievements').select('*').order('order', { ascending: true });
        if (ea) throw ea;
        achievements = a || [];
      } catch (e2) {
        // PostgREST code PGRST205 indicates table not found in schema cache
        if (e2?.code === 'PGRST205' || /Could not find the table '.+achievements'/.test(e2?.message || '')) {
          console.warn('Achievements table missing, falling back to localStorage');
        } else {
          console.warn('Achievements fetch failed', e2);
        }
      }

      return true;
    } catch (err) {
      console.error('Supabase fetch failed', err);
      return false;
    }
  }

  (async () => {
    if (sb) {
      await refreshAuthUI();
      sb.auth.onAuthStateChange(() => {
        refreshAuthUI();
      });
    }

    await loadFromSupabase();
    // Always render after attempting to load (even if arrays are empty)
    renderWorks();
    renderSponsors();
    renderBoard();
    renderFaq();
    renderAchievements();
    renderBlog();
    // If page opened directly on profile tab, load profile info
    try {
      if (location.hash === '#section-profile') {
        adminLoadProfileIntoForm?.();
      }
    } catch {}
  })();
})();
