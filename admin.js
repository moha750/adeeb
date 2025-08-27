// Admin Panel Logic
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

  const KEYS = {
    works: 'adeeb_works',
    sponsors: 'adeeb_sponsors',
    board: 'adeeb_board',
    faq: 'adeeb_faq',
    achievements: 'adeeb_achievements',
  };

  // Supabase client (if configured)
  const sb = window.sbClient || null;

  function load(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Failed to parse localStorage for', key, e);
      return [];
    }

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

  // Auth UI controls
  const loginBtn = $('#loginBtn');
  const logoutBtn = $('#logoutBtn');

  async function refreshAuthUI() {
    if (!sb) return; // no supabase
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      loginBtn && (loginBtn.style.display = 'none');
      logoutBtn && (logoutBtn.style.display = 'inline-flex');
    } else {
      loginBtn && (loginBtn.style.display = 'inline-flex');
      logoutBtn && (logoutBtn.style.display = 'none');
    }
  }

  loginBtn?.addEventListener('click', () => {
    // Navigate to dedicated login page with redirect back to admin
    const url = new URL('login.html', location.href);
    url.searchParams.set('redirect', 'admin.html');
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

  logoutBtn?.addEventListener('click', async () => {
    if (!sb) {
      // Fallback: just go to login
      const url = new URL('login.html', location.href);
      url.searchParams.set('redirect', 'admin.html');
      location.replace(url.toString());
      return;
    }
    await sb.auth.signOut();
    await refreshAuthUI();
    const url = new URL('login.html', location.href);
    url.searchParams.set('redirect', 'admin.html');
    location.replace(url.toString());
  });

  // Sidebar toggle (mobile)
  const sidebar = $('#sidebar');
  const toggleSidebarBtn = $('#toggleSidebar');
  toggleSidebarBtn?.addEventListener('click', () => {
    sidebar?.classList.toggle('open');
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
    });
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
      alert('تم الاستيراد بنجاح');
    } catch (err) {
      alert('فشل الاستيراد: ملف غير صالح');
      console.error(err);
    } finally {
      e.target.value = '';
    }
  });

  // Seed static data (from index.html) into Supabase
  async function seedStaticData() {
    try {
      if (!sb) { alert('Supabase غير مفعّل. تأكد من تحميل supabase-config.js'); return; }
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { alert('يلزم تسجيل الدخول لتنفيذ الترحيل'); return; }
      const seededStatic = localStorage.getItem('seeded_static_v1') === 'done';
      const seededBoard = localStorage.getItem('seeded_board_v1') === 'done';
      const seededFaq = localStorage.getItem('seeded_faq_v1') === 'done';
      const seededAch = localStorage.getItem('seeded_achievements_v1') === 'done';

      // الأعمال الثابتة من قسم our-works في index.html
      const staticWorks = [
        { title: 'مُعجم أدِيب', category: 'مُبادرة ثقافية', image_url: 'https://lh3.googleusercontent.com/d/1eq5qdc1KrTRLqAMTYGvJw-rKw7B2QBdM', link_url: 'https://x.com/AB_KFU/status/1716445053051191659' },
        { title: 'إبداع بجريرة', category: 'فلم قصير', image_url: 'https://lh3.googleusercontent.com/d/1ZLgJUjaJN02yq95Zh38v_81SK3ZpZ7or', link_url: 'https://x.com/AB_KFU/status/1734926267722367064' },
        { title: 'قصص نفخر بها', category: 'قصص', image_url: 'https://lh3.googleusercontent.com/d/1KEv1mdFWpfMBKRJW5SutBsc5Erhbv4Rn', link_url: 'https://x.com/AB_KFU/status/1766180150499049817' },
        { title: 'ذَكِّــــــــرْ', category: 'مُبادرة دينية', image_url: 'https://lh3.googleusercontent.com/d/1HrXbNy3d5JNeIIpzcNZK6TPeoIpRhiUB', link_url: 'https://x.com/AB_KFU/status/1781257849751957520' },
        { title: 'أدِيب وجهتك الإبداعية الأولى', category: 'الهوية الجديدة', image_url: 'https://lh3.googleusercontent.com/d/1eUP6KSkao_-HrcveLlkbnXBcb_po9EBr', link_url: 'https://x.com/AB_KFU/status/1838277205484581150' },
        { title: 'بوصلة', category: 'مُبادرة', image_url: 'https://lh3.googleusercontent.com/d/1BVpwxxlLXMbKkGS_UX2PTglzfVDgH_sG', link_url: 'https://x.com/AB_KFU/status/1860411289874346477' },
        { title: 'كفو تُبدع', category: 'فديو', image_url: 'https://lh3.googleusercontent.com/d/1dW7iXqxv2OXdtXEWTUJaWBQnrrtG-jUX', link_url: 'https://x.com/AB_KFU/status/1860681872105177102' },
        { title: 'صناعة المحتوى الإبداعي', category: 'ورشة تدريبية', image_url: 'https://lh3.googleusercontent.com/d/1FxEXQOy6UExLjutoj0f47qtgH3n-_eVd', link_url: 'https://x.com/AB_KFU/status/1858637724171071520' },
        { title: 'أدِيب يُعمِّق الصُّورة', category: 'توقيع شراكة', image_url: 'https://lh3.googleusercontent.com/d/18rs51qRjkSK-iYjG3Mnf_3dEInDksvkA', link_url: 'https://x.com/AB_KFU/status/1864014785089528186' },
        { title: 'ظهير في الظهيرة', category: 'فلم قصير', image_url: 'https://lh3.googleusercontent.com/d/1fJ6a7QFNvX1WhiCSvwkqSA0w_sKdt0KN', link_url: 'https://x.com/AB_KFU/status/1866562368047559043' },
        { title: 'نجم الآداب', category: 'فلم قصير', image_url: 'https://lh3.googleusercontent.com/d/1wGor11Qd2j4598twMGstARq--BkDAkVT', link_url: 'https://x.com/AB_KFU/status/1881395225622720931' },
        { title: 'ليالي كفو الرمضانية 2025', category: 'تغطية مُصورة', image_url: 'https://lh3.googleusercontent.com/d/1g5hqun2CPqdaanhr1BrwQaRM0fF2vJfd', link_url: 'https://x.com/AB_KFU/status/1903880080692330613' },
      ];

      // الرعاة الثابتون من قسم sponsors في index.html
      const staticSponsors = [
        { name: 'معهد رسيم للتدريب', badge: 'راعي تعليمي', logo_url: 'https://lh3.googleusercontent.com/d/1i9gWEWoeKIEq89mcY6IJd_SBfYujkU5V', link_url: 'https://www.instagram.com/raseem144/' },
        { name: 'أكواب التوت', badge: 'راعي الضيافة', logo_url: 'https://lh3.googleusercontent.com/d/14pBwvt62a4UDUtbFox3wIuGJ-_QVDHm6', link_url: 'https://www.instagram.com/akwabaltot/' },
        { name: 'مؤسسة عمق الصورة لتأجير المعدات', badge: 'شريك استراتيجي', logo_url: 'https://lh3.googleusercontent.com/d/1tWyttaSeKhbaeHF6LQLB07Vz1d227Rxt', link_url: 'https://www.instagram.com/deep_of_picture/' },
      ];

      // أعضاء المجلس من index.html
      const staticBoardMembers = [
        { name: 'محمد إسماعيل المطر', position: 'رئيس أدِيب', image_url: 'https://lh3.googleusercontent.com/d/17L-IKuMXlGv3z7rpqJ0i890djmG1iSa_', twitter_url: 'https://x.com/M7_ALMATTAR', linkedin_url: null, email: 'mohammad.bin.ismael@gmail.com' },
        { name: 'حوراء عبدالرزاق العاشور', position: 'نائب الرئيس', image_url: 'https://lh3.googleusercontent.com/d/16VmYRaPl4GcnekmJL7_0vBcAUdL-qbSI', twitter_url: 'https://x.com/Ha_10re', linkedin_url: 'https://www.linkedin.com/in/hawra-al-ashour-b37344329?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app', email: 'hawraabdulrazaq100@gmail.com' },
        { name: 'مهدي عبدالله', position: 'نائب الرئيس', image_url: 'https://lh3.googleusercontent.com/d/16iMjgbrDIkAi5GYX6PrOUhfFdQKFCB0x', twitter_url: 'https://x.com/AlsheikhMahdii', linkedin_url: 'https://www.linkedin.com/in/mahdi-a-940a5b309?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app', email: 'mahdiajs@hotmail.com' },
        { name: 'قصايد أحمد النصيب', position: 'قائدة الرُواة', image_url: 'https://lh3.googleusercontent.com/d/14upqEEnsfBjK9bkm3Dc0YJ0XKfRuJuCf', twitter_url: null, linkedin_url: null, email: null },
        { name: 'حصة وليد الشويهين', position: 'قائدة السُفراء', image_url: 'https://lh3.googleusercontent.com/d/1x-vqnZqQ0qpjZrepowZ5Tu4rVrQljUN4', twitter_url: null, linkedin_url: null, email: null },
        { name: 'رغد داوّد العُويّد', position: 'قائدة التأليف', image_url: 'https://lh3.googleusercontent.com/d/16yy2bCa-g2iXb51aJpGv7QTDYbFU90xg', twitter_url: 'https://x.com/Rd_Alowayyid', linkedin_url: null, email: 'raghadalowayyid6@gmail.com' },
        { name: 'نورة خالد الشمري', position: 'قائدة التصميم', image_url: 'https://lh3.googleusercontent.com/d/1dxYmTW6v1nyisB5SLla1Ajtk32YEfZGB', twitter_url: 'https://x.com/Nawari1i', linkedin_url: 'https://www.linkedin.com/in/norah-alshammari-4754b5316?', email: null },
        { name: 'محمد عبدالعزيز العبدالمحسن', position: 'المسؤول التقني', image_url: 'https://lh3.googleusercontent.com/d/16s8yyXbBpqPqwYjpnVmt5DoeL3_zG8yQ', twitter_url: 'https://x.com/Xor01A', linkedin_url: 'https://www.linkedin.com/in/xor01/', email: 'm.abdulmuhsin@outlook.com' },
        { name: 'علي سعيد العيسى', position: 'مسؤول التحرير', image_url: 'https://lh3.googleusercontent.com/d/1tRctgCHx_tYj090VeXVpy2_u6-9TC2ET', twitter_url: 'https://x.com/ali_alessa14', linkedin_url: null, email: 'mralialessa99@gmail.com' },
        { name: 'رنيم احمد الدريويش', position: 'مسؤولة الأرشيف', image_url: 'https://lh3.googleusercontent.com/d/1fvCbCdATA9DQ9LuwtKlZJiD1fzuaw8z9', twitter_url: 'https://x.com/ali_alessa14', linkedin_url: null, email: 'rneemaldryweesh@icloud.com' },
      ];

      // اجلب الموجود حالياً لتجنب التكرار
      const [
        { data: wRows, error: ew },
        { data: sRows, error: es },
        { data: bRows, error: eb },
        { data: fRows, error: ef },
      ] = await Promise.all([
        sb.from('works').select('id,title'),
        sb.from('sponsors').select('id,name'),
        sb.from('board_members').select('id,name'),
        sb.from('faq').select('id,question'),
      ]);
      if (ew) throw ew; if (es) throw es; if (eb) throw eb; if (ef) throw ef;

      const existingWorkTitles = new Set((wRows || []).map((r) => (r.title || '').trim()));
      const existingSponsorNames = new Set((sRows || []).map((r) => (r.name || '').trim()));
      const existingBoardNames = new Set((bRows || []).map((r) => (r.name || '').trim()));
      const existingFaqQuestions = new Set((fRows || []).map((r) => (r.question || '').trim()));

      // الأسئلة الشائعة الافتراضية
      const staticFaq = [
        { question: 'كيف يمكنني الانضمام إلى نادي أديب؟', answer: 'يمكنك الانضمام إلينا عن طريق تعبئة نموذج الاشتراك الموجود في أعلى الصفحة أو زيارة مقر النادي في جامعة الملك فيصل خلال أوقات العمل الرسمية. نحن نرحب بجميع المواهب الإبداعية من طلاب الجامعة.', order: 1 },
        { question: 'هل هناك رسوم للعضوية في النادي؟', answer: 'لا، العضوية في نادي أديب مجانية لجميع طلاب جامعة الملك فيصل. نحن نقدم جميع خدماتنا وبرامجنا بدون أي رسوم على الأعضاء.', order: 2 },
        { question: 'ما هي مجالات الإبداع التي يركز عليها النادي؟', answer: 'يركز نادي أديب على مجالات متعددة تشمل الكتابة الإبداعية (شعر، قصة، مقال)، الإنتاج المرئي (تصوير، أفلام قصيرة)، التصميم الجرافيكي، والخطابة والإلقاء. كما نقدم ورش عمل في جميع هذه المجالات.', order: 3 },
        { question: 'هل يمكن المشاركة في فعاليات النادي بدون عضوية؟', answer: 'نعم، بعض الفعاليات مفتوحة لجميع الطلاب حتى غير الأعضاء، خاصة الورش التدريبية والمعارض. لكن العضوية تمنحك أولوية في التسجيل وحق المشاركة في المسابقات والبرامج الحصرية.', order: 4 },
        { question: 'كيف يمكنني التواصل مع المسؤولين عن لجنة معينة؟', answer: 'يمكنك التواصل عبر البريد الإلكتروني الرسمي للنادي أو عبر حساباتنا على وسائل التواصل الاجتماعي. سنقوم بتوجيهك للشخص المسؤول عن اللجنة التي تريد التواصل معها.', order: 5 }
      ];

      // الإنجازات الافتراضية (نُقلت من index.html سابقاً)
      const staticAchievements = [
        { label: 'ظهور إعلامي', icon_class: 'fa-solid fa-hashtag', count_number: 500000, order: 1, plus_flag: true },
        { label: 'ورش تدريبية', icon_class: 'fa-solid fa-chalkboard', count_number: 6, order: 2, plus_flag: true },
        { label: 'مُشاركة', icon_class: 'fas fa-trophy', count_number: 12, order: 3, plus_flag: true },
        { label: 'مادة مرئية', icon_class: 'fa-solid fa-photo-film', count_number: 100, order: 4, plus_flag: true },
      ];

      const toInsertWorks = seededStatic ? [] : staticWorks.filter((w) => !existingWorkTitles.has((w.title || '').trim()));
      const toInsertSponsors = seededStatic ? [] : staticSponsors.filter((s) => !existingSponsorNames.has((s.name || '').trim()));
      const toInsertBoard = seededBoard ? [] : staticBoardMembers.filter((m) => !existingBoardNames.has((m.name || '').trim()));
      const toInsertFaq = seededFaq ? [] : staticFaq.filter((f) => !existingFaqQuestions.has((f.question || '').trim()));

      let insertedWorks = 0, insertedSponsors = 0, insertedBoard = 0, insertedFaq = 0, insertedAchievements = 0;

      if (toInsertWorks.length) {
        const { error } = await sb.from('works').insert(toInsertWorks);
        if (error) throw error; insertedWorks = toInsertWorks.length;
      }
      if (toInsertSponsors.length) {
        const { error } = await sb.from('sponsors').insert(toInsertSponsors);
        if (error) throw error; insertedSponsors = toInsertSponsors.length;
      }
      if (toInsertBoard.length) {
        const { error } = await sb.from('board_members').insert(toInsertBoard);
        if (error) throw error; insertedBoard = toInsertBoard.length;
      }
      if (toInsertFaq.length) {
        const { error } = await sb.from('faq').insert(toInsertFaq);
        if (error) throw error; insertedFaq = toInsertFaq.length;
      }

      // الإنجازات: حاول إدراجها إذا كان الجدول موجوداً؛ وإلا خزّنها محلياً
      try {
        if (!seededAch) {
          // تحقق من وجود الجدول عبر استعلام بسيط
          const { data: aRows, error: ea } = await sb.from('achievements').select('id,label');
          if (ea) throw ea;
          const existingAchLabels = new Set((aRows || []).map((r) => (r.label || '').trim()));
          const toInsertAchievements = staticAchievements.filter((a) => !existingAchLabels.has((a.label || '').trim()));
          if (toInsertAchievements.length) {
            const { error: insErr } = await sb.from('achievements').insert(toInsertAchievements);
            if (insErr) throw insErr;
            insertedAchievements = toInsertAchievements.length;
          }
        }
      } catch (achErr) {
        // إن لم يوجد الجدول (PGRST205) أو فشل الاستعلام، استخدم localStorage
        if (achErr?.code === 'PGRST205' || /Could not find the table '.+achievements'/.test(achErr?.message || '')) {
          if (!seededAch) {
            // دمج مع الموجود محلياً وتفادي التكرار بحسب label
            const local = Array.isArray(achievements) ? achievements : [];
            const labels = new Set(local.map((x) => (x.label || '').trim()));
            const merged = [...local];
            staticAchievements.forEach((a) => { if (!labels.has((a.label || '').trim())) merged.push(a); });
            achievements = merged;
            save(KEYS.achievements, achievements);
            insertedAchievements = staticAchievements.filter((a) => !labels.has((a.label || '').trim())).length;
          }
        } else {
          console.warn('Achievements seed failed', achErr);
        }
      }

      // أعد التحميل من Supabase وحدّث الواجهة
      const ok = await loadFromSupabase();
      renderWorks();
      renderSponsors();
      renderAchievements();
      renderBoard();
      renderFaq();

      if (!seededStatic) localStorage.setItem('seeded_static_v1', 'done');
      if (!seededBoard) localStorage.setItem('seeded_board_v1', 'done');
      if (!seededFaq) localStorage.setItem('seeded_faq_v1', 'done');
      if (!seededAch) localStorage.setItem('seeded_achievements_v1', 'done');
      alert(`تم الترحيل بنجاح:\nأُضيف ${insertedWorks} عمل\nأُضيف ${insertedSponsors} راعٍ\nأُضيف ${insertedBoard} عضو مجلس\nأُضيف ${insertedFaq} سؤال شائع\nأُضيف ${insertedAchievements} إنجاز`);
    } catch (err) {
      console.error(err);
      alert('فشل الترحيل: ' + (err?.message || 'خطأ غير معروف'));
    }
  }

  document.getElementById('seedStaticDataBtn')?.addEventListener('click', seedStaticData);
  // استدعاء مباشر الآن كما طلبت
  seedStaticData();

  // Fetch from Supabase on load if available
  async function loadFromSupabase() {
    if (!sb) return false;
    try {
      const [
        { data: w, error: ew },
        { data: s, error: es },
        { data: b, error: eb },
        { data: f, error: ef }
      ] = await Promise.all([
        sb.from('works').select('*').order('created_at', { ascending: false }),
        sb.from('sponsors').select('*').order('created_at', { ascending: false }),
        sb.from('board_members').select('*').order('created_at', { ascending: false }),
        sb.from('faq').select('*').order('order', { ascending: true }),
      ]);
      if (ew) throw ew; if (es) throw es; if (eb) throw eb; if (ef) throw ef;
      works = w || [];
      sponsors = s || [];
      board = b || [];
      faq = f || [];

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
    const ok = await loadFromSupabase();
    if (!ok) {
      // fallback remains localStorage-loaded arrays
    }
    renderWorks();
    renderSponsors();
    renderAchievements();
    renderBoard();
    renderFaq();
  })();
})();