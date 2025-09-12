// blog.js - سلوكيات أساسية لصفحة المدونة فقط

// عناصر الهيدر
const menuToggle = document.getElementById("menuToggle");
const nav = document.querySelector(".nav");
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
  const hero = document.querySelector('.blog-hero');
  const layers = document.querySelectorAll('.parallax-layer');
  if (!hero || !layers.length) return;

  const update = () => {
    const rect = hero.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const inView = rect.bottom > 0 && rect.top < vh;
    // مقدار التمرير داخل البطل فقط: عندما يكون أعلى البطل قد تجاوز أعلى الشاشة
    // نقيّده بين 0 وارتفاع البطل حتى لا يستمر التحريك بعد الخروج من البطل
    const visibleProgress = Math.min(
      Math.max(-rect.top, 0),
      Math.max(rect.height, 0)
    );

    // حدد أقصى مقدار إزاحة لمنع التكرار البصري عند الحواف
    const maxShift = Math.min(120, Math.max(60, rect.height * 0.25));
    layers.forEach((layer) => {
      const depth = parseFloat(layer.getAttribute('data-depth') || '0');
      const movement = -(
        Math.min(visibleProgress, maxShift) * depth
      );
      // حرّك خلفية الطبقة لإبقاء الموج مثبتاً أسفل البطل ومنع التكرار البصري عند الحافة
      layer.style.backgroundPosition = `center calc(100% + ${movement}px)`;
      // أزل أي ترجمات سابقة إن وُجدت
      layer.style.transform = 'translateZ(0)';
      layer.style.opacity = inView ? '1' : '0';
      layer.style.visibility = inView ? 'visible' : 'hidden';
    });
  };

  // حدث التمرير وتغيير الحجم
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  // استدعاء أولي لضبط القيم
  update();
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
  const relTime = post.published_at ? formatRelativeTime(post.published_at) : '';
  const img = (post.image || post.image_url || post.thumbnail_url) || 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=1400&auto=format&fit=crop';
  const title = post.title || '';
  const excerptSrc = (post.excerpt || post.content || '').toString();
  const excerpt = excerptSrc.slice(0, 160);
  const href = post.id ? `post.html?id=${encodeURIComponent(post.id)}` : '#';
  const categories = Array.isArray(post.categories) ? post.categories.filter(Boolean).map(String) : [];
  const categoryLabel = categories.length ? categories[0] : '';
  const authorName = (post.author_name || post.author || '').toString();
  const authorAvatar = (post.author_avatar || '').toString() || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(authorName || 'A') + '&background=E2E8F0&color=334155&size=64&rounded=true';
  const views = typeof post.views === 'number' ? post.views : 0;
  // قراءة المدة التقريبية (دقيقة/دقائق) — نحسبها من عدد الكلمات إن لم تتوفر قيمة في البيانات
  const explicitReadMin = typeof post.reading_time === 'number' ? post.reading_time : (typeof post.reading_time_minutes === 'number' ? post.reading_time_minutes : null);
  let readingMinutes = explicitReadMin;
  if (readingMinutes == null) {
    const plain = excerptSrc.replace(/<[^>]*>/g, ' ').trim();
    const words = plain ? plain.split(/\s+/).length : 0;
    readingMinutes = Math.max(1, Math.round(words / 200)); // 200 كلمة/دقيقة تقريباً
  }
  const commentsCount = typeof post.comments_count === 'number' ? post.comments_count : (typeof post.comments === 'number' ? post.comments : 0);
  const likesCount = typeof post.likes_count === 'number' ? post.likes_count : (typeof post.likes === 'number' ? post.likes : 0);
  const el = document.createElement('article');
  el.className = 'post-card';
  el.innerHTML = `
    <div class="post-media">
      <img class="post-thumb" src="${img}" alt="${title}" />
      ${categoryLabel ? `<span class="post-badge" aria-label="التصنيف"><i class="fa-solid fa-tag"></i><span class="label">${categoryLabel}</span></span>` : ''}
      <button class="post-share" type="button" aria-label="مشاركة"><i class="fa-solid fa-share-nodes"></i><span class="label">مشاركة</span></button>
    </div>
    <div class="post-content">
      <div class="post-meta">
        <div class="post-author">
          <img class="author-avatar" src="${authorAvatar}" alt="${authorName}" />
          <span class="author-name">${authorName}</span>
        </div>
        ${relTime ? `<span class="dot">•</span><div class="post-readtime"><i class="fa-regular fa-clock"></i><span>${relTime}</span></div>` : ''}
      </div>
      <h3 class="post-title">${title}</h3>
      ${excerpt ? `<p class="post-excerpt">${excerpt}${excerptSrc.length > 160 ? '…' : ''}</p>` : ''}
      <div class="post-engagement">
        <span class="eng-item eng-views"><i class="fa-regular fa-eye"></i><span>${views}</span></span>
        <span class="eng-item eng-likes"><i class="fa-regular fa-heart"></i><span>${likesCount}</span></span>
        <span class="eng-item eng-comments"><i class="fa-regular fa-comments"></i><span>${commentsCount}</span></span>
      </div>
      <div class="post-footer">
        <a class="post-readmore" href="${href}"><i class="fa-solid fa-arrow-left"></i> قراءة المزيد</a>
        <div class="post-time-bottom"><i class="fa-solid fa-hourglass-half"></i><span>مدة القراءة: ${readingMinutes} دقيقة</span></div>
      </div>
    </div>`;
  const shareBtn = el.querySelector('.post-share');
  if (shareBtn) {
    const urlAbs = new URL(href, location.href).toString();
    shareBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      sharePost({ title, url: urlAbs, text: excerpt });
    });
  }
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
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const instance = new Swiper(el, {
      slidesPerView: 1,
      spaceBetween: 24,
      loop: true,
      autoplay: prefersReduced ? false : { delay: 3500, disableOnInteraction: false },
      speed: prefersReduced ? 0 : 550,
      breakpoints: {
        700: { slidesPerView: 2 },
        1024: { slidesPerView: 3 },
      },
      keyboard: { enabled: true, onlyInViewport: true },
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

    // جلب بروفايل الكاتب لكل user_id مرة واحدة وتعزيز البيانات بالاسم والصورة
    try {
      const userIds = Array.from(new Set(posts.map(p => p.user_id).filter(Boolean)));
      if (sb && userIds.length) {
        const { data: profiles, error: profErr } = await sb
          .from('auth_users_public')
          .select('user_id, display_name, avatar_url')
          .in('user_id', userIds);
        if (!profErr && Array.isArray(profiles)) {
          const map = new Map(profiles.map(pr => [pr.user_id, pr]));
          posts.forEach(p => {
            const pr = map.get(p.user_id);
            if (pr) {
              p.author_name = pr.display_name || p.author_name || p.author || '';
              if (pr.avatar_url) p.author_avatar = pr.avatar_url;
            }
          });
        }
      }
    } catch {}

    // جلب عدد الإعجابات والتعليقات لكل تدوينة دفعة واحدة لإظهارها في البطاقات
    try {
      const ids = Array.from(new Set(posts.map(p => p.id).filter(id => id != null)));
      if (sb && ids.length) {
        // جلب جميع صفوف الإعجابات لهذه التدوينات ثم حساب العدد لكل post_id
        const [{ data: likesRows, error: likesErr }, { data: commentsRows, error: commentsErr }] = await Promise.all([
          sb.from('blog_likes').select('post_id').in('post_id', ids),
          sb.from('blog_comments').select('post_id').in('post_id', ids),
        ]);
        if (!likesErr && Array.isArray(likesRows)) {
          const likeMap = new Map();
          likesRows.forEach(r => {
            const pid = r.post_id; likeMap.set(pid, (likeMap.get(pid) || 0) + 1);
          });
          posts.forEach(p => { p.likes_count = likeMap.get(p.id) || 0; });
        }
        if (!commentsErr && Array.isArray(commentsRows)) {
          const comMap = new Map();
          commentsRows.forEach(r => {
            const pid = r.post_id; comMap.set(pid, (comMap.get(pid) || 0) + 1);
          });
          posts.forEach(p => { p.comments_count = comMap.get(p.id) || 0; });
        }
      }
    } catch {}

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
  // تهيئة اللودر
  ensureLoaderInit();
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

  // تمييز رابط النافبار النشط حسب موضع التمرير (مماثل للرئيسية)
  (function initBlogScrollSpy() {
    const headerEl = document.querySelector('.header');
    const headerHeight = headerEl ? headerEl.offsetHeight : 80;
    const links = Array.from(document.querySelectorAll('.nav-link'));
    const linkByHref = new Map(links.map(a => [a.getAttribute('href') || '', a]));

    const postsSection = document.getElementById('posts');

    function setActiveLinkByHref(href) {
      links.forEach(l => l.classList.remove('active'));
      const el = linkByHref.get(href);
      if (el) el.classList.add('active');
    }

    function updateActiveOnScroll() {
      const scrollY = window.scrollY + headerHeight + 10; // تعويض ارتفاع الهيدر
      if (postsSection) {
        const rect = postsSection.getBoundingClientRect();
        const top = rect.top + window.scrollY;
        const bottom = top + postsSection.offsetHeight;
        if (scrollY >= top && scrollY < bottom) {
          // داخل قسم التدوينات
          setActiveLinkByHref('#posts');
          return;
        }
      }
      // الوضع الافتراضي قرب الأعلى: فعل "مرافئ"
      // ابحث عن رابط مرافئ (قد يكون blog.html أو ./blog.html)
      const candidates = ['blog.html', './blog.html'];
      let set = false;
      for (const href of candidates) { if (linkByHref.has(href)) { setActiveLinkByHref(href); set = true; break; } }
      if (!set) {
        // كخيار أخير، إن لم نجد مرافئ، لا نفعل شيئًا
      }
    }

    // تفعيل أولي
    updateActiveOnScroll();
    // عند التمرير
    window.addEventListener('scroll', updateActiveOnScroll, { passive: true });

    // عند الضغط على روابط نفس الصفحة، حدّث الحالة مباشرة
    links.forEach(a => {
      const href = a.getAttribute('href') || '';
      if (href.startsWith('#')) {
        a.addEventListener('click', () => setActiveLinkByHref(href));
      }
    });
  })();

  // تحديث سنة الحقوق
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  // تحديث سنة الحقوق في الفوتر الجديد
  const footerYearEl = document.getElementById('footerYear');
  if (footerYearEl) footerYearEl.textContent = new Date().getFullYear();

  // تهيئة نموذج النشرة البريدية
  initNewsletterForm();

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
  // تحميل المقالات مع شاشة التحميل
  (async () => {
    showPageLoader('جاري تحميل المقالات…');
    try { await loadPosts(); } finally { hidePageLoader(); }
  })();

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

  // تبديل زر الدعوة (Outline) بحسب حالة تسجيل الدخول
  (function initBlogHeroCtaAuthAware() {
    const sb = window.sbClient || null;
    const cta = document.getElementById('blogCtaBtn');
    if (!cta) return;

    const iconEl = cta.querySelector('i');
    const textEl = cta.querySelector('span');
    const setLoggedIn = () => {
      if (iconEl) {
        iconEl.className = 'fa-solid fa-feather-pointed';
      }
      if (textEl) {
        textEl.textContent = 'أنشر تدوينتك';
      }
      cta.setAttribute('href', '../blogger/dashboard.html');
    };
    const setLoggedOut = () => {
      if (iconEl) {
        iconEl.className = 'fa-solid fa-user-pen';
      }
      if (textEl) {
        textEl.textContent = 'سجل حساب مدون';
      }
      cta.setAttribute('href', '../register.html');
    };

    // الحالة الأولية
    if (!sb) {
      setLoggedOut();
      return;
    }
    sb.auth.getUser().then(({ data }) => {
      if (data && data.user) setLoggedIn(); else setLoggedOut();
    }).catch(() => setLoggedOut());

    // الاستماع لتغيرات الجلسة
    try {
      sb.auth.onAuthStateChange((_event, session) => {
        if (session && session.user) setLoggedIn(); else setLoggedOut();
      });
    } catch {}
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

// احترام تفضيلات تقليل الحركة
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('*').forEach(el => {
    el.style.animation = 'none';
    el.style.transition = 'none';
  });
}

// تنسيق نسبي للوقت مثل "منذ 3 ساعات"
function formatRelativeTime(dateInput) {
  try {
    const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
    const now = new Date();
    const diffMs = now - d;
    if (!isFinite(diffMs)) return '';
    const sec = Math.floor(diffMs / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);
    if (sec < 60) return 'الآن';
    if (min < 60) return `منذ ${min} دقيقة`;
    if (hr < 24) return `منذ ${hr} ساعة`;
    if (day < 30) return `منذ ${day} يوم`;
    // fallback إلى تاريخ قصير بالعربية
    return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '';
  }
}

// مشاركة رابط المقال باستخدام Web Share API مع بديل النسخ إلى الحافظة
function sharePost({ title, url, text }) {
  try {
    if (navigator.share) {
      navigator.share({ title: title || document.title, text: text || '', url }).catch(() => {});
      return;
    }
  } catch {}
  const toCopy = url;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(toCopy).then(() => {
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          icon: 'success',
          title: 'تم نسخ الرابط',
          text: 'يمكنك الآن لصقه ومشاركته',
          confirmButtonText: 'حسناً',
          customClass: { popup: 'custom-swal-popup' }
        });
      } else {
        alert('تم نسخ رابط المقال.');
      }
    }).catch(() => alert(toCopy));
  } else {
    // حل أخير
    try {
      prompt('انسخ الرابط التالي:', toCopy);
    } catch {
      alert(toCopy);
    }
  }
}

// تهيئة نموذج النشرة البريدية + رسائل الحالة
function initNewsletterForm() {
  const form = document.getElementById('newsletterForm');
  const messageEl = document.getElementById('newsletterMessage');
  if (!form || !messageEl) return;

  let submitting = false;
  const emailInputEl = form.querySelector('input[type="email"]');
  const submitBtn = form.querySelector('.newsletter-btn');

  const isValidEmail = (val) => {
    // RFC5322-like simple validation
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val);
  };

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    if (submitting) return; // امنع الإرسال المكرر
    const email = (emailInputEl?.value || '').trim();

    if (!email || !isValidEmail(email)) {
      showNewsletterMessage('يرجى إدخال بريد إلكتروني صحيح', 'error');
      return;
    }

    showNewsletterMessage('جاري الإشتراك...', 'loading');
    submitting = true;
    if (submitBtn) {
      submitBtn.setAttribute('disabled', 'true');
      submitBtn.style.cursor = 'not-allowed';
    }
    try {
      // موضع الاتصال بمزود الخدمة (Supabase/خدمة بريد)
      await new Promise(resolve => setTimeout(resolve, 1500));
      showNewsletterMessage('تم الاشتراك بنجاح! شكراً لك.', 'success');
      if (emailInputEl) emailInputEl.value = '';
      setTimeout(() => {
        messageEl.textContent = '';
        messageEl.className = 'newsletter-message';
      }, 3000);
    } catch (err) {
      showNewsletterMessage('حدث خطأ أثناء الاشتراك. يرجى المحاولة لاحقاً.', 'error');
    } finally {
      submitting = false;
      if (submitBtn) submitBtn.removeAttribute('disabled');
    }
  });
}

function showNewsletterMessage(message, type) {
  const messageEl = document.getElementById('newsletterMessage');
  if (!messageEl) return;
  messageEl.textContent = message;
  messageEl.className = `newsletter-message ${type}`;
}

// Header Scroll Effects
const logoImg = document.querySelector(".logo-img");
const logoText = document.querySelector(".logo-text");
const progressBar = document.querySelector(".progress-bar");

const header = document.querySelector(".header");
header.classList.add("blue");
let lastScroll = 0;

window.addEventListener("scroll", () => {
  const currentScroll = window.scrollY;

  // إخفاء الهيدر عند النزول وإظهاره عند الصعود
  if (currentScroll > lastScroll && currentScroll > 100) {
    header.classList.add("hidden");
  } else {
    header.classList.remove("hidden");
  }

  lastScroll = currentScroll;
});