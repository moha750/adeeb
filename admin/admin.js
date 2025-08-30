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
        };
        if (blogEditingIndex === null) {
          sb.from('blog_posts').insert(payload).select('*').single().then(({ data: row, error }) => {
            if (error) return alert('فشل الحفظ: ' + error.message);
            blogPosts.unshift(row);
            renderBlog();
            closeDialog(blogDialog);
          });
        } else {
          const id = blogPosts[blogEditingIndex]?.id;
          if (!id) { alert('عنصر بدون معرف، لا يمكن التحديث'); return; }
          sb.from('blog_posts').update(payload).eq('id', id).select('*').single().then(({ data: row, error }) => {
            if (error) return alert('فشل التحديث: ' + error.message);
            blogPosts[blogEditingIndex] = row;
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
    sorted.forEach((item) => {
      const originalIdx = achievements.indexOf(item);
      const iconClass = item.icon || item.icon_class || 'fa-solid fa-trophy';
      const rawCount = (item.count ?? item.count_number ?? 0);
      const number = typeof rawCount === 'number' ? rawCount : Number(rawCount || 0);
      const plus = 'plus' in item ? !!item.plus : ('plus_flag' in item ? !!item.plus_flag : true);
      const node = el(`
        <div class="card">
          <div class="card__body" style="display:flex;gap:14px;align-items:center;">
            <div class="card__media" style="width:auto">
              <i class="${iconClass}" style="font-size:28px;color:#0ea5e9"></i>
            </div>
            <div style="flex:1">
              <div class="card__title">${item.label || ''}</div>
              <p class="card__text" style="margin:6px 0;color:#64748b">${number}${plus ? '+' : ''}</p>
              ${item.order ? `<span class="card__badge">ترتيب: ${item.order}</span>` : ''}
              <div class="card__actions" style="margin-top:8px">
                <button class="btn btn-outline" data-act="edit" data-idx="${originalIdx}"><i class="fa-solid fa-pen"></i> تعديل</button>
                <button class="btn btn-outline" data-act="del" data-idx="${originalIdx}"><i class="fa-solid fa-trash"></i> حذف</button>
              </div>
            </div>
          </div>
        </div>`);
      achievementsList.appendChild(node);
    });
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
    if (act === 'edit') {
      achievementEditingIndex = idx;
      const cur = achievements[idx];
      achievementForm.label.value = cur.label || '';
      achievementForm.icon.value = cur.icon || cur.icon_class || '';
      const rawCount = (cur.count ?? cur.count_number ?? 0);
      achievementForm.count.value = typeof rawCount === 'number' ? rawCount : Number(rawCount || 0);
      achievementForm.order.value = cur.order || '';
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
      order: achievementForm.order.value ? Number(achievementForm.order.value) : null,
      plus: !!achievementForm.plus.checked,
    };
    if (sb) {
      sb.auth.getSession().then(({ data: { session } }) => {
        if (!session) return alert('يلزم تسجيل الدخول لإجراء التعديلات');
        const payload = {
          label: data.label,
          icon_class: data.icon || null,
          count_number: data.count,
          order: data.order,
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

  function renderWorks() {
    if (!worksList) return;
    worksList.innerHTML = '';
    works.forEach((item, idx) => {
      const node = el(`
        <div class="card">
          <div class="card__media">
            <img src="${(item.image || item.image_url) || ''}" alt="${item.title || ''}" />
            ${(item.category) ? `<span class=\"card__badge\">${item.category}</span>` : ''}
          </div>
          <div class="card__body">
            <div class="card__title">${item.title || ''}</div>
            ${(item.link || item.link_url) ? `<a class=\"btn btn-outline\" target=\"_blank\" href=\"${item.link || item.link_url}\"><i class=\"fa-solid fa-link\"></i> رابط</a>` : ''}
            <div class="card__actions">
              <button class="btn btn-outline" data-act="edit" data-idx="${idx}"><i class="fa-solid fa-pen"></i> تعديل</button>
              <button class="btn btn-outline" data-act="del" data-idx="${idx}"><i class="fa-solid fa-trash"></i> حذف</button>
            </div>
          </div>
        </div>`);
      worksList.appendChild(node);
    });
  }

  function renderSponsors() {
    if (!sponsorsList) return;
    sponsorsList.innerHTML = '';
    sponsors.forEach((item, idx) => {
      const node = el(`
        <div class="card">
          <div class="card__media">
            <img src="${(item.logo || item.logo_url) || ''}" alt="${item.name || ''}" />
            ${item.badge ? `<span class="card__badge">${item.badge}</span>` : ''}
          </div>
          <div class="card__body">
            <div class="card__title">${item.name || ''}</div>
            ${item.description ? `<p class="card__text">${item.description}</p>` : ''}
            ${(item.link || item.link_url) ? `<a class=\"btn btn-outline\" target=\"_blank\" href=\"${item.link || item.link_url}\"><i class=\"fa-solid fa-arrow-up-right-from-square\"></i> موقع</a>` : ''}
            <div class="card__actions">
              <button class="btn btn-outline" data-act="edit" data-idx="${idx}"><i class="fa-solid fa-pen"></i> تعديل</button>
              <button class="btn btn-outline" data-act="del" data-idx="${idx}"><i class="fa-solid fa-trash"></i> حذف</button>
            </div>
          </div>
        </div>`);
      sponsorsList.appendChild(node);
    });
  }

  function renderBoard() {
    if (!boardList) return;
    boardList.innerHTML = '';
    board.forEach((item, idx) => {
      const node = el(`
        <div class="card">
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
              <button class="btn btn-outline" data-act="edit" data-idx="${idx}"><i class="fa-solid fa-pen"></i> تعديل</button>
              <button class="btn btn-outline" data-act="del" data-idx="${idx}"><i class="fa-solid fa-trash"></i> حذف</button>
            </div>
          </div>
        </div>`);
      boardList.appendChild(node);
    });
  }

  function renderFaq() {
    if (!faqList) return;
    faqList.innerHTML = '';
    // Sort FAQ by order field
    const sortedFaq = [...faq].sort((a, b) => (a.order || 999) - (b.order || 999));
    sortedFaq.forEach((item, idx) => {
      const originalIdx = faq.indexOf(item);
      const node = el(`
        <div class="card">
          <div class="card__body">
            <div class="card__title">${item.question || ''}</div>
            <p class="card__text" style="margin: 10px 0; color: #666; line-height: 1.5;">${(item.answer || '').substring(0, 150)}${(item.answer || '').length > 150 ? '...' : ''}</p>
            ${item.order ? `<span class="card__badge">ترتيب: ${item.order}</span>` : ''}
            <div class="card__actions">
              <button class="btn btn-outline" data-act="edit" data-idx="${originalIdx}"><i class="fa-solid fa-pen"></i> تعديل</button>
              <button class="btn btn-outline" data-act="del" data-idx="${originalIdx}"><i class="fa-solid fa-trash"></i> حذف</button>
            </div>
          </div>
        </div>`);
      faqList.appendChild(node);
    });
  }

  // Dialog helpers
  function openDialog(dialog) {
    if (!dialog.open) dialog.showModal();
  }
  function closeDialog(dialog) {
    if (dialog.open) dialog.close();
  }

  // Works CRUD
  const workDialog = $('#workDialog');
  const workForm = $('#workForm');
  let workEditingIndex = null; // number | null

  $('#addWorkBtn')?.addEventListener('click', () => {
    workEditingIndex = null;
    workForm.reset();
    openDialog(workDialog);
  });

  worksList?.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const act = btn.dataset.act;
    if (act === 'edit') {
      workEditingIndex = idx;
      const cur = works[idx];
      workForm.title.value = cur.title || '';
      workForm.category.value = cur.category || '';
      workForm.image.value = (cur.image || cur.image_url) || '';
      workForm.link.value = (cur.link || cur.link_url) || '';
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

  workForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      title: workForm.title.value.trim(),
      category: workForm.category.value.trim(),
      image: workForm.image.value.trim(),
      link: workForm.link.value.trim(),
    };
    if (sb) {
      // require auth for write
      sb.auth.getSession().then(({ data: { session } }) => {
        if (!session) return alert('يلزم تسجيل الدخول لإجراء التعديلات');
        const payload = { title: data.title, category: data.category || null, image_url: data.image, link_url: data.link || null };
        if (workEditingIndex === null) {
          sb.from('works').insert(payload).select('*').single().then(({ data: row, error }) => {
            if (error) return alert('فشل الحفظ: ' + error.message);
            works.unshift(row);
            renderWorks();
            closeDialog(workDialog);
          });
        } else {
          const id = works[workEditingIndex]?.id;
          if (!id) { alert('عنصر بدون معرف، لا يمكن التحديث'); return; }
          sb.from('works').update(payload).eq('id', id).select('*').single().then(({ data: row, error }) => {
            if (error) return alert('فشل التحديث: ' + error.message);
            works[workEditingIndex] = row;
            renderWorks();
            closeDialog(workDialog);
          });
        }
      });
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

  $('#addSponsorBtn')?.addEventListener('click', () => {
    sponsorEditingIndex = null;
    sponsorForm.reset();
    openDialog(sponsorDialog);
  });

  sponsorsList?.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const act = btn.dataset.act;
    if (act === 'edit') {
      sponsorEditingIndex = idx;
      const cur = sponsors[idx];
      sponsorForm.name.value = cur.name || '';
      sponsorForm.badge.value = cur.badge || '';
      sponsorForm.description.value = cur.description || '';
      sponsorForm.logo.value = (cur.logo || cur.logo_url) || '';
      sponsorForm.link.value = (cur.link || cur.link_url) || '';
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

  sponsorForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      name: sponsorForm.name.value.trim(),
      badge: sponsorForm.badge.value.trim(),
      description: sponsorForm.description.value.trim(),
      logo: sponsorForm.logo.value.trim(),
      link: sponsorForm.link.value.trim(),
    };
    if (sb) {
      sb.auth.getSession().then(({ data: { session } }) => {
        if (!session) return alert('يلزم تسجيل الدخول لإجراء التعديلات');
        const payload = { name: data.name, badge: data.badge || null, description: data.description || null, logo_url: data.logo, link_url: data.link || null };
        const payloadNoDesc = { name: data.name, badge: data.badge || null, logo_url: data.logo, link_url: data.link || null };
        if (sponsorEditingIndex === null) {
          sb.from('sponsors').insert(payload).select('*').single().then(async ({ data: row, error }) => {
            if (error) {
              // fallback if column doesn't exist in DB
              if (/(column\s+description|invalid input|unknown column)/i.test(error.message || '')) {
                const { data: row2, error: e2 } = await sb.from('sponsors').insert(payloadNoDesc).select('*').single();
                if (e2) return alert('فشل الحفظ: ' + e2.message);
                sponsors.unshift({ ...row2, description: data.description || '' });
              } else {
                return alert('فشل الحفظ: ' + error.message);
              }
            } else {
              sponsors.unshift({ ...row, description: data.description || '' });
            }
            renderSponsors();
            closeDialog(sponsorDialog);
          });
        } else {
          const id = sponsors[sponsorEditingIndex]?.id;
          if (!id) { alert('عنصر بدون معرف، لا يمكن التحديث'); return; }
          sb.from('sponsors').update(payload).eq('id', id).select('*').single().then(async ({ data: row, error }) => {
            if (error) {
              if (/(column\s+description|invalid input|unknown column)/i.test(error.message || '')) {
                const { data: row2, error: e2 } = await sb.from('sponsors').update(payloadNoDesc).eq('id', id).select('*').single();
                if (e2) return alert('فشل التحديث: ' + e2.message);
                sponsors[sponsorEditingIndex] = { ...row2, description: data.description || '' };
              } else {
                return alert('فشل التحديث: ' + error.message);
              }
            } else {
              sponsors[sponsorEditingIndex] = { ...row, description: data.description || '' };
            }
            renderSponsors();
            closeDialog(sponsorDialog);
          });
        }
      });
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

  $('#addBoardBtn')?.addEventListener('click', () => {
    boardEditingIndex = null;
    boardForm.reset();
    openDialog(boardDialog);
  });

  boardList?.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const act = btn.dataset.act;
    if (act === 'edit') {
      boardEditingIndex = idx;
      const cur = board[idx];
      boardForm.name.value = cur.name || '';
      boardForm.position.value = cur.position || '';
      boardForm.image.value = (cur.image || cur.image_url) || '';
      boardForm.twitter.value = (cur.twitter || cur.twitter_url) || '';
      boardForm.linkedin.value = (cur.linkedin || cur.linkedin_url) || '';
      boardForm.email.value = cur.email || '';
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

  boardForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      name: boardForm.name.value.trim(),
      position: boardForm.position.value.trim(),
      image: boardForm.image.value.trim(),
      twitter: boardForm.twitter.value.trim(),
      linkedin: boardForm.linkedin.value.trim(),
      email: boardForm.email.value.trim(),
    };
    if (sb) {
      sb.auth.getSession().then(({ data: { session } }) => {
        if (!session) return alert('يلزم تسجيل الدخول لإجراء التعديلات');
        const payload = {
          name: data.name,
          position: data.position,
          image_url: data.image,
          twitter_url: data.twitter || null,
          linkedin_url: data.linkedin || null,
          email: data.email || null,
        };
        if (boardEditingIndex === null) {
          sb.from('board_members').insert(payload).select('*').single().then(({ data: row, error }) => {
            if (error) return alert('فشل الحفظ: ' + error.message);
            board.unshift(row);
            renderBoard();
            closeDialog(boardDialog);
          });
        } else {
          const id = board[boardEditingIndex]?.id;
          if (!id) { alert('عنصر بدون معرف، لا يمكن التحديث'); return; }
          sb.from('board_members').update(payload).eq('id', id).select('*').single().then(({ data: row, error }) => {
            if (error) return alert('فشل التحديث: ' + error.message);
            board[boardEditingIndex] = row;
            renderBoard();
            closeDialog(boardDialog);
          });
        }
      });
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
    if (act === 'edit') {
      faqEditingIndex = idx;
      const cur = faq[idx];
      faqForm.question.value = cur.question || '';
      faqForm.answer.value = cur.answer || '';
      faqForm.order.value = cur.order || '';
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
      order: faqForm.order.value ? Number(faqForm.order.value) : null,
    };
    if (sb) {
      sb.auth.getSession().then(({ data: { session } }) => {
        if (!session) return alert('يلزم تسجيل الدخول لإجراء التعديلات');
        const payload = {
          question: data.question,
          answer: data.answer,
          order: data.order,
        };
        if (faqEditingIndex === null) {
          sb.from('faq').insert(payload).select('*').single().then(({ data: row, error }) => {
            if (error) return alert('فشل الحفظ: ' + error.message);
            faq.unshift(row);
            renderFaq();
            closeDialog(faqDialog);
          });
        } else {
          const id = faq[faqEditingIndex]?.id;
          if (!id) { alert('عنصر بدون معرف، لا يمكن التحديث'); return; }
          sb.from('faq').update(payload).eq('id', id).select('*').single().then(({ data: row, error }) => {
            if (error) return alert('فشل التحديث: ' + error.message);
            faq[faqEditingIndex] = row;
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
        sb.from('works').select('*').order('created_at', { ascending: false }),
        sb.from('sponsors').select('*').order('created_at', { ascending: false }),
        sb.from('board_members').select('*').order('created_at', { ascending: false }),
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
  })();
})();
