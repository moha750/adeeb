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

    function fetchPostFromLocal(id) {
      const arr = lsGet('adeeb_blog_posts', []);
      const match = arr.find(p => String(p.id) === String(id));
      return match || null;
    }

    async function incrementViews(id, current) {
      if (!sb) return;
      try {
        // محاولة زيادة المشاهدات بشكل مبسط
        const next = (typeof current === 'number' ? current : 0) + 1;
        await sb.from('blog_posts').update({ views: next }).eq('id', id);
        el.views.textContent = next;
      } catch (e) {
        // تجاهل الخطأ بهدوء
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

    function renderComments(items) {
      if (!Array.isArray(items) || items.length === 0) {
        el.commentsList.textContent = 'لا توجد تعليقات بعد.';
        return;
      }
      el.commentsList.innerHTML = '';
      items.forEach(c => {
        const div = document.createElement('div');
        div.className = 'comment-item';
        const when = c.created_at ? new Date(c.created_at).toLocaleString('ar-SA') : '';
        div.innerHTML = `
          <div class="comment-meta"><i class="fa-regular fa-user"></i><strong>${(c.author_name||'مجهول')}</strong><span>•</span><span>${when}</span></div>
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
        const payload = { post_id: id, author_name: name || 'مجهول', body: body };
        const { error } = await sb.from('blog_comments').insert(payload);
        if (error) throw error;
        return true;
      } catch (e) { return false; }
    }

    async function loadComments(id) {
      const sbItems = await fetchCommentsSB(id);
      if (Array.isArray(sbItems)) { renderComments(sbItems); return { mode: 'sb', items: sbItems }; }
      const lsItems = getCommentsLS(id);
      renderComments(lsItems);
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
        el.commentHint.textContent = 'جارٍ الإرسال…';
        const ok = await submitComment(postId, el.commentName.value, el.commentBody.value);
        el.commentHint.textContent = ok ? 'تم الإرسال بنجاح' : 'تعذر الإرسال، حاول لاحقاً';
        if (ok) { el.commentBody.value = ''; }
        setTimeout(() => { el.commentHint.textContent = ''; }, 2000);
      });
    }

    // جلب التدوينة وعرضها
    (async () => {
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
      renderPost(post);
      // زيادة المشاهدات بشكل غير حصري
      incrementViews(postId, post.views);
      // تجهيز الإعجابات والتعليقات
      await refreshLikesUI(postId);
      await loadComments(postId);
      // تحديث العنوان
      if (post.title) document.title = `${post.title} — مرافئ`;
    })();
  });
})();
