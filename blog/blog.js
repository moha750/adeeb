// blog.js - سلوكيات أساسية لصفحة المدونة فقط

// عناصر الهيدر
const menuToggle = document.getElementById("menuToggle");
const nav = document.querySelector(".nav");
const body = document.body;

if (menuToggle && nav) {
  menuToggle.addEventListener("click", function () {
    this.classList.toggle("active");
    nav.classList.toggle("active");
    body.style.overflow = nav.classList.contains("active") ? "hidden" : "";
  });

  // إغلاق القائمة عند الضغط على رابط في الشريط (للجوال)
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", function () {
      if (window.innerWidth <= 992) {
        menuToggle.classList.remove("active");
        nav.classList.remove("active");
        body.style.overflow = "";
      }
    });
  });

  // إغلاق عند الضغط خارج القائمة (للجوال)
  document.addEventListener("click", function (e) {
    if (!nav.contains(e.target) && !menuToggle.contains(e.target)) {
      if (window.innerWidth <= 992) {
        menuToggle.classList.remove("active");
        nav.classList.remove("active");
        body.style.overflow = "";
      }
    }
  });
}

// تمرير سلس للروابط داخل نفس الصفحة (مثل #posts)
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const targetId = this.getAttribute("href");
      if (!targetId || targetId === "#") return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        window.scrollTo({ top: target.offsetTop - 80, behavior: "smooth" });
      }
    });
  });

  // تحديث سنة الحقوق
  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // زر العودة للأعلى
  const backToTopBtn = document.getElementById("back-to-top");
  if (backToTopBtn) {
    backToTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    window.addEventListener("scroll", () => {
      if (window.pageYOffset > 300) {
        backToTopBtn.style.opacity = "1";
        backToTopBtn.style.visibility = "visible";
      } else {
        backToTopBtn.style.opacity = "0";
        backToTopBtn.style.visibility = "hidden";
      }
    });
  }

  // Load blog posts from Supabase or localStorage fallback
  const grid = document.getElementById('postsGrid');
  if (!grid) return;

  const sb = window.sbClient || null;

  function card(post) {
    const dateStr = post.published_at ? new Date(post.published_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
    const img = (post.image || post.image_url) || 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=1400&auto=format&fit=crop';
    const title = post.title || '';
    const excerpt = (post.excerpt || post.content || '').toString().slice(0, 160);
    const href = post.id ? `post.html?id=${encodeURIComponent(post.id)}` : '#';
    const el = document.createElement('article');
    el.className = 'post-card';
    el.innerHTML = `
      <img class="post-thumb" src="${img}" alt="${title}" />
      <div class="post-content">
        <div class="post-meta"><i class="fa-regular fa-calendar"></i><span>${dateStr}</span></div>
        <h3 class="post-title">${title}</h3>
        ${excerpt ? `<p class="post-excerpt">${excerpt}${post.content && post.content.length > 160 ? '…' : ''}</p>` : ''}
        <a class="post-readmore" href="${href}"><i class="fa-solid fa-arrow-left"></i> قراءة المزيد</a>
      </div>`;
    return el;
  }

  async function loadFromSupabase() {
    if (!sb) return null;
    try {
      const nowIso = new Date().toISOString();
      const { data, error } = await sb
        .from('blog_posts')
        .select('*')
        .eq('status', 'published')
        .lte('published_at', nowIso)
        .order('published_at', { ascending: false });
      if (error) throw error;
      return (data || []).filter(p => !p.published_at || new Date(p.published_at) <= new Date());
    } catch (e) {
      console.warn('Failed to fetch blog posts from Supabase', e);
      return null;
    }
  }

  function loadFromLocal() {
    try {
      const raw = localStorage.getItem('adeeb_blog_posts');
      const arr = raw ? JSON.parse(raw) : [];
      const now = new Date();
      return (arr || []).filter(p => (p.status || 'draft') === 'published' && (!p.published_at || new Date(p.published_at) <= now));
    } catch (_) {
      return [];
    }
  }

  (async () => {
    const sbData = await loadFromSupabase();
    const posts = Array.isArray(sbData) ? sbData : loadFromLocal();
    if (!Array.isArray(posts) || posts.length === 0) return; // keep static fallback
    grid.innerHTML = '';
    posts.forEach(p => grid.appendChild(card(p)));
  })();

  // انضم إلينا: إظهار خيارات إنشاء حساب/تسجيل الدخول للمدونين
  const joinBtn = document.getElementById('joinBtn');
  if (joinBtn && typeof Swal !== 'undefined') {
    joinBtn.addEventListener('click', function (e) {
      e.preventDefault();
      Swal.fire({
        title: "<span style=\"font-family:'fbb';color:#274060\">انضم إلى أدِيب — المدونة</span>",
        html: `
          <div style="font-family:'fr';color:#64748b;margin-bottom:20px">اختر إجراء للمدونين</div>
          <div style="display:flex;flex-direction:column;gap:12px;margin-top:10px">
            <a id="blogRegister" href="../blogger/register.html" style="display:block;text-decoration:none;background: linear-gradient(135deg, #3d8fd6, #274060);color:#fff;padding:12px;border-radius:10px;font-family:'fb'">
              <i class="fa-solid fa-user-plus"></i> إنشاء حساب مدون
            </a>
            <a id="blogLogin" href="../blogger/login.html" style="display:block;text-decoration:none;background:#fff;color:#274060;border:1px solid #3d8fd6;padding:12px;border-radius:10px;font-family:'fb'">
              <i class="fa-solid fa-right-to-bracket"></i> تسجيل الدخول
            </a>
          </div>
        `,
        showConfirmButton: false,
        showCancelButton: false,
        customClass: { popup: 'custom-swal-popup' }
      });
    });
  }
});
