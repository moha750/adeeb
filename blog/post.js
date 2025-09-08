'use strict';

// post.js - صفحة قراءة تدوينة تفاعلية
(function () {
  // عناصر الهيدر الأساسية (مطابقة لسلوك blog.js قدر الإمكان)
  const menuToggle = document.getElementById('menuToggle');
  const nav = document.querySelector('.nav');
  const body = document.body;
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
    // تحديث سنة الحقوق + زر العودة للأعلى
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
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
      views: document.getElementById('postViews'),
      cover: document.getElementById('postCover'),
      content: document.getElementById('postContent'),
      tags: document.getElementById('postTags'),
      likeBtn: document.getElementById('likeBtn'),
      likesCount: document.getElementById('likesCount'),
      shareBtn: document.getElementById('shareBtn'),
      copyLinkBtn: document.getElementById('copyLinkBtn'),
      commentsList: document.getElementById('commentsList'),
      commentForm: document.getElementById('commentForm'),
      commentName: document.getElementById('commentName'),
      commentBody: document.getElementById('commentBody'),
      commentHint: document.getElementById('commentHint')
    };

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
        // Blogger: allow typing, hide name field and show identity hint
        if (el.commentName) el.commentName.style.display = 'none';
        el.commentBody.disabled = false;
        if (submitBtn) submitBtn.disabled = false;
        const dn = displayNameFromUser(currentUser);
        const av = avatarFromUser(currentUser);
        const avatarImg = av ? `<img src="${av}" alt="${dn}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;margin-inline-start:6px" onerror="this.remove()" />` : '';
        el.commentHint.innerHTML = `سوف يتم النشر باسم <strong>${dn || 'مدون'}</strong> ${avatarImg}`;
      } else {
        // Not blogger: disable
        el.commentBody.disabled = true;
        if (submitBtn) submitBtn.disabled = true;
        if (el.commentName) el.commentName.disabled = true;
        el.commentHint.innerHTML = `التعليقات متاحة للمدونين فقط. <a href="../blogger/login.html">سجّل الدخول</a> أو <a href="../blogger/register.html">أنشئ حساب مدون</a>.`;
      }
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

    function renderPost(p) {
      el.title.textContent = p.title || '';
      el.author.textContent = p.author_name || p.author || '';
      if (p.published_at) {
        el.date.textContent = new Date(p.published_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
      }
      renderTags(p.tags || p.categories);
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
      if (typeof p.views === 'number') el.views.textContent = p.views;
      if (typeof p.likes === 'number') el.likesCount.textContent = p.likes;
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

    // منع احتساب المشاهدة مع كل تحديث للصفحة عبر فترة سماح محلية
    const VIEW_COOLDOWN_MS = 60 * 60 * 1000; // ساعة واحدة
    function viewedKey(id) { return `adeeb_post_viewed_${id}`; }
    function shouldCountView(id) {
      try {
        const raw = localStorage.getItem(viewedKey(id));
        if (!raw) return true;
        const last = Number(raw) || 0;
        return (Date.now() - last) > VIEW_COOLDOWN_MS;
      } catch { return true; }
    }
    function markViewRecorded(id) {
      try { localStorage.setItem(viewedKey(id), String(Date.now())); } catch {}
    }

    async function incrementViews(id) {
      if (!sb) { markViewRecorded(id); return; }
      try {
        // المحاولة الأولى: استدعاء RPC ذرّي إن كان مُنشأً في قاعدة البيانات
        const { error: rpcErr } = await sb.rpc('increment_post_views', { p_post_id: id });
        if (rpcErr) {
          // بديل: قراءة العدد الحالي ثم تحديثه +1 (قد يفشل ذرّياً في السباقات الشديدة)
          const { data: row, error: selErr } = await sb
            .from('blog_posts')
            .select('views')
            .eq('id', id)
            .single();
          if (!selErr) {
            const curDb = typeof row?.views === 'number' ? row.views : 0;
            await sb.from('blog_posts').update({ views: curDb + 1 }).eq('id', id);
          }
        }
        // تحديث واجهة المستخدم تفاؤليًا بزيادة واحدة
        const cur = parseInt(el.views.textContent, 10) || 0;
        el.views.textContent = String(cur + 1);
      } catch (e) {
        // تجاهل الخطأ بهدوء
      } finally {
        markViewRecorded(id);
      }
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

    function getLikesLSKey(id) { return `adeeb_post_likes_${id}`; }
    function getLikedLSKey(id) { return `adeeb_post_liked_${id}`; }
    function getLikesLS(id) { return Number(lsGet(getLikesLSKey(id), 0)) || 0; }
    function setLikesLS(id, v) { lsSet(getLikesLSKey(id), v); }
    function isLikedLS(id) { return !!lsGet(getLikedLSKey(id), false); }
    function setLikedLS(id, v) { lsSet(getLikedLSKey(id), !!v); }

    async function refreshLikesUI(id) {
      // حاول Supabase أولاً وإلا محلي
      const did = getDeviceId();
      const [countSB, likedSB] = await Promise.all([getLikesCountSB(id), isLikedSB(id, did)]);
      if (typeof countSB === 'number' && likedSB !== null) {
        el.likesCount.textContent = String(countSB);
        el.likeBtn.classList.toggle('active', likedSB);
        el.likeBtn.setAttribute('aria-pressed', likedSB ? 'true' : 'false');
        return { mode: 'sb', liked: likedSB, count: countSB };
      }
      const count = getLikesLS(id);
      const liked = isLikedLS(id);
      el.likesCount.textContent = String(count);
      el.likeBtn.classList.toggle('active', liked);
      el.likeBtn.setAttribute('aria-pressed', liked ? 'true' : 'false');
      return { mode: 'ls', liked, count };
    }

    async function toggleLike(id) {
      const did = getDeviceId();
      const state = await refreshLikesUI(id);
      if (state.mode === 'sb') {
        if (state.liked) {
          const ok = await unlikeSB(id, did);
          await refreshLikesUI(id);
          return ok;
        } else {
          const ok = await likeSB(id, did);
          await refreshLikesUI(id);
          return ok;
        }
      } else {
        // Local fallback
        if (state.liked) {
          const next = Math.max(0, state.count - 1);
          setLikesLS(id, next); setLikedLS(id, false);
        } else {
          const next = state.count + 1;
          setLikesLS(id, next); setLikedLS(id, true);
        }
        await refreshLikesUI(id);
        return true;
      }
    }

    // التعليقات: Supabase إن وُجد blog_comments وإلا LocalStorage
    function commentsLSKey(id) { return `adeeb_post_comments_${id}`; }
    function getCommentsLS(id) { return lsGet(commentsLSKey(id), []); }
    function setCommentsLS(id, arr) { lsSet(commentsLSKey(id), arr); }

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

    async function renderComments(items) {
      if (!Array.isArray(items) || items.length === 0) {
        el.commentsList.textContent = 'لا توجد تعليقات بعد.';
        return;
      }
      el.commentsList.innerHTML = '';
      // Resolve profiles for commenters that have user_id
      const uids = items.map(c => c.user_id).filter(Boolean);
      const profMap = await fetchProfilesByUserIds(uids);
      items.forEach(c => {
        const pr = c.user_id ? profMap.get(c.user_id) : null;
        const name = pr?.display_name || c.author_name || 'مجهول';
        const avatar = safeAvatarForName(name, pr?.avatar_url || c.author_avatar);
        const when = c.created_at ? new Date(c.created_at).toLocaleString('ar-SA') : '';
        const div = document.createElement('div');
        div.className = 'comment-item';
        div.innerHTML = `
          <div class="comment-meta">
            <img src="${avatar}" alt="${name}" style="width:24px;height:24px;border-radius:50%;object-fit:cover" onerror="this.remove()" />
            <strong>${name}</strong><span>•</span><span>${when}</span>
          </div>
          <div class="comment-body">${(c.body||'').toString().replace(/</g,'&lt;').replace(/\n/g,'<br>')}</div>
        `;
        el.commentsList.appendChild(div);
      });
    }

    async function fetchCommentsSB(id) {
      if (!sb) return null;
      try {
        const { data, error } = await sb.from('blog_comments').select('*').eq('post_id', id).order('created_at', { ascending: true });
        if (error) throw error;
        return data || [];
      } catch (e) { return null; }
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
      const sbItems = await fetchCommentsSB(id);
      if (Array.isArray(sbItems)) { await renderComments(sbItems); return { mode: 'sb', items: sbItems }; }
      const lsItems = getCommentsLS(id);
      await renderComments(lsItems);
      return { mode: 'ls', items: lsItems };
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

    if (el.commentForm) {
      el.commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        // Disallow if not blogger
        if (!isBlogger) {
          el.commentHint.innerHTML = 'التعليقات متاحة للمدونين فقط.';
          return;
        }
        el.commentHint.textContent = 'جارٍ الإرسال…';
        const ok = await submitComment(postId, el.commentName ? el.commentName.value : '', el.commentBody.value);
        el.commentHint.textContent = ok ? 'تم الإرسال بنجاح' : 'تعذر الإرسال، حاول لاحقاً';
        if (ok) { el.commentBody.value = ''; }
        setTimeout(() => { el.commentHint.textContent = ''; }, 2000);
      });
    }

    // جلب التدوينة وعرضها
    (async () => {
      // Prepare auth and comment access state
      await refreshAuth();
      enforceCommentAccessUI();
      el.content.textContent = 'جاري التحميل…';
      let post = await fetchPostFromSupabase(postId);
      if (!post) post = fetchPostFromLocal(postId);
      if (!post) {
        // في حال فشل تحميل التدوينة نعيد التوجيه إلى صفحة المدونة
        window.location.replace('blog.html');
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
            // يمكن لاحقًا استخدام avatar_url لعرض صورة الكاتب إن رغبت
          }
        }
      } catch {}
      renderPost(post);
      // زيادة المشاهدات مع فترة سماح محلية لمنع العد مع كل تحديث صفحة
      if (shouldCountView(postId)) {
        incrementViews(postId);
      }
      // تجهيز الإعجابات والتعليقات
      await refreshLikesUI(postId);
      await loadComments(postId);
      // تحديث العنوان
      if (post.title) document.title = `${post.title} — مرافئ`;
    })();
  });
})();
