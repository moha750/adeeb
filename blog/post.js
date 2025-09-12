'use strict';

// post.js - صفحة قراءة تدوينة تفاعلية
(function () {
  // عناصر الهيدر الأساسية (مطابقة لسلوك blog.js قدر الإمكان)
  const menuToggle = document.getElementById('menuToggle');
  const nav = document.querySelector('.nav');
  const body = document.body;
  // ===== Loader (Lottie) Helpers =====
  let __adeebLottie = null;
  let __adeebLoaderEl = null;
  function ensureLoaderInit() {
    if (!__adeebLoaderEl) __adeebLoaderEl = document.getElementById('adeebLoader');
    const container = document.getElementById('adeebLottie');
    if (container && !__adeebLottie && typeof lottie !== 'undefined') {
      try {
        __adeebLottie = lottie.loadAnimation({
          container,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          path: '../logo.json'
        });
      } catch {}
    }
  }
  function showPageLoader(text) {
    ensureLoaderInit();
    try {
      const t = document.querySelector('.adeeb-loader-text');
      if (t && text) t.textContent = text;
    } catch {}
    if (__adeebLoaderEl) {
      __adeebLoaderEl.style.display = 'flex';
      __adeebLoaderEl.setAttribute('aria-hidden', 'false');
    }
  }
  function hidePageLoader() {
    if (__adeebLoaderEl) {
      __adeebLoaderEl.style.display = 'none';
      __adeebLoaderEl.setAttribute('aria-hidden', 'true');
    }
  }
  if (menuToggle && nav) {
    menuToggle.addEventListener('click', function () {
      this.classList.toggle('active');
      nav.classList.toggle('active');
      body.style.overflow = nav.classList.contains('active') ? 'hidden' : '';
    });
    document.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', function () {
        if (window.innerWidth <= 992) {
          menuToggle.classList.remove('active');
          nav.classList.remove('active');
          body.style.overflow = '';
        }
      });
    });
    document.addEventListener('click', function (e) {
      if (!nav.contains(e.target) && !menuToggle.contains(e.target)) {
        if (window.innerWidth <= 992) {
          menuToggle.classList.remove('active');
          nav.classList.remove('active');
          body.style.overflow = '';
        }
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    // تهيئة اللودر
    ensureLoaderInit();
    // تحديث سنة الحقوق + زر العودة للأعلى
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
    const footerYear = document.getElementById('footerYear');
    if (footerYear) footerYear.textContent = new Date().getFullYear();
    const backToTopBtn = document.getElementById('back-to-top');
    if (backToTopBtn) {
      backToTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
      window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
          backToTopBtn.style.opacity = '1';
          backToTopBtn.style.visibility = 'visible';
        } else {
          backToTopBtn.style.opacity = '0';
          backToTopBtn.style.visibility = 'hidden';
        }
      });
    }

    

    // أدوات مساعدة
    const sb = window.sbClient || null; // من supabase-config.js
    let currentUser = null;
    let isBlogger = false;
    const q = new URLSearchParams(window.location.search);
    const postId = q.get('id');

    const el = {
      title: document.getElementById('postTitle'),
      date: document.getElementById('postDate'),
      author: document.getElementById('postAuthor'),
      authorAvatar: document.getElementById('postAuthorAvatar'),
      cover: document.getElementById('postCover'),
      content: document.getElementById('postContent'),
      tags: document.getElementById('postTags'),
      likeBtn: document.getElementById('likeBtn'),
      likesCount: document.getElementById('likesCount'),
      viewsWrap: document.getElementById('postViews'),
      viewsCount: document.getElementById('viewsCount'),
      shareBtn: document.getElementById('shareBtn'),
      copyLinkBtn: document.getElementById('copyLinkBtn'),
      commentsList: document.getElementById('commentsList'),
      commentForm: document.getElementById('commentForm'),
      commentName: document.getElementById('commentName'),
      commentBody: document.getElementById('commentBody'),
      commentIdentity: document.getElementById('commentIdentity'),
      commentStatus: document.getElementById('commentStatus'),
      commentsCount: document.getElementById('commentsCount'),
      commentsLabel: document.getElementById('commentsLabel'),
      commentCounter: document.getElementById('commentCounter'),
      commentsSort: document.getElementById('commentsSort'),
      commentsRefreshBtn: document.getElementById('commentsRefreshBtn'),
      commentsToggleBtn: document.getElementById('commentsToggleBtn'),
      commentsSection: document.getElementById('commentsSection'),
      commentsBody: document.getElementById('commentsBody'),
      commentsLoadMoreBtn: document.getElementById('commentsLoadMoreBtn'),
      commentsEndNotice: document.getElementById('commentsEndNotice')
    };

    // Arabic pluralization for views label
    function viewsLabelAr(n) {
      const num = Number(n);
      if (!isFinite(num)) return 'مشاهدة';
      if (num === 1) return 'مشاهدة';
      if (num === 2) return 'مشاهدتان';
      if (num >= 3 && num <= 10) return 'مشاهدات';
      if (num >= 11 && num <= 99) return 'مشاهدة';
      return 'مشاهدة'; // 100+
    }

    function setViewsUI(count) {
      if (el.viewsCount) el.viewsCount.textContent = String(count);
      const labelEl = el.viewsWrap ? el.viewsWrap.querySelector('.views-label') : null;
      if (labelEl) labelEl.textContent = viewsLabelAr(count);
    }

    // Arabic pluralization for comments label
    function commentsLabelAr(n) {
      const num = Number(n);
      if (!isFinite(num)) return 'تعليق';
      if (num === 0) return 'تعليق';
      if (num === 1) return 'تعليق';
      if (num === 2) return 'تعليقان';
      if (num >= 3 && num <= 10) return 'تعليقات';
      if (num >= 11 && num <= 99) return 'تعليقًا';
      return 'تعليقًا';
    }

    // --- Auth helpers: fetch current session and determine blogger role ---
    async function refreshAuth() {
      try {
        if (!sb) { currentUser = null; isBlogger = false; return; }
        const { data: { session } } = await sb.auth.getSession();
        currentUser = session?.user || null;
        const role = currentUser?.user_metadata?.role || '';
        isBlogger = role === 'blogger';
      } catch {
        currentUser = null; isBlogger = false;
      }
    }

    function displayNameFromUser(user) {
      if (!user) return '';
      const md = user.user_metadata || {};
      return md.display_name || md.name || user.email || '';
    }
    function avatarFromUser(user) {
      if (!user) return '';
      const md = user.user_metadata || {};
      return (md.avatar_url && String(md.avatar_url).trim()) || '';
    }

    function enforceCommentAccessUI() {
      if (!el.commentForm) return;
      const submitBtn = el.commentForm.querySelector('button[type="submit"]');
      if (isBlogger && currentUser) {
        // Blogger: allow typing, hide name field and show identity only (avatar + name)
        if (el.commentName) el.commentName.style.display = 'none';
        el.commentBody.disabled = false;
        if (submitBtn) submitBtn.disabled = false;
        const dn = displayNameFromUser(currentUser);
        const av = avatarFromUser(currentUser);
        const avatarImg = av ? `<img src="${av}" alt="${dn}" onerror="this.remove()" />` : '';
        if (el.commentIdentity) el.commentIdentity.innerHTML = `${avatarImg}<strong>${dn || 'مدون'}</strong>`;
        if (el.commentStatus) el.commentStatus.textContent = '';
      } else {
        // Not blogger: disable
        el.commentBody.disabled = true;
        if (submitBtn) submitBtn.disabled = true;
        if (el.commentName) el.commentName.disabled = true;
        if (el.commentIdentity) el.commentIdentity.innerHTML = '';
        if (el.commentStatus) el.commentStatus.innerHTML = `التعليقات متاحة للمدونين فقط. <a href="../blogger/login.html">سجّل الدخول</a> أو <a href="../blogger/register.html">أنشئ حساب مدون</a>.`;
      }
      // Initialize counter UI according to current value/state
      updateCommentCounter();
    }

    if (!postId) {
      // إذا فُتحت الصفحة مباشرة دون id نعيد المستخدم لقائمة المدونة
      window.location.replace('blog.html');
      return;
    }

    // LocalStorage helpers
    function lsGet(key, fallback) {
      try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
    }
    function lsSet(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }

    function renderTags(tags) {
      el.tags.innerHTML = '';
      if (!tags) return;
      const list = Array.isArray(tags) ? tags : String(tags).split(',').map(s => s.trim()).filter(Boolean);
      list.forEach(t => {
        const s = document.createElement('span');
        s.className = 'tag';
        s.textContent = t;
        el.tags.appendChild(s);
      });
    }

    // عرض مسار: العودة لمرافئ ثم اسم التصنيف ثم اسم المقالة داخل منطقة التاج
    function renderCategoryAndTitle(p) {
      if (!el.tags) return;
      el.tags.innerHTML = '';
      // رابط العودة لمرافئ
      const back = document.createElement('a');
      back.className = 'tag';
      back.href = 'blog.html';
      back.textContent = 'العودة لمرافئ';
      el.tags.appendChild(back);
      // فاصل بصري
      const sep1 = document.createElement('span');
      sep1.className = 'tag';
      sep1.textContent = '›';
      el.tags.appendChild(sep1);
      const cats = Array.isArray(p.categories)
        ? p.categories.filter(Boolean).map(String)
        : (p.tags ? String(p.tags).split(',').map(s => s.trim()).filter(Boolean) : []);
      const cat = cats.length ? cats[0] : '';
      // عنصر التصنيف
      if (cat) {
        const c = document.createElement('span');
        c.className = 'tag';
        c.textContent = cat;
        el.tags.appendChild(c);
      }
      // فاصل بصري
      if (p.title) {
        const sep = document.createElement('span');
        sep.className = 'tag';
        sep.textContent = '›';
        el.tags.appendChild(sep);
      }
      // اسم المقالة
      if (p.title) {
        const t = document.createElement('span');
        t.className = 'tag';
        t.textContent = p.title;
        el.tags.appendChild(t);
      }
    }

    function renderPost(p) {
      el.title.textContent = p.title || '';
      const authorName = p.author_name || p.author || '';
      el.author.textContent = authorName;
      if (p.published_at) {
        el.date.textContent = new Date(p.published_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
      }
      renderCategoryAndTitle(p);
      // صورة الكاتب
      if (el.authorAvatar) {
        const avatarSrc = safeAvatarForName(authorName, p.author_avatar);
        if (avatarSrc) {
          el.authorAvatar.src = avatarSrc;
          el.authorAvatar.alt = authorName || '';
          el.authorAvatar.style.display = '';
          el.authorAvatar.onerror = function(){ this.remove(); };
        } else {
          el.authorAvatar.style.display = 'none';
        }
      }
      if (p.image || p.image_url || p.cover_url) {
        const src = p.image || p.image_url || p.cover_url;
        el.cover.src = src; el.cover.style.display = '';
        el.cover.alt = p.title || '';
      }
      // المحتوى: دعم content_html أو content كـ نص بسيط
      const html = p.content_html || '';
      if (html) {
        el.content.innerHTML = html;
      } else if (p.content) {
        el.content.innerHTML = String(p.content).replace(/\n/g, '<br>');
      } else {
        el.content.textContent = '';
      }
      if (typeof p.likes === 'number') el.likesCount.textContent = p.likes;
      // initial views if provided by query
      if (typeof p.views === 'number') {
        setViewsUI(p.views);
      }
    }

    async function fetchPostFromSupabase(id) {
      if (!sb) return null;
      try {
        const { data, error } = await sb.from('blog_posts').select('*').eq('id', id).single();
        if (error) throw error;
        return data || null;
      } catch (e) {
        console.warn('Supabase get post failed', e);
        return null;
      }
    }

    // يجلب بروفايل عام للكاتب من View عامة (auth_users_public) باستخدام user_id
    async function fetchAuthorProfile(userId) {
      if (!sb || !userId) return null;
      try {
        const { data, error } = await sb
          .from('auth_users_public')
          .select('display_name, avatar_url')
          .eq('user_id', userId)
          .maybeSingle();
        if (error) throw error;
        return data || null;
      } catch (e) {
        return null;
      }
    }

    function fetchPostFromLocal(id) {
      const arr = lsGet('adeeb_blog_posts', []);
      const match = arr.find(p => String(p.id) === String(id));
      return match || null;
    }


    // إعجابات: محاولة عبر جدول blog_likes وإلا فـ LocalStorage
    const deviceIdKey = 'adeeb_device_id';
    function getDeviceId() {
      let id = localStorage.getItem(deviceIdKey);
      if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(deviceIdKey, id); }
      return id;
    }

    async function getLikesCountSB(id) {
      if (!sb) return null;
      try {
        const { count, error } = await sb.from('blog_likes').select('id', { count: 'exact', head: true }).eq('post_id', id);
        if (error) throw error;
        return typeof count === 'number' ? count : 0;
      } catch (e) { return null; }
    }
    async function isLikedSB(id, did) {
      if (!sb) return null;
      try {
        const { data, error } = await sb.from('blog_likes').select('id').eq('post_id', id).eq('device_id', did).maybeSingle();
        if (error) throw error;
        return !!data;
      } catch (e) { return null; }
    }
    async function likeSB(id, did) {
      if (!sb) return false;
      try {
        const { error } = await sb.from('blog_likes').insert({ post_id: id, device_id: did });
        if (error) throw error;
        return true;
      } catch { return false; }
    }
    async function unlikeSB(id, did) {
      if (!sb) return false;
      try {
        const { error } = await sb.from('blog_likes').delete().eq('post_id', id).eq('device_id', did);
        if (error) throw error;
        return true;
      } catch { return false; }
    }

    // ===== Comment Likes (Supabase: blog_comment_likes) with LocalStorage fallback =====
    function getCommentLikesLSKey(cid) { return `adeeb_comment_likes_${cid}`; }
    function getCommentLikedLSKey(cid) { return `adeeb_comment_liked_${cid}`; }
    function getCommentLikesLS(cid) { return Number(lsGet(getCommentLikesLSKey(cid), 0)) || 0; }
    function setCommentLikesLS(cid, v) { lsSet(getCommentLikesLSKey(cid), v); }
    function isCommentLikedLS(cid) { return !!lsGet(getCommentLikedLSKey(cid), false); }
    function setCommentLikedLS(cid, v) { lsSet(getCommentLikedLSKey(cid), !!v); }

    async function getCommentLikesCountSB(cid) {
      if (!sb) return null;
      try {
        const { count, error } = await sb
          .from('blog_comment_likes')
          .select('id', { count: 'exact', head: true })
          .eq('comment_id', cid);
        if (error) throw error;
        return typeof count === 'number' ? count : 0;
      } catch { return null; }
    }

    async function getLikesCountForManyCommentsSB(cids) {
      const ids = Array.from(new Set((cids || []).filter(Boolean)));
      if (!ids.length) return new Map();
      const results = await Promise.all(ids.map(async (id) => {
        if (commentLikesCache.has(id)) return [id, commentLikesCache.get(id)];
        const c = await getCommentLikesCountSB(id);
        const v = typeof c === 'number' ? c : 0;
        commentLikesCache.set(id, v);
        return [id, v];
      }));
      return new Map(results);
    }
    async function isCommentLikedSB(cid, did) {
      if (!sb) return null;
      try {
        const { data, error } = await sb
          .from('blog_comment_likes')
          .select('id')
          .eq('comment_id', cid)
          .eq('device_id', did)
          .maybeSingle();
        if (error) throw error;
        return !!data;
      } catch { return null; }
    }
    async function likeCommentSB(cid, did) {
      if (!sb) return false;
      try {
        const { error } = await sb.from('blog_comment_likes').insert({ comment_id: cid, device_id: did });
        if (error) throw error;
        return true;
      } catch { return false; }
    }
    async function unlikeCommentSB(cid, did) {
      if (!sb) return false;
      try {
        const { error } = await sb.from('blog_comment_likes').delete().eq('comment_id', cid).eq('device_id', did);
        if (error) throw error;
        return true;
      } catch { return false; }
    }

    async function refreshCommentLikeUI(cid, btnEl) {
      const did = getDeviceId();
      const [countSB, likedSB] = await Promise.all([
        getCommentLikesCountSB(cid),
        isCommentLikedSB(cid, did)
      ]);
      if (typeof countSB === 'number' && likedSB !== null) {
        if (btnEl) {
          const cnt = btnEl.querySelector('.comment-like-count');
          if (cnt) cnt.textContent = String(countSB);
          btnEl.classList.toggle('active', likedSB);
          btnEl.setAttribute('aria-pressed', likedSB ? 'true' : 'false');
          btnEl.classList.remove('error');
          btnEl.title = '';
        }
        return { count: countSB, liked: likedSB };
      }
      if (btnEl) {
        btnEl.classList.add('error');
        btnEl.title = 'تعذر تحميل إعجابات التعليق من الخادم';
      }
      throw new Error('Supabase comment likes unavailable');
    }

    async function toggleCommentLike(cid, btnEl) {
      const did = getDeviceId();
      try {
        const state = await refreshCommentLikeUI(cid, btnEl);
        if (state.liked) {
          await unlikeCommentSB(cid, did);
        } else {
          await likeCommentSB(cid, did);
        }
        await refreshCommentLikeUI(cid, btnEl);
      } catch (e) {
        if (btnEl) {
          const old = btnEl.innerHTML;
          btnEl.classList.add('error');
          btnEl.innerHTML = '<i class="fa-regular fa-heart"></i> فشل';
          setTimeout(() => { btnEl.innerHTML = old; }, 1500);
        }
      }
    }

    function getLikesLSKey(id) { return `adeeb_post_likes_${id}`; }
    function getLikedLSKey(id) { return `adeeb_post_liked_${id}`; }
    function getLikesLS(id) { return Number(lsGet(getLikesLSKey(id), 0)) || 0; }
    function setLikesLS(id, v) { lsSet(getLikesLSKey(id), v); }
    function isLikedLS(id) { return !!lsGet(getLikedLSKey(id), false); }
    function setLikedLS(id, v) { lsSet(getLikedLSKey(id), !!v); }

    // ===== Views: prefer Supabase blog_posts.views or count from blog_views; fallback to LS =====
    function getViewsLSKey(id) { return `adeeb_post_views_${id}`; }
    function getViewsSeenKey(id) { return `adeeb_post_view_seen_${id}`; }
    function getViewsLS(id) { return Number(lsGet(getViewsLSKey(id), 0)) || 0; }
    function setViewsLS(id, v) { lsSet(getViewsLSKey(id), v); }
    function markViewSeenLS(id) { lsSet(getViewsSeenKey(id), { t: Date.now() }); }
    function hasSeenRecentlyLS(id, minutes = 60) {
      const rec = lsGet(getViewsSeenKey(id), null);
      if (!rec) return false;
      try { return (Date.now() - Number(rec.t)) < minutes * 60 * 1000; } catch { return false; }
    }

    async function getViewsSB(id) {
      if (!sb) return null;
      try {
        // Try blog_posts.views column first
        const { data, error } = await sb.from('blog_posts').select('views').eq('id', id).maybeSingle();
        if (!error && data && typeof data.views === 'number') return data.views;
      } catch {}
      try {
        // Fallback: count rows from blog_views if exists
        const { count, error } = await sb.from('blog_views').select('id', { count: 'exact', head: true }).eq('post_id', id);
        if (!error && typeof count === 'number') return count;
      } catch {}
      return null;
    }

    async function addViewSB(id, deviceId) {
      if (!sb) return false;
      // Try inserting into blog_views; ignore duplicates if unique constraint exists on (post_id, device_id)
      try {
        const payload = { post_id: id };
        if (deviceId) payload.device_id = deviceId;
        const { error } = await sb.from('blog_views').insert(payload);
        if (error) throw error;
        return true;
      } catch (e) {
        // As a fallback, try incrementing blog_posts.views via RPC or update
        try {
          const { data, error } = await sb.rpc('inc_post_views', { pid: id });
          if (error) throw error;
          return true;
        } catch {}
        return false;
      }
    }

    async function refreshViewsUI(id) {
      // Prefer SB
      const sbCount = await getViewsSB(id);
      if (typeof sbCount === 'number') {
        setViewsUI(sbCount);
        return { mode: 'sb', count: sbCount };
      }
      // fallback LS
      const c = getViewsLS(id);
      setViewsUI(c);
      return { mode: 'ls', count: c };
    }

    async function trackView(id) {
      const did = getDeviceId();
      // de-duplicate frequent reloads locally for 60 minutes
      if (hasSeenRecentlyLS(id, 60)) { await refreshViewsUI(id); return false; }
      const ok = await addViewSB(id, did);
      if (!ok) {
        // local fallback counter
        const prev = getViewsLS(id);
        setViewsLS(id, prev + 1);
      }
      markViewSeenLS(id);
      await refreshViewsUI(id);
      return true;
    }

    async function refreshLikesUI(id) {
      // Supabase only; on failure mark error state
      const did = getDeviceId();
      const [countSB, likedSB] = await Promise.all([getLikesCountSB(id), isLikedSB(id, did)]);
      if (typeof countSB === 'number' && likedSB !== null) {
        el.likesCount.textContent = String(countSB);
        el.likeBtn.classList.toggle('active', likedSB);
        el.likeBtn.setAttribute('aria-pressed', likedSB ? 'true' : 'false');
        el.likeBtn.classList.remove('error');
        el.likeBtn.title = '';
        return { liked: likedSB, count: countSB };
      }
      // failure UI
      el.likeBtn.classList.add('error');
      el.likeBtn.setAttribute('aria-pressed', 'false');
      el.likeBtn.title = 'تعذر تحميل الإعجابات من الخادم';
      throw new Error('Supabase likes unavailable');
    }

    async function toggleLike(id) {
      const did = getDeviceId();
      try {
        const state = await refreshLikesUI(id);
        if (state.liked) {
          await unlikeSB(id, did);
        } else {
          await likeSB(id, did);
        }
        await refreshLikesUI(id);
        return true;
      } catch (e) {
        // show failure feedback
        const oldHtml = el.likeBtn.innerHTML;
        el.likeBtn.classList.add('error');
        el.likeBtn.innerHTML = '<i class="fa-regular fa-heart"></i> فشل';
        setTimeout(() => { el.likeBtn.innerHTML = oldHtml; }, 1500);
        return false;
      }
    }

    // التعليقات: Supabase إن وُجد blog_comments وإلا LocalStorage
    function commentsLSKey(id) { return `adeeb_post_comments_${id}`; }
    function getCommentsLS(id) { return lsGet(commentsLSKey(id), []); }
    function setCommentsLS(id, arr) { lsSet(commentsLSKey(id), arr); }

    // حالة ترتيب التعليقات والكاش
    let commentSort = 'latest'; // latest | oldest | most_liked
    let cachedComments = [];
    let lastSortedComments = [];
    const commentLikesCache = new Map(); // cid -> likes count

    // ترقيم التعليقات (عرض المزيد)
    const COMMENTS_PAGE_SIZE = 5;
    let commentsVisibleCount = COMMENTS_PAGE_SIZE;
    // سيظهر تنويه "وصلت إلى النهاية" فقط بعد محاولة المستخدم الضغط على زر إظهار المزيد
    let hasAttemptedLoadMore = false;

    function setCommentsToolbarSortFromUI() {
      if (el.commentsSort) {
        const v = el.commentsSort.value;
        if (v === 'latest' || v === 'oldest' || v === 'most_liked') commentSort = v;
      }
    }

    function updateCommentsCounterUI(count) {
      try {
        document.querySelectorAll('#commentsCount').forEach(n => n.textContent = String(count));
        document.querySelectorAll('#commentsLabel').forEach(n => n.textContent = commentsLabelAr(count));
      } catch {}
    }

    // جلب ملفات المعلقين دفعة واحدة عبر user_id
    async function fetchProfilesByUserIds(userIds) {
      if (!sb || !userIds || !userIds.length) return new Map();
      try {
        const { data, error } = await sb
          .from('auth_users_public')
          .select('user_id, display_name, avatar_url')
          .in('user_id', Array.from(new Set(userIds)));
        if (error) throw error;
        return new Map((data || []).map(r => [r.user_id, r]));
      } catch {
        return new Map();
      }
    }

    function safeAvatarForName(name, avatarUrl) {
      if (avatarUrl && String(avatarUrl).trim()) return avatarUrl;
      const n = encodeURIComponent(name || 'U');
      return `https://ui-avatars.com/api/?name=${n}&background=E2E8F0&color=334155&size=64&rounded=true`;
    }

    // إظهار الزمن بصيغة "منذ" بالعربية بشكل مبسط
    function timeAgoAr(input) {
      const d = input instanceof Date ? input : new Date(input);
      const now = new Date();
      const diffSec = Math.floor((now - d) / 1000);
      if (!isFinite(diffSec)) return '';
      if (diffSec < 5) return 'الآن';
      if (diffSec < 60) return `منذ ${diffSec} ثانية`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin === 1) return 'منذ دقيقة';
      if (diffMin === 2) return 'منذ دقيقتين';
      if (diffMin < 60) return `منذ ${diffMin} دقائق`;
      const diffH = Math.floor(diffMin / 60);
      if (diffH === 1) return 'منذ ساعة';
      if (diffH === 2) return 'منذ ساعتين';
      if (diffH < 24) return `منذ ${diffH} ساعات`;
      const diffD = Math.floor(diffH / 24);
      if (diffD === 1) return 'منذ يوم';
      if (diffD === 2) return 'منذ يومين';
      if (diffD < 30) return `منذ ${diffD} أيام`;
      const diffM = Math.floor(diffD / 30);
      if (diffM === 1) return 'منذ شهر';
      if (diffM === 2) return 'منذ شهرين';
      if (diffM < 12) return `منذ ${diffM} أشهر`;
      const diffY = Math.floor(diffM / 12);
      if (diffY === 1) return 'منذ سنة';
      if (diffY === 2) return 'منذ سنتين';
      return `منذ ${diffY} سنوات`;
    }

    // تحديث كل تواريخ التعليقات إلى صيغة "منذ" دوريًا
    function updateAllCommentDates() {
      document.querySelectorAll('.comment-date[data-iso]').forEach((elDate) => {
        const iso = elDate.getAttribute('data-iso');
        if (!iso) return;
        const d = new Date(iso);
        elDate.textContent = timeAgoAr(d);
      });
    }

    // إدارة مؤقّت التحديث تبعًا لرؤية التبويب
    function startCommentDatesInterval() {
      if (window.__adeebCommentDatesInterval) return;
      window.__adeebCommentDatesInterval = setInterval(updateAllCommentDates, 10 * 1000);
    }
    function stopCommentDatesInterval() {
      if (!window.__adeebCommentDatesInterval) return;
      clearInterval(window.__adeebCommentDatesInterval);
      window.__adeebCommentDatesInterval = null;
    }

    async function renderComments(items, append = false) {
      const count = Array.isArray(items) ? items.length : 0;
      // Update toolbar/header counters (supports duplicates)
      updateCommentsCounterUI(count);
      // Render loading or empty state
      if (!Array.isArray(items)) {
        // Loading state (unknown items yet)
        el.commentsList.setAttribute('data-loading', 'true');
        // Remove visible loader for initial state; JS will manage later states
        el.commentsList.innerHTML = '';
        if (el.commentsLoadMoreBtn) el.commentsLoadMoreBtn.style.display = 'none';
        if (el.commentsEndNotice) el.commentsEndNotice.style.display = 'none';
        return;
      }
      if (items.length === 0) {
        // Empty state (no comments)
        el.commentsList.removeAttribute('data-loading');
        el.commentsList.innerHTML = `
          <div class="no-comments">
            <i class="fa-regular fa-comments no-comments-icon" aria-hidden="true"></i>
            <h3 class="no-comments-title">كن أول المعلقين</h3>
            <p class="no-comments-desc">لا توجد تعليقات حتى الآن. ابدأ المحادثة وشاركنا رأيك!</p>
            <button class="no-comments-cta" type="button">
              <i class="fa-regular fa-pen-to-square" aria-hidden="true"></i>
              اكتب تعليقك الأول
            </button>
          </div>
        `;
        if (el.commentsLoadMoreBtn) el.commentsLoadMoreBtn.style.display = 'none';
        if (el.commentsEndNotice) el.commentsEndNotice.style.display = 'none';
        return;
      }
      // Remove loading state when we have comments to render
      el.commentsList.removeAttribute('data-loading');
      const alreadyRendered = append ? el.commentsList.querySelectorAll('.comment-item').length : 0;
      if (!append) {
        el.commentsList.innerHTML = '';
      }
      const visible = Math.max(0, Math.min(commentsVisibleCount, items.length));
      const start = append ? alreadyRendered : 0;
      const slice = items.slice(start, visible);
      // Resolve profiles for commenters that have user_id (only for the slice)
      const uids = slice.map(c => c.user_id).filter(Boolean);
      const profMap = await fetchProfilesByUserIds(uids);
      slice.forEach(c => {
        const pr = c.user_id ? profMap.get(c.user_id) : null;
        const name = pr?.display_name || c.author_name || 'مجهول';
        const avatar = safeAvatarForName(name, pr?.avatar_url || c.author_avatar);
        const fullDate = c.created_at ? new Date(c.created_at).toLocaleString('ar-SA') : '';
        const isoDate = c.created_at ? new Date(c.created_at).toISOString() : '';
        const when = c.created_at ? timeAgoAr(new Date(c.created_at)) : '';
        const div = document.createElement('div');
        div.className = 'comment-item';
        div.innerHTML = `
          <div class="comment-header">
            <img class="comment-avatar" src="${avatar}" alt="${name}" onerror="this.remove()" />
            <div class="comment-meta"><strong class="comment-author">${name}</strong><span class="comment-date" title="${fullDate}" data-iso="${isoDate}">${when}</span></div>
            <button class="comment-like-btn" data-cid="${c.id}" aria-pressed="false" title="إعجاب">
              <i class="fa-regular fa-heart"></i>
              <span class="comment-like-count">0</span>
            </button>
          </div>
          <div class="comment-body">${(c.body||'').toString().replace(/</g,'&lt;').replace(/\n/g,'<br>')}</div>
        `;
        // Add appear animation class with a small stagger
        try {
          div.classList.add('comment-appear');
          const idx = start + (Array.isArray(slice) ? slice.indexOf(c) : 0);
          div.style.setProperty('--delay', ((idx - start) * 80) + 'ms');
          div.addEventListener('animationend', () => { div.classList.remove('comment-appear'); div.style.removeProperty('--delay'); }, { once: true });
        } catch {}
        el.commentsList.appendChild(div);
      });
      // بعد الرسم حدّث صيغة "منذ"
      updateAllCommentDates();
      // الآن فقط، حدّث حالة زر "إظهار المزيد" وتنويه النهاية بعد إضافة العناصر فعليًا
      if (el.commentsLoadMoreBtn) {
        const atEnd = visible >= items.length;
        if (!atEnd) {
          el.commentsLoadMoreBtn.style.display = '';
          el.commentsLoadMoreBtn.disabled = false;
          if (el.commentsEndNotice) el.commentsEndNotice.style.display = 'none';
        } else {
          el.commentsLoadMoreBtn.style.display = 'none';
          // أظهر التنويه فقط إذا سبق أن حاول المستخدم عرض المزيد
          if (el.commentsEndNotice) el.commentsEndNotice.style.display = hasAttemptedLoadMore ? '' : 'none';
        }
      }
      // Initialize like UI only for the newly added comments (Supabase only), non-blocking
      const newButtons = el.commentsList.querySelectorAll('.comment-item:nth-last-child(-n+' + slice.length + ') .comment-like-btn');
      try {
        const tasks = Array.from(newButtons).map((btn) => {
          const cid = btn.getAttribute('data-cid');
          if (!cid) return null;
          return refreshCommentLikeUI(cid, btn).catch(() => {});
        }).filter(Boolean);
        // Run in parallel without blocking UI
        Promise.all(tasks).catch(() => {});
      } catch {}
    }

    async function fetchCommentsSB(id) {
      if (!sb) return null;
      try {
        // جلب دون ترتيب معقد. سنقوم بالترتيب محليًا بحسب اختيار المستخدم.
        const { data, error } = await sb.from('blog_comments').select('*').eq('post_id', id);
        if (error) throw error;
        return data || [];
      } catch (e) { return null; }
    }

    function sortCommentsLocally(items, likesMap) {
      const arr = Array.isArray(items) ? [...items] : [];
      if (!arr.length) return arr;
      if (commentSort === 'latest') {
        arr.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      } else if (commentSort === 'oldest') {
        arr.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
      } else if (commentSort === 'most_liked') {
        const getLikes = (c) => (likesMap && likesMap.get(c.id)) || 0;
        arr.sort((a, b) => {
          const lb = getLikes(b) - getLikes(a);
          if (lb !== 0) return lb;
          // tie-breaker: latest first
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        });
      }
      return arr;
    }

    async function addCommentSB(id, name, body) {
      if (!sb) return false;
      try {
        // enforce blogger identity
        const payload = { post_id: id, body: body };
        if (currentUser) {
          payload.user_id = currentUser.id; // if column exists
          payload.author_name = displayNameFromUser(currentUser);
          const av = avatarFromUser(currentUser);
          if (av) payload.author_avatar = av; // if column exists
        } else {
          payload.author_name = name || 'مجهول';
        }
        const { error } = await sb.from('blog_comments').insert(payload);
        if (error) throw error;
        return true;
      } catch (e) { return false; }
    }

    async function loadComments(id) {
      // Loading state: show placeholder and disable controls
      try {
        if (el.commentsList) {
          el.commentsList.setAttribute('data-loading', 'true');
          el.commentsList.innerHTML = `
            <div class="loading-comments">
              <div class="loading-spinner" aria-hidden="true"></div>
              <span>جارٍ تحميل التعليقات…</span>
            </div>
          `;
        }
        if (el.commentsLoadMoreBtn) {
          el.commentsLoadMoreBtn.style.display = 'none';
          el.commentsLoadMoreBtn.disabled = true;
        }
        if (el.commentsEndNotice) el.commentsEndNotice.style.display = 'none';
        if (el.commentsSort) el.commentsSort.disabled = true;
      } catch {}

      const sbItems = await fetchCommentsSB(id);
      if (Array.isArray(sbItems)) {
        cachedComments = sbItems;
        // reset pagination on load
        commentsVisibleCount = COMMENTS_PAGE_SIZE;
        // Apply current sorting
        if (commentSort === 'most_liked') {
          const ids = cachedComments.map(c => c.id).filter(Boolean);
          const likesMap = await getLikesCountForManyCommentsSB(ids);
          lastSortedComments = sortCommentsLocally(cachedComments, likesMap);
          await renderComments(lastSortedComments);
        } else {
          lastSortedComments = sortCommentsLocally(cachedComments);
          await renderComments(lastSortedComments);
        }
        try {
          if (el.commentsList) el.commentsList.removeAttribute('data-loading');
          if (el.commentsSort) el.commentsSort.disabled = false;
        } catch {}
        return { mode: 'sb', items: cachedComments };
      }
      const lsItems = getCommentsLS(id);
      cachedComments = lsItems;
      commentsVisibleCount = COMMENTS_PAGE_SIZE;
      lastSortedComments = sortCommentsLocally(cachedComments);
      await renderComments(lastSortedComments);
      try {
        if (el.commentsList) el.commentsList.removeAttribute('data-loading');
        if (el.commentsSort) el.commentsSort.disabled = false;
      } catch {}
      return { mode: 'ls', items: cachedComments };
    }

    async function submitComment(id, name, body) {
      if (!body || !body.trim()) return false;
      const current = await loadComments(id);
      if (current.mode === 'sb') {
        const ok = await addCommentSB(id, name, body.trim());
        await loadComments(id);
        return ok;
      } else {
        const items = getCommentsLS(id);
        items.push({ author_name: name || 'مجهول', body: body.trim(), created_at: new Date().toISOString() });
        setCommentsLS(id, items);
        await loadComments(id);
        return true;
      }
    }

    // مشاركة ونسخ رابط
    function currentLink() { return window.location.href; }
    if (el.shareBtn) {
      el.shareBtn.addEventListener('click', async () => {
        const url = currentLink();
        const title = el.title.textContent || document.title;
        if (navigator.share) {
          try { await navigator.share({ title, url }); } catch {}
        } else {
          try { await navigator.clipboard.writeText(url); el.shareBtn.textContent = 'تم نسخ الرابط'; setTimeout(()=>{ el.shareBtn.innerHTML = '<i class="fa-solid fa-share-nodes"></i> مشاركة'; }, 1500); } catch {}
        }
      });
    }
    if (el.copyLinkBtn) {
      el.copyLinkBtn.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(currentLink()); el.copyLinkBtn.textContent = 'تم النسخ'; setTimeout(()=>{ el.copyLinkBtn.innerHTML = '<i class="fa-regular fa-copy"></i> نسخ الرابط'; }, 1500); } catch {}
      });
    }

    if (el.likeBtn) {
      el.likeBtn.addEventListener('click', () => { toggleLike(postId); });
    }

    // Event delegation for comment like buttons
    if (el.commentsList) {
      el.commentsList.addEventListener('click', async (e) => {
        const btn = e.target.closest('.comment-like-btn');
        if (!btn) return;
        const cid = btn.getAttribute('data-cid');
        if (!cid) return;
        // allow only bloggers if that is the policy, else allow all devices
        try { await toggleCommentLike(cid, btn); } catch {}
      });
    }

    // زر عرض المزيد للتعليقات
    if (el.commentsLoadMoreBtn) {
      el.commentsLoadMoreBtn.addEventListener('click', async () => {
        try {
          el.commentsLoadMoreBtn.disabled = true;
          hasAttemptedLoadMore = true;
          commentsVisibleCount += COMMENTS_PAGE_SIZE;
          const base = lastSortedComments && lastSortedComments.length
            ? lastSortedComments
            : sortCommentsLocally(cachedComments);
          await renderComments(base, true);
        } finally {
          el.commentsLoadMoreBtn.disabled = false;
        }
      });
    }

    if (el.commentForm) {
      el.commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        // Disallow if not blogger
        if (!isBlogger) { if (el.commentStatus) el.commentStatus.textContent = 'التعليقات متاحة للمدونين فقط.'; return; }
        const bodyVal = el.commentBody.value || '';
        const maxLen = 500;
        if (bodyVal.trim().length === 0) { if (el.commentStatus) el.commentStatus.textContent = 'الرجاء كتابة تعليق.'; return; }
        if (bodyVal.length > maxLen) { if (el.commentStatus) el.commentStatus.textContent = `تجاوزت الحد الأقصى (${maxLen}) حرفًا. قلّل طول التعليق قبل الإرسال.`; return; }
        if (el.commentStatus) el.commentStatus.textContent = 'جارٍ الإرسال…';
        const ok = await submitComment(postId, el.commentName ? el.commentName.value : '', bodyVal);
        if (el.commentStatus) el.commentStatus.textContent = ok ? 'تم الإرسال بنجاح' : 'تعذر الإرسال، حاول لاحقاً';
        if (ok) { el.commentBody.value = ''; updateCommentCounter(); }
        setTimeout(() => { if (el.commentStatus) el.commentStatus.textContent = ''; }, 2000);
      });
    }

    // تغيير ترتيب التعليقات من الواجهة
    if (el.commentsSort) {
      el.commentsSort.addEventListener('change', async () => {
        try {
          setCommentsToolbarSortFromUI();
          // reset pagination when sorting changes
          commentsVisibleCount = COMMENTS_PAGE_SIZE;
          hasAttemptedLoadMore = false;
          // Show loading state and temporarily disable controls
          try {
            if (el.commentsList) {
              el.commentsList.setAttribute('data-loading', 'true');
              el.commentsList.innerHTML = `
                <div class="loading-comments">
                  <div class="loading-spinner" aria-hidden="true"></div>
                  <span>جارٍ تحميل التعليقات…</span>
                </div>
              `;
            }
            if (el.commentsSort) el.commentsSort.disabled = true;
            if (el.commentsLoadMoreBtn) {
              el.commentsLoadMoreBtn.disabled = true;
              el.commentsLoadMoreBtn.style.display = 'none';
            }
            if (el.commentsEndNotice) el.commentsEndNotice.style.display = 'none';
          } catch {}

          if (commentSort === 'most_liked') {
            const ids = cachedComments.map(c => c.id).filter(Boolean);
            const likesMap = await getLikesCountForManyCommentsSB(ids);
            lastSortedComments = sortCommentsLocally(cachedComments, likesMap);
            await renderComments(lastSortedComments);
          } else {
            lastSortedComments = sortCommentsLocally(cachedComments);
            await renderComments(lastSortedComments);
          }
        } finally {
          // Remove loading state and re-enable controls
          try {
            if (el.commentsList) el.commentsList.removeAttribute('data-loading');
            if (el.commentsSort) el.commentsSort.disabled = false;
            if (el.commentsLoadMoreBtn) el.commentsLoadMoreBtn.disabled = false;
          } catch {}
        }
      });
      // مزامنة الحالة الأولية مع الواجهة
      setCommentsToolbarSortFromUI();
    }

    // أزرار ترويسة التعليقات: تحديث + طيّ
    if (el.commentsRefreshBtn) {
      el.commentsRefreshBtn.addEventListener('click', async () => {
        try {
          const icon = el.commentsRefreshBtn.querySelector('i');
          const txt = el.commentsRefreshBtn.querySelector('.btn-text');
          if (icon) icon.classList.add('spin');
          el.commentsRefreshBtn.disabled = true;
          const oldTitle = el.commentsRefreshBtn.title;
          if (txt) txt.textContent = 'جارٍ التحديث';
          el.commentsRefreshBtn.title = 'جارٍ التحديث';
          // Disable sort while refreshing
          if (el.commentsSort) el.commentsSort.disabled = true;
          // إعادة ضبط حالة التنويه
          hasAttemptedLoadMore = false;
          await loadComments(postId);
        } finally {
          const icon = el.commentsRefreshBtn.querySelector('i');
          if (icon) icon.classList.remove('spin');
          el.commentsRefreshBtn.disabled = false;
          const txt = el.commentsRefreshBtn.querySelector('.btn-text');
          if (txt) txt.textContent = 'تحديث';
          el.commentsRefreshBtn.title = 'تحديث التعليقات';
          // Re-enable sort
          if (el.commentsSort) el.commentsSort.disabled = false;
        }
      });
    }

    if (el.commentsToggleBtn && el.commentsSection) {
      el.commentsToggleBtn.addEventListener('click', () => {
        const isCollapsed = el.commentsSection.classList.toggle('collapsed');
        el.commentsToggleBtn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
        // تحديث النص والعنوان
        const txt = el.commentsToggleBtn.querySelector('.btn-text');
        if (txt) txt.textContent = isCollapsed ? 'عرض' : 'طيّ';
        el.commentsToggleBtn.title = isCollapsed ? 'عرض التعليقات' : 'طيّ التعليقات';
      });
    }

    // مستمع عام لزر الحالة الفارغة للتركيز على حقل التعليق مع إبراز بصري
    document.addEventListener('click', function(e) {
      const target = e.target && e.target.closest ? e.target.closest('.no-comments-cta') : null;
      if (!target) return;
      const commentBody = document.getElementById('commentBody');
      if (commentBody) {
        commentBody.focus();
        try { commentBody.style.transition = 'box-shadow 0.5s ease'; } catch {}
        commentBody.style.boxShadow = '0 0 0 3px rgba(30, 96, 145, 0.3)';
        setTimeout(() => { commentBody.style.boxShadow = ''; }, 1500);
      }
    });

    // جلب التدوينة وعرضها
    (async () => {
      showPageLoader('جاري تحميل التدوينة…');
      // Prepare auth and comment access state
      await refreshAuth();
      enforceCommentAccessUI();
      // Live counter events
      if (el.commentBody) {
        // احذف حد المتصفح حتى نسمح بتجاوز 500 حرف، ونمنع النشر فقط
        try { el.commentBody.removeAttribute('maxlength'); } catch {}
        el.commentBody.addEventListener('input', () => {
          updateCommentCounter();
        });
        // initialize once in case browser restores previous value
        updateCommentCounter();
      }
      el.content.textContent = 'جاري التحميل…';
      let post = await fetchPostFromSupabase(postId);
      if (!post) post = fetchPostFromLocal(postId);
      if (!post) {
        // في حال فشل تحميل التدوينة نعيد التوجيه إلى صفحة المدونة
        window.location.replace('blog.html');
        hidePageLoader();
        return;
      }
      // منع عرض التدوينات غير المنشورة أو المجدولة للمستقبل
      try {
        const now = new Date();
        const pubAt = post.published_at ? new Date(post.published_at) : null;
        const isFuture = pubAt && !isNaN(pubAt.getTime()) && pubAt > now;
        if ((post.status || 'draft') !== 'published' || isFuture) {
          window.location.replace('blog.html');
          return;
        }
      } catch {}
      // محاولة جلب اسم الكاتب ديناميكيًا عبر user_id من View عامة
      try {
        if (post.user_id) {
          const profile = await fetchAuthorProfile(post.user_id);
          if (profile && (profile.display_name || profile.avatar_url)) {
            post.author_name = profile.display_name || post.author_name || post.author;
            if (profile.avatar_url) post.author_avatar = profile.avatar_url;
          }
        }
      } catch {}
      renderPost(post);
      // تجهيز الإعجابات والتعليقات
      await refreshLikesUI(postId);
      await refreshViewsUI(postId);
      // سجل مشاهدة (مرة لكل جهاز في 60 دقيقة)
      trackView(postId);
      await loadComments(postId);
      // تحديث العنوان
      if (post.title) document.title = `${post.title} — مرافئ`;
      // تشغيل/إيقاف التحديث الزمني لصيغة "منذ" بحسب رؤية التبويب
      startCommentDatesInterval();
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          stopCommentDatesInterval();
        } else {
          updateAllCommentDates();
          startCommentDatesInterval();
        }
      });
      hidePageLoader();
    })().catch(() => { hidePageLoader(); });

    // ===== Helpers: comment counter =====
    function updateCommentCounter() {
      if (!el.commentCounter || !el.commentBody) return;
      const max = Number(el.commentBody.getAttribute('maxlength')) || 500;
      const len = (el.commentBody.value || '').length;
      el.commentCounter.textContent = `${len}/${max} حرف`;
      // Color ranges: green (0-449), yellow (450-489), red (490-500)
      el.commentCounter.classList.remove('counter-green', 'counter-yellow', 'counter-red', 'near-limit');
      if (len <= 449) {
        el.commentCounter.classList.add('counter-green');
      } else if (len <= 489) {
        el.commentCounter.classList.add('counter-yellow');
      } else {
        el.commentCounter.classList.add('counter-red');
      }
    }
  });
})();
