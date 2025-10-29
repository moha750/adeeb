(function(){
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const sb = window.sbClient || null;
  const listEl = document.getElementById('boardList');
  const emptyEl = document.getElementById('emptyState');
  const ideaForm = document.getElementById('ideaForm');
  const ideaName = document.getElementById('ideaName');
  const ideaTitle = document.getElementById('ideaTitle');
  const ideaContent = document.getElementById('ideaContent');
  const ideaMsg = document.getElementById('ideaMsg');
  const charLeft = document.getElementById('charLeft');
  const titleCharLeft = document.getElementById('titleCharLeft');
  const refreshBtn = document.getElementById('refreshBtn');
  const ideaImage = document.getElementById('ideaImage');
  const imagePreview = document.getElementById('imagePreview');
  const previewImg = document.getElementById('previewImg');
  const clearImageBtn = document.getElementById('clearImageBtn');
  const ideaModal = document.getElementById('ideaModal');
  const ideaModalBackdrop = document.getElementById('ideaModalBackdrop');
  const ideaModalClose = document.getElementById('ideaModalClose');
  const ideaModalTitle = document.getElementById('ideaModalTitle');
  const ideaModalMeta = document.getElementById('ideaModalMeta');
  const ideaModalContent = document.getElementById('ideaModalContent');
  const ideaModalHero = document.getElementById('ideaModalHero');
  const ideaModalLikeBtn = document.getElementById('ideaModalLikeBtn');
  const ideaModalDownloadBtn = document.getElementById('ideaModalDownloadBtn');
  const ideaModalCopyBtn = document.getElementById('ideaModalCopyBtn');
  const ideaModalCopyLinkBtn = document.getElementById('ideaModalCopyLinkBtn');
  // Topics UI elements
  const topicsPanel = document.getElementById('topicsPanel');
  const topicsGrid = document.getElementById('topicsGrid');
  const topicsEmpty = document.getElementById('topicsEmpty');
  const topicsRefreshBtn = document.getElementById('topicsRefreshBtn');
  const submitPanel = document.getElementById('submitPanel');
  const listPanel = document.getElementById('listPanel');
  const backToTopicsBtn = document.getElementById('backToTopicsBtn');
  const currentTopicHeader = document.getElementById('currentTopicHeader');
  const ideaTopicSelect = document.getElementById('ideaTopicSelect');
  const topicsFilter = document.getElementById('topicsFilter');

  let rtChan = null;
  let selectedFile = null;
  let lastItems = [];
  let currentModalIdea = null;
  let copyBtnResetTimer = null;
  let copyLinkBtnResetTimer = null;
  let initialURLProcessed = false; // ensure auto-open from URL runs once
  let selectedTopicId = null; // currently selected topic
  let topicList = []; // cached topics

  function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function fmtArDateTime(iso){
    try {
      return new Date(iso).toLocaleString('ar', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch { return iso || ''; }
  }
  
  function timeAgoAr(iso){
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      const now = Date.now();
      const diff = Math.max(0, now - d.getTime());
      const sec = Math.floor(diff / 1000);
      if (sec < 60) return 'نُشر للتو';
      const min = Math.floor(sec / 60);
      if (min < 60) {
        if (min === 1) return 'نُشر منذ دقيقة';
        if (min === 2) return 'نُشر منذ دقيقتين';
        return `نُشر منذ ${min} دقائق`;
      }
      const hr = Math.floor(min / 60);
      if (hr < 24) {
        if (hr === 1) return 'نُشر منذ ساعة';
        if (hr === 2) return 'نُشر منذ ساعتين';
        return `نُشر منذ ${hr} ساعات`;
      }
      const day = Math.floor(hr / 24);
      if (day < 7) {
        if (day === 1) return 'نُشر منذ يوم';
        if (day === 2) return 'نُشر منذ يومين';
        return `نُشر منذ ${day} أيام`;
      }
      const week = Math.floor(day / 7);
      if (week < 5) {
        if (week === 1) return 'نُشر منذ أسبوع';
        if (week === 2) return 'نُشر منذ أسبوعين';
        return `نُشر منذ ${week} أسابيع`;
      }
      const month = Math.floor(day / 30);
      if (month < 12) {
        if (month === 1) return 'نُشر منذ شهر';
        if (month === 2) return 'نُشر منذ شهرين';
        return `نُشر منذ ${month} أشهر`;
      }
      const year = Math.floor(day / 365);
      if (year === 1) return 'نُشر منذ سنة';
      if (year === 2) return 'نُشر منذ سنتين';
      return `نُشر منذ ${year} سنوات`;
    } catch {
      return '';
    }
  }

  // ===== Topics: fetch + render + UI selection (top-level) =====
  function findTopicById(id){ return (topicList || []).find(t => String(t.id) === String(id)); }
  function setTopicHeader(t){
    if (!currentTopicHeader) return;
    if (t){ currentTopicHeader.textContent = `الموضوع: ${t.title || ''}`; currentTopicHeader.style.display = ''; }
    else { currentTopicHeader.textContent = ''; currentTopicHeader.style.display = 'none'; }
  }
  function showTopicsLanding(){
    if (topicsPanel) topicsPanel.style.display = '';
    if (submitPanel) submitPanel.style.display = 'none';
    if (listPanel) listPanel.style.display = 'none';
    if (backToTopicsBtn) backToTopicsBtn.style.display = 'none';
    setTopicHeader(null);
  }
  function showTopicView(topic){
    if (topicsPanel) topicsPanel.style.display = 'none';
    if (submitPanel) submitPanel.style.display = '';
    if (listPanel) listPanel.style.display = '';
    if (backToTopicsBtn) backToTopicsBtn.style.display = '';
    setTopicHeader(topic || null);
  }
  function fillTopicSelect(){
    if (!ideaTopicSelect) return;
    const items = (topicList || []).filter(t => t && (t.visible ?? true));
    const cur = String(selectedTopicId || '');
    ideaTopicSelect.innerHTML = items.map(t => `<option value="${String(t.id)}">${(t.title || '').toString()}</option>`).join('');
    if (cur){ try { ideaTopicSelect.value = cur; } catch {} }
  }
  function renderTopicsGrid(){
    if (!topicsGrid) return;
    topicsGrid.innerHTML = '';
    const vis = (topicList || []).filter(t => t && (t.visible ?? true));
    if (!vis.length){ if (topicsEmpty) topicsEmpty.style.display=''; return; } else { if (topicsEmpty) topicsEmpty.style.display='none'; }
    vis.sort((a,b)=>{
      const ao = a.order ?? 1_000_000, bo = b.order ?? 1_000_000;
      if (ao !== bo) return ao - bo;
      return new Date(b.created_at||0) - new Date(a.created_at||0);
    }).forEach(t => {
      const card = document.createElement('div');
      card.className = 'topic-card';
      card.setAttribute('data-id', String(t.id));
      const imgHtml = t.image_url
        ? `<div class="card-media"><img src="${escapeHtml(t.image_url)}" alt="${escapeHtml(t.title||'موضوع')}" loading="lazy" onerror="this.remove()"/></div>`
        : `<div class="card-media" style="display:grid;place-items:center;color:var(--accent-blue);"><i class="fa-solid fa-book" style="font-size:2rem"></i></div>`;
      const desc = (t.description || '').toString();
      card.innerHTML = `${imgHtml}<div class="card-body"><div class="title">${escapeHtml(t.title||'')}</div>${desc ? `<div class="desc">${escapeHtml(desc)}</div>` : ''}</div>`;
      topicsGrid.appendChild(card);
    });
  }
  async function fetchTopics(){
    if (sb){
      try {
        const { data, error } = await sb
          .from('idea_topics')
          .select('id, title, description, image_url, visible, order, created_at')
          .eq('visible', true)
          .order('order', { ascending: true, nullsFirst: true })
          .order('created_at', { ascending: false });
        if (error) throw error;
        topicList = Array.isArray(data) ? data : [];
        renderTopicsGrid();
        fillTopicSelect();
        return;
      } catch (e){ console.warn('idea_topics fetch failed', e); }
    }
    topicList = getLocalTopics();
    renderTopicsGrid();
    fillTopicSelect();
  }

  function setMsg(text, type='muted'){ if (ideaMsg){ ideaMsg.className = type === 'error' ? 'alert error' : 'muted'; ideaMsg.textContent = text || ''; } }

  function getLocalIdeas(){ try { const raw = localStorage.getItem('adeeb_ideas_public'); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch { return []; } }
  function setLocalIdeas(arr){ try { localStorage.setItem('adeeb_ideas_public', JSON.stringify(Array.isArray(arr) ? arr : [])); } catch {} }
  function getLocalTopics(){ try { const raw = localStorage.getItem('adeeb_idea_topics'); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch { return []; } }
  function setLocalTopics(arr){ try { localStorage.setItem('adeeb_idea_topics', JSON.stringify(Array.isArray(arr) ? arr : [])); } catch {} }

  // ===== Likes helpers (Supabase with LocalStorage fallback) =====
  const deviceIdKey = 'adeeb_device_id';
  function getDeviceId(){
    try {
      let id = localStorage.getItem(deviceIdKey);
      if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(deviceIdKey, id); }
      return id;
    } catch { return String(Math.random()); }
  }

  function lsGet(key, fallback){ try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } }
  function lsSet(key, value){ try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
  function ideaLikesLSKey(id){ return `adeeb_idea_likes_${id}`; }
  function ideaLikedLSKey(id){ return `adeeb_idea_liked_${id}`; }
  function getIdeaLikesLS(id){ return Number(lsGet(ideaLikesLSKey(id), 0)) || 0; }
  function setIdeaLikesLS(id, v){ lsSet(ideaLikesLSKey(id), Number(v)||0); }
  function isIdeaLikedLS(id){ return !!lsGet(ideaLikedLSKey(id), false); }
  function setIdeaLikedLS(id, v){ lsSet(ideaLikedLSKey(id), !!v); }

  async function getIdeaLikesCountSB(id){
    if (!sb) return null;
    try {
      const { count, error } = await sb.from('idea_likes').select('id', { count: 'exact', head: true }).eq('idea_id', id);
      if (error) throw error;
      return typeof count === 'number' ? count : 0;
    } catch { return null; }
  }
  async function isIdeaLikedSB(id, did){
    if (!sb) return null;
    try {
      const { data, error } = await sb.from('idea_likes').select('id').eq('idea_id', id).eq('device_id', did).maybeSingle();
      if (error) throw error;
      return !!data;
    } catch { return null; }
  }
  async function likeIdeaSB(id, did){
    if (!sb) return false;
    try { const { error } = await sb.from('idea_likes').insert({ idea_id: id, device_id: did }); if (error) throw error; return true; } catch { return false; }
  }
  async function unlikeIdeaSB(id, did){
    if (!sb) return false;
    try { const { error } = await sb.from('idea_likes').delete().eq('idea_id', id).eq('device_id', did); if (error) throw error; return true; } catch { return false; }
  }

  async function refreshIdeaLikeUI(id, btnEl){
    if (!btnEl) return { mode: 'none', liked: false, count: 0 };
    const viewOnly = btnEl.classList.contains('view-only') || btnEl.hasAttribute('data-view-only');
    const did = getDeviceId();
    // Prefer Supabase
    const [countSB, likedSB] = await Promise.all([getIdeaLikesCountSB(id), isIdeaLikedSB(id, did)]);
    if (typeof countSB === 'number' && likedSB !== null){
      const cntEl = btnEl.querySelector('.like-count');
      if (cntEl) cntEl.textContent = String(countSB);
      if (!viewOnly) btnEl.classList.toggle('active', likedSB);
      const icon = btnEl.querySelector('i');
      if (icon) icon.className = viewOnly ? 'fa-regular fa-heart' : (likedSB ? 'fa-solid fa-heart' : 'fa-regular fa-heart');
      if (!viewOnly) btnEl.setAttribute('aria-pressed', likedSB ? 'true' : 'false');
      btnEl.dataset.mode = 'sb';
      btnEl.title = viewOnly ? 'الإعجابات' : (likedSB ? 'إزالة الإعجاب' : 'إعجاب');
      return { mode: 'sb', liked: likedSB, count: countSB };
    }
    // Fallback: LocalStorage
    const c = getIdeaLikesLS(id);
    const liked = isIdeaLikedLS(id);
    const cntEl = btnEl.querySelector('.like-count');
    if (cntEl) cntEl.textContent = String(c);
    if (!viewOnly) btnEl.classList.toggle('active', liked);
    const icon2 = btnEl.querySelector('i');
    if (icon2) icon2.className = viewOnly ? 'fa-regular fa-heart' : (liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart');
    if (!viewOnly) btnEl.setAttribute('aria-pressed', liked ? 'true' : 'false');
    btnEl.dataset.mode = 'ls';
    btnEl.title = viewOnly ? 'الإعجابات' : (liked ? 'إزالة الإعجاب' : 'إعجاب');
    return { mode: 'ls', liked, count: c };
  }

  // Refresh all view-only like buttons (list cards) for a given idea id
  function refreshAllViewOnlyLikeButtons(ideaId){
    try {
      const nodes = $$(`.like-btn.view-only[data-id="${CSS.escape(String(ideaId))}"]`);
      nodes.forEach((el)=>{ try { refreshIdeaLikeUI(ideaId, el); } catch {} });
    } catch {}
  }

  async function toggleIdeaLike(id, btnEl){
    if (!btnEl) return;
    const did = getDeviceId();
    try {
      const state = await refreshIdeaLikeUI(id, btnEl);
      if (state.mode === 'sb'){
        if (state.liked) { await unlikeIdeaSB(id, did); } else { await likeIdeaSB(id, did); }
      } else {
        // Local fallback toggle
        const liked = isIdeaLikedLS(id);
        if (liked){ setIdeaLikedLS(id, false); setIdeaLikesLS(id, Math.max(0, getIdeaLikesLS(id) - 1)); }
        else { setIdeaLikedLS(id, true); setIdeaLikesLS(id, getIdeaLikesLS(id) + 1); }
      }
      await refreshIdeaLikeUI(id, btnEl);
      // Also refresh counts on list cards instantly
      try { refreshAllViewOnlyLikeButtons(id); } catch {}
    } catch {}
  }

  function renderList(items){
    if (!listEl) return;
    listEl.innerHTML = '';
    const visible = (items || []).filter(r => r && (r.visible ?? true));
    if (!visible.length){ if (emptyEl) emptyEl.style.display=''; return; } else { if (emptyEl) emptyEl.style.display='none'; }
    const sorted = visible.slice().sort((a,b)=>{
      const ap = !!a.pinned, bp = !!b.pinned;
      if (ap !== bp) return ap ? -1 : 1;
      return new Date(b.created_at||0) - new Date(a.created_at||0);
    });
    lastItems = sorted;
    sorted.forEach((row)=>{
      const card = document.createElement('div');
      card.className = 'idea-card';
      const name = row.author_name && String(row.author_name).trim() ? String(row.author_name).trim() : 'مجهول';
      const timeHtml = `<span class=\"chip chip-date\" title=\"${escapeHtml(fmtArDateTime(row.created_at))}\"><i class=\"fa-regular fa-clock\" aria-hidden=\"true\"></i> ${timeAgoAr(row.created_at)}</span>`;
      let bannerHtml = '';
      const safeTitle = escapeHtml(String(row.title || 'فكرة'));
      if (row.image_url){
        bannerHtml = `
          <div class="card-banner">
            <img src="${escapeHtml(row.image_url)}" alt="صورة الفكرة" loading="lazy" onerror="this.style.display='none'" />
            <div class="card-badge card-badge--tl">${timeHtml}</div>
          </div>
        `;
        try { card.classList.add('has-banner'); } catch {}
      } else {
        bannerHtml = `
          <div class="card-brandbar">
            <i id="p" class="fa-solid fa-lightbulb" aria-hidden="true"></i>
            <div class="card-badge card-badge--tl">${timeHtml}</div>
          </div>
        `;
      }
      const titleBlock = `<div class="title">${safeTitle}</div>`;

      const likeBtnHtml = `<button class=\"like-btn view-only\" data-view-only=\"1\" data-id=\"${escapeHtml(row.id)}\" aria-pressed=\"false\" title=\"الإعجابات\"><i class=\"fa-regular fa-heart\"></i><span class=\"like-count\">0</span></button>`;
      const bodyHtml = `
        <div class="card-body">
          <div class="card-head">
            ${titleBlock}
            ${likeBtnHtml}
          </div>
        </div>
      `;

      const cardFooterHtml = `
        <div class="card-footer">
          <span class="chip chip-name"><i class=\"fa-solid fa-user\" aria-hidden=\"true\"></i> ${escapeHtml(name)}</span>
          <button class="btn btn-outline view-idea" data-id="${escapeHtml(row.id)}"><i class="fa-solid fa-eye"></i> عرض الفكرة</button>
        </div>
      `;

      card.innerHTML = `${bannerHtml}${bodyHtml}${cardFooterHtml}`;
      if (row.pinned) {
        try { card.classList.add('pinned'); } catch {}
        const rib = document.createElement('div');
        rib.className = 'card-ribbon';
        rib.innerHTML = '<i class="fa-solid fa-thumbtack"></i> مثبت';
        card.appendChild(rib);
      }
      listEl.appendChild(card);
      // Initialize like UI asynchronously
      try { const btn = card.querySelector('.like-btn'); if (btn) refreshIdeaLikeUI(row.id, btn); } catch {}
    });
  }

  async function fetchIdeas(){
    if (sb){
      try {
        let q = sb
          .from('idea_board')
          .select('id, title, content, author_name, image_url, visible, pinned, created_at, topic_id')
          .eq('visible', true);
        if (selectedTopicId) q = q.eq('topic_id', selectedTopicId);
        const { data, error } = await q
          .order('pinned', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false });
        if (error) throw error;
        const rows = Array.isArray(data) ? data : [];
        renderList(rows);
        return;
      } catch (e){ console.warn('idea_board fetch failed', e); }
    }
    // fallback
    const all = getLocalIdeas();
    const filteredLS = selectedTopicId ? all.filter(r => String(r.topic_id) === String(selectedTopicId)) : all;
    renderList(filteredLS);
  }

  function canPostNow(){ try { const last = Number(localStorage.getItem('adeeb_idea_last_ts')||'0'); const now = Date.now(); return (now - last) > 60_000; } catch { return true; } }
  function markPosted(){ try { localStorage.setItem('adeeb_idea_last_ts', String(Date.now())); } catch {} }

  ideaContent?.addEventListener('input', ()=>{
    const max = Number(ideaContent.getAttribute('maxlength')||500);
    const left = Math.max(0, max - (ideaContent.value||'').length);
    if (charLeft) charLeft.textContent = `المتبقي ${left} حرف`;
  });
  ideaTitle?.addEventListener('input', ()=>{
    const max = Number(ideaTitle.getAttribute('maxlength')||120);
    const left = Math.max(0, max - (ideaTitle.value||'').length);
    if (titleCharLeft) titleCharLeft.textContent = `المتبقي ${left} حرف`;
  });

  function showPreview(file){
    if (!file || !previewImg || !imagePreview) return;
    const maxSize = 3 * 1024 * 1024; // 3MB
    if (file.size > maxSize) { setMsg('حجم الصورة يتجاوز 3MB', 'error'); ideaImage.value = ''; selectedFile = null; imagePreview.style.display='none'; return; }
    const url = URL.createObjectURL(file);
    previewImg.src = url;
    imagePreview.style.display = '';
  }
  ideaImage?.addEventListener('change', ()=>{
    const f = ideaImage.files && ideaImage.files[0] ? ideaImage.files[0] : null;
    selectedFile = f || null;
    if (f) showPreview(f); else { imagePreview && (imagePreview.style.display='none'); }
  });
  clearImageBtn?.addEventListener('click', (e)=>{
    e.preventDefault();
    ideaImage.value = '';
    selectedFile = null;
    if (imagePreview) imagePreview.style.display = 'none';
  });

  // Modal helpers
  function closeIdeaModal(){
    try {
      if (!ideaModal) return;
      ideaModal.setAttribute('hidden', '');
      try { if (document && document.body) document.body.classList.remove('modal-open'); } catch {}
      if (ideaModalTitle) ideaModalTitle.textContent = '';
      if (ideaModalMeta) ideaModalMeta.innerHTML = '';
      if (ideaModalContent) ideaModalContent.textContent = '';
      if (ideaModalHero) Array.from(ideaModalHero.children).forEach((ch)=>{ if (ch.id !== 'ideaModalClose') ch.remove(); });
      if (ideaModalDownloadBtn){ ideaModalDownloadBtn.disabled = false; ideaModalDownloadBtn.style.display = ''; ideaModalDownloadBtn.removeAttribute('data-url'); ideaModalDownloadBtn.removeAttribute('data-fn'); }
      currentModalIdea = null;
      document.removeEventListener('keydown', onEscClose);
      // Remove ?idea from URL (but don't add another history entry)
      try {
        if (!suppressPushState) {
          const url = new URL(window.location.href);
          if (url.searchParams.has('idea')){
            url.searchParams.delete('idea');
            history.replaceState({}, '', url.toString());
          }
        }
      } catch {}
    } catch {}
  }

  function onEscClose(e){ if (e.key === 'Escape') closeIdeaModal(); }

  function openIdeaModal(row){
    if (!ideaModal) return;
    const name = row.author_name && String(row.author_name).trim() ? String(row.author_name).trim() : 'مجهول';
    if (ideaModalTitle) ideaModalTitle.textContent = row.title || 'فكرة';
    // Build hero (image or brand) with time badge
    if (ideaModalHero){
      try {
        Array.from(ideaModalHero.children).forEach((ch)=>{ if (ch.id !== 'ideaModalClose') ch.remove(); });
        if (row.image_url){
          const img = document.createElement('img');
          img.className = 'idea-hero__img';
          img.src = row.image_url;
          img.alt = 'صورة الفكرة';
          img.onerror = function(){ this.remove(); };
          ideaModalHero.appendChild(img);
        } else {
          const brand = document.createElement('div');
          brand.className = 'idea-hero__brand';
          brand.innerHTML = '<i class="fa-solid fa-lightbulb" aria-hidden="true"></i>';
          ideaModalHero.appendChild(brand);
        }
      } catch {}
    }
    // Meta: author chip + full date
    if (ideaModalMeta){
      const full = fmtArDateTime(row.created_at);
      ideaModalMeta.innerHTML = `
        <div class="card-meta">
          <span class="chip chip-name"><i class="fa-solid fa-user" aria-hidden="true"></i> ${escapeHtml(name)}</span>
          <span class="chip chip-date" title="${escapeHtml(full)}"><i class="fa-regular fa-calendar"></i> ${full}</span>
        </div>
      `;
    }
    if (ideaModalContent) ideaModalContent.textContent = row.content || '';
    // Footer actions
    currentModalIdea = row;
    if (ideaModalDownloadBtn){
      if (row.image_url){
        const url = String(row.image_url);
        let ext = 'jpg';
        try {
          const u = new URL(url);
          const m = (u.pathname||'').match(/\.([a-zA-Z0-9]+)$/);
          if (m) ext = m[1].toLowerCase();
        } catch {
          const m = url.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
          if (m) ext = m[1].toLowerCase();
        }
        const safeBase = (row.title || 'idea').toString().trim().slice(0,40).replace(/[^\p{L}\p{N}\-\s_]/gu,'').replace(/\s+/g,'-') || 'idea';
        const fileName = `idea-${row.id}-${safeBase}.${ext}`;
        ideaModalDownloadBtn.disabled = false;
        ideaModalDownloadBtn.style.display = '';
        ideaModalDownloadBtn.setAttribute('data-url', url);
        ideaModalDownloadBtn.setAttribute('data-fn', fileName);
      } else {
        ideaModalDownloadBtn.disabled = true;
        ideaModalDownloadBtn.style.display = 'none';
        ideaModalDownloadBtn.removeAttribute('data-url');
        ideaModalDownloadBtn.removeAttribute('data-fn');
      }
    }
    // Modal like button wiring
    if (ideaModalLikeBtn){
      ideaModalLikeBtn.setAttribute('data-id', row.id);
      // Modal like button: label only, no count; ensure it's actionable (not view-only)
      try { ideaModalLikeBtn.classList.remove('view-only'); ideaModalLikeBtn.removeAttribute('data-view-only'); } catch {}
      ideaModalLikeBtn.innerHTML = '<i class="fa-regular fa-heart"></i> <span class="like-label">إعجاب بالفكرة</span>';
      try { refreshIdeaLikeUI(row.id, ideaModalLikeBtn); } catch {}
    }
    ideaModal.removeAttribute('hidden');
    try { if (document && document.body) document.body.classList.add('modal-open'); } catch {}
    document.addEventListener('keydown', onEscClose);
    // Push ?idea=<id> to URL so it can be shared/back-button aware
    try {
      if (!suppressPushState) {
        const url = new URL(window.location.href);
        const current = url.searchParams.get('idea');
        if (String(current) !== String(row.id)){
          url.searchParams.set('idea', row.id);
          history.pushState({ ideaId: row.id }, '', url.toString());
        }
      }
    } catch {}
  }

  function readFileAsDataURL(file){
    return new Promise((resolve,reject)=>{
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  ideaForm?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const name = (ideaName?.value || '').trim().slice(0,80);
    const title = (ideaTitle?.value || '').trim().slice(0,120);
    const content = (ideaContent?.value || '').trim().slice(0,500);
    const topicId = (ideaTopicSelect?.value || selectedTopicId || '').toString();
    if (!content){ setMsg('الرجاء كتابة الفكرة.', 'error'); return; }
    if (!name){ setMsg('الاسم مطلوب لحفظ حقوق الفكرة', 'error'); try { ideaName?.focus(); } catch {} return; }
    if (!topicId){ setMsg('الرجاء اختيار الموضوع.', 'error'); try { ideaTopicSelect?.focus(); } catch {} return; }
    if (!canPostNow()){ setMsg('الرجاء الانتظار دقيقة قبل إرسال فكرة أخرى.', 'error'); return; }
    setMsg('جارٍ الإرسال...');
    try {
      if (sb){
        let image_url = null, image_key = null;
        if (selectedFile) {
          const ext = (selectedFile.name && selectedFile.name.includes('.')) ? selectedFile.name.split('.').pop() : 'jpg';
          const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
          const up = await sb.storage.from('idea-board').upload(path, selectedFile, { upsert: false });
          if (up.error) throw up.error;
          image_key = up.data?.path || path;
          const pub = sb.storage.from('idea-board').getPublicUrl(image_key);
          image_url = pub?.data?.publicUrl || null;
        }
        const payload = { title: title || null, content, author_name: name, image_url, image_key, visible: true, pinned: false, topic_id: topicId };
        const { error } = await sb.from('idea_board').insert(payload);
        if (error) throw error;
        setMsg('تم نشر الفكرة. شكراً لمشاركتك!');
        ideaForm.reset();
        ideaContent.dispatchEvent(new Event('input'));
        ideaTitle?.dispatchEvent(new Event('input'));
        if (imagePreview) imagePreview.style.display = 'none';
        selectedFile = null;
        markPosted();
        fetchIdeas();
      } else {
        // local fallback
        const arr = getLocalIdeas();
        let image_url = null;
        if (selectedFile) {
          try { image_url = String(await readFileAsDataURL(selectedFile)); } catch {}
        }
        arr.unshift({ id: 'local-'+Date.now(), title: title || null, content, author_name: name, image_url, visible: true, pinned: false, created_at: new Date().toISOString(), topic_id: topicId });
        setLocalIdeas(arr);
        setMsg('تم حفظ الفكرة محلياً (وحدك تراها). لتظهر للجميع فعّل Supabase.');
        ideaForm.reset();
        ideaContent.dispatchEvent(new Event('input'));
        ideaTitle?.dispatchEvent(new Event('input'));
        if (imagePreview) imagePreview.style.display = 'none';
        selectedFile = null;
        markPosted();
        fetchIdeas();
      }
    } catch (err){
      setMsg('تعذر نشر الفكرة: ' + (err?.message || 'غير معروف'), 'error');
    }
  });

  refreshBtn?.addEventListener('click', (e)=>{ e.preventDefault(); fetchIdeas(); });

  // Delegated click for viewing idea in modal
  listEl?.addEventListener('click', (e)=>{
    const btn = e.target && e.target.closest ? e.target.closest('.view-idea') : null;
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    const row = (lastItems || []).find(r => String(r.id) === String(id));
    if (row) openIdeaModal(row);
  });

  // Delegated click for like button
  listEl?.addEventListener('click', (e)=>{
    const btn = e.target && e.target.closest ? e.target.closest('.like-btn') : null;
    if (!btn) return;
    if (btn.classList.contains('view-only') || btn.hasAttribute('data-view-only')) return;
    e.preventDefault();
    const id = btn.getAttribute('data-id');
    toggleIdeaLike(id, btn);
  });

  // Modal close interactions
  ideaModalClose?.addEventListener('click', (e)=>{ e.preventDefault(); closeIdeaModal(); });
  ideaModalBackdrop?.addEventListener('click', (e)=>{ e.preventDefault(); closeIdeaModal(); });

  // Modal like toggle
  ideaModalLikeBtn?.addEventListener('click', (e)=>{
    e.preventDefault();
    const id = ideaModalLikeBtn.getAttribute('data-id');
    if (id) toggleIdeaLike(id, ideaModalLikeBtn);
  });

  // Copy and download helpers
  async function copyTextToClipboard(text){
    try {
      if (navigator.clipboard && window.isSecureContext){ await navigator.clipboard.writeText(text); return true; }
    } catch {}
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      return true;
    } catch { return false; }
  }

  async function downloadImageByUrl(url, filename){
    try {
      const res = await fetch(url, { mode: 'cors' });
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename || 'image';
      document.body.appendChild(a);
      a.click();
      setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 120);
      return true;
    } catch {
      try {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'image';
        document.body.appendChild(a);
        a.click();
        a.remove();
        return true;
      } catch { return false; }
    }
  }

  ideaModalCopyBtn?.addEventListener('click', async (e)=>{
    e.preventDefault();
    const row = currentModalIdea;
    if (!row) return;
    const name = row.author_name && String(row.author_name).trim() ? String(row.author_name).trim() : '';
    const title = row.title ? String(row.title).trim() : '';
    const content = row.content ? String(row.content).trim() : '';
    const lines = [
      '💡| العنوان:',
      title || '',
      '',
      '📄 | المحتوى:',
      content || '',
      '',
      `🪶 | بِريشة «${name}»`,
    ];
    const text = lines.join('\n');
    const origHtml = ideaModalCopyBtn.innerHTML;
    const ok = await copyTextToClipboard(text);
    try { if (copyBtnResetTimer) { clearTimeout(copyBtnResetTimer); copyBtnResetTimer = null; } } catch {}
    if (ok) {
      ideaModalCopyBtn.innerHTML = '<i class="fa-solid fa-check"></i> تم النسخ';
    } else {
      ideaModalCopyBtn.innerHTML = '<i class="fa-solid fa-exclamation"></i> تعذر النسخ';
    }
    ideaModalCopyBtn.disabled = true;
    copyBtnResetTimer = setTimeout(()=>{
      ideaModalCopyBtn.innerHTML = origHtml;
      ideaModalCopyBtn.disabled = false;
    }, 1600);
  });

  ideaModalDownloadBtn?.addEventListener('click', async (e)=>{
    e.preventDefault();
    if (ideaModalDownloadBtn.disabled) return;
    const url = ideaModalDownloadBtn.getAttribute('data-url');
    const fn = ideaModalDownloadBtn.getAttribute('data-fn') || 'idea-image.jpg';
    if (url) await downloadImageByUrl(url, fn);
  });

  // Copy deep link button
  ideaModalCopyLinkBtn?.addEventListener('click', async (e)=>{
    e.preventDefault();
    const row = currentModalIdea;
    if (!row) return;
    const shareUrl = `${location.origin}${location.pathname}?idea=${encodeURIComponent(row.id)}`;
    const origHtml = ideaModalCopyLinkBtn.innerHTML;
    const ok = await copyTextToClipboard(shareUrl);
    try { if (copyLinkBtnResetTimer) { clearTimeout(copyLinkBtnResetTimer); copyLinkBtnResetTimer = null; } } catch {}
    if (ok) {
      ideaModalCopyLinkBtn.innerHTML = '<i class="fa-solid fa-check"></i> تم النسخ';
    } else {
      ideaModalCopyLinkBtn.innerHTML = '<i class="fa-solid fa-exclamation"></i> تعذر النسخ';
    }
    ideaModalCopyLinkBtn.disabled = true;
    copyLinkBtnResetTimer = setTimeout(()=>{
      ideaModalCopyLinkBtn.innerHTML = origHtml;
      ideaModalCopyLinkBtn.disabled = false;
    }, 1600);
  });

  function ensureRealtime(){
    if (!sb || rtChan) return;
    try {
      rtChan = sb
        .channel('rb:idea_board')
        // Re-fetch ideas on any board change
        .on('postgres_changes', { event: '*', schema: 'public', table: 'idea_board' }, (payload)=>{
          fetchIdeas();
        })
        // Live-update like counts on any like/unlike
        .on('postgres_changes', { event: '*', schema: 'public', table: 'idea_likes' }, (payload)=>{
          try {
            const ideaId = (payload.new && payload.new.idea_id) || (payload.old && payload.old.idea_id) || null;
            if (ideaId) refreshAllViewOnlyLikeButtons(String(ideaId));
          } catch {}
        })
        .subscribe();
    } catch {}
  }

  // URL helpers for deep-linking
  function getIdeaIdFromURL(){
    try {
      const url = new URL(window.location.href);
      const id = url.searchParams.get('idea');
      return id ? String(id) : null;
    } catch { return null; }
  }
  function getTopicIdFromURL(){
    try {
      const url = new URL(window.location.href);
      const id = url.searchParams.get('topic');
      return id ? String(id) : null;
    } catch { return null; }
  }

  function maybeOpenIdeaFromURL(){
    if (initialURLProcessed) return;
    const id = getIdeaIdFromURL();
    initialURLProcessed = true;
    if (!id) return;
    const row = (lastItems || []).find(r => String(r.id) === String(id));
    if (row){
      suppressPushState = true;
      try { openIdeaModal(row); } finally { suppressPushState = false; }
    }
  }

  window.addEventListener('popstate', ()=>{
    suppressPushState = true;
    try {
      // Handle topic navigation
      const tId = getTopicIdFromURL();
      selectedTopicId = tId || null;
      if (selectedTopicId){
        showTopicView(findTopicById(selectedTopicId));
        fetchIdeas();
      } else {
        showTopicsLanding();
      }
      // Handle idea deep-link
      const id = getIdeaIdFromURL();
      if (id){
        const row = (lastItems || []).find(r => String(r.id) === String(id));
        if (row) { openIdeaModal(row); }
        // If not found in current list, try fetching single idea
        else if (sb){
          sb.from('idea_board').select('id, title, content, author_name, image_url, visible, pinned, created_at, topic_id').eq('id', id).maybeSingle().then(({ data })=>{
            if (data){
              if (!selectedTopicId && data.topic_id){ selectedTopicId = String(data.topic_id); showTopicView(findTopicById(selectedTopicId)); fetchIdeas(); }
              openIdeaModal(data);
            }
          }).catch(()=>{});
        }
      } else {
        closeIdeaModal();
      }
    } finally {
      suppressPushState = false;
    }
  });

  document.addEventListener('visibilitychange', ()=>{ if (!document.hidden) fetchIdeas(); });

  // init
  // After fetching and rendering, try to open modal from URL once
  const _origFetchIdeas = fetchIdeas;
  async function fetchIdeas(){
    if (sb){
      try {
        let q = sb
          .from('idea_board')
          .select('id, title, content, author_name, image_url, visible, pinned, created_at, topic_id')
          .eq('visible', true);
        if (selectedTopicId) q = q.eq('topic_id', selectedTopicId);
        const { data, error } = await q
          .order('pinned', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false });
        if (error) throw error;
        const rows = Array.isArray(data) ? data : [];
        renderList(rows);
        maybeOpenIdeaFromURL();
        return;
      } catch (e){ console.warn('idea_board fetch failed', e); }
    }
    // fallback
    const all = getLocalIdeas();
    const filteredLS = selectedTopicId ? all.filter(r => String(r.topic_id) === String(selectedTopicId)) : all;
    renderList(filteredLS);
    maybeOpenIdeaFromURL();
  }

  // Bind topics UI
  topicsRefreshBtn?.addEventListener('click', (e)=>{ e.preventDefault(); fetchTopics(); });
  topicsGrid?.addEventListener('click', (e)=>{
    const card = e.target && e.target.closest ? e.target.closest('.topic-card') : null;
    if (!card) return;
    const id = card.getAttribute('data-id');
    if (!id) return;
    selectedTopicId = String(id);
    showTopicView(findTopicById(selectedTopicId));
    try {
      if (!suppressPushState){ const url = new URL(window.location.href); url.searchParams.set('topic', selectedTopicId); history.pushState({ topicId: selectedTopicId }, '', url.toString()); }
    } catch {}
    fillTopicSelect();
    fetchIdeas();
  });
  backToTopicsBtn?.addEventListener('click', (e)=>{
    e.preventDefault();
    selectedTopicId = null;
    showTopicsLanding();
    try { const url = new URL(window.location.href); url.searchParams.delete('topic'); history.pushState({}, '', url.toString()); } catch {}
  });

  async function initBoard(){
    await fetchTopics();
    const tId = getTopicIdFromURL();
    if (tId){ selectedTopicId = String(tId); showTopicView(findTopicById(selectedTopicId)); fillTopicSelect(); }
    else { showTopicsLanding(); }
    await fetchIdeas();
  }

  initBoard();
  ensureRealtime();
})();
