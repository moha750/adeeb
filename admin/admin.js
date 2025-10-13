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
  const membersList = $('#membersList');
  const faqList = $('#faqList');
  const testimonialsList = $('#testimonialsList');
  const blogList = $('#blogList');
  const todosList = $('#todosList');
  const statsGrid = $('#statsGrid');
  const membershipAppsTableBody = document.getElementById('membershipAppsTableBody');
  const membershipAppsEmpty = document.getElementById('membershipAppsEmpty');
  const membershipRefreshBtn = document.getElementById('membershipRefreshBtn');
  // Idea Board (admin) elements
  const ideaBoardTableBody = document.getElementById('ideaBoardTableBody');
  const ideaBoardEmpty = document.getElementById('ideaBoardEmpty');
  const ideaBoardRefreshBtn = document.getElementById('ideaBoardRefreshBtn');
  const ideaBoardList = document.getElementById('ideaBoardList');
  // Idea Details dialog elements
  const ideaDetailsDialog = document.getElementById('ideaDetailsDialog');
  const ideaDetailsTitle = document.getElementById('ideaDetailsTitle');
  const ideaDetailsAuthor = document.getElementById('ideaDetailsAuthor');
  const ideaDetailsDate = document.getElementById('ideaDetailsDate');
  const ideaDetailsTopic = document.getElementById('ideaDetailsTopic');
  const ideaDetailsContent = document.getElementById('ideaDetailsContent');
  const ideaPinToggleBtn = document.getElementById('ideaPinToggleBtn');
  const ideaVisToggleBtn = document.getElementById('ideaVisToggleBtn');
  const ideaDeleteBtn = document.getElementById('ideaDeleteBtn');
  // Idea Topics (admin)
  const ideaTopicsList = document.getElementById('ideaTopicsList');
  const ideaTopicsEmpty = document.getElementById('ideaTopicsEmpty');
  const ideaTopicsRefreshBtn = document.getElementById('ideaTopicsRefreshBtn');
  const addTopicBtn = document.getElementById('addTopicBtn');
  const topicDialog = document.getElementById('topicDialog');
  const topicForm = document.getElementById('topicForm');
  const topicTitleInput = document.getElementById('topicTitle');
  const topicDescInput = document.getElementById('topicDesc');
  const topicImageFileInput = document.getElementById('topicImageFile');
  const topicImagePreview = document.getElementById('topicImagePreview');
  const topicImagePreviewWrap = document.getElementById('topicImagePreviewWrap');
  const topicClearImageBtn = document.getElementById('topicClearImageBtn');
  const topicVisibleInput = document.getElementById('topicVisible');
  // Schedule elements
  const calendarGrid = $('#calendarGrid');
  const calendarDaysHead = $('#calendarDaysHead');
  const calMonthLabel = $('#calMonthLabel');
  const calPrevBtn = $('#calPrevBtn');
  const calNextBtn = $('#calNextBtn');
  const calTodayBtn = $('#calTodayBtn');
  const calIntlBtn = $('#calIntlBtn');
  const intlDaysSection = document.getElementById('intlDaysSection');
  const intlDaysTableBody = document.getElementById('intlDaysTableBody');
  const intlAddCustomBtn = document.getElementById('intlAddCustomBtn');
  const intlCustomDialog = document.getElementById('intlCustomDialog');
  const intlCustomForm = document.getElementById('intlCustomForm');
  const intlCustomDate = document.getElementById('intlCustomDate');
  const intlCustomTitle = document.getElementById('intlCustomTitle');

  // Chat elements
  const chatContactsEl = document.getElementById('chatContacts');
  const chatSearchInput = document.getElementById('chatSearch');
  const chatMessagesEl = document.getElementById('chatMessages');
  const chatComposerForm = document.getElementById('chatComposer');
  const chatInputEl = document.getElementById('chatInput');
  const chatPeerAvatar = document.getElementById('chatPeerAvatar');
  const chatPartnerName = document.getElementById('chatPartnerName');
  const chatPeerMeta = document.getElementById('chatPeerMeta');
  const chatFiltersEl = document.getElementById('chatFilters');
  const chatNoContactsEl = document.getElementById('chatNoContacts');
  const chatTypingEl = document.getElementById('chatTyping');
  const chatLoadMoreBtn = document.getElementById('chatLoadMore');
  const chatEmptyEl = document.getElementById('chatEmpty');
  const chatScrollBottomBtn = document.getElementById('chatScrollBottom');

  const KEYS = {
    works: 'adeeb_works',
    sponsors: 'adeeb_sponsors',
    board: 'adeeb_board',
    members: 'adeeb_members',
    faq: 'adeeb_faq',
    achievements: 'adeeb_achievements',
    blog: 'adeeb_blog_posts',
    schedule: 'adeeb_schedule',
    todos: 'adeeb_todos',
    ideas: 'adeeb_ideas_public',
    topics: 'adeeb_idea_topics',
    testimonials: 'adeeb_testimonials',
    membership_apps: 'adeeb_membership_applications',
  };

  // Supabase client (if configured)
  const sb = window.sbClient || null;

  // ===== PWA Install (Profile tab) =====
  const installAppBtn = document.getElementById('installAppBtn');
  let deferredInstallPrompt = null;
  function isAppInstalled() {
    try { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; } catch { return false; }
  }
  
  function renderMembershipApps(rows) {
    if (!membershipAppsTableBody) return;
    membershipAppsTableBody.innerHTML = '';
    const list = Array.isArray(rows) ? rows : [];
    if (membershipAppsEmpty) membershipAppsEmpty.style.display = list.length ? 'none' : '';
    list.forEach((r) => {
      const created = formatArDate(r.created_at || r.createdAt || null);
      const name = escapeHtml(r.full_name || r.name || '—');
      const phone = escapeHtml(r.phone || '—');
      const email = escapeHtml(r.email || '—');
      const degree = escapeHtml(r.degree || '—');
      const college = escapeHtml(r.college || '—');
      const major = escapeHtml(r.major || '—');
      const skills = escapeHtml(r.skills || '');
      const committee = escapeHtml(r.preferred_committee || r.committee || '');
      const portfolio = (r.portfolio_url || '').toString().trim();
      const status = escapeHtml(r.status || 'new');
      const tr = el(`
        <tr>
          <td style="padding:12px; white-space:nowrap">${created}</td>
          <td style="padding:12px; min-width:160px">${name}</td>
          <td style="padding:12px">${phone || '—'}</td>
          <td style="padding:12px">${email || '—'}</td>
          <td style="padding:12px">${degree || '—'}</td>
          <td style="padding:12px">${college || '—'}</td>
          <td style="padding:12px">${major || '—'}</td>
          <td style="padding:12px; min-width:200px">${skills || '—'}</td>
          <td style="padding:12px">${committee || '—'}</td>
          <td style="padding:12px">${portfolio ? `<a class="btn btn-outline btn-xs" href="${portfolio}" target="_blank"><i class="fa-solid fa-arrow-up-right-from-square"></i> فتح</a>` : '—'}</td>
          <td style="padding:12px">${status}</td>
        </tr>
      `);
      membershipAppsTableBody.appendChild(tr);
    });
  }

  async function loadMembershipApps() {
    let rows = [];
    if (sb) {
      try {
        const { data, error } = await sb
          .from('membership_applications')
          .select('id, created_at, full_name, phone, email, degree, college, major, skills, preferred_committee, portfolio_url, status')
          .order('created_at', { ascending: false });
        if (error) throw error;
        rows = Array.isArray(data) ? data : [];
      } catch (e) {
        console.warn('membership_applications fetch failed', e);
        rows = localMembershipAppsGet();
      }
    } else {
      rows = localMembershipAppsGet();
    }
    membershipApps = rows.slice();
    renderMembershipApps(membershipApps);
  }
  membershipRefreshBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    try { await loadMembershipApps(); } catch {}
  });
  function isIOSLike() {
    try { return /iphone|ipad|ipod/i.test(navigator.userAgent || ''); } catch { return false; }
  }
  function updateInstallButtonVisibility() {
    if (!installAppBtn) return;
    const installed = isAppInstalled();
    // Show if not installed and we either have a prompt (Android/desktop) or we're on iOS (show guide)
    installAppBtn.style.display = (!installed && (!!deferredInstallPrompt || isIOSLike())) ? '' : 'none';
  }
  installAppBtn?.addEventListener('click', async () => {
    try {
      if (!deferredInstallPrompt) {
        // iOS fallback: show guidance to add to home screen
        if (isIOSLike()) {
          alert('لتثبيت التطبيق على iOS: افتح الصفحة في Safari، ثم اضغط على زر المشاركة واختر "إضافة إلى الشاشة الرئيسية".');
        }
        return;
      }
      installAppBtn.disabled = true;
      const evt = deferredInstallPrompt;
      deferredInstallPrompt = null; // can only be used once
      await evt.prompt();
      const { outcome } = await evt.userChoice;
      // If dismissed, keep the button hidden until another event fires
      updateInstallButtonVisibility();
    } catch {
      // ignore
    } finally {
      if (installAppBtn) installAppBtn.disabled = false;
    }
  });
  window.addEventListener('beforeinstallprompt', (e) => {
    try {
      e.preventDefault();
      deferredInstallPrompt = e;
      updateInstallButtonVisibility();
    } catch {}
  });
  window.addEventListener('appinstalled', () => {
    try {
      deferredInstallPrompt = null;
      updateInstallButtonVisibility();
    } catch {}
  });
  // Initial visibility check
  try { updateInstallButtonVisibility(); } catch {}

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

  // ===== Idea Topics (Admin CRUD) =====
  function localTopicsGet() { try { const raw = localStorage.getItem(KEYS.topics); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch { return []; } }
  function localTopicsSet(arr) { try { localStorage.setItem(KEYS.topics, JSON.stringify(Array.isArray(arr) ? arr : [])); } catch {} }
  async function fetchTopicsAdmin() {
    if (sb) {
      try {
        const { data, error } = await sb
          .from('idea_topics')
          .select('id, title, description, image_url, visible, order, created_at')
          .order('order', { ascending: true, nullsFirst: true })
          .order('created_at', { ascending: false });
        if (error) throw error;
        return Array.isArray(data) ? data : [];
      } catch (e) {
        console.warn('idea_topics fetch (admin) failed', e);
      }
    }
    return localTopicsGet();
  }
  function renderIdeaTopicsList(rows) {
    if (!ideaTopicsList) return;
    ideaTopicsList.innerHTML = '';
    const list = Array.isArray(rows) ? rows : [];
    if (ideaTopicsEmpty) ideaTopicsEmpty.style.display = list.length ? 'none' : '';
    list.forEach((row, idx) => {
      const node = el(`
        <div class="card draggable-card" data-idx="${idx}" draggable="true">
          <span class="order-chip">#${(row.order ?? (idx+1))}</span>
          <div class="card__media">${row.image_url ? `<img src="${escapeHtml(row.image_url)}" alt="${escapeHtml(row.title||'موضوع')}" onerror="this.style.display='none'"/>` : ''}</div>
          <div class="card__body">
            <div class="card__title"><i class="fa-solid fa-book-open"></i> ${escapeHtml(row.title || '')}</div>
            ${row.description ? `<p class="card__text" style="color:#64748b; line-height:1.6">${escapeHtml(row.description)}</p>` : ''}
            <div class="card__actions">
              <button class="btn btn-outline" data-act="up" data-idx="${idx}"><i class="fa-solid fa-arrow-up"></i></button>
              <button class="btn btn-outline" data-act="down" data-idx="${idx}"><i class="fa-solid fa-arrow-down"></i></button>
              <button class="btn btn-outline" data-act="edit" data-idx="${idx}"><i class="fa-solid fa-pen"></i> تعديل</button>
              <button class="btn btn-outline" data-act="del" data-idx="${idx}"><i class="fa-regular fa-trash-can"></i> حذف</button>
            </div>
          </div>
        </div>
      `);
      ideaTopicsList.appendChild(node);
    });
    setupListDnD?.(ideaTopicsList, topics, KEYS.topics, 'idea_topics', loadIdeaTopicsAdmin);
  }
  async function loadIdeaTopicsAdmin() {
    const rows = await fetchTopicsAdmin();
    topics = rows.slice();
    renderIdeaTopicsList(rows);
    // Re-render ideas to reflect updated topic titles/grouping
    try { if (ideaBoardList) renderIdeaBoardSimpleList(lastIdeaRows); } catch {}
  }
  async function uploadTopicImageIfAny() {
    const file = topicImageFileInput?.files && topicImageFileInput.files[0];
    if (!file) return null;
    if (!sb) return null;
    const bucket = 'adeeb-site';
    const ext = (file.name.split('.').pop() || getExtFromType(file.type, 'jpg')).toLowerCase();
    const safeExt = ext.replace(/[^a-z0-9]/gi, '') || 'jpg';
    const path = `topics/topic-${Date.now()}-${Math.random().toString(36).slice(2,8)}.${safeExt}`;
    const { error: upErr } = await sb.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: false });
    if (upErr) throw upErr;
    const { data } = sb.storage.from(bucket).getPublicUrl(path);
    const publicUrl = data?.publicUrl;
    if (!publicUrl) throw new Error('تعذر الحصول على رابط الصورة');
    return publicUrl;
  }
  addTopicBtn?.addEventListener('click', () => {
    topicEditingIndex = null;
    topicForm?.reset?.();
    if (topicImagePreview) { topicImagePreview.src = ''; }
    if (topicImagePreviewWrap) topicImagePreviewWrap.style.display = 'none';
    openDialog?.(topicDialog);
  });
  topicImageFileInput?.addEventListener('change', () => {
    const file = topicImageFileInput.files && topicImageFileInput.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      if (topicImagePreview) topicImagePreview.src = url;
      if (topicImagePreviewWrap) topicImagePreviewWrap.style.display = '';
    } else {
      if (topicImagePreviewWrap) topicImagePreviewWrap.style.display = 'none';
    }
  });
  topicClearImageBtn?.addEventListener('click', (e)=>{ e.preventDefault(); if (topicImageFileInput) topicImageFileInput.value = ''; if (topicImagePreviewWrap) topicImagePreviewWrap.style.display='none'; });
  let topicEditingIndex = null;
  ideaTopicsList?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const act = btn.dataset.act;
    if (!Number.isInteger(idx) || idx < 0 || idx >= topics.length) return;
    if (act === 'up' || act === 'down') {
      const newIndex = act === 'up' ? Math.max(0, idx - 1) : Math.min(topics.length - 1, idx + 1);
      if (newIndex === idx) return;
      const [moved] = topics.splice(idx, 1);
      topics.splice(newIndex, 0, moved);
      normalizeAndPersistOrder(topics, KEYS.topics, 'idea_topics').then(() => {
        renderIdeaTopicsList(topics);
      });
      return;
    }
    if (act === 'edit') {
      topicEditingIndex = idx;
      const cur = topics[idx];
      if (topicTitleInput) topicTitleInput.value = cur.title || '';
      if (topicDescInput) topicDescInput.value = cur.description || '';
      if (topicVisibleInput) topicVisibleInput.checked = (cur.visible ?? true);
      if (topicImagePreview && cur.image_url) topicImagePreview.src = cur.image_url;
      if (topicImagePreviewWrap) topicImagePreviewWrap.style.display = cur.image_url ? '' : 'none';
      openDialog?.(topicDialog);
      return;
    }
    if (act === 'del') {
      if (!confirm('تأكيد الحذف؟')) return;
      const cur = topics[idx];
      if (sb && cur.id) {
        sb.from('idea_topics').delete().eq('id', cur.id).then(({ error }) => {
          if (error) return alert('فشل الحذف: ' + error.message);
          topics.splice(idx, 1);
          renderIdeaTopicsList(topics);
        });
      } else {
        topics.splice(idx, 1);
        save(KEYS.topics, topics);
        renderIdeaTopicsList(topics);
      }
      return;
    }
  });
  topicForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      title: (topicTitleInput?.value || '').trim(),
      description: (topicDescInput?.value || '').trim() || null,
      visible: !!(topicVisibleInput?.checked),
    };
    if (!data.title) { alert('الرجاء إدخال العنوان'); return; }
    try {
      let finalImageUrl = null;
      const uploaded = await uploadTopicImageIfAny();
      if (uploaded) finalImageUrl = uploaded;
      if (sb) {
        const { data: { session } } = await sb.auth.getSession();
        if (!session) return alert('يلزم تسجيل الدخول لإجراء التعديلات');
        const payload = { title: data.title, description: data.description, image_url: finalImageUrl, visible: data.visible, order: (topicEditingIndex !== null) ? (topics[topicEditingIndex]?.order ?? null) : null };
        const payloadNoOrder = { title: data.title, description: data.description, image_url: finalImageUrl, visible: data.visible };
        if (topicEditingIndex === null) {
          let row, error;
          ({ data: row, error } = await sb.from('idea_topics').insert(payload).select('*').single());
          if (error && /(column\s+order|unknown column|invalid input)/i.test(error.message || '')) {
            const res2 = await sb.from('idea_topics').insert(payloadNoOrder).select('*').single();
            if (res2.error) return alert('فشل الحفظ: ' + res2.error.message);
            topics.unshift({ ...res2.data, order: payload.order });
          } else if (error) {
            return alert('فشل الحفظ: ' + error.message);
          } else {
            topics.unshift(row);
          }
          renderIdeaTopicsList(topics);
          closeDialog?.(topicDialog);
        } else {
          const id = topics[topicEditingIndex]?.id;
          if (!id) { alert('عنصر بدون معرف، لا يمكن التحديث'); return; }
          let row, error;
          ({ data: row, error } = await sb.from('idea_topics').update(payload).eq('id', id).select('*').single());
          if (error && /(column\s+order|unknown column|invalid input)/i.test(error.message || '')) {
            const res2 = await sb.from('idea_topics').update(payloadNoOrder).eq('id', id).select('*').single();
            if (res2.error) return alert('فشل التحديث: ' + res2.error.message);
            topics[topicEditingIndex] = { ...res2.data, order: payload.order };
          } else if (error) {
            return alert('فشل التحديث: ' + error.message);
          } else {
            topics[topicEditingIndex] = row;
          }
          renderIdeaTopicsList(topics);
          closeDialog?.(topicDialog);
        }
      } else {
        const item = { title: data.title, description: data.description, image_url: finalImageUrl, visible: data.visible, order: (topicEditingIndex !== null) ? (topics[topicEditingIndex]?.order ?? null) : null };
        if (topicEditingIndex === null) topics.unshift(item); else topics[topicEditingIndex] = item;
        save(KEYS.topics, topics);
        renderIdeaTopicsList(topics);
        closeDialog?.(topicDialog);
      }
    } catch (err) {
      alert('فشل الحفظ: ' + (err?.message || 'غير معروف'));
    }
  });
  ideaTopicsRefreshBtn?.addEventListener('click', async (e) => { e.preventDefault(); await loadIdeaTopicsAdmin(); });

  // ===== Schedule (Monthly Calendar) =====
  // Load schedule as a map { 'YYYY-MM-DD': Array<{ title, notes } > }
  let schedule = (() => {
    try {
      const raw = localStorage.getItem(KEYS.schedule);
      const obj = raw ? JSON.parse(raw) : {};
      return (obj && typeof obj === 'object' && !Array.isArray(obj)) ? obj : {};
    } catch (e) { return {}; }
  })();
  function saveSchedule() { try { localStorage.setItem(KEYS.schedule, JSON.stringify(schedule)); } catch {}
  }

  // Normalize legacy schedule values (object -> array)
  function itemsFrom(val) {
    if (Array.isArray(val)) {
      return val.filter(Boolean).map((it) => ({ title: (it?.title || null), notes: (it?.notes || null) }));
    }
    if (val && typeof val === 'object') {
      return [{ title: (val.title || null), notes: (val.notes || null) }];
    }
    return [];
  }
  (function migrateScheduleToArrays() {
    let changed = false;
    for (const k in schedule) {
      if (!Array.isArray(schedule[k])) { schedule[k] = itemsFrom(schedule[k]); changed = true; }
    }
    if (changed) saveSchedule();
  })();

  // Calendar view state (month index 0-11)
  let viewYear = (new Date()).getFullYear();
  let viewMonth = (new Date()).getMonth();

  function arMonthLabel(y, m) {
    try { return new Date(y, m, 1).toLocaleDateString('ar', { month: 'long', year: 'numeric' }); } catch { return `${y}/${m+1}`; }
  }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function dateKey(y, m, d) { return `${y}-${pad2(m+1)}-${pad2(d)}`; }
  function isSameDate(a, b) { return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
  function keyFromDate(dt) { return dateKey(dt.getFullYear(), dt.getMonth(), dt.getDate()); }
  function getGridRange(y, m) {
    const first = new Date(y, m, 1);
    const offset = (first.getDay() + 1) % 7; // Saturday-first
    const start = new Date(y, m, 1 - offset);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 41);
    return { start, end };
  }

  async function loadScheduleForCurrentGrid() {
    if (!sb) return; // local only
    const { start, end } = getGridRange(viewYear, viewMonth);
    const startKey = keyFromDate(start);
    const endKey = keyFromDate(end);
    try {
      const { data, error } = await sb
        .from('schedule_entries')
        .select('date, title, notes, position')
        .gte('date', startKey)
        .lte('date', endKey)
        .order('date', { ascending: true })
        .order('position', { ascending: true })
      ;
      if (error) throw error;
      // Clear the range
      const keysInRange = [];
      for (let i=0;i<42;i++) {
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        keysInRange.push(keyFromDate(d));
      }
      keysInRange.forEach(k => { delete schedule[k]; });
      // Fill from DB
      if (Array.isArray(data)) {
        for (const row of data) {
          const k = String(row.date).slice(0,10);
          const arr = schedule[k] = schedule[k] || [];
          arr.push({ title: row.title || null, notes: row.notes || null, position: row.position ?? null });
        }
      }
      saveSchedule();
      renderSchedule();
    } catch (err) {
      console.error('Failed to load schedule from DB:', err);
    }
  }
  function buildDaysHeadOnce() {
    if (!calendarDaysHead || calendarDaysHead._built) return;
    const days = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
    calendarDaysHead.innerHTML = days.map(d => `<div class="day">${d}</div>`).join('');
    calendarDaysHead._built = true;
  }
  function truncate(str, n) { if (!str) return ''; const s = String(str); return s.length>n ? s.slice(0,n)+'…' : s; }

  function renderSchedule() {
    if (!calendarGrid) return;
    buildDaysHeadOnce();
    // Update month label
    if (calMonthLabel) calMonthLabel.textContent = arMonthLabel(viewYear, viewMonth);
    calendarGrid.innerHTML = '';
    const first = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    // Saturday-first offset: JS getDay(): 0=Sunday..6=Saturday -> offset=(day+1)%7
    const offset = (first.getDay() + 1) % 7;
    const totalCells = 42; // 6 rows * 7 cols
    const startDate = new Date(viewYear, viewMonth, 1 - offset);
    const today = new Date();

    for (let i=0;i<totalCells;i++) {
      const cur = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
      const inThisMonth = cur.getMonth() === viewMonth;
      const key = dateKey(cur.getFullYear(), cur.getMonth(), cur.getDate());
      const items = itemsFrom(schedule[key]);
      const cell = document.createElement('div');
      cell.className = 'calendar-cell' + (inThisMonth ? '' : ' other-month') + (isSameDate(cur, today) ? ' today' : '') + (items.length ? ' has-content' : '');
      cell.setAttribute('data-date', key);
      const firstItem = items[0] || null;
      const restCount = Math.max(0, items.length - 1);
      cell.innerHTML = `
        <div class="date-badge">${cur.getDate()}</div>
        ${restCount ? `<span class="count-chip" title="${items.length} عناصر">+${restCount}</span>` : ''}
        ${firstItem ? `<div class="content" title="${((firstItem.title || firstItem.notes || '') + '').replace(/"/g,'&quot;')}">${firstItem.title ? truncate(firstItem.title, 40) : truncate(firstItem.notes || '', 50)}</div>` : ''}
      `;
      calendarGrid.appendChild(cell);
    }
    // Also refresh the International Days table below the grid
    renderIntlDaysTable();
  }

  calPrevBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    viewMonth -= 1; if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
    renderSchedule();
    loadScheduleForCurrentGrid();
  });

  // ===== Idea Board (Admin Moderation) =====
  function localIdeasGet() { try { const raw = localStorage.getItem(KEYS.ideas); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch { return []; } }
  function localIdeasSet(arr) { try { localStorage.setItem(KEYS.ideas, JSON.stringify(Array.isArray(arr) ? arr : [])); } catch {} }
  function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function fmtArDateTime(iso){ try { return new Date(iso).toLocaleString('ar'); } catch { return iso || ''; } }

  async function fetchIdeasAdmin() {
    if (sb) {
      try {
        const { data, error } = await sb
          .from('idea_board')
          .select('id, title, content, author_name, image_url, image_key, visible, pinned, created_at, topic_id')
          .order('pinned', { ascending: false })
          .order('created_at', { ascending: false });
        if (error) throw error;
        return Array.isArray(data) ? data : [];
      } catch (e) {
        console.warn('idea_board fetch (admin) failed', e);
      }
    }
    return localIdeasGet();
  }

  // ===== Idea Board (Admin): Simplified list + details modal =====
  let lastIdeaRows = [];

  function renderIdeaBoardSimpleList(rows) {
    if (!ideaBoardList) return;
    ideaBoardList.innerHTML = '';
    const list = Array.isArray(rows) ? rows : [];
    lastIdeaRows = list.slice();
    if (ideaBoardEmpty) ideaBoardEmpty.style.display = list.length ? 'none' : '';

    // Build groups by topic_id
    const tlist = Array.isArray(topics) ? topics.slice() : [];
    const tmap = new Map(tlist.map(t => [String(t.id), t]));
    const groups = new Map();
    list.forEach((row) => {
      const key = row.topic_id ? String(row.topic_id) : '__none__';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    });
    const sortItems = (arr) => arr.sort((a,b) => {
      const p = (b.pinned === true) - (a.pinned === true);
      if (p) return p;
      try { return new Date(b.created_at) - new Date(a.created_at); } catch { return 0; }
    });

    function renderGroup(title, desc, key) {
      const items = sortItems(groups.get(key) || []);
      if (!items.length) return;
      const wrap = document.createElement('section');
      wrap.className = 'topic-group';
      const safeTitle = escapeHtml(title || 'بدون موضوع');
      wrap.innerHTML = `
        <header class="topic-group__head">
          <div class="topic-group__title">${safeTitle}</div>
          <div class="topic-group__meta">
            <span class="topic-group__count">${items.length}</span>
          </div>
        </header>
        <div class="topic-group__list"></div>
      `;
      const listEl = wrap.querySelector('.topic-group__list');
      items.forEach((row) => {
        const item = document.createElement('div');
        item.className = 'simple-list__item';
        const title = String(row.title || 'فكرة');
        const chips = [
          row.pinned ? '<span class="chip active">مثبّت</span>' : '',
          (row.visible === false) ? '<span class="chip">مخفي</span>' : ''
        ].filter(Boolean).join(' ');
        item.innerHTML = `
          <div class="simple-list__title" title="${escapeHtml(title)}">${escapeHtml(title)} ${chips ? ('&nbsp;' + chips) : ''}</div>
          <div class="simple-list__actions">
            <button class="btn btn-outline btn-xs view-idea" data-id="${row.id}" aria-label="عرض التفاصيل"><i class="fa-solid fa-eye"></i></button>
          </div>
        `;
        listEl.appendChild(item);
      });
      ideaBoardList.appendChild(wrap);
    }

    // Render groups in topics order
    tlist.forEach(t => {
      const key = String(t.id);
      renderGroup(t.title || 'موضوع', t.description || '', key);
    });
    // Render groups not present in topics list (unknown topics)
    groups.forEach((arr, key) => {
      if (key === '__none__') return;
      if (!tmap.has(String(key))) {
        renderGroup('موضوع غير معروف', '', key);
      }
    });
    // Finally, render unassigned group
    if (groups.has('__none__')) {
      renderGroup('بدون موضوع', '', '__none__');
    }
  }

  function openIdeaDetails(row){
    if (!row) return;
    try {
      if (ideaDetailsTitle) ideaDetailsTitle.textContent = row.title || 'فكرة';
      if (ideaDetailsAuthor) ideaDetailsAuthor.textContent = row.author_name || 'مجهول';
      if (ideaDetailsDate) ideaDetailsDate.textContent = fmtArDateTime(row.created_at);
      if (ideaDetailsTopic) {
        let t = '—';
        try {
          const tlist = Array.isArray(topics) ? topics : [];
          const found = tlist.find(tp => String(tp.id) === String(row.topic_id));
          t = found?.title ? String(found.title) : '—';
        } catch {}
        ideaDetailsTopic.textContent = t;
      }
      if (ideaDetailsContent) ideaDetailsContent.textContent = row.content || '';
      // Stash current id on the action buttons for convenience
      const id = row.id;
      if (ideaPinToggleBtn) ideaPinToggleBtn.dataset.id = id;
      if (ideaVisToggleBtn) ideaVisToggleBtn.dataset.id = id;
      if (ideaDeleteBtn) ideaDeleteBtn.dataset.id = id;
      // Update buttons' labels according to state
      try {
        if (ideaPinToggleBtn) ideaPinToggleBtn.innerHTML = row.pinned
          ? '<i class="fa-solid fa-thumbtack"></i> إزالة التثبيت'
          : '<i class="fa-solid fa-thumbtack"></i> تثبيت';
        if (ideaVisToggleBtn) ideaVisToggleBtn.innerHTML = row.visible
          ? '<i class="fa-solid fa-eye-slash"></i> إخفاء'
          : '<i class="fa-solid fa-eye"></i> إظهار';
      } catch {}
      openDialog?.(ideaDetailsDialog);
    } catch {}
  }

  async function loadIdeaBoardAdmin() {
    const rows = await fetchIdeasAdmin();
    renderIdeaBoardSimpleList(rows);
  }

  ideaBoardRefreshBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    await loadIdeaBoardAdmin();
  });

  // Delegated: open details from simplified list
  if (ideaBoardList) {
    ideaBoardList.addEventListener('click', (e) => {
      const btn = e.target.closest?.('.view-idea');
      if (!btn) return;
      const id = btn.dataset.id;
      const row = lastIdeaRows.find(r => String(r.id) === String(id));
      if (row) openIdeaDetails(row);
    });
  }

  // Dialog actions

  ideaPinToggleBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    const id = ideaPinToggleBtn?.dataset?.id;
    if (!id) return;
    try {
      if (!sb) {
        const arr = localIdeasGet();
        const idx = arr.findIndex(r => String(r.id) === String(id));
        if (idx === -1) return;
        arr[idx].pinned = !arr[idx].pinned;
        localIdeasSet(arr);
        await loadIdeaBoardAdmin();
        // reflect in dialog
        const row = arr[idx];
        openIdeaDetails(row);
        return;
      }
      const { data: row } = await sb.from('idea_board').select('pinned').eq('id', id).maybeSingle();
      const cur = !!(row?.pinned);
      const { error } = await sb.from('idea_board').update({ pinned: !cur }).eq('id', id);
      if (error) throw error;
      await loadIdeaBoardAdmin();
      const updated = lastIdeaRows.find(r => String(r.id) === String(id));
      if (updated) openIdeaDetails(updated);
    } catch (err) {
      alert('فشل العملية: ' + (err?.message || 'غير معروف'));
    }
  });

  ideaVisToggleBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    const id = ideaVisToggleBtn?.dataset?.id;
    if (!id) return;
    try {
      if (!sb) {
        const arr = localIdeasGet();
        const idx = arr.findIndex(r => String(r.id) === String(id));
        if (idx === -1) return;
        arr[idx].visible = !arr[idx].visible;
        localIdeasSet(arr);
        await loadIdeaBoardAdmin();
        const row = arr[idx];
        openIdeaDetails(row);
        return;
      }
      const { data: row } = await sb.from('idea_board').select('visible').eq('id', id).maybeSingle();
      const cur = !!(row?.visible);
      const { error } = await sb.from('idea_board').update({ visible: !cur }).eq('id', id);
      if (error) throw error;
      await loadIdeaBoardAdmin();
      const updated = lastIdeaRows.find(r => String(r.id) === String(id));
      if (updated) openIdeaDetails(updated);
    } catch (err) {
      alert('فشل العملية: ' + (err?.message || 'غير معروف'));
    }
  });

  ideaDeleteBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    const id = ideaDeleteBtn?.dataset?.id;
    if (!id) return;
    if (!confirm('تأكيد الحذف؟')) return;
    try {
      if (!sb) {
        const arr = localIdeasGet();
        const idx = arr.findIndex(r => String(r.id) === String(id));
        if (idx === -1) return;
        arr.splice(idx, 1);
        localIdeasSet(arr);
        await loadIdeaBoardAdmin();
        closeDialog?.(ideaDetailsDialog);
        return;
      }
      // fetch image key before deletion
      let imgKey = null;
      try {
        const f = await sb.from('idea_board').select('image_key').eq('id', id).maybeSingle();
        imgKey = f?.data?.image_key || null;
      } catch {}
      const { error } = await sb.from('idea_board').delete().eq('id', id);
      if (error) throw error;
      if (imgKey) {
        try { await sb.storage.from('idea-board').remove([imgKey]); } catch {}
      }
      await loadIdeaBoardAdmin();
      closeDialog?.(ideaDetailsDialog);
    } catch (err) {
      alert('فشل العملية: ' + (err?.message || 'غير معروف'));
    }
  });

  function openMemberDetails(idx) {
    const m = members?.[idx];
    if (!m) return;
    const safe = (v) => (v && String(v).trim()) ? String(v) : '—';
    const fmtDate = (v) => {
      try { return v ? (formatArDate?.(v) || new Date(v).toLocaleDateString('ar')) : '—'; } catch { return safe(v); }
    };
    const xh = m.x_handle || '';
    const ig = m.instagram_handle || '';
    const tk = m.tiktok_handle || '';
    const xUrl = xh ? `https://x.com/${String(xh).replace(/^@/, '')}` : '';
    const igUrl = ig ? `https://instagram.com/${String(ig).replace(/^@/, '')}` : '';
    const tkUrl = tk ? `https://tiktok.com/@${String(tk).replace(/^@/, '')}` : '';
    const colorBox = (hex) => hex ? `<span style="display:inline-flex;align-items:center;gap:8px"><span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:${hex};border:1px solid var(--border)"></span><code>${hex}</code></span>` : '—';
    const html = `
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:8px">
        <img src="${(m.avatar || m.avatar_url) || ''}" alt="${safe(m.full_name || m.name)}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;background:#f1f5f9" />
        <div>
          <div style="font-weight:700;color:var(--main-blue);font-size:18px">${safe(m.full_name || m.name)}</div>
          ${m.committee ? `<div class="muted">${safe(m.committee)}</div>` : ''}
        </div>
      </div>
      <div class="form-grid" style="--grid-cols: 2">
        <label>البريد الإلكتروني <div class="muted">${safe(m.email)}</div></label>
        <label>رقم الجوال <div class="muted">${safe(m.phone)}</div></label>
        <label>الرقم الأكاديمي <div class="muted">${safe(m.academic_number)}</div></label>
        <label>رقم الهوية الوطنية <div class="muted">${safe(m.national_id)}</div></label>
        <label>الكلية <div class="muted">${safe(m.college)}</div></label>
        <label>التخصص <div class="muted">${safe(m.major)}</div></label>
        <label>الدرجة العلمية <div class="muted">${safe(m.degree)}</div></label>
        <label>تاريخ الميلاد <div class="muted">${fmtDate(m.birth_date)}</div></label>
        <label>حساب أكس <div class="muted">${xUrl ? `<a href="${xUrl}" target="_blank" rel="noopener">${safe(xh)}</a>` : '—'}</div></label>
        <label>الإنستقرام <div class="muted">${igUrl ? `<a href="${igUrl}" target="_blank" rel="noopener">${safe(ig)}</a>` : '—'}</div></label>
        <label>تيك توك <div class="muted">${tkUrl ? `<a href="${tkUrl}" target="_blank" rel="noopener">${safe(tk)}</a>` : '—'}</div></label>
        <label>اللون الأساسي <div>${colorBox(m.primary_color)}</div></label>
        <label>اللون الثانوي <div>${colorBox(m.secondary_color)}</div></label>
      </div>
    `;
    if (memberDetailsContent) memberDetailsContent.innerHTML = html;
    openDialog?.(memberDetailsDialog);
  }

  // Members CRUD
  const memberDialog = $('#memberDialog');
  const memberForm = $('#memberForm');
  let memberEditingIndex = null;
  // Member image upload elements
  const memberImageFile = document.getElementById('member_image_file');
  const memberImageUrl = document.getElementById('member_image_url');
  const memberImagePreview = document.getElementById('member_image_preview');
  const memberDropzone = document.getElementById('memberDropzone');
  const memberBrowseBtn = document.getElementById('memberBrowseBtn');
  const memberImageActions = document.getElementById('memberImageActions');
  const memberEditImageBtn = document.getElementById('member_edit_image_btn');
  const memberChangeImageBtn = document.getElementById('member_change_image_btn');
  let memberCroppedFile = null;
  // Member details dialog elements
  const memberDetailsDialog = document.getElementById('memberDetailsDialog');
  const memberDetailsContent = document.getElementById('memberDetailsContent');

  async function handleMemberImageFile(file) {
    if (!file) return;
    if (!(file.type || '').startsWith('image/')) { alert('الملف ليس صورة'); return; }
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) { if (!confirm('حجم الصورة يتجاوز 5MB. المتابعة؟')) return; }
    try {
      const cropped = await openImageCropper(file, { aspectRatio: 1, lockAspect: true, maxWidth: 1200, maxHeight: 1200, mimeType: 'image/webp', quality: 0.9 });
      memberCroppedFile = cropped;
      const url = URL.createObjectURL(cropped);
      if (memberImagePreview) { memberImagePreview.src = url; memberImagePreview.style.display = 'block'; }
      if (memberImageActions) memberImageActions.style.display = 'flex';
      if (memberDropzone) memberDropzone.style.display = 'none';
    } catch (err) {
      if (memberImageFile) memberImageFile.value = '';
    }
  }
  memberImageFile?.addEventListener('change', async () => {
    const file = memberImageFile.files && memberImageFile.files[0];
    await handleMemberImageFile(file);
  });
  memberBrowseBtn?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); memberImageFile?.click(); });
  memberDropzone?.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    if ((e.target instanceof HTMLElement) && e.target.closest('#memberBrowseBtn')) return;
    memberImageFile?.click();
  });
  memberDropzone?.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); memberImageFile?.click(); } });
  memberDropzone?.addEventListener('dragover', (e) => { e.preventDefault(); memberDropzone.classList.add('dragover'); });
  memberDropzone?.addEventListener('dragleave', () => { memberDropzone.classList.remove('dragover'); });
  memberDropzone?.addEventListener('drop', async (e) => {
    e.preventDefault(); e.stopPropagation(); memberDropzone.classList.remove('dragover');
    const dt = e.dataTransfer; if (!dt) return;
    let file = null;
    if (dt.files && dt.files.length) file = dt.files[0];
    if (!file && dt.items && dt.items.length) { const item = Array.from(dt.items).find(i => i.kind === 'file'); if (item) file = item.getAsFile(); }
    await handleMemberImageFile(file);
  });
  memberChangeImageBtn?.addEventListener('click', (e) => { e.preventDefault(); memberImageFile?.click(); });
  memberEditImageBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      const src = (memberImagePreview && memberImagePreview.src) || (memberImageUrl && memberImageUrl.value) || '';
      if (!src) { alert('لا توجد صورة لتحريرها'); return; }
      const file = await fetchUrlAsFile(src, 'current');
      const cropped = await openImageCropper(file, { aspectRatio: 1, lockAspect: true, maxWidth: 1200, maxHeight: 1200, mimeType: 'image/webp', quality: 0.9 });
      memberCroppedFile = cropped;
      const url = URL.createObjectURL(cropped);
      if (memberImagePreview) { memberImagePreview.src = url; memberImagePreview.style.display = 'block'; }
      if (memberImageActions) memberImageActions.style.display = 'flex';
      if (memberDropzone) memberDropzone.style.display = 'none';
    } catch (err) {
      if (String(err?.message || '').includes('crop-cancelled')) return;
      alert('تعذر تحرير الصورة الحالية. جرّب تغيير الصورة بدلًا من ذلك.');
    }
  });

  async function uploadMemberImage() {
    const file = memberCroppedFile || (memberImageFile?.files && memberImageFile.files[0]);
    if (!file) return null;
    if (!sb) return null;
    const bucket = 'adeeb-site';
    const ext = (file.name.split('.').pop() || getExtFromType(file.type, 'jpg')).toLowerCase();
    const safeExt = ext.replace(/[^a-z0-9]/gi, '') || 'jpg';
    const path = `members/member-${Date.now()}-${Math.random().toString(36).slice(2,8)}.${safeExt}`;
    const { error: upErr } = await sb.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: false });
    if (upErr) throw upErr;
    const { data } = sb.storage.from(bucket).getPublicUrl(path);
    const publicUrl = data?.publicUrl;
    if (!publicUrl) throw new Error('تعذر الحصول على رابط الصورة');
    return publicUrl;
  }

  $('#addMemberBtn')?.addEventListener('click', () => {
    memberEditingIndex = null;
    memberForm?.reset?.();
    if (memberImagePreview) { memberImagePreview.src = ''; memberImagePreview.style.display = 'none'; }
    if (memberImageUrl) memberImageUrl.value = '';
    memberCroppedFile = null;
    if (memberDropzone) memberDropzone.style.display = '';
    if (memberImageActions) memberImageActions.style.display = 'none';
    openDialog?.(memberDialog);
  });

  membersList?.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const act = btn.dataset.act;
    if (act === 'view') {
      openMemberDetails(idx);
      return;
    }
    if (act === 'up' || act === 'down') {
      if (!Number.isInteger(idx) || idx < 0 || idx >= members.length) return;
      const newIndex = act === 'up' ? Math.max(0, idx - 1) : Math.min(members.length - 1, idx + 1);
      if (newIndex === idx) return;
      const [moved] = members.splice(idx, 1);
      members.splice(newIndex, 0, moved);
      normalizeAndPersistOrder(members, KEYS.members, 'members').then(() => {
        renderMembers();
      });
      return;
    }
    if (act === 'edit') {
      memberEditingIndex = idx;
      const cur = members[idx];
      memberForm.full_name.value = cur.full_name || cur.name || '';
      memberForm.email.value = cur.email || '';
      memberForm.phone.value = cur.phone || '';
      memberForm.college.value = cur.college || '';
      memberForm.major.value = cur.major || '';
      memberForm.academic_number.value = cur.academic_number || '';
      memberForm.national_id.value = cur.national_id || '';
      // Ensure degree select preserves existing custom values not in the list
      try {
        const selDeg = memberForm.degree;
        const valDeg = cur.degree || '';
        if (selDeg && selDeg.tagName === 'SELECT') {
          const hasDeg = Array.from(selDeg.options || []).some(o => o.value === valDeg);
          if (valDeg && !hasDeg) {
            selDeg.add(new Option(valDeg, valDeg, true, true));
          }
          selDeg.value = valDeg;
        } else if (selDeg) {
          selDeg.value = valDeg;
        }
      } catch {
        memberForm.degree.value = cur.degree || '';
      }
      memberForm.birth_date.value = (cur.birth_date || '').slice(0,10);
      // Ensure committee select preserves existing custom values not in the list
      try {
        const sel = memberForm.committee;
        const val = cur.committee || '';
        if (sel && sel.tagName === 'SELECT') {
          const has = Array.from(sel.options || []).some(o => o.value === val);
          if (val && !has) {
            sel.add(new Option(val, val, true, true));
          }
          sel.value = val;
        } else if (sel) {
          sel.value = val;
        }
      } catch {
        memberForm.committee.value = cur.committee || '';
      }
      memberForm.x_handle.value = cur.x_handle || '';
      memberForm.instagram_handle.value = cur.instagram_handle || '';
      memberForm.tiktok_handle.value = cur.tiktok_handle || '';
      memberForm.primary_color.value = cur.primary_color || '#3D8FD6';
      memberForm.secondary_color.value = cur.secondary_color || '#274060';
      const imgUrl = (cur.avatar || cur.avatar_url) || '';
      if (memberImageUrl) memberImageUrl.value = imgUrl;
      if (memberImagePreview) {
        if (imgUrl) { memberImagePreview.src = imgUrl; memberImagePreview.style.display = 'block'; }
        else { memberImagePreview.src = ''; memberImagePreview.style.display = 'none'; }
      }
      if (memberImageFile) memberImageFile.value = '';
      memberCroppedFile = null;
      if (imgUrl) { if (memberDropzone) memberDropzone.style.display = 'none'; if (memberImageActions) memberImageActions.style.display = 'flex'; }
      else { if (memberDropzone) memberDropzone.style.display = ''; if (memberImageActions) memberImageActions.style.display = 'none'; }
      openDialog?.(memberDialog);
    } else if (act === 'del') {
      if (!confirm('تأكيد الحذف؟')) return;
      const cur = members[idx];
      if (sb && cur.id) {
        sb.from('members').delete().eq('id', cur.id).then(({ error }) => {
          if (error) return alert('فشل الحذف: ' + error.message);
          members.splice(idx, 1);
          renderMembers();
        });
      } else {
        members.splice(idx, 1);
        save(KEYS.members, members);
        renderMembers();
      }
    }
  });

  memberForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    // determine final image url
    let finalImgUrl = (memberImageUrl?.value || '').trim();
    try {
      const uploaded = await uploadMemberImage();
      if (uploaded) finalImgUrl = uploaded;
    } catch (err) {
      return alert('فشل رفع الصورة: ' + (err?.message || 'غير معروف'));
    }
    memberCroppedFile = null;
    const data = {
      full_name: memberForm.full_name.value.trim(),
      email: memberForm.email.value.trim(),
      phone: memberForm.phone.value.trim(),
      college: memberForm.college.value.trim(),
      major: memberForm.major.value.trim(),
      academic_number: memberForm.academic_number.value.trim(),
      national_id: memberForm.national_id.value.trim(),
      degree: memberForm.degree.value.trim(),
      birth_date: memberForm.birth_date.value.trim(),
      committee: memberForm.committee.value.trim(),
      x_handle: memberForm.x_handle.value.trim(),
      instagram_handle: memberForm.instagram_handle.value.trim(),
      tiktok_handle: memberForm.tiktok_handle.value.trim(),
      primary_color: memberForm.primary_color.value || null,
      secondary_color: memberForm.secondary_color.value || null,
      avatar: finalImgUrl,
      order: (memberEditingIndex !== null)
        ? (members[memberEditingIndex]?.order ?? null)
        : null,
    };
    if (sb) {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return alert('يلزم تسجيل الدخول لإجراء التعديلات');
      const payload = {
        full_name: data.full_name,
        email: data.email || null,
        phone: data.phone || null,
        college: data.college || null,
        major: data.major || null,
        academic_number: data.academic_number || null,
        national_id: data.national_id || null,
        degree: data.degree || null,
        birth_date: data.birth_date || null,
        committee: data.committee || null,
        x_handle: data.x_handle || null,
        instagram_handle: data.instagram_handle || null,
        tiktok_handle: data.tiktok_handle || null,
        primary_color: data.primary_color || null,
        secondary_color: data.secondary_color || null,
        avatar_url: data.avatar || null,
        order: data.order,
      };
      const payloadNoOrder = { ...payload }; delete payloadNoOrder.order;
      if (memberEditingIndex === null) {
        let row, error;
        ({ data: row, error } = await sb.from('members').insert(payload).select('*').single());
        if (error && /(column\s+order|unknown column|invalid input)/i.test(error.message || '')) {
          const res2 = await sb.from('members').insert(payloadNoOrder).select('*').single();
          if (res2.error) return alert('فشل الحفظ: ' + res2.error.message);
          members.unshift({ ...res2.data, order: data.order });
        } else if (error) {
          return alert('فشل الحفظ: ' + error.message);
        } else {
          members.unshift(row);
        }
        renderMembers();
        closeDialog?.(memberDialog);
      } else {
        const id = members[memberEditingIndex]?.id;
        if (!id) { alert('عنصر بدون معرف، لا يمكن التحديث'); return; }
        let row, error;
        ({ data: row, error } = await sb.from('members').update(payload).eq('id', id).select('*').single());
        if (error && /(column\s+order|unknown column|invalid input)/i.test(error.message || '')) {
          const res2 = await sb.from('members').update(payloadNoOrder).eq('id', id).select('*').single();
          if (res2.error) return alert('فشل التحديث: ' + res2.error.message);
          members[memberEditingIndex] = { ...res2.data, order: data.order };
        } else if (error) {
          return alert('فشل التحديث: ' + error.message);
        } else {
          members[memberEditingIndex] = row;
        }
        renderMembers();
        closeDialog?.(memberDialog);
      }
    } else {
      if (memberEditingIndex === null) members.unshift(data);
      else members[memberEditingIndex] = data;
      save(KEYS.members, members);
      renderMembers();
      closeDialog?.(memberDialog);
    }
  });
  calNextBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    viewMonth += 1; if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
    renderSchedule();
    loadScheduleForCurrentGrid();
  });
  calTodayBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    const now = new Date(); viewYear = now.getFullYear(); viewMonth = now.getMonth();
    renderSchedule();
    loadScheduleForCurrentGrid();
  });

  // ===== International Days (Fixed-date subset) =====
  // A curated subset of widely recognized international/UN days (Arabic titles).
  // Only fixed dates are included; variable weekday-based observances are omitted for simplicity.
  const INTL_DAYS_FIXED = {
    '01': [
      ['24', 'اليوم الدولي للتعليم'],
      ['27', 'اليوم الدولي لإحياء ذكرى ضحايا الهولوكوست']
    ],
    '02': [
      ['04', 'اليوم العالمي للسرطان'],
      ['11', 'اليوم الدولي للمرأة والفتاة في ميدان العلوم'],
      ['13', 'اليوم العالمي للإذاعة'],
      ['20', 'اليوم العالمي للعدالة الاجتماعية'],
      ['21', 'اليوم الدولي للغة الأم']
    ],
    '03': [
      ['03', 'اليوم العالمي للحياة البرية'],
      ['08', 'اليوم العالمي للمرأة'],
      ['15', 'اليوم العالمي لحقوق المستهلك'],
      ['20', 'اليوم الدولي للسعادة'],
      ['21', 'اليوم العالمي لمتلازمة داون'],
      ['22', 'اليوم العالمي للمياه'],
      ['23', 'اليوم العالمي للأرصاد الجوية'],
      ['24', 'اليوم العالمي لمكافحة السل'],
      ['27', 'اليوم العالمي للمسرح']
    ],
    '04': [
      ['02', 'اليوم العالمي للتوعية بالتوحد'],
      ['07', 'اليوم العالمي للصحة'],
      ['21', 'اليوم العالمي للإبداع والابتكار'],
      ['22', 'يوم الأرض'],
      ['23', 'اليوم العالمي للكتاب وحقوق المؤلف'],
      ['25', 'اليوم العالمي لمكافحة الملاريا']
    ],
    '05': [
      ['01', 'اليوم العالمي للعمال'],
      ['03', 'اليوم العالمي لحرية الصحافة'],
      ['08', 'اليوم العالمي للصليب الأحمر والهلال الأحمر'],
      ['12', 'اليوم الدولي للممرضات والممرضين'],
      ['15', 'اليوم الدولي للأسر'],
      ['17', 'اليوم العالمي للاتصالات ومجتمع المعلومات'],
      ['20', 'اليوم العالمي للقياس'],
      ['21', 'اليوم العالمي للتنوع الثقافي'],
      ['22', 'اليوم الدولي للتنوع البيولوجي'],
      ['31', 'اليوم العالمي للامتناع عن تعاطي التبغ']
    ],
    '06': [
      ['03', 'اليوم العالمي للدراجة الهوائية'],
      ['05', 'اليوم العالمي للبيئة'],
      ['08', 'اليوم العالمي للمحيطات'],
      ['12', 'اليوم العالمي لمكافحة عمل الأطفال'],
      ['14', 'اليوم العالمي للمتبرعين بالدم'],
      ['20', 'اليوم العالمي للاجئين'],
      ['21', 'اليوم العالمي لليوغا'],
      ['26', 'اليوم الدولي لمكافحة تعاطي المخدرات والاتجار غير المشروع بها']
    ],
    '07': [
      ['11', 'اليوم العالمي للسكان'],
      ['15', 'اليوم العالمي لمهارات الشباب'],
      ['18', 'يوم نيلسون مانديلا الدولي']
    ],
    '08': [
      ['09', 'اليوم الدولي للشعوب الأصلية في العالم'],
      ['12', 'اليوم الدولي للشباب'],
      ['19', 'اليوم العالمي للعمل الإنساني'],
      ['23', 'اليوم الدولي لإحياء ذكرى تجارة الرقيق وإلغائها']
    ],
    '09': [
      ['05', 'اليوم الدولي للعمل الخيري'],
      ['08', 'اليوم الدولي لمحو الأمية'],
      ['15', 'اليوم الدولي للديمقراطية'],
      ['21', 'اليوم الدولي للسلام'],
      ['27', 'اليوم العالمي للسياحة'],
      ['28', 'اليوم الدولي للوصول إلى المعلومات']
    ],
    '10': [
      ['01', 'اليوم الدولي لكبار السن'],
      ['02', 'اليوم الدولي للاعنف'],
      ['05', 'اليوم العالمي للمعلمين'],
      ['10', 'اليوم العالمي للصحة النفسية'],
      ['11', 'اليوم الدولي للطفلة'],
      ['13', 'اليوم الدولي للحد من مخاطر الكوارث'],
      ['15', 'اليوم العالمي لغسل اليدين'],
      ['16', 'اليوم العالمي للأغذية'],
      ['17', 'اليوم الدولي للقضاء على الفقر'],
      ['24', 'يوم الأمم المتحدة'],
      ['31', 'اليوم العالمي للمدن']
    ],
    '11': [
      ['10', 'اليوم العالمي للعلم من أجل السلام والتنمية'],
      ['14', 'اليوم العالمي لمرض السكري'],
      ['16', 'اليوم الدولي للتسامح'],
      ['19', 'اليوم العالمي لدورات المياه'],
      ['20', 'اليوم العالمي للطفل'],
      ['25', 'اليوم الدولي للقضاء على العنف ضد المرأة']
    ],
    '12': [
      ['01', 'اليوم العالمي للإيدز'],
      ['03', 'اليوم الدولي للأشخاص ذوي الإعاقة'],
      ['05', 'اليوم الدولي للمتطوعين'],
      ['10', 'اليوم العالمي لحقوق الإنسان'],
      ['18', 'اليوم العالمي للغة العربية'],
      ['20', 'اليوم الدولي للتضامن الإنساني']
    ]
  };

  function getIntlDaysForMonth(year, monthIdx /* 0-11 */) {
    const mm = String(monthIdx + 1).padStart(2, '0');
    const list = (INTL_DAYS_FIXED[mm] || []).map(([dd, title]) => {
      const d = Number(dd);
      const dt = new Date(year, monthIdx, d);
      if (dt.getMonth() !== monthIdx) return null; // skip invalid dates
      return { key: dateKey(year, monthIdx, d), title };
    }).filter(Boolean);
    return list;
  }

  async function importIntlDaysForVisibleMonth() {
    const intl = getIntlDaysForMonth(viewYear, viewMonth);
    if (!intl.length) { alert('لا توجد أيام عالمية ثابتة لهذا الشهر في القائمة.'); return; }
    const changed = new Set();
    for (const it of intl) {
      const k = it.key;
      const arr = schedule[k] = schedule[k] || [];
      const exists = arr.some(x => (x?.title || '').trim() === it.title.trim());
      if (!exists) {
        arr.push({ title: it.title, notes: null });
        changed.add(k);
      }
    }
    if (!changed.size) { alert('لا توجد عناصر جديدة لإضافتها.'); return; }
    saveSchedule();
    // Sync with Supabase if available and authenticated
    if (sb) {
      try {
        const { data: { session } } = await sb.auth.getSession();
        if (session) {
          for (const k of changed) {
            try {
              const arr = itemsFrom(schedule[k]);
              // Delete existing for k
              const { error: delErr } = await sb.from('schedule_entries').delete().eq('date', k);
              if (delErr) throw delErr;
              if (arr.length) {
                const rows = arr.map((it, i) => ({ date: k, title: it.title || null, notes: it.notes || null, position: i + 1 }));
                let res = await sb.from('schedule_entries').insert(rows).select('*');
                if (res.error && /(column\s+position|unknown column|invalid input)/i.test(res.error.message || '')) {
                  const rows2 = arr.map((it) => ({ date: k, title: it.title || null, notes: it.notes || null }));
                  const res2 = await sb.from('schedule_entries').insert(rows2).select('*');
                  if (res2.error) throw res2.error;
                } else if (res.error) {
                  throw res.error;
                }
              }
            } catch (e) {
              console.error('Sync failed for', k, e);
            }
          }
        }
      } catch {}
    }
    renderSchedule();
    renderIntlDaysTable();
    alert('تمت إضافة الأيام العالمية لهذا الشهر');
  }

  calIntlBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    await importIntlDaysForVisibleMonth();
  });

  // Open custom international day dialog
  intlAddCustomBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    try {
      if (intlCustomDate) {
        const d = new Date(viewYear, viewMonth, 1);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        intlCustomDate.value = `${yyyy}-${mm}-${dd}`;
      }
      if (intlCustomTitle) intlCustomTitle.value = '';
      if (typeof openDialog === 'function') openDialog(intlCustomDialog);
      else intlCustomDialog?.showModal?.();
    } catch {}
  });

  // Save custom international day
  intlCustomForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const dateStr = (intlCustomDate?.value || '').trim();
    const title = (intlCustomTitle?.value || '').trim();
    if (!dateStr || !title) { alert('يرجى إدخال التاريخ والعنوان'); return; }
    const key = dateStr.slice(0, 10);
    const arr = schedule[key] = itemsFrom(schedule[key]);
    const exists = arr.some(x => (x?.title || '').trim() === title);
    if (exists) {
      alert('هذا اليوم موجود مسبقًا في هذا التاريخ');
    } else {
      arr.push({ title, notes: null });
      saveSchedule();
      if (sb) {
        try {
          const { data: { session } } = await sb.auth.getSession();
          if (session) {
            const curArr = itemsFrom(schedule[key]);
            const { error: delErr } = await sb.from('schedule_entries').delete().eq('date', key);
            if (delErr) throw delErr;
            if (curArr.length) {
              const rows = curArr.map((it, i) => ({ date: key, title: it.title || null, notes: it.notes || null, position: i + 1 }));
              let res = await sb.from('schedule_entries').insert(rows).select('*');
              if (res.error && /(column\s+position|unknown column|invalid input)/i.test(res.error.message || '')) {
                const rows2 = curArr.map((it) => ({ date: key, title: it.title || null, notes: it.notes || null }));
                const res2 = await sb.from('schedule_entries').insert(rows2).select('*');
                if (res2.error) throw res2.error;
              } else if (res.error) {
                throw res.error;
              }
            }
          }
        } catch (err) {
          console.error('Failed to sync custom intl day', key, err);
        }
      }
    }
    renderSchedule();
    renderIntlDaysTable();
    try { if (typeof closeDialog === 'function') closeDialog(intlCustomDialog); else intlCustomDialog?.close?.(); } catch {}
  });

  function formatDateShortAr(key) {
    const [y, m, d] = key.split('-').map(Number);
    try { return new Date(y, m - 1, d).toLocaleDateString('ar', { day: 'numeric', month: 'long' }); } catch { return key; }
  }

  function renderIntlDaysTable() {
    if (!intlDaysTableBody) return;
    const list = getIntlDaysForMonth(viewYear, viewMonth);
    // Keep header and "Add" button visible; hide only the table when no fixed days
    const wrap = document.getElementById('intlDaysTableWrap');
    if (wrap) wrap.style.display = list.length ? '' : 'none';
    intlDaysTableBody.innerHTML = '';
    list.forEach(({ key, title }) => {
      const exists = itemsFrom(schedule[key]).some(x => (x?.title || '').trim() === title.trim());
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td data-label="التاريخ" style="padding:12px">${formatDateShortAr(key)}</td>
        <td data-label="العنوان" style="padding:12px">${title}</td>
        <td data-label="إجراء" style="padding:12px">
          ${exists
            ? `<button class="btn btn-outline" data-act="open" data-date="${key}"><i class="fa-solid fa-eye"></i> فتح اليوم</button>`
            : `<button class="btn btn-outline" data-act="add" data-date="${key}" data-title="${title}"><i class="fa-solid fa-plus"></i> إضافة</button>`
          }
        </td>`;
      intlDaysTableBody.appendChild(tr);
    });
  }

  intlDaysTableBody?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const key = btn.dataset.date;
    const act = btn.dataset.act;
    if (!key || !act) return;
    if (act === 'open') { openDayEditor(key); return; }
    if (act === 'add') {
      const title = (btn.dataset.title || '').trim();
      if (!title) return;
      const arr = schedule[key] = itemsFrom(schedule[key]);
      const exists = arr.some(x => (x?.title || '').trim() === title);
      if (!exists) {
        arr.push({ title, notes: null });
        saveSchedule();
        if (sb) {
          try {
            const { data: { session } } = await sb.auth.getSession();
            if (session) {
              const curArr = itemsFrom(schedule[key]);
              const { error: delErr } = await sb.from('schedule_entries').delete().eq('date', key);
              if (delErr) throw delErr;
              if (curArr.length) {
                const rows = curArr.map((it, i) => ({ date: key, title: it.title || null, notes: it.notes || null, position: i + 1 }));
                let res = await sb.from('schedule_entries').insert(rows).select('*');
                if (res.error && /(column\s+position|unknown column|invalid input)/i.test(res.error.message || '')) {
                  const rows2 = curArr.map((it) => ({ date: key, title: it.title || null, notes: it.notes || null }));
                  const res2 = await sb.from('schedule_entries').insert(rows2).select('*');
                  if (res2.error) throw res2.error;
                } else if (res.error) {
                  throw res.error;
                }
              }
            }
          } catch (err) {
            console.error('Failed to sync intl day add', key, err);
          }
        }
        renderSchedule();
        renderIntlDaysTable();
      }
    }
  });

  // Day dialog handlers
  const scheduleDayDialog = document.getElementById('scheduleDayDialog');
  const scheduleDayForm = document.getElementById('scheduleDayForm');
  const scheduleSelectedDate = document.getElementById('scheduleSelectedDate');
  const dayDeleteBtn = document.getElementById('dayDeleteBtn');
  // Multiple items UI
  const dayItemTitle = document.getElementById('dayItemTitle');
  const dayItemNotes = document.getElementById('dayItemNotes');
  const dayAddBtn = document.getElementById('dayAddBtn');
  const dayCancelEditBtn = document.getElementById('dayCancelEditBtn');
  const dayEditState = document.getElementById('dayEditState');
  const dayItemsList = document.getElementById('dayItemsList');
  let dayItemsTemp = [];
  let dayEditingIndex = -1;

  function resetDayInputs() {
    if (dayItemTitle) dayItemTitle.value = '';
    if (dayItemNotes) dayItemNotes.value = '';
  }
  function setEditing(idx) {
    dayEditingIndex = idx;
    const isEdit = idx >= 0;
    if (dayCancelEditBtn) dayCancelEditBtn.style.display = isEdit ? '' : 'none';
    if (dayEditState) dayEditState.style.display = isEdit ? '' : 'none';
    if (dayAddBtn) dayAddBtn.innerHTML = isEdit ? '<i class="fa-solid fa-check"></i> تحديث' : '<i class="fa-solid fa-plus"></i> إضافة';
  }
  function renderDayItemsList() {
    if (!dayItemsList) return;
    dayItemsList.innerHTML = '';
    dayItemsTemp.forEach((it, idx) => {
      const div = document.createElement('div');
      div.className = 'day-item';
      const titleText = (it.title || '').trim();
      const notesText = (it.notes || '').trim();
      div.innerHTML = `
        <div class="day-item__text">
          ${titleText ? `<div class="day-item__title"><strong>${titleText}</strong></div>` : ''}
          ${notesText ? `<div class="day-item__notes">${notesText.replace(/</g,'&lt;')}</div>` : ''}
        </div>
        <div class="day-item__actions">
          <button type="button" class="btn btn-outline" data-act="edit" data-idx="${idx}"><i class="fa-solid fa-pen"></i></button>
          <button type="button" class="btn btn-outline" data-act="del" data-idx="${idx}"><i class="fa-solid fa-trash"></i></button>
        </div>`;
      dayItemsList.appendChild(div);
    });
  }

  function arFullDateLabel(key) {
    const [y,m,d] = key.split('-').map(Number);
    try { return new Date(y, m-1, d).toLocaleDateString('ar', { weekday:'long', day:'numeric', month:'long', year:'numeric' }); } catch { return key; }
  }

  function openDayEditor(key) {
    if (!scheduleDayForm) return;
    scheduleDayForm.dataset.date = key;
    if (scheduleSelectedDate) scheduleSelectedDate.textContent = arFullDateLabel(key);
    // Load items into temp list
    dayItemsTemp = itemsFrom(schedule[key]).slice();
    renderDayItemsList();
    resetDayInputs();
    setEditing(-1);
    if (dayDeleteBtn) dayDeleteBtn.style.display = dayItemsTemp.length ? '' : 'none';
    openDialog?.(scheduleDayDialog);
  }

  calendarGrid?.addEventListener('click', (e) => {
    const cell = e.target.closest('.calendar-cell');
    if (!cell) return;
    const key = cell.getAttribute('data-date');
    if (!key) return;
    openDayEditor(key);
  });

  scheduleDayForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const key = scheduleDayForm.dataset.date;
    if (!key) return;
    if (sb) {
      // require auth for write
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { alert('يلزم تسجيل الدخول لإجراء التعديلات'); return; }
      try {
        // Delete all existing for this date
        const { error: delErr } = await sb.from('schedule_entries').delete().eq('date', key);
        if (delErr) throw delErr;
        if (dayItemsTemp.length) {
          const rows = dayItemsTemp.map((it, i) => ({ date: key, title: it.title || null, notes: it.notes || null, position: i + 1 }));
          let insErr = null;
          let res = await sb.from('schedule_entries').insert(rows).select('*');
          if (res.error && /(column\s+position|unknown column|invalid input)/i.test(res.error.message || '')) {
            // Retry without position column
            const rows2 = dayItemsTemp.map((it) => ({ date: key, title: it.title || null, notes: it.notes || null }));
            const res2 = await sb.from('schedule_entries').insert(rows2).select('*');
            insErr = res2.error || null;
          } else {
            insErr = res.error || null;
          }
          if (insErr) throw insErr;
        }
        // update local and UI
        if (!dayItemsTemp.length) delete schedule[key];
        else schedule[key] = itemsFrom(dayItemsTemp);
        saveSchedule();
        renderSchedule();
        closeDialog?.(scheduleDayDialog);
      } catch (err) {
        alert('فشل الحفظ: ' + (err?.message || 'غير معروف'));
      }
    } else {
      // local fallback
      if (!dayItemsTemp.length) {
        if (schedule[key]) delete schedule[key];
      } else {
        schedule[key] = itemsFrom(dayItemsTemp);
      }
      saveSchedule();
      renderSchedule();
      closeDialog?.(scheduleDayDialog);
    }
  });

  dayDeleteBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    const key = scheduleDayForm?.dataset.date;
    if (!key) return;
    if (sb) {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { alert('يلزم تسجيل الدخول لإجراء التعديلات'); return; }
      try {
        const { error } = await sb.from('schedule_entries').delete().eq('date', key);
        if (error) throw error;
        delete schedule[key];
        dayItemsTemp = [];
        saveSchedule();
        renderSchedule();
        closeDialog?.(scheduleDayDialog);
      } catch (err) {
        alert('فشل الحذف: ' + (err?.message || 'غير معروف'));
      }
    } else {
      if (schedule[key]) delete schedule[key];
      dayItemsTemp = [];
      saveSchedule();
      renderSchedule();
      closeDialog?.(scheduleDayDialog);
    }
  });

  dayAddBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    const t = (dayItemTitle?.value || '').trim();
    const n = (dayItemNotes?.value || '').trim();
    if (!t && !n) { alert('أدخل العنوان أو الملاحظات'); return; }
    const item = { title: t || null, notes: n || null };
    if (dayEditingIndex >= 0) {
      dayItemsTemp[dayEditingIndex] = item;
    } else {
      dayItemsTemp.push(item);
    }
    renderDayItemsList();
    resetDayInputs();
    setEditing(-1);
    if (dayDeleteBtn) dayDeleteBtn.style.display = dayItemsTemp.length ? '' : 'none';
  });

  dayCancelEditBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    resetDayInputs();
    setEditing(-1);
  });

  dayItemsList?.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const act = btn.dataset.act;
    if (!Number.isInteger(idx) || idx < 0 || idx >= dayItemsTemp.length) return;
    if (act === 'edit') {
      const it = dayItemsTemp[idx];
      if (dayItemTitle) dayItemTitle.value = it.title || '';
      if (dayItemNotes) dayItemNotes.value = it.notes || '';
      setEditing(idx);
    } else if (act === 'del') {
      if (!confirm('تأكيد حذف العنصر؟')) return;
      dayItemsTemp.splice(idx, 1);
      renderDayItemsList();
      if (dayItemsTemp.length === 0) setEditing(-1);
      if (dayDeleteBtn) dayDeleteBtn.style.display = dayItemsTemp.length ? '' : 'none';
    }
  });

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

  // Membership applications: local fallback
  function localMembershipAppsGet() {
    try {
      const raw = localStorage.getItem(KEYS.membership_apps);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  // Initial Data
  let works = load(KEYS.works);
  let sponsors = load(KEYS.sponsors);
  let board = load(KEYS.board);
  let members = load(KEYS.members);
  let topics = load(KEYS.topics);
  let faq = load(KEYS.faq);
  let achievements = load(KEYS.achievements);
  let membershipApps = localMembershipAppsGet();
  let blogPosts = load(KEYS.blog);
  let testimonials = load(KEYS.testimonials);
  let todos = load(KEYS.todos);
  let visitStats = { total: 0, new: 0, returning: 0 };

  // Auth UI controls
  const loginBtn = $('#loginBtn');
  const sidebarLogoutBtn = document.querySelector('[data-logout]');

  // ===== Notifications (Header) =====
  const notifBtn = document.getElementById('notifBtn');
  const notifBadge = document.getElementById('notifBadge');
  const notifDropdown = document.getElementById('notifDropdown');
  const notifList = document.getElementById('notifList');
  const notifEmpty = document.getElementById('notifEmpty');
  const notifMarkAllBtn = document.getElementById('notifMarkAll');
  const notifClearAllBtn = document.getElementById('notifClearAll');
  const NOTIF_KEY = 'adeeb_admin_notifications';
  let notifications = (() => {
    try {
      const raw = localStorage.getItem(NOTIF_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  })();
  function saveNotifications() { try { localStorage.setItem(NOTIF_KEY, JSON.stringify(notifications)); } catch {} }
  function notifUnreadCount() { try { return notifications.reduce((a, n) => a + (n && n.unread ? 1 : 0), 0); } catch { return 0; } }
  function renderNotifBadge() {
    if (!notifBadge) return;
    const c = notifUnreadCount();
    if (c > 0) { notifBadge.textContent = String(c); notifBadge.style.display = 'inline-flex'; }
    else { notifBadge.style.display = 'none'; }
  }
  function truncateText(s, n = 120) { const t = String(s || ''); return t.length > n ? t.slice(0, n) + '…' : t; }
  function getPeerMeta(uid) {
    try {
      const c = (chatContacts || []).find(x => x && x.user_id === uid);
      if (c) return { name: c.name || 'مستخدم', avatar_url: c.avatar_url || null, position: c.position || '' };
    } catch {}
    return { name: 'مستخدم', avatar_url: null, position: '' };
  }
  function renderNotificationsList() {
    if (!notifList || !notifEmpty) return;
    notifList.innerHTML = '';
    const list = notifications.slice(0, 50);
    if (!list.length) { notifEmpty.style.display = ''; return; }
    notifEmpty.style.display = 'none';
    list.forEach((n, idx) => {
      const meta = getPeerMeta(n.sender_id);
      const avatarInner = meta.avatar_url ? `<img src="${meta.avatar_url}" alt="${meta.name}" onerror="this.remove()" />` : '';
      const item = document.createElement('div');
      item.className = 'notif-item' + (n.unread ? ' unread' : '');
      item.innerHTML = `
        <div class="avatar">${avatarInner}</div>
        <div class="meta">
          <div class="title">${n.title || ''}</div>
          ${n.text ? `<div class="sub">${truncateText(n.text, 140)}</div>` : ''}
        </div>
        <div class="notif-acts">
          <button class="btn btn-outline small" data-act="open" data-idx="${idx}"><i class="fa-solid fa-arrow-left"></i></button>
          <button class="btn btn-outline small" data-act="dismiss" data-idx="${idx}"><i class="fa-regular fa-trash-can"></i></button>
        </div>`;
      notifList.appendChild(item);
    });
  }
  function openNotifDropdown(forceOpen) {
    if (!notifDropdown || !notifBtn) return;
    const willOpen = typeof forceOpen === 'boolean' ? forceOpen : !!notifDropdown.hidden;
    notifDropdown.hidden = !willOpen;
    notifBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
  }
  function addNotification(n) {
    notifications.unshift({ ...n, id: n.id || ('loc-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)), unread: true });
    saveNotifications();
    renderNotifBadge();
    if (notifDropdown && !notifDropdown.hidden) renderNotificationsList();
  }
  function notifyChatMessage(row) {
    const meta = getPeerMeta(row.sender_id);
    addNotification({
      type: 'chat',
      sender_id: row.sender_id,
      title: `رسالة جديدة من ${meta.name}`,
      text: String(row.content || ''),
      created_at: row.created_at || new Date().toISOString(),
    });
  }
  // Events
  notifBtn?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openNotifDropdown(); if (!notifDropdown.hidden) renderNotificationsList(); });
  document.addEventListener('click', (e) => { const wrap = e.target.closest && e.target.closest('.notif-wrap'); if (!wrap) openNotifDropdown(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') openNotifDropdown(false); });
  notifMarkAllBtn?.addEventListener('click', (e) => { e.preventDefault(); notifications.forEach(n => n.unread = false); saveNotifications(); renderNotifBadge(); renderNotificationsList(); });
  notifClearAllBtn?.addEventListener('click', (e) => { e.preventDefault(); notifications = []; saveNotifications(); renderNotifBadge(); renderNotificationsList(); });
  notifList?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const act = btn.dataset.act;
    if (!Number.isInteger(idx) || idx < 0 || idx >= notifications.length) return;
    const n = notifications[idx];
    if (act === 'dismiss') {
      notifications.splice(idx, 1);
      saveNotifications(); renderNotifBadge(); renderNotificationsList();
      return;
    }
    if (act === 'open') {
      (async () => {
        try {
          n.unread = false; saveNotifications(); renderNotifBadge(); renderNotificationsList();
          if (n.type === 'chat' && n.sender_id) {
            if (!hasPermBySectionId('#section-chat')) { alert('لا تملك صلاحية الوصول لتبويب المحادثات'); return; }
            const link = document.querySelector('.admin-menu__item[href="#section-chat"]');
            if (link) link.dispatchEvent(new Event('click', { bubbles: true }));
            else {
              document.querySelectorAll('.admin-section').forEach(sec => sec.hidden = true);
              const target = document.getElementById('section-chat'); if (target) target.hidden = false;
            }
            openNotifDropdown(false);
            try { await initChatSection?.(); } catch {}
            try { await openChatWith?.(n.sender_id); } catch {}
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        } catch {}
      })();
    }
  });
  // Initialize badge on load
  try { renderNotifBadge(); } catch {}

  async function refreshAuthUI() {
    if (!sb) return; // no supabase
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      loginBtn && (loginBtn.style.display = 'none');
      renderUserBadge(session.user);
      try { await applyCurrentUserPermissions(); } catch {}
      try { await chatEnsureAuth?.(); chatEnsureRealtime?.(); } catch {}
    } else {
      loginBtn && (loginBtn.style.display = 'inline-flex');
      renderUserBadge(null);
    }
  }

  async function getAdminExtra(userId) {
    if (!sb || !userId) return { position: null, phone: null, created_at: null };
    let position = null, phone = null, created_at = null;
    try {
      const { data: row, error } = await sb
        .from('admins')
        .select('position, phone, created_at')
        .eq('user_id', userId)
        .maybeSingle();
      if (!error && row) {
        position = row.position ?? position;
        phone = row.phone ?? phone;
        created_at = row.created_at ?? created_at;
      }
    } catch {}
    // Try public profile for phone/position if available in the view
    try {
      if (!position || !phone) {
        const { data: pr2, error: e2 } = await sb
          .from('auth_users_public')
          .select('user_id, phone, position')
          .eq('user_id', userId)
          .maybeSingle();
        if (!e2 && pr2) {
          position = position ?? pr2.position ?? null;
          phone = phone ?? pr2.phone ?? null;
        }
      }
    } catch {}
    return { position, phone, created_at };
  }

  function formatArDate(val) {
    try { return val ? new Date(val).toLocaleString('ar') : '—'; } catch { return '—'; }
  }

  // ===== Admin Tabs Permissions =====
  const SECTION_PERMISSIONS = {
    '#section-works': 'works',
    '#section-sponsors': 'sponsors',
    '#section-achievements': 'achievements',
    '#section-board': 'board',
    '#section-members': 'members',
    '#section-membership-apps': 'membership_apps',
    '#section-faq': 'faq',
    '#section-blog': 'blog',
    '#section-schedule': 'schedule',
    '#section-idea-board': 'idea_board',
    '#section-chat': 'chat',
    '#section-todos': 'todos',
    '#section-admins': 'admins',
    '#section-testimonials': 'testimonials',
  };
  function defaultAdminPerms() {
    return { works: true, sponsors: true, achievements: true, board: true, members: true, membership_apps: true, faq: true, blog: true, schedule: true, idea_board: true, chat: true, todos: true, admins: true, testimonials: true };
  }
  function normalizePermsShape(perms) {
    const base = defaultAdminPerms();
    try { return { ...base, ...(perms || {}) }; } catch { return base; }
  }
  async function getAdminPerms(userId) {
    if (!sb || !userId) return null;
    try {
      // Prefer reading from public view (exposes other users' perms). Fallbacks handled by caller.
      const { data, error } = await sb
        .from('auth_users_public')
        .select('user_id, admin_perms')
        .eq('user_id', userId)
        .maybeSingle();
      if (error || !data) return null;
      let perms = data.admin_perms;
      if (!perms) return null;
      if (typeof perms === 'string') { try { perms = JSON.parse(perms); } catch {} }
      if (perms && typeof perms === 'object') return perms;
      return null;
    } catch { return null; }
  }
  let currentUserAdminPerms = null;
  function hasPermBySectionId(id) {
    if (!id) return true;
    const key = SECTION_PERMISSIONS[id];
    if (!key) return true; // sections without explicit mapping are allowed
    const perms = currentUserAdminPerms || defaultAdminPerms();
    return !!perms[key];
  }
  async function applyCurrentUserPermissions() {
    if (!sb) return;
    try {
      const { data: { user } } = await sb.auth.getUser();
      const uid = user?.id;
      if (!uid) return;
      const perms = await getAdminPerms(uid);
      if (perms) {
        currentUserAdminPerms = normalizePermsShape(perms);
      } else {
        const lvl = await getCallerLevel();
        currentUserAdminPerms = normalizePermsShape(fallbackPermsForLevel(lvl));
      }
      // Hide disallowed sidebar items
      document.querySelectorAll('.admin-menu__item').forEach((link) => {
        const id = link.getAttribute('href');
        if (!hasPermBySectionId(id)) link.style.display = 'none';
        else link.style.display = '';
      });
      // Hide disallowed dashboard cards (buttons with data-go)
      document.querySelectorAll('[data-go]').forEach((btn) => {
        const id = btn.getAttribute('data-go');
        const card = btn.closest('.card');
        if (card) card.style.display = hasPermBySectionId(id) ? '' : 'none';
      });
    } catch {}
  }

  // ===== Admin Levels (1: President, 2: Vice, 3: Manager) =====
  const ADMIN_LEVELS = { president: 1, vice: 2, manager: 3 };
  function levelLabel(l) { return l === 1 ? 'رئيس' : (l === 2 ? 'نائب' : 'قائد/مشرف'); }
  function normalizeAr(s) {
    if (!s) return '';
    let t = String(s);
    // remove diacritics and tatweel
    t = t.replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]/g, '').replace(/\u0640/g, '');
    // normalize hamza forms to alif
    t = t.replace(/[أإآ]/g, 'ا');
    // normalize dashes/spaces
    t = t.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
    return t;
  }
  function levelFromPositionAr(position) {
    if (!position) return ADMIN_LEVELS.manager;
    const p = normalizeAr(position);
    // رئيس أدِيب: وجود كلمتي رئيس + اديب يكفي
    if (p.includes('رئيس') && p.includes('اديب')) return ADMIN_LEVELS.president;
    // النائب: وجود نائب + الرئيس يكفي (سواء شطر الطلاب/الطالبات)
    if (p.includes('نائب') && p.includes('الرئيس')) return ADMIN_LEVELS.vice;
    // باقي المسميات: قادة/مشرفون
    return ADMIN_LEVELS.manager;
  }
  function fallbackPermsForLevel(lv) {
    // الرئيس/النائب: كل التبويبات مسموحة. القادة: كل شيء ما عدا إدارة الإداريين.
    const base = { works: true, sponsors: true, achievements: true, board: true, members: true, membership_apps: true, faq: true, blog: true, schedule: true, idea_board: true, chat: true, todos: true, admins: true };
    if (lv === ADMIN_LEVELS.manager) return { ...base, admins: false };
    return base;
  }
  async function getAdminLevelPublic(userId) {
    if (!sb || !userId) return ADMIN_LEVELS.manager;
    try {
      const { data, error } = await sb
        .from('auth_users_public')
        .select('user_id, admin_level, position')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) return ADMIN_LEVELS.manager;
      const lv = Number(data?.admin_level);
      if (Number.isFinite(lv) && lv >= 1 && lv <= 3) return lv;
      // fallback: derive from position (from view), else from admins table
      let pos = (data?.position || null);
      if (!pos) {
        try {
          const { data: row2 } = await sb.from('admins').select('position').eq('user_id', userId).maybeSingle();
          pos = row2?.position || null;
        } catch {}
      }
      return levelFromPositionAr(pos);
    } catch { return ADMIN_LEVELS.manager; }
  }
  async function getCallerLevel() {
    if (!sb) return ADMIN_LEVELS.manager;
    try {
      const { data: { user } } = await sb.auth.getUser();
      const mdLv = Number(user?.user_metadata?.admin_level);
      if (Number.isFinite(mdLv)) return mdLv;
      // fallback to mapping from public view (may derive from position too)
      return await getAdminLevelPublic(user?.id);
    } catch { return ADMIN_LEVELS.manager; }
  }
  function evalAdminActions(callerLevel, targetLevel, callerId, targetId) {
    // President (1) can manage everyone except we also avoid self-remove edit for safety
    if (targetLevel === ADMIN_LEVELS.president) {
      return { canEditPerms: false, canRemove: false, canEditLevel: false };
    }
    const isSelf = callerId && targetId && callerId === targetId;
    // Vice rules: can manage only managers (lvl3), not self
    if (callerLevel === ADMIN_LEVELS.vice) {
      const can = targetLevel >= ADMIN_LEVELS.manager && !isSelf;
      return { canEditPerms: can, canRemove: can, canEditLevel: false };
    }
    // Manager cannot manage anyone
    if (callerLevel >= ADMIN_LEVELS.manager) {
      return { canEditPerms: false, canRemove: false, canEditLevel: false };
    }
    // President managing Vice/Manager
    if (callerLevel === ADMIN_LEVELS.president) {
      // Allow editing/removing vice and managers; avoid self-remove
      return { canEditPerms: !isSelf, canRemove: !isSelf, canEditLevel: !isSelf && targetLevel !== ADMIN_LEVELS.president };
    }
    return { canEditPerms: false, canRemove: false, canEditLevel: false };
  }

  async function showAdminDetails(userId) {
    const pr = adminsProfilesMap.get(userId) || {};
    const row = adminsList.find(r => r && r.user_id === userId) || {};
    const name = (pr.display_name && String(pr.display_name).trim()) || 'مستخدم';
    const avatarUrl = (pr.avatar_url && String(pr.avatar_url).trim()) ? pr.avatar_url : '';
    const email = row.email || '—';
    const created = row.created_at || null;
    const extra = await getAdminExtra(userId);
    const position = extra.position || '—';
    const phone = extra.phone || '—';
    const createdAt = formatArDate(created || extra.created_at || null);
    // Resolve hierarchy (caller vs target)
    const targetLevel = await getAdminLevelPublic(userId);
    // Fallback permissions bound to level if no explicit admin_perms found
    const perms = await getAdminPerms(userId) || fallbackPermsForLevel(targetLevel);
    const { data: { user: caller } } = await sb.auth.getUser();
    const callerId = caller?.id || null;
    const callerLevel = await getCallerLevel();
    const { canEditPerms, canRemove, canEditLevel } = evalAdminActions(callerLevel, targetLevel, callerId, userId);
    adminDetailsCurrentUserId = userId;

    const avatar = avatarUrl
      ? `<img src="${avatarUrl}" alt="${name}" onerror="this.remove()" style="width:48px;height:48px;border-radius:999px;object-fit:cover" />`
      : `<div class="avatar" style="width:48px;height:48px;border-radius:999px;overflow:hidden;background:#e2e8f0;display:grid;place-items:center">
           <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
             <circle cx="12" cy="12" r="10" fill="#cbd5e1"/>
             <circle cx="12" cy="10" r="3.2" fill="#64748b"/>
             <path d="M5.5 18.2c1.9-3 5-4.2 6.5-4.2s4.6 1.2 6.5 4.2c-2.1 1.7-4.6 2.8-6.5 2.8s-4.4-1.1-6.5-2.8z" fill="#64748b"/>
           </svg>
         </div>`;

    const html = `
      <div style="display:flex; align-items:center; gap:12px;">
        ${avatar}
        <div>
          <div style="font-family: fb; color: var(--main-blue); font-size: 16px;">${name}</div>
          <div class="muted" style="font-size:12px">${email}</div>
        </div>
      </div>
      <div style="display:flex; gap:8px; margin-top:8px">
        <button type="button" class="btn" id="startChatWithAdminBtn"><i class="fa-solid fa-comments"></i> بدء محادثة</button>
      </div>
      <div class="panel__body" style="padding:0; margin-top:12px">
        <div style="display:grid; gap:8px; grid-template-columns: 140px 1fr; align-items:center;">
          <div class="muted">المنصب</div><div>${position}</div>
          <div class="muted">رقم الجوال</div><div>${phone}</div>
          <div class="muted">وقت إنشاء الحساب</div><div>${createdAt}</div>
          <div class="muted">المعرّف</div><div style="direction:ltr">${userId}</div>
        </div>
      </div>
      <div class="panel__body" id="adminPermsSection" style="padding:0; margin-top:16px">
        <div style="font-weight:700; color: var(--main-blue); margin-bottom:8px"><i class="fa-solid fa-lock"></i> الصلاحيات</div>
        <div class="form-grid" id="adminPermsGrid">
          <label><input type="checkbox" id="perm-works" /> إدارة الأعمال</label>
          <label><input type="checkbox" id="perm-sponsors" /> إدارة الرعاة</label>
          <label><input type="checkbox" id="perm-achievements" /> إدارة الإنجازات</label>
          <label><input type="checkbox" id="perm-board" /> المجلس الإداري</label>
          <label><input type="checkbox" id="perm-members" /> أعضاء النادي</label>
          <label><input type="checkbox" id="perm-membership_apps" /> طلبات العضوية</label>
          <label><input type="checkbox" id="perm-faq" /> الأسئلة الشائعة</label>
          <label><input type="checkbox" id="perm-blog" /> مرافئ (المدونة)</label>
          <label><input type="checkbox" id="perm-idea_board" /> سبورة أدِيب</label>
          <label><input type="checkbox" id="perm-chat" /> المحادثات</label>
          <label><input type="checkbox" id="perm-schedule" /> جدول أدِيب</label>
          <label><input type="checkbox" id="perm-todos" /> المهام</label>
          <label><input type="checkbox" id="perm-admins" /> إدارة الأعضاء الإداريين</label>
          <label><input type="checkbox" id="perm-testimonials" /> آراء الأعضاء</label>
        </div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
          <button type="button" class="btn" id="permsSelectAll">تحديد الكل</button>
          <button type="button" class="btn" id="permsClearAll">مسح الكل</button>
          <div style="flex:1"></div>
          <button type="button" class="btn btn-primary" id="adminPermsSaveBtn"><i class="fa-regular fa-floppy-disk"></i> حفظ الصلاحيات</button>
          <span id="adminPermsMsg" class="muted"></span>
        </div>
      </div>
      <div class="panel__body" style="padding:0; margin-top:16px">
        <div style="display:grid; gap:8px; grid-template-columns: 140px 1fr; align-items:center;">
          <div class="muted">الرتبة الإدارية</div><div>${levelLabel(targetLevel)}</div>
        </div>
        <div id="levelEditor" style="margin-top:8px; ${canEditLevel ? '' : 'display:none'}">
          <label style="display:flex; gap:8px; align-items:center">
            <span>تعديل الرتبة</span>
            <select id="adminLevelSelect">
              <option value="2">نائب</option>
              <option value="3">قائد/مشرف</option>
            </select>
          </label>
          <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
            <button type="button" class="btn btn-primary" id="adminLevelSaveBtn"><i class="fa-regular fa-floppy-disk"></i> حفظ المستوى</button>
            <span id="adminLevelMsg" class="muted"></span>
          </div>
        </div>
      </div>`;
    if (adminDetailsBody) adminDetailsBody.innerHTML = html;
    // Initialize permissions UI
    try {
      // Start chat button
      document.getElementById('startChatWithAdminBtn')?.addEventListener('click', async () => {
        try {
          if (!hasPermBySectionId('#section-chat')) { alert('لا تملك صلاحية الوصول لتبويب المحادثات'); return; }
          // Switch to chat tab
          const link = document.querySelector('.admin-menu__item[href="#section-chat"]');
          if (link) {
            link.dispatchEvent(new Event('click', { bubbles: true }));
          } else {
            // Fallback: directly show the section
            document.querySelectorAll('.admin-section').forEach(sec => sec.hidden = true);
            const target = document.getElementById('section-chat'); if (target) target.hidden = false;
          }
          closeDialog?.(adminDetailsDialog);
          // Ensure chat is initialized then open conversation
          try { await initChatSection?.(); } catch {}
          try { await openChatWith?.(userId); } catch {}
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch {}
      });

      const setPerm = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };
      setPerm('perm-works', perms.works);
      setPerm('perm-sponsors', perms.sponsors);
      setPerm('perm-achievements', perms.achievements);
      setPerm('perm-board', perms.board);
      setPerm('perm-members', perms.members);
      setPerm('perm-membership_apps', perms.membership_apps);
      setPerm('perm-faq', perms.faq);
      setPerm('perm-blog', perms.blog);
      setPerm('perm-idea_board', perms.idea_board);
      setPerm('perm-chat', perms.chat);
      setPerm('perm-schedule', perms.schedule);
      setPerm('perm-todos', perms.todos);
      setPerm('perm-admins', perms.admins);
      setPerm('perm-testimonials', perms.testimonials);

      document.getElementById('permsSelectAll')?.addEventListener('click', () => {
        adminDetailsBody?.querySelectorAll('#adminPermsGrid input[type="checkbox"]:not(:disabled)')
          .forEach(cb => cb.checked = true);
      });
      document.getElementById('permsClearAll')?.addEventListener('click', () => {
        adminDetailsBody?.querySelectorAll('#adminPermsGrid input[type="checkbox"]').forEach(cb => cb.checked = false);
      });
      document.getElementById('adminPermsSaveBtn')?.addEventListener('click', async () => {
        const btn = document.getElementById('adminPermsSaveBtn');
        const msg = document.getElementById('adminPermsMsg');
        const gather = () => ({
          works: !!document.getElementById('perm-works')?.checked,
          sponsors: !!document.getElementById('perm-sponsors')?.checked,
          achievements: !!document.getElementById('perm-achievements')?.checked,
          board: !!document.getElementById('perm-board')?.checked,
          members: !!document.getElementById('perm-members')?.checked,
          membership_apps: !!document.getElementById('perm-membership_apps')?.checked,
          faq: !!document.getElementById('perm-faq')?.checked,
          blog: !!document.getElementById('perm-blog')?.checked,
          idea_board: !!document.getElementById('perm-idea_board')?.checked,
          chat: !!document.getElementById('perm-chat')?.checked,
          schedule: !!document.getElementById('perm-schedule')?.checked,
          todos: !!document.getElementById('perm-todos')?.checked,
          admins: !!document.getElementById('perm-admins')?.checked,
          testimonials: !!document.getElementById('perm-testimonials')?.checked,
        });
        try {
          if (msg) { msg.className = 'muted'; msg.textContent = ''; }
          if (btn) { btn.disabled = true; btn.style.opacity = .7; }
          await callFunction('set-admin-perms', { method: 'POST', body: { user_id: adminDetailsCurrentUserId, perms: gather() } });
          if (msg) { msg.className = 'muted'; msg.textContent = 'تم الحفظ'; }
        } catch (err) {
          if (msg) { msg.className = 'alert error'; msg.textContent = 'فشل الحفظ: ' + (err?.message || 'غير معروف'); }
        } finally {
          if (btn) { btn.disabled = false; btn.style.opacity = 1; }
        }
      });
      // Disable permissions UI if not allowed
      adminDetailsBody?.querySelectorAll('#adminPermsGrid input[type="checkbox"]').forEach(cb => { cb.disabled = !canEditPerms; });
      const savePermBtn = document.getElementById('adminPermsSaveBtn');
      if (savePermBtn) savePermBtn.style.display = canEditPerms ? '' : 'none';
      const selectAllBtn = document.getElementById('permsSelectAll');
      const clearAllBtn = document.getElementById('permsClearAll');
      if (selectAllBtn) selectAllBtn.style.display = canEditPerms ? '' : 'none';
      if (clearAllBtn) clearAllBtn.style.display = canEditPerms ? '' : 'none';

      // Enforce role-title binding: managers (level 3) can never get 'admins' tab
      try {
        if (targetLevel === ADMIN_LEVELS.manager) {
          const adminsCb = document.getElementById('perm-admins');
          if (adminsCb) {
            adminsCb.checked = false;
            adminsCb.disabled = true;
            adminsCb.title = 'صلاحية إدارة الإداريين محفوظة للرئيس/النائب';
          }
        }
      } catch {}

      // Init level editor
      const levelSelect = document.getElementById('adminLevelSelect');
      if (levelSelect) levelSelect.value = String(Math.min(Math.max(targetLevel, 2), 3));
      document.getElementById('adminLevelSaveBtn')?.addEventListener('click', async () => {
        const btn = document.getElementById('adminLevelSaveBtn');
        const msg = document.getElementById('adminLevelMsg');
        const newLevel = Number(document.getElementById('adminLevelSelect')?.value || 3);
        if (newLevel === 1) { if (msg) { msg.className = 'alert error'; msg.textContent = 'لا يمكن تعيين رئيس من هنا'; } return; }
        try {
          if (msg) { msg.className = 'muted'; msg.textContent = ''; }
          if (btn) { btn.disabled = true; btn.style.opacity = .7; }
          await callFunction('set-admin-level', { method: 'POST', body: { user_id: adminDetailsCurrentUserId, admin_level: newLevel } });
          if (msg) { msg.className = 'muted'; msg.textContent = 'تم حفظ المستوى'; }
        } catch (err) {
          if (msg) { msg.className = 'alert error'; msg.textContent = 'فشل الحفظ: ' + (err?.message || 'غير معروف'); }
        } finally {
          if (btn) { btn.disabled = false; btn.style.opacity = 1; }
        }
      });
    } catch {}
    // Hide/disable remove button based on hierarchy
    try {
      const btnRemove = document.getElementById('adminRemoveBtn');
      if (btnRemove) btnRemove.style.display = canRemove ? '' : 'none';
    } catch {}
    // Hide/disable remove button and perms block based on hierarchy
    try {
      const btnRemove = document.getElementById('adminRemoveBtn');
      if (btnRemove) btnRemove.style.display = canRemove ? '' : 'none';
      if (targetLevel === ADMIN_LEVELS.president) {
        const permsSection = document.getElementById('adminPermsSection');
        if (permsSection) permsSection.style.display = 'none';
      }
    } catch {}
    openDialog?.(adminDetailsDialog);
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
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      const id = link.getAttribute('href');
      if (!id) return;
      if (!hasPermBySectionId(id)) { alert('لا تملك صلاحية الوصول لهذا التبويب'); return; }

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
        try { updateInstallButtonVisibility?.(); } catch {}
      }

      // If schedule tab is opened, render the calendar
      if (id === '#section-schedule') {
        try { renderSchedule?.(); } catch {}
        try { loadScheduleForCurrentGrid?.(); } catch {}
      }

      // If stats tab is opened, render statistics
      if (id === '#section-stats') {
        try { await fetchVisitStats?.(); } catch {}
        try { renderStats?.(); } catch {}
      }

      // If chat tab is opened, init chat
      if (id === '#section-chat') {
        try { initChatSection?.(); } catch {}
      }

      // If to-dos tab is opened, render tasks
      if (id === '#section-todos') {
        try { renderTodos?.(); } catch {}
      }

      // If idea board tab is opened, load ideas
      if (id === '#section-idea-board') {
        try { loadIdeaBoardAdmin?.(); } catch {}
        try { loadIdeaTopicsAdmin?.(); } catch {}
      }

      // If members tab is opened, render members
      if (id === '#section-members') {
        try { renderMembers?.(); } catch {}
      }
      // If membership apps tab is opened, load applications
      if (id === '#section-membership-apps') {
        try { await loadMembershipApps?.(); } catch {}
      }
      // If testimonials tab is opened, render testimonials
      if (id === '#section-testimonials') {
        try { renderTestimonials?.(); } catch {}
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
    if (!hasPermBySectionId(id)) { alert('لا تملك صلاحية الوصول لهذا التبويب'); return; }
    // hide all and show target
    $$('.admin-section').forEach((sec) => (sec.hidden = true));
    const target = $(id);
    if (target) target.hidden = false;
    // If navigating via dashboard card to schedule, render it
    if (id === '#section-schedule') {
      try { renderSchedule?.(); } catch {}
      try { loadScheduleForCurrentGrid?.(); } catch {}
    }
    // If navigating via dashboard card to chat, init it
    if (id === '#section-chat') {
      try { initChatSection?.(); } catch {}
    }
    // If navigating via dashboard card to to-dos, render them
    if (id === '#section-todos') {
      try { renderTodos?.(); } catch {}
    }
    // If navigating via dashboard card to idea board, load it
    if (id === '#section-idea-board') {
      try { loadIdeaBoardAdmin?.(); } catch {}
    }
    // If navigating via dashboard card to members, render them
    if (id === '#section-members') {
      try { renderMembers?.(); } catch {}
    }
    // If navigating to membership apps, load them
    if (id === '#section-membership-apps') {
      try { loadMembershipApps?.(); } catch {}
    }
    // If navigating via dashboard card to testimonials, render them
    if (id === '#section-testimonials') {
      try { renderTestimonials?.(); } catch {}
    }
    // keep sidebar active on the single Home tab
    if (isMobile()) closeSidebar();
    // optional: scroll to top for better context
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ===== Admin Chat Logic =====
  let chatInitialized = false;
  let chatMyId = null;
  let chatActivePeerId = null;
  let chatContacts = [];
  let chatRtChannel = null;
  let chatTypingChannel = null;
  let chatTypingTimeout = null;
  let chatTypingDebounce = null;
  let chatFilter = 'all';
  let chatUnreadMap = new Map(); // user_id -> count
  const chatPageSize = 50;
  let chatHistoryOldest = null; // ISO string
  let chatHistoryLoadedAll = false;

  function chatTimeLabel(ts) {
    try { return new Date(ts).toLocaleString('ar', { hour: '2-digit', minute: '2-digit' }); } catch { return ts; }
  }
  function chatRenderContacts(filter = '') {
    if (!chatContactsEl) return;
    const q = (filter || '').trim();
    const qn = normalizeAr?.(q) || q;
    chatContactsEl.innerHTML = '';
    let list = chatContacts;
    // apply search
    if (q) {
      list = list.filter(c => {
        const n = normalizeAr?.(c.name || '') || (c.name || '');
        const p = normalizeAr?.(c.position || '') || (c.position || '');
        return n.includes(qn) || p.includes(qn);
      });
    }
    // apply filter chips
    if (chatFilter === 'high') {
      list = list.filter(c => c.level === ADMIN_LEVELS.president || c.level === ADMIN_LEVELS.vice);
    } else if (chatFilter === 'admins') {
      list = list.filter(c => c.level === ADMIN_LEVELS.manager);
    }
    // empty state toggle
    if (chatNoContactsEl) chatNoContactsEl.style.display = list.length ? 'none' : '';
    list.forEach(c => {
      const div = document.createElement('div');
      div.className = 'chat-contact' + (c.user_id === chatActivePeerId ? ' active' : '');
      div.dataset.uid = c.user_id;
      const avatar = c.avatar_url
        ? `<img src="${c.avatar_url}" alt="${c.name}" onerror="this.remove()" />`
        : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
             <circle cx="12" cy="12" r="10" fill="#cbd5e1"/>
             <circle cx="12" cy="10" r="3.2" fill="#64748b"/>
             <path d="M5.5 18.2c1.9-3 5-4.2 6.5-4.2s4.6 1.2 6.5 4.2c-2.1 1.7-4.6 2.8-6.5 2.8s-4.4-1.1-6.5-2.8z" fill="#64748b"/>
           </svg>`;
      const unread = Number(chatUnreadMap.get(c.user_id) || 0);
      const badge = unread > 0 ? `<div class="badge" aria-label="غير مقروء">${unread}</div>` : '';
      div.innerHTML = `
        <div class="avatar">${avatar}</div>
        <div class="meta">
          <div class="name">${c.name || 'مستخدم'}</div>
          ${c.position ? `<div class="sub">${c.position}</div>` : ''}
        </div>${badge}`;
      chatContactsEl.appendChild(div);
    });
  }
  function chatRenderHeader(peer) {
    if (chatPartnerName) chatPartnerName.textContent = peer?.name || '—';
    if (chatPeerMeta) chatPeerMeta.textContent = peer?.position || '';
    if (chatPeerAvatar) {
      if (peer?.avatar_url) {
        chatPeerAvatar.innerHTML = `<img src="${peer.avatar_url}" alt="${peer.name || ''}" onerror="this.remove()" />`;
      } else {
        chatPeerAvatar.innerHTML = '';
      }
    }
  }
  function chatAppendMessage(row, isMine) {
    if (!chatMessagesEl) return;
    const div = document.createElement('div');
    div.className = 'msg' + (isMine ? ' me' : '');
    const contentRaw = String(row.content || '');
    const html = chatRenderMessageContent(contentRaw);
    div.innerHTML = `${html}<span class="time">${chatTimeLabel(row.created_at)}</span>`;
    chatMessagesEl.appendChild(div);
  }
  function chatClearMessages() { if (chatMessagesEl) chatMessagesEl.innerHTML = ''; }
  function chatScrollToBottom() { try { chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight; } catch {} }

  function escapeHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  function linkifyText(s) {
    const esc = escapeHtml(s);
    return esc.replace(/(https?:\/\/[^\s<>]+)/g, (m) => `<a href="${m}" target="_blank" rel="noopener">${m}</a>`);
  }
  function chatRenderMessageContent(content) {
    if (content.startsWith('image:')) {
      const url = content.slice(6).trim();
      if (/^https?:\/\//.test(url)) {
        return `<img src="${url}" alt="image" loading="lazy" />`;
      }
    }
    return linkifyText(content);
  }

  function isNearBottom(el, thresh = 24) {
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < thresh;
  }
  function toggleScrollBottomBtn() {
    if (!chatMessagesEl || !chatScrollBottomBtn) return;
    const show = !isNearBottom(chatMessagesEl, 24);
    chatScrollBottomBtn.style.display = show ? '' : 'none';
  }

  async function chatEnsureAuth() {
    if (!sb) throw new Error('no-supabase');
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error('not-authenticated');
    chatMyId = user.id;
    return user;
  }
  async function chatLoadContacts() {
    if (!sb) return;
    try {
      // Use Edge Function to bypass RLS on public.admins and get current admins
      let rows = [];
      try { rows = await callFunction('list-admins', { method: 'GET' }); } catch (e) { throw e; }
      const ids = Array.from(new Set((rows || []).map(r => r && r.user_id).filter(Boolean)));
      const filtered = ids.filter(id => id !== chatMyId);
      if (!filtered.length) { chatContacts = []; chatRenderContacts(); return; }
      let profiles = null; let perr = null;
      try {
        const q = await sb
          .from('auth_users_public')
          .select('user_id, display_name, avatar_url, position, admin_level')
          .in('user_id', filtered);
        profiles = q.data; perr = q.error || null;
      } catch (e) { perr = e; }
      if (perr) {
        // Fallback: select without admin_level if column doesn't exist in the view
        try {
          const q2 = await sb
            .from('auth_users_public')
            .select('user_id, display_name, avatar_url, position')
            .in('user_id', filtered);
          profiles = q2.data; perr = q2.error || null;
        } catch (e2) { perr = e2; }
        if (perr) throw perr;
      }
      const map = new Map((profiles || []).map(pr => [pr.user_id, pr]));
      chatContacts = filtered.map(uid => {
        const pr = map.get(uid) || {};
        const rawLv = Number(pr.admin_level);
        const level = Number.isFinite(rawLv) ? rawLv : levelFromPositionAr(pr.position || '');
        return {
          user_id: uid,
          name: pr.display_name || 'مستخدم',
          avatar_url: pr.avatar_url || null,
          position: pr.position || '',
          level
        };
      });
      chatRenderContacts(chatSearchInput?.value || '');
    } catch (err) {
      console.error('chat contacts load failed', err);
      chatContacts = [];
      chatRenderContacts();
    }
  }
  async function chatLoadLatest(peerId) {
    if (!sb || !peerId || !chatMyId) return [];
    const or = `and(sender_id.eq.${chatMyId},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${chatMyId})`;
    const { data, error } = await sb
      .from('admin_messages')
      .select('id,sender_id,recipient_id,content,created_at')
      .or(or)
      .order('created_at', { ascending: false })
      .limit(chatPageSize);
    if (error) throw error;
    const rows = Array.isArray(data) ? data : [];
    // determine oldest timestamp loaded
    chatHistoryLoadedAll = rows.length < chatPageSize;
    const sortedAsc = rows.slice().reverse();
    chatHistoryOldest = sortedAsc.length ? sortedAsc[0].created_at : null;
    return sortedAsc;
  }
  async function chatLoadOlder() {
    if (!sb || !chatActivePeerId || !chatMyId || !chatHistoryOldest || chatHistoryLoadedAll) return [];
    const or = `and(sender_id.eq.${chatMyId},recipient_id.eq.${chatActivePeerId}),and(sender_id.eq.${chatActivePeerId},recipient_id.eq.${chatMyId})`;
    const { data, error } = await sb
      .from('admin_messages')
      .select('id,sender_id,recipient_id,content,created_at')
      .or(or)
      .lt('created_at', chatHistoryOldest)
      .order('created_at', { ascending: false })
      .limit(chatPageSize);
    if (error) throw error;
    const rows = Array.isArray(data) ? data : [];
    if (!rows.length) { chatHistoryLoadedAll = true; return []; }
    const sortedAsc = rows.slice().reverse();
    chatHistoryOldest = sortedAsc[0]?.created_at || chatHistoryOldest;
    if (rows.length < chatPageSize) chatHistoryLoadedAll = true;
    return sortedAsc;
  }
  async function openChatWith(peerId) {
    chatActivePeerId = peerId;
    // active class
    try {
      chatContactsEl?.querySelectorAll('.chat-contact').forEach(el => {
        el.classList.toggle('active', el.dataset.uid === String(peerId));
      });
    } catch {}
    const peer = chatContacts.find(c => c.user_id === peerId) || null;
    chatRenderHeader(peer);
    chatClearMessages();
    if (chatEmptyEl) chatEmptyEl.style.display = 'none';
    try {
      chatHistoryLoadedAll = false; chatHistoryOldest = null;
      const rows = await chatLoadLatest(peerId);
      rows.forEach(r => chatAppendMessage(r, r.sender_id === chatMyId));
      chatScrollToBottom();
      // clear unread for this peer
      chatUnreadMap.delete(peerId);
      chatRenderContacts(chatSearchInput?.value || '');
      // toggle load more
      if (chatLoadMoreBtn) chatLoadMoreBtn.style.display = chatHistoryLoadedAll ? 'none' : '';
    } catch (err) {
      alert('تعذر تحميل المحادثة: ' + (err?.message || 'غير معروف'));
    }
  }
  function chatEnsureRealtime() {
    if (!sb || !chatMyId) return;
    if (chatRtChannel) return;
    chatRtChannel = sb.channel(`admin-messages-${chatMyId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_messages', filter: `recipient_id=eq.${chatMyId}` }, (payload) => {
        const row = payload?.new || {};
        // Append only if this conversation is open
        if (row && row.sender_id && row.sender_id === chatActivePeerId) {
          chatAppendMessage(row, false);
          chatScrollToBottom();
        } else {
          // increase unread counter for sender
          const cur = Number(chatUnreadMap.get(row.sender_id) || 0);
          chatUnreadMap.set(row.sender_id, cur + 1);
          chatRenderContacts(chatSearchInput?.value || '');
          try { notifyChatMessage?.(row); } catch {}
        }
      })
      .subscribe();

    // Typing indicator broadcast (Realtime channel)
    if (!chatTypingChannel) {
      chatTypingChannel = sb.channel('admin-chat-typing')
        .on('broadcast', { event: 'typing' }, (payload) => {
          const p = payload?.payload || {};
          if (p && p.recipient_id === chatMyId) {
            // show typing only when open on that sender
            if (p.sender_id && p.sender_id === chatActivePeerId) {
              if (chatTypingEl) {
                chatTypingEl.style.display = '';
                clearTimeout(chatTypingTimeout);
                chatTypingTimeout = setTimeout(() => { chatTypingEl.style.display = 'none'; }, 2500);
              }
            } else {
              // could mark a subtle hint on contact (skipped)
            }
          }
        })
        .subscribe();
    }
  }
  async function initChatSection() {
    if (!sb) return;
    try {
      await chatEnsureAuth();
      await chatLoadContacts();
      if (!chatInitialized) {
        // Bind contacts click
        chatContactsEl?.addEventListener('click', (e) => {
          const el = e.target.closest('.chat-contact');
          if (!el) return;
          const uid = el.dataset.uid;
          if (uid) openChatWith(uid);
        });
        // Search filter
        chatSearchInput?.addEventListener('input', () => {
          chatRenderContacts(chatSearchInput.value);
        });
        // Filter chips
        chatFiltersEl?.addEventListener('click', (e) => {
          const btn = e.target.closest('.chip');
          if (!btn) return;
          chatFiltersEl.querySelectorAll('.chip').forEach(ch => ch.classList.remove('active'));
          btn.classList.add('active');
          chatFilter = btn.getAttribute('data-filter') || 'all';
          chatRenderContacts(chatSearchInput?.value || '');
        });
        // Load older history
        chatLoadMoreBtn?.addEventListener('click', async () => {
          try {
            if (!chatActivePeerId) return;
            const atTop = chatMessagesEl ? chatMessagesEl.scrollTop : 0;
            const prevHeight = chatMessagesEl ? chatMessagesEl.scrollHeight : 0;
            const rows = await chatLoadOlder();
            if (rows.length) {
              const frag = document.createDocumentFragment();
              rows.forEach(r => {
                const div = document.createElement('div');
                div.className = 'msg' + (r.sender_id === chatMyId ? ' me' : '');
                div.innerHTML = `${chatRenderMessageContent(String(r.content || ''))}<span class="time">${chatTimeLabel(r.created_at)}</span>`;
                frag.appendChild(div);
              });
              if (chatMessagesEl) {
                chatMessagesEl.insertBefore(frag, chatMessagesEl.firstChild);
                // keep scroll position stable
                const newHeight = chatMessagesEl.scrollHeight;
                chatMessagesEl.scrollTop = (newHeight - prevHeight) + atTop;
              }
            }
            if (chatLoadMoreBtn) chatLoadMoreBtn.style.display = chatHistoryLoadedAll ? 'none' : '';
          } catch (err) {
            alert('تعذر تحميل رسائل أقدم: ' + (err?.message || 'غير معروف'));
          }
        });
        // Scroll behavior
        chatMessagesEl?.addEventListener('scroll', toggleScrollBottomBtn);
        chatScrollBottomBtn?.addEventListener('click', () => chatScrollToBottom());
        // Typing: broadcast while typing (debounced)
        chatInputEl?.addEventListener('input', () => {
          if (!chatActivePeerId || !chatTypingChannel) return;
          clearTimeout(chatTypingDebounce);
          chatTypingDebounce = setTimeout(() => {
            try {
              chatTypingChannel.send({ type: 'broadcast', event: 'typing', payload: { sender_id: chatMyId, recipient_id: chatActivePeerId } });
            } catch {}
          }, 200);
        });
        // Send
        chatComposerForm?.addEventListener('submit', async (e) => {
          e.preventDefault();
          const txt = (chatInputEl?.value || '').trim();
          if (!txt) return;
          if (!chatActivePeerId) { alert('اختر جهة اتصال لبدء المحادثة'); return; }
          try {
            const { data: { session } } = await sb.auth.getSession();
            if (!session) { alert('يلزم تسجيل الدخول'); return; }
            const payload = { sender_id: chatMyId, recipient_id: chatActivePeerId, content: txt };
            const { data: row, error } = await sb.from('admin_messages').insert(payload).select('*').single();
            if (error) throw error;
            chatAppendMessage(row || payload, true);
            chatScrollToBottom();
            if (chatInputEl) chatInputEl.value = '';
          } catch (err) {
            alert('تعذر إرسال الرسالة: ' + (err?.message || 'غير معروف'));
          }
        });
        chatInitialized = true;
      }
      chatEnsureRealtime();
      // Open first contact by default
      if (chatContacts.length && !chatActivePeerId) openChatWith(chatContacts[0].user_id);
      if (!chatContacts.length && chatEmptyEl) chatEmptyEl.style.display = '';
    } catch (err) {
      console.warn('chat init failed', err);
    }
  }


  // Renderers

  function el(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstElementChild;
  }

  async function fetchVisitStats() {
    if (!sb) { visitStats = { total: 0, new: 0, returning: 0 }; return; }
    try {
      const [tot, ret, neu] = await Promise.all([
        sb.from('site_visits').select('*', { count: 'exact', head: true }),
        sb.from('site_visits').select('*', { count: 'exact', head: true }).eq('is_returning', true),
        sb.from('site_visits').select('*', { count: 'exact', head: true }).eq('is_returning', false),
      ]);
      visitStats = {
        total: Number(tot?.count || 0),
        returning: Number(ret?.count || 0),
        new: Number(neu?.count || 0),
      };
    } catch (e) {
      console.warn('visit stats fetch failed', e);
      visitStats = { total: 0, new: 0, returning: 0 };
    }
  }

  function renderStats() {
    if (!statsGrid) return;
    const num = (v) => {
      const n = Number(v || 0);
      try { return n.toLocaleString('ar'); } catch { return String(n); }
    };
    const vs = visitStats || { total: 0, new: 0, returning: 0 };
    // Build committee cards from members' committee field
    const committeeItems = (() => {
      try {
        const map = new Map();
        (members || []).forEach((m) => {
          const raw = (m?.committee || '').trim();
          if (!raw) return;
          const key = raw.replace(/\s+/g, ' ');
          map.set(key, (map.get(key) || 0) + 1);
        });
        // sort by Arabic label
        const labels = Array.from(map.entries()).sort((a, b) => {
          try { return a[0].localeCompare(b[0], 'ar'); } catch { return String(a[0]).localeCompare(String(b[0])); }
        });
        return labels.map(([label, count]) => ({
          title: `أعضاء ${label}`,
          value: num(count),
          icon: 'fa-solid fa-users',
        }));
      } catch {
        return [];
      }
    })();
    const items = [
      { title: 'أعضاء النادي', value: num((members || []).length), icon: 'fa-solid fa-users-rectangle' },
      { title: 'زيارات الموقع', value: num(vs.total), icon: 'fa-solid fa-eye' },
      { title: 'زائرون جدد', value: num(vs.new), icon: 'fa-solid fa-user-plus' },
      { title: 'زائرون عائدون', value: num(vs.returning), icon: 'fa-solid fa-user-clock' },
      ...committeeItems,
    ];
    statsGrid.innerHTML = '';
    items.forEach((it) => {
      const node = el(`
        <div class="card">
          <div class="card__body">
            <div class="card__title"><i class="${it.icon}"></i> ${it.title}</div>
            <div class="stat-number">${it.value}</div>
          </div>
        </div>
      `);
      statsGrid.appendChild(node);
    });
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

  function renderMembers() {
    if (!membersList) return;
    membersList.innerHTML = '';
    // Group by committee
    const byCommittee = new Map();
    const sortedGlobal = [...members].sort((a, b) => (a.order ?? 1_000_000) - (b.order ?? 1_000_000));
    for (const m of sortedGlobal) {
      const key = (m.committee && String(m.committee).trim()) ? String(m.committee).trim() : 'بدون لجنة';
      if (!byCommittee.has(key)) byCommittee.set(key, []);
      byCommittee.get(key).push(m);
    }
    // Render each committee block with a table: Member + View
    for (const [committeeName, items] of byCommittee) {
      const block = el(`
        <div class="panel" style="grid-column:1 / -1; padding:16px;">
          <h3 style="margin:0 0 12px; font-family: fb; color: var(--main-blue); display:flex; align-items:center; gap:8px">
            <i class="fa-solid fa-people-group"></i> ${committeeName}
          </h3>
          <div style="overflow:auto">
            <table class="table" style="width:100%; border-collapse:collapse">
              <thead>
                <tr>
                  <th style="text-align:right; padding:12px">العضو</th>
                  <th style="text-align:right; padding:12px; width:1%">إجراءات</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>`);
      const tbody = block.querySelector('tbody');
      items.forEach((item, sortedIndex) => {
        const idx = members.indexOf(item);
        const name = item.full_name || item.name || '';
        const avatar = (item.avatar || item.avatar_url) || '';
        const row = el(`
          <tr data-idx="${idx}">
            <td style="padding:12px; min-width:260px">
              <div style="display:flex; align-items:center; gap:10px">
                <img src="${avatar || ''}" alt="${name}" style="width:40px; height:40px; border-radius:50%; object-fit:cover; background:#f1f5f9" />
                <div>
                  <div class="card__title" style="margin:0">${name}</div>
                </div>
              </div>
            </td>
            <td style="padding:12px; white-space:nowrap">
              <div style="display:flex; gap:6px; flex-wrap:wrap;">
                <button class="btn btn-primary" data-act="view" data-idx="${idx}"><i class="fa-regular fa-eye"></i> عرض</button>
                <button class="btn btn-outline" data-act="edit" data-idx="${idx}"><i class="fa-solid fa-pen"></i> تعديل</button>
                <button class="btn btn-outline" data-act="del" data-idx="${idx}"><i class="fa-solid fa-trash"></i> حذف</button>
              </div>
            </td>
          </tr>`);
        tbody.appendChild(row);
      });
      membersList.appendChild(block);
    }
    // no DnD in simplified grouped view
  }
  
  function renderTestimonials() {
    if (!testimonialsList) return;
    testimonialsList.innerHTML = '';
    const sorted = [...testimonials].sort((a, b) => (a.order ?? 1_000_000) - (b.order ?? 1_000_000));
    sorted.forEach((item, sortedIndex) => {
      const idx = testimonials.indexOf(item);
      const displayOrder = (item.order ? Number(item.order) : (sortedIndex + 1));
      const name = item.member_name || item.name || 'عضو';
      const committee = (item.committee || '').toString().trim();
      const neutralAvatar = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#e5e7eb"/><stop offset="1" stop-color="#cbd5e1"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/><circle cx="32" cy="24" r="12" fill="#94a3b8"/><path d="M12 54c0-10 10-16 20-16s20 6 20 16" fill="#94a3b8"/></svg>');
      const avatar = ((item.avatar || item.avatar_url) || '').toString().trim() || neutralAvatar;
      const rating = Math.max(0, Math.min(5, Number(item.rating || 0)));
      const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
      const text = (item.text || '').toString();
      const snippet = text.length > 200 ? (text.slice(0, 200) + '...') : text;
      const visible = (item.visible === undefined) ? true : !!item.visible;
      const node = el(`
        <div class="card draggable-card" data-idx="${idx}" draggable="true">
          <span class="order-chip">#${displayOrder}</span>
          <div class="card__body" style="display:flex;gap:14px;align-items:flex-start;">
            <div class="card__media" style="width:auto">
              <img src="${avatar}" alt="${name}" style="width:56px; height:56px; border-radius:50%; object-fit:cover; background:#f1f5f9" onerror="this.onerror=null;this.src='${neutralAvatar}'" />
            </div>
            <div style="flex:1">
              <div class="card__title" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                <span>${name}</span>
                ${committee ? `<span class="chip">${committee}</span>` : ''}
                ${!visible ? `<span style="background:#ef4444;color:#fff;border-radius:999px;padding:0 8px;font-size:12px">مخفي</span>` : ''}
              </div>
              <div class="muted" style="margin:4px 0">${stars}</div>
              ${snippet ? `<p class="card__text" style="margin:6px 0;color:#64748b;white-space:pre-wrap">${snippet}</p>` : ''}
              <div class="card__actions" style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;">
                <button class="btn btn-outline" data-act="up" data-idx="${idx}" title="تحريك لأعلى"><i class="fa-solid fa-arrow-up"></i></button>
                <button class="btn btn-outline" data-act="down" data-idx="${idx}" title="تحريك لأسفل"><i class="fa-solid fa-arrow-down"></i></button>
                <button class="btn btn-outline drag-handle" title="سحب لإعادة الترتيب"><i class="fa-solid fa-grip-vertical"></i></button>
                <button class="btn btn-outline" data-act="vis" data-idx="${idx}" title="إظهار/إخفاء"><i class="fa-regular fa-eye"></i></button>
                <button class="btn btn-outline" data-act="edit" data-idx="${idx}"><i class="fa-solid fa-pen"></i> تعديل</button>
                <button class="btn btn-outline" data-act="del" data-idx="${idx}"><i class="fa-solid fa-trash"></i> حذف</button>
              </div>
            </div>
          </div>
        </div>`);
      testimonialsList.appendChild(node);
    });
    setupListDnD(testimonialsList, testimonials, KEYS.testimonials, 'testimonials', renderTestimonials);
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

  function renderTodos() {
    if (!todosList) return;
    todosList.innerHTML = '';
    const sorted = [...todos].sort((a, b) => (a.order ?? 1_000_000) - (b.order ?? 1_000_000));
    sorted.forEach((item, sortedIndex) => {
      const idx = todos.indexOf(item);
      const displayOrder = item.order ? Number(item.order) : (sortedIndex + 1);
      const status = (item.status || 'pending');
      const isDone = status === 'done';
      const due = (item.due || '').trim();
      const dueLabel = due ? (formatDateShortAr?.(due) || due) : null;
      const statusLabel = status === 'done' ? 'منجزة' : (status === 'in_progress' ? 'قيد التنفيذ' : 'قيد الانتظار');
      const node = el(`
        <div class="card draggable-card ${isDone ? 'todo-done' : ''}" data-idx="${idx}" draggable="true">
          <span class="order-chip">#${displayOrder}</span>
          <div class="card__body">
            <div class="card__title">${item.title || ''}</div>
            ${dueLabel ? `<div class="muted">موعد: ${dueLabel}</div>` : ''}
            ${item.notes ? `<p class="card__text" style="margin:6px 0;color:#64748b">${item.notes}</p>` : ''}
            <div class="card__actions" style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;">
              <span class="status-chip">${statusLabel}</span>
              <button class="btn btn-outline" data-act="toggle-done" data-idx="${idx}" title="تبديل الإنجاز"><i class="fa-solid fa-check"></i></button>
              <button class="btn btn-outline" data-act="up" data-idx="${idx}" title="تحريك لأعلى"><i class="fa-solid fa-arrow-up"></i></button>
              <button class="btn btn-outline" data-act="down" data-idx="${idx}" title="تحريك لأسفل"><i class="fa-solid fa-arrow-down"></i></button>
              <button class="btn btn-outline drag-handle" title="سحب لإعادة الترتيب"><i class="fa-solid fa-grip-vertical"></i></button>
              <button class="btn btn-outline" data-act="edit" data-idx="${idx}"><i class="fa-solid fa-pen"></i> تعديل</button>
              <button class="btn btn-outline" data-act="del" data-idx="${idx}"><i class="fa-solid fa-trash"></i> حذف</button>
            </div>
          </div>
        </div>`);
      todosList.appendChild(node);
    });
    setupListDnD(todosList, todos, KEYS.todos, null, renderTodos);
  }

  // ===== To-Dos CRUD =====
  const todoDialog = document.getElementById('todoDialog');
  const todoForm = document.getElementById('todoForm');
  const addTodoBtn = document.getElementById('addTodoBtn');
  let todoEditingIndex = null;

  addTodoBtn?.addEventListener('click', () => {
    todoEditingIndex = null;
    try { todoForm?.reset(); } catch {}
    // defaults
    try { if (todoForm?.status) todoForm.status.value = 'pending'; } catch {}
    openDialog?.(todoDialog);
  });

  todosList?.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const act = btn.dataset.act;
    if (!Number.isInteger(idx) || idx < 0 || idx >= todos.length) return;
    if (act === 'toggle-done') {
      const cur = todos[idx] || {};
      const curStatus = cur.status || 'pending';
      cur.status = (curStatus === 'done') ? 'pending' : 'done';
      save(KEYS.todos, todos);
      renderTodos();
      return;
    }
    if (act === 'up' || act === 'down') {
      const newIndex = act === 'up' ? Math.max(0, idx - 1) : Math.min(todos.length - 1, idx + 1);
      if (newIndex === idx) return;
      const [moved] = todos.splice(idx, 1);
      todos.splice(newIndex, 0, moved);
      normalizeAndPersistOrder(todos, KEYS.todos, null).then(() => {
        renderTodos();
      });
      return;
    }
    if (act === 'edit') {
      todoEditingIndex = idx;
      const cur = todos[idx];
      if (todoForm) {
        todoForm.title.value = cur.title || '';
        todoForm.notes.value = cur.notes || '';
        todoForm.due.value = cur.due ? String(cur.due).substring(0,10) : '';
        todoForm.status.value = cur.status || 'pending';
      }
      openDialog?.(todoDialog);
      return;
    }
    if (act === 'del') {
      if (!confirm('تأكيد الحذف؟')) return;
      todos.splice(idx, 1);
      save(KEYS.todos, todos);
      renderTodos();
      return;
    }
  });

  todoForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!todoForm) return;
    const data = {
      title: (todoForm.title.value || '').trim(),
      notes: (todoForm.notes.value || '').trim() || null,
      due: (todoForm.due.value || '').trim() || null,
      status: (todoForm.status.value || 'pending'),
      // Keep order when editing to avoid resetting drag order
      order: (todoEditingIndex !== null)
        ? (todos[todoEditingIndex]?.order ?? null)
        : null,
    };
    if (!data.title) { alert('الرجاء إدخال العنوان'); return; }
    if (todoEditingIndex === null) todos.unshift(data); else todos[todoEditingIndex] = data;
    save(KEYS.todos, todos);
    renderTodos();
    closeDialog?.(todoDialog);
  });

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

  // ===== Testimonials CRUD =====
  const testimonialDialog = document.getElementById('testimonialDialog');
  const testimonialForm = document.getElementById('testimonialForm');
  const addTestimonialBtn = document.getElementById('addTestimonialBtn');
  let testimonialEditingIndex = null;
  // Image upload elements
  const testimonialImageFile = document.getElementById('testimonial_image_file');
  const testimonialImageUrl = document.getElementById('testimonial_image_url');
  const testimonialImagePreview = document.getElementById('testimonial_image_preview');
  const testimonialDropzone = document.getElementById('testimonialDropzone');
  const testimonialBrowseBtn = document.getElementById('testimonialBrowseBtn');
  const testimonialImageActions = document.getElementById('testimonialImageActions');
  const testimonialEditImageBtn = document.getElementById('testimonial_edit_image_btn');
  const testimonialChangeImageBtn = document.getElementById('testimonial_change_image_btn');
  let testimonialCroppedFile = null;

  async function handleTestimonialImageFile(file) {
    if (!file) return;
    if (!(file.type || '').startsWith('image/')) { alert('الملف ليس صورة'); return; }
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) { if (!confirm('حجم الصورة يتجاوز 5MB. المتابعة؟')) return; }
    try {
      const cropped = await openImageCropper(file, { aspectRatio: 1, lockAspect: true, maxWidth: 1200, maxHeight: 1200, mimeType: 'image/webp', quality: 0.9 });
      testimonialCroppedFile = cropped;
      const url = URL.createObjectURL(cropped);
      if (testimonialImagePreview) { testimonialImagePreview.src = url; testimonialImagePreview.style.display = 'block'; }
      if (testimonialImageActions) testimonialImageActions.style.display = 'flex';
      if (testimonialDropzone) testimonialDropzone.style.display = 'none';
    } catch (err) {
      if (testimonialImageFile) testimonialImageFile.value = '';
    }
  }
  testimonialImageFile?.addEventListener('change', async () => {
    const file = testimonialImageFile.files && testimonialImageFile.files[0];
    await handleTestimonialImageFile(file);
  });
  testimonialBrowseBtn?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); testimonialImageFile?.click(); });
  testimonialDropzone?.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    if ((e.target instanceof HTMLElement) && e.target.closest('#testimonialBrowseBtn')) return;
    testimonialImageFile?.click();
  });
  testimonialDropzone?.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); testimonialImageFile?.click(); } });
  testimonialDropzone?.addEventListener('dragover', (e) => { e.preventDefault(); testimonialDropzone.classList.add('dragover'); });
  testimonialDropzone?.addEventListener('dragleave', () => { testimonialDropzone.classList.remove('dragover'); });
  testimonialDropzone?.addEventListener('drop', async (e) => {
    e.preventDefault(); e.stopPropagation(); testimonialDropzone.classList.remove('dragover');
    const dt = e.dataTransfer; if (!dt) return;
    let file = null;
    if (dt.files && dt.files.length) file = dt.files[0];
    if (!file && dt.items && dt.items.length) { const item = Array.from(dt.items).find(i => i.kind === 'file'); if (item) file = item.getAsFile(); }
    await handleTestimonialImageFile(file);
  });
  testimonialChangeImageBtn?.addEventListener('click', (e) => { e.preventDefault(); testimonialImageFile?.click(); });
  testimonialEditImageBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      const src = (testimonialImagePreview && testimonialImagePreview.src) || (testimonialImageUrl && testimonialImageUrl.value) || '';
      if (!src) { alert('لا توجد صورة لتحريرها'); return; }
      const file = await fetchUrlAsFile(src, 'current');
      const cropped = await openImageCropper(file, { aspectRatio: 1, lockAspect: true, maxWidth: 1200, maxHeight: 1200, mimeType: 'image/webp', quality: 0.9 });
      testimonialCroppedFile = cropped;
      const url = URL.createObjectURL(cropped);
      if (testimonialImagePreview) { testimonialImagePreview.src = url; testimonialImagePreview.style.display = 'block'; }
      if (testimonialImageActions) testimonialImageActions.style.display = 'flex';
      if (testimonialDropzone) testimonialDropzone.style.display = 'none';
    } catch (err) {
      if (String(err?.message || '').includes('crop-cancelled')) return;
      alert('تعذر تحرير الصورة الحالية. جرّب تغيير الصورة بدلًا من ذلك.');
    }
  });

  async function uploadTestimonialImage() {
    const file = testimonialCroppedFile || (testimonialImageFile?.files && testimonialImageFile.files[0]);
    if (!file) return null;
    if (!sb) return null;
    const bucket = 'adeeb-site';
    const ext = (file.name.split('.').pop() || getExtFromType(file.type, 'jpg')).toLowerCase();
    const safeExt = ext.replace(/[^a-z0-9]/gi, '') || 'jpg';
    const path = `testimonials/testimonial-${Date.now()}-${Math.random().toString(36).slice(2,8)}.${safeExt}`;
    const { error: upErr } = await sb.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: false });
    if (upErr) throw upErr;
    const { data } = sb.storage.from(bucket).getPublicUrl(path);
    const publicUrl = data?.publicUrl;
    if (!publicUrl) throw new Error('تعذر الحصول على رابط الصورة');
    return publicUrl;
  }

  addTestimonialBtn?.addEventListener('click', () => {
    testimonialEditingIndex = null;
    try { testimonialForm?.reset?.(); } catch {}
    try { if (testimonialForm?.rating) testimonialForm.rating.value = '5'; } catch {}
    try { if (testimonialForm?.visible) testimonialForm.visible.checked = true; } catch {}
    if (testimonialImagePreview) { testimonialImagePreview.src = ''; testimonialImagePreview.style.display = 'none'; }
    if (testimonialImageUrl) testimonialImageUrl.value = '';
    testimonialCroppedFile = null;
    if (testimonialDropzone) testimonialDropzone.style.display = '';
    if (testimonialImageActions) testimonialImageActions.style.display = 'none';
    if (typeof openDialog === 'function') openDialog(testimonialDialog); else testimonialDialog?.showModal?.();
  });

  // Fallback delegated handler in case direct binding missed for any reason
  document.getElementById('section-testimonials')?.addEventListener('click', (e) => {
    const btn = e.target?.closest?.('#addTestimonialBtn');
    if (!btn) return;
    try {
      testimonialEditingIndex = null;
      try { testimonialForm?.reset?.(); } catch {}
      try { if (testimonialForm?.rating) testimonialForm.rating.value = '5'; } catch {}
      try { if (testimonialForm?.visible) testimonialForm.visible.checked = true; } catch {}
      if (testimonialImagePreview) { testimonialImagePreview.src = ''; testimonialImagePreview.style.display = 'none'; }
      if (testimonialImageUrl) testimonialImageUrl.value = '';
      testimonialCroppedFile = null;
      if (testimonialDropzone) testimonialDropzone.style.display = '';
      if (testimonialImageActions) testimonialImageActions.style.display = 'none';
      if (typeof openDialog === 'function') openDialog(testimonialDialog); else testimonialDialog?.showModal?.();
    } catch {}
  });

  testimonialsList?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const act = btn.dataset.act;
    if (!Number.isInteger(idx) || idx < 0 || idx >= testimonials.length) return;
    if (act === 'up' || act === 'down') {
      const newIndex = act === 'up' ? Math.max(0, idx - 1) : Math.min(testimonials.length - 1, idx + 1);
      if (newIndex === idx) return;
      const [moved] = testimonials.splice(idx, 1);
      testimonials.splice(newIndex, 0, moved);
      normalizeAndPersistOrder(testimonials, KEYS.testimonials, 'testimonials').then(() => {
        renderTestimonials();
      });
      return;
    }
    if (act === 'vis') {
      const cur = testimonials[idx];
      const curVis = (cur.visible === undefined) ? true : !!cur.visible;
      const nextVis = !curVis;
      if (sb && cur.id) {
        const { data: row, error } = await sb.from('testimonials').update({ visible: nextVis }).eq('id', cur.id).select('*').single();
        if (error) return alert('فشل التحديث: ' + error.message);
        testimonials[idx] = row || { ...cur, visible: nextVis };
        renderTestimonials();
      } else {
        cur.visible = nextVis;
        save(KEYS.testimonials, testimonials);
        renderTestimonials();
      }
      return;
    }
    if (act === 'edit') {
      testimonialEditingIndex = idx;
      const cur = testimonials[idx];
      if (testimonialForm) {
        testimonialForm.member_name.value = cur.member_name || cur.name || '';
        try {
          const sel = testimonialForm.committee;
          const val = cur.committee || '';
          if (sel && sel.tagName === 'SELECT') {
            const has = Array.from(sel.options || []).some(o => o.value === val);
            if (val && !has) {
              const opt = document.createElement('option');
              opt.value = val;
              opt.textContent = val;
              sel.appendChild(opt);
            }
            sel.value = val;
          } else {
            testimonialForm.committee.value = val;
          }
        } catch {
          testimonialForm.committee.value = cur.committee || '';
        }
        testimonialForm.rating.value = String(cur.rating ?? '5');
        testimonialForm.text.value = cur.text || '';
        try { testimonialForm.visible.checked = (cur.visible === undefined) ? true : !!cur.visible; } catch {}
      }
      const imgUrl = (cur.avatar || cur.avatar_url) || '';
      if (testimonialImageUrl) testimonialImageUrl.value = imgUrl;
      if (testimonialImagePreview) {
        if (imgUrl) { testimonialImagePreview.src = imgUrl; testimonialImagePreview.style.display = 'block'; }
        else { testimonialImagePreview.src = ''; testimonialImagePreview.style.display = 'none'; }
      }
      if (testimonialImageFile) testimonialImageFile.value = '';
      testimonialCroppedFile = null;
      if (imgUrl) { if (testimonialDropzone) testimonialDropzone.style.display = 'none'; if (testimonialImageActions) testimonialImageActions.style.display = 'flex'; }
      else { if (testimonialDropzone) testimonialDropzone.style.display = ''; if (testimonialImageActions) testimonialImageActions.style.display = 'none'; }
      openDialog?.(testimonialDialog);
      return;
    }
    if (act === 'del') {
      if (!confirm('تأكيد الحذف؟')) return;
      const cur = testimonials[idx];
      if (sb && cur.id) {
        sb.from('testimonials').delete().eq('id', cur.id).then(({ error }) => {
          if (error) return alert('فشل الحذف: ' + error.message);
          testimonials.splice(idx, 1);
          renderTestimonials();
        });
      } else {
        testimonials.splice(idx, 1);
        save(KEYS.testimonials, testimonials);
        renderTestimonials();
      }
      return;
    }
  });

  testimonialForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    // determine final image url
    let finalImgUrl = (testimonialImageUrl?.value || '').trim();
    try {
      const uploaded = await uploadTestimonialImage();
      if (uploaded) finalImgUrl = uploaded;
    } catch (err) {
      return alert('فشل رفع الصورة: ' + (err?.message || 'غير معروف'));
    }
    testimonialCroppedFile = null;
    const data = {
      member_name: (testimonialForm.member_name.value || '').trim(),
      committee: (testimonialForm.committee.value || '').trim() || null,
      rating: testimonialForm.rating.value ? Number(testimonialForm.rating.value) : 5,
      text: (testimonialForm.text.value || '').trim(),
      visible: !!testimonialForm.visible.checked,
      avatar: finalImgUrl || null,
      // Keep existing order when editing so we don't reset it to null
      order: (testimonialEditingIndex !== null)
        ? (testimonials[testimonialEditingIndex]?.order ?? null)
        : null,
    };
    if (!data.member_name || !data.text) { alert('يرجى إدخال الاسم والنص'); return; }
    if (sb) {
      if (testimonialEditingIndex === null) {
        // insert with fallback if `order` column is missing
        const payload = {
          member_name: data.member_name,
          committee: data.committee,
          rating: data.rating,
          text: data.text,
          visible: data.visible,
          avatar_url: data.avatar,
          order: data.order,
        };
        const payloadNoOrder = {
          member_name: data.member_name,
          committee: data.committee,
          rating: data.rating,
          text: data.text,
          visible: data.visible,
          avatar_url: data.avatar,
        };
        let row, error;
        ({ data: row, error } = await sb.from('testimonials').insert(payload).select('*').single());
        if (error && /(column\s+order|unknown column|invalid input)/i.test(error.message || '')) {
          const res2 = await sb.from('testimonials').insert(payloadNoOrder).select('*').single();
          if (res2.error) return alert('فشل الحفظ: ' + res2.error.message);
          testimonials.unshift({ ...res2.data, order: data.order });
        } else if (error) {
          return alert('فشل الحفظ: ' + error.message);
        } else {
          testimonials.unshift(row);
        }
        renderTestimonials();
        closeDialog?.(testimonialDialog);
      } else {
        // update by id with fallback if `order` column is missing
        const id = testimonials[testimonialEditingIndex]?.id;
        if (!id) { alert('عنصر بدون معرف، لا يمكن التحديث'); return; }
        const payload = {
          member_name: data.member_name,
          committee: data.committee,
          rating: data.rating,
          text: data.text,
          visible: data.visible,
          avatar_url: data.avatar,
          order: data.order,
        };
        const payloadNoOrder = {
          member_name: data.member_name,
          committee: data.committee,
          rating: data.rating,
          text: data.text,
          visible: data.visible,
          avatar_url: data.avatar,
        };
        let row, error;
        ({ data: row, error } = await sb.from('testimonials').update(payload).eq('id', id).select('*').single());
        if (error && /(column\s+order|unknown column|invalid input)/i.test(error.message || '')) {
          const res2 = await sb.from('testimonials').update(payloadNoOrder).eq('id', id).select('*').single();
          if (res2.error) return alert('فشل التحديث: ' + res2.error.message);
          testimonials[testimonialEditingIndex] = { ...res2.data, order: data.order };
        } else if (error) {
          return alert('فشل التحديث: ' + error.message);
        } else {
          testimonials[testimonialEditingIndex] = row;
        }
        renderTestimonials();
        closeDialog?.(testimonialDialog);
      }
    } else {
      if (testimonialEditingIndex === null) testimonials.unshift(data);
      else testimonials[testimonialEditingIndex] = data;
      save(KEYS.testimonials, testimonials);
      renderTestimonials();
      closeDialog?.(testimonialDialog);
    }
  });

  // Export / Import
  $('#exportData')?.addEventListener('click', () => {
    const data = {
      works,
      sponsors,
      achievements,
      board,
      members,
      faq,
      testimonials,
      blogPosts,
      schedule,
      todos,
      topics,
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
      if (Array.isArray(data.members)) {
        members = data.members; save(KEYS.members, members); renderMembers();
      }
      if (Array.isArray(data.faq)) {
        faq = data.faq; save(KEYS.faq, faq); renderFaq();
      }
      if (Array.isArray(data.testimonials)) {
        testimonials = data.testimonials; save(KEYS.testimonials, testimonials); renderTestimonials();
      }
      if (Array.isArray(data.blogPosts)) {
        blogPosts = data.blogPosts; save(KEYS.blog, blogPosts); renderBlog();
      }
      if (Array.isArray(data.topics)) {
        topics = data.topics; save(KEYS.topics, topics); renderIdeaTopicsList(topics);
      }
      if (data.schedule && typeof data.schedule === 'object' && !Array.isArray(data.schedule)) {
        schedule = data.schedule; saveSchedule(); renderSchedule();
      }
      if (Array.isArray(data.todos)) {
        todos = data.todos; save(KEYS.todos, todos); renderTodos();
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
  const adminsHighCouncilTable = document.getElementById('adminsHighCouncilTable');
  const adminsAdminCouncilTable = document.getElementById('adminsAdminCouncilTable');
  const addAdminForm = document.getElementById('addAdminForm');
  const newAdminEmail = document.getElementById('newAdminEmail');
  const adminsStatus = document.getElementById('adminsStatus');
  let adminsList = [];
  let adminsProfilesMap = new Map();
  const adminDetailsDialog = document.getElementById('adminDetailsDialog');
  const adminDetailsBody = document.getElementById('adminDetailsBody');
  let adminDetailsCurrentUserId = null;
  const adminRemoveBtn = document.getElementById('adminRemoveBtn');

  adminRemoveBtn?.addEventListener('click', async () => {
    const id = adminDetailsCurrentUserId;
    if (!id) return;
    if (!confirm('هل تريد إزالة صلاحية هذا الإداري؟')) return;
    try {
      adminRemoveBtn.disabled = true;
      await callFunction('toggle-admin', { method: 'POST', body: { user_id: id, make_admin: false } });
      try { closeDialog?.(adminDetailsDialog); } catch {}
      try { adminDetailsDialog?.close?.(); } catch {}
      await fetchAdmins();
      if (adminsStatus) { adminsStatus.className = 'alert success'; adminsStatus.textContent = 'تمت إزالة الصلاحية'; }
    } catch (err) {
      alert('فشل العملية: ' + (err?.message || 'غير معروف'));
    } finally {
      adminRemoveBtn.disabled = false;
    }
  });

  function renderAdmins() {
    if (!adminsHighCouncilTable || !adminsAdminCouncilTable) return;
    adminsHighCouncilTable.innerHTML = '';
    adminsAdminCouncilTable.innerHTML = '';

    const presidents = [];
    const vicesFemale = [];
    const vicesMale = [];
    const managers = [];

    const rowNode = (row, pr) => {
      const name = (pr?.display_name && String(pr.display_name).trim()) || 'مستخدم';
      const avatarUrl = (pr?.avatar_url && String(pr.avatar_url).trim()) ? pr.avatar_url : null;
      const avatar = avatarUrl
        ? `<img src="${avatarUrl}" alt="${name}" onerror="this.remove()" />`
        : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
             <circle cx="12" cy="12" r="10" fill="#cbd5e1"/>
             <circle cx="12" cy="10" r="3.2" fill="#64748b"/>
             <path d="M5.5 18.2c1.9-3 5-4.2 6.5-4.2s4.6 1.2 6.5 4.2c-2.1 1.7-4.6 2.8-6.5 2.8s-4.4-1.1-6.5-2.8z" fill="#64748b"/>
           </svg>`;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="padding:12px" data-label="العضو">
          <div class="user-mini">
            <div class="avatar">${avatar}</div>
            <div class="name">${name}</div>
          </div>
        </td>
        <td style="padding:12px" data-label="إجراءات">
          <button class="btn btn-outline" data-act="details" data-id="${row.user_id}"><i class="fa-solid fa-circle-info"></i> تفاصيل</button>
        </td>`;
      return tr;
    };

    adminsList.forEach((row) => {
      const pr = adminsProfilesMap.get(row.user_id) || {};
      const pos = pr?.position || null;
      const lvRaw = Number(pr?.admin_level);
      const level = Number.isFinite(lvRaw) ? lvRaw : levelFromPositionAr(pos);
      const pNorm = normalizeAr(pos || '');
      if (level === ADMIN_LEVELS.president) {
        presidents.push({ row, pr });
      } else if (level === ADMIN_LEVELS.vice) {
        if (pNorm.includes('الطالبات') || pNorm.includes('طالبات')) vicesFemale.push({ row, pr });
        else vicesMale.push({ row, pr });
      } else {
        managers.push({ row, pr });
      }
    });

    // Append in required order for High Council
    presidents.forEach((it) => adminsHighCouncilTable.appendChild(rowNode(it.row, it.pr)));
    vicesFemale.forEach((it) => adminsHighCouncilTable.appendChild(rowNode(it.row, it.pr)));
    vicesMale.forEach((it) => adminsHighCouncilTable.appendChild(rowNode(it.row, it.pr)));

    // Sort managers by display name (optional)
    managers.sort((a, b) => {
      const an = (a.pr?.display_name || '').toString();
      const bn = (b.pr?.display_name || '').toString();
      return an.localeCompare(bn, 'ar');
    });
    managers.forEach((it) => adminsAdminCouncilTable.appendChild(rowNode(it.row, it.pr)));
  }

  async function fetchAdmins() {
    if (!adminsStatus) return;
    adminsStatus.className = 'muted';
    adminsStatus.textContent = 'جاري تحميل قائمة الإداريين...';
    try {
      const data = await callFunction('list-admins', { method: 'GET' });
      adminsList = Array.isArray(data) ? data : [];
      // Enrich with public profiles (display_name, avatar_url)
      adminsProfilesMap = new Map();
      try {
        if (sb && adminsList.length) {
          const userIds = Array.from(new Set(adminsList.map(r => r && r.user_id).filter(Boolean)));
          if (userIds.length) {
            const { data: profiles, error: profErr } = await sb
              .from('auth_users_public')
              .select('user_id, display_name, avatar_url, position, admin_level')
              .in('user_id', userIds);
            if (!profErr && Array.isArray(profiles)) {
              adminsProfilesMap = new Map(profiles.map(pr => [pr.user_id, pr]));
            }
          }
          // Fallback merge: take position/admin_level from list-admins response if missing in public view
          for (const r of adminsList) {
            const uid = r && r.user_id; if (!uid) continue;
            const pr = adminsProfilesMap.get(uid) || { user_id: uid };
            if (pr.position == null && typeof r.position === 'string') pr.position = r.position;
            const prLv = Number(pr.admin_level);
            const rLv = Number(r.admin_level);
            if (!Number.isFinite(prLv) && Number.isFinite(rLv)) pr.admin_level = rLv;
            adminsProfilesMap.set(uid, pr);
          }
        }
      } catch {}
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
    const position = (document.getElementById('newAdminPosition')?.value || '').trim();
    const admin_level = levelFromPositionAr(position || null);
    if (!email) return;
    adminsStatus && (adminsStatus.className = 'muted', adminsStatus.textContent = 'جاري إرسال الدعوة...');
    try {
      // Dynamic redirect: use current origin (works for local Live Server and production)
      const baseOrigin = location.origin;
      const redirectTo = (baseOrigin.includes('localhost') || baseOrigin.includes('127.0.0.1'))
        ? 'https://www.adeeb.club/admin/onboarding.html'
        : `${baseOrigin}/admin/onboarding.html`;
      await callFunction('invite-admin', { method: 'POST', body: { email, position: position || null, admin_level, redirectTo } });
      if (newAdminEmail) newAdminEmail.value = '';
      const posEl = document.getElementById('newAdminPosition'); if (posEl) posEl.value = '';
      await fetchAdmins();
      if (adminsStatus) { adminsStatus.className = 'alert success'; adminsStatus.textContent = `تم إرسال الدعوة وتعيين المستوى حسب المسمى. صفحة الإكمال: ${redirectTo}`; }
    } catch (err) {
      if (adminsStatus) { adminsStatus.className = 'alert error'; adminsStatus.textContent = 'فشل إرسال الدعوة: ' + (err?.message || 'غير معروف'); }
    }
  });

  function handleAdminsTableClick(e) {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const act = btn.getAttribute('data-act');
    const userId = btn.getAttribute('data-id');
    if (!userId) return;
    (async () => {
      if (act === 'details') {
        await showAdminDetails(userId);
        return;
      }
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
    })();
  }
  adminsHighCouncilTable?.addEventListener('click', handleAdminsTableClick);
  adminsAdminCouncilTable?.addEventListener('click', handleAdminsTableClick);

  // Fetch from Supabase on load if available
  async function loadFromSupabase() {
    if (!sb) return false;
    try {
      const [
        { data: w, error: ew },
        { data: s, error: es },
        { data: b, error: eb },
        { data: m, error: em },
        { data: f, error: ef },
        { data: posts, error: eposts },
        { data: apps, error: eapps }
      ] = await Promise.all([
        sb.from('works').select('*').order('order', { ascending: true, nullsFirst: true }).order('created_at', { ascending: false }),
        sb.from('sponsors').select('*').order('order', { ascending: true, nullsFirst: true }).order('created_at', { ascending: false }),
        sb.from('board_members').select('*').order('order', { ascending: true, nullsFirst: true }).order('created_at', { ascending: false }),
        sb.from('members').select('*').order('order', { ascending: true, nullsFirst: true }).order('created_at', { ascending: false }),
        sb.from('faq').select('*').order('order', { ascending: true }),
        sb.from('blog_posts').select('*').order('published_at', { ascending: false }),
        sb.from('membership_applications').select('id, created_at, full_name, phone, email, degree, college, major, skills, preferred_committee, portfolio_url, status').order('created_at', { ascending: false }),
      ]);
      if (ew) throw ew; if (es) throw es; if (eb) throw eb; if (em) throw em; if (ef) throw ef; if (eposts) throw eposts; if (eapps) throw eapps;
      works = w || [];
      sponsors = s || [];
      board = b || [];
      members = m || [];
      faq = f || [];
      blogPosts = posts || [];
      membershipApps = apps || [];

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

      // Fetch testimonials by created_at only; sort by `order` client-side
      try {
        const { data: tRows, error: et } = await sb
          .from('testimonials')
          .select('*')
          .order('created_at', { ascending: false });
        if (et) throw et;
        testimonials = tRows || [];
      } catch (e3) {
        if (e3?.code === 'PGRST205' || /Could not find the table '.+testimonials'/.test(e3?.message || '')) {
          console.warn('Testimonials table missing, falling back to localStorage');
        } else {
          console.warn('Testimonials fetch failed', e3);
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
    // Apply permissions to hide disallowed tabs/cards
    try { await applyCurrentUserPermissions(); } catch {}
    // Always render after attempting to load (even if arrays are empty)
    renderWorks();
    renderSponsors();
    renderBoard();
    renderMembers();
    renderFaq();
    renderTestimonials();
    renderAchievements();
    renderBlog();
    renderTodos();
    try { await fetchVisitStats(); } catch {}
    renderStats();
    // If page opened directly on profile tab, load profile info
    try {
      if (location.hash === '#section-profile') {
        adminLoadProfileIntoForm?.();
      }
    } catch {}
  })();
})();
