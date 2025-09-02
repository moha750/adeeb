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

// تأثير Parallax للطبقات
function initParallax() {
  const layers = document.querySelectorAll('.parallax-layer');
  if (!layers.length) return;
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    layers.forEach(layer => {
      const depth = parseFloat(layer.getAttribute('data-depth') || '0');
      const movement = -(scrollY * depth);
      layer.style.transform = `translateY(${movement}px)`;
    });
  });
}

// إنشاء جسيمات متحركة في الخلفية
function createParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  const particleCount = 20;
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.classList.add('particle');
    const size = Math.random() * 10 + 5;
    const opacity = Math.random() * 0.2 + 0.05;
    const colors = [
      `rgba(61, 143, 214, ${opacity})`,
      `rgba(39, 64, 96, ${opacity})`,
      `rgba(51, 92, 129, ${opacity})`
    ];
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.background = colors[Math.floor(Math.random() * colors.length)];
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.top = `${Math.random() * 100}%`;
    particle.style.animationDelay = `${Math.random() * 15}s`;
    container.appendChild(particle);
  }
}

// مُركِّب بطاقة المقال
function card(post) {
  const dateStr = post.published_at ? new Date(post.published_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
  const img = (post.image || post.image_url || post.thumbnail_url) || 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=1400&auto=format&fit=crop';
  const title = post.title || '';
  const excerptSrc = (post.excerpt || post.content || '').toString();
  const excerpt = excerptSrc.slice(0, 160);
  const href = post.id ? `post.html?id=${encodeURIComponent(post.id)}` : '#';
  const el = document.createElement('article');
  el.className = 'post-card';
  el.innerHTML = `
    <img class="post-thumb" src="${img}" alt="${title}" />
    <div class="post-content">
      <div class="post-meta"><i class="fa-regular fa-calendar"></i><span>${dateStr}</span></div>
      <h3 class="post-title">${title}</h3>
      ${excerpt ? `<p class="post-excerpt">${excerpt}${excerptSrc.length > 160 ? '…' : ''}</p>` : ''}
      <a class="post-readmore" href="${href}"><i class="fa-solid fa-arrow-left"></i> قراءة المزيد</a>
    </div>`;
  return el;
}

// تهيئة سلايدر لفئات المدونة داخل عنصر محدد
function initCategorySwiper(rootEl) {
  if (typeof Swiper === 'undefined') return;
  const containers = rootEl.querySelectorAll('.category-swiper');
  containers.forEach((el) => {
    if (el.dataset.inited === '1') return;
    const slidesCount = el.querySelectorAll('.swiper-slide').length;
    if (!slidesCount) return;
    const nextEl = el.querySelector('.swiper-button-next');
    const prevEl = el.querySelector('.swiper-button-prev');
    // تهيئة
    const instance = new Swiper(el, {
      slidesPerView: 1,
      spaceBetween: 24,
      loop: slidesCount > 3,
      autoplay: { delay: 3500, disableOnInteraction: false },
      breakpoints: {
        700: { slidesPerView: 2 },
        1024: { slidesPerView: 3 },
      },
      navigation: {
        nextEl,
        prevEl,
      },
    });
    // علّم كونه مُهياً
    el.dataset.inited = '1';
    el._swiperInstance = instance;
  });
}

// بناء شجرة تصنيفات من مصفوفة التدوينات (يدعم مستويات متعددة)
function buildCategoryTree(posts) {
  const root = { posts: [], children: new Map() };
  posts.forEach(p => {
    const cats = Array.isArray(p.categories) ? p.categories.filter(Boolean).map(String) : [];
    if (!cats.length) {
      // بدون تصنيف
      let unc = root.children.get('بدون تصنيف');
      if (!unc) { unc = { posts: [], children: new Map() }; root.children.set('بدون تصنيف', unc); }
      unc.posts.push(p);
      return;
    }
    let node = root;
    cats.forEach((c) => {
      if (!node.children.has(c)) node.children.set(c, { posts: [], children: new Map() });
      node = node.children.get(c);
    });
    node.posts.push(p);
  });
  return root;
}

// عرض عقدة تصنيف مع العناوين والشبكات
function renderCategoryNode(container, name, node, level = 1) {
  const section = document.createElement('section');
  section.className = `category-section level-${level}`;
  if (name) {
    const h = document.createElement(level === 1 ? 'h2' : level === 2 ? 'h3' : 'h4');
    h.className = `category-title level-${level}`;
    h.innerHTML = `${name}`;
    section.appendChild(h);
  }
  if (node.posts && node.posts.length) {
    // حاوية سوايبر لكل مجموعة تدوينات داخل هذا التصنيف
    const swiper = document.createElement('div');
    swiper.className = 'category-swiper swiper';
    const wrapper = document.createElement('div');
    wrapper.className = 'swiper-wrapper';
    node.posts.forEach((p) => {
      const slide = document.createElement('div');
      slide.className = 'swiper-slide';
      slide.appendChild(card(p));
      wrapper.appendChild(slide);
    });
    const nav = document.createElement('div');
    nav.className = 'swiper-button';
    const next = document.createElement('div');
    next.className = 'swiper-button-next';
    const prev = document.createElement('div');
    prev.className = 'swiper-button-prev';
    nav.appendChild(next);
    nav.appendChild(prev);
    swiper.appendChild(wrapper);
    swiper.appendChild(nav);
    section.appendChild(swiper);
  }
  if (node.children && node.children.size) {
    // ترتيب أبجدي للتصنيفات الفرعية
    const entries = Array.from(node.children.entries()).sort((a, b) => a[0].localeCompare(b[0], 'ar'));
    entries.forEach(([childName, childNode]) => renderCategoryNode(section, childName, childNode, level + 1));
  }
  container.appendChild(section);
  // بعد إدراج القسم في DOM، هيّئ أي سلايدرات بداخله
  initCategorySwiper(section);
}

// تحميل المقالات من Supabase مع تحسين تجربة المستخدم لحالات التحميل/الخطأ
async function loadPosts() {
  const host = document.getElementById('posts');
  const legacyGrid = document.getElementById('postsGrid');
  if (!host && !legacyGrid) return;

  // عرض حالة التحميل الأولية
  const container = host || legacyGrid;
  container.innerHTML = `
    <div class="loading-posts" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
      <div style="font-size: 3rem; color: #3d8fd6; margin-bottom: 1rem;">
        <i class="fa-solid fa-compass fa-spin"></i>
      </div>
      <p style="color: #64748b; font-family: 'fr'; font-size: 1.2rem;">
        جاري تحميل المقالات...
      </p>
    </div>
  `;

  const sb = window.sbClient || null;
  if (!sb) {
    // إذا لم يتوفر Supabase، عرض رسالة مناسبة
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
        <div style="font-size: 3rem; color: #64748b; margin-bottom: 1rem;">
          <i class="fa-solid fa-book-open-reader"></i>
        </div>
        <p style="color: #64748b; font-family: 'fr'; font-size: 1.2rem;">
          المدونة تحت التطوير. سيتم إضافة المحتوى قريباً.
        </p>
      </div>
    `;
    return;
  }

  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await sb
      .from('blog_posts')
      .select('*')
      .eq('status', 'published')
      .lte('published_at', nowIso)
      .order('published_at', { ascending: false });
    if (error) throw error;

    const posts = (data || []).filter(p => !p.published_at || new Date(p.published_at) <= new Date());
    if (!posts.length) { container.innerHTML = ''; return; }

    // إنشاء شجرة التصنيفات ثم عرضها
    const tree = buildCategoryTree(posts);
    container.innerHTML = '';
    // جذور التصنيفات (المستوى الأول)
    const topEntries = Array.from(tree.children.entries()).sort((a, b) => a[0].localeCompare(b[0], 'ar'));
    topEntries.forEach(([name, node]) => renderCategoryNode(container, name, node, 1));
    // تأكيد تهيئة أي سلايدرات أنشئت على المستوى الأعلى
    initCategorySwiper(container);
  } catch (error) {
    console.warn('Failed to fetch blog posts from Supabase', error);
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
        <div style="font-size: 3rem; color: #ef4444; margin-bottom: 1rem;">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>
        <p style="color: #64748b; font-family: 'fr'; font-size: 1.2rem;">
          حدث خطأ في تحميل المقالات. يرجى المحاولة مرة أخرى لاحقاً.
        </p>
        <button onclick="loadPosts()" style="margin-top: 1rem; padding: 0.5rem 1.5rem; 
          background: #3d8fd6; color: white; border: none; border-radius: 8px; 
          cursor: pointer; font-family: 'fb';">
          <i class="fa-solid fa-rotate-right"></i> إعادة المحاولة
        </button>
      </div>
    `;
  }
}

// تهيئة جميع الوظائف عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
  // تمرير سلس لروابط نفس الصفحة
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (!targetId || targetId === '#') return;
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // تحديث سنة الحقوق
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // زر العودة للأعلى
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

  // تهيئة تأثير Parallax
  initParallax();
  // إنشاء الجسيمات المتحركة
  createParticles();
  // تحميل المقالات
  loadPosts();

  // إضافة تأثيرات تفاعلية للأزرار
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('mouseenter', function() {
      const fx = this.querySelector('.btn-hover-effect');
      if (fx) fx.style.transform = 'translateY(0)';
    });
    btn.addEventListener('mouseleave', function() {
      const fx = this.querySelector('.btn-hover-effect');
      if (fx) fx.style.transform = 'translateY(100%)';
    });
  });

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

// احترام تفضيلات تقليل الحركة
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('*').forEach(el => {
    el.style.animation = 'none';
    el.style.transition = 'none';
  });
}
