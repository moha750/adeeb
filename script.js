/* 
  ملف وظائف الواجهة (JavaScript)
  يحتوي على: قائمة الجوال، الروابط والتنقل السلس، الأكورديون للأسئلة الشائعة،
  عدادات الإنجازات، تهيئة سوايبر، الرسوم باستخدام GSAP، النماذج (تواصل/نشرة)، ومساعد المحادثة.
  ملاحظة: يرجى الحفاظ على أسماء المعرفات والكلاسات كما هي لتوافقها مع HTML/CSS.
*/
// Menu Toggle Functionality
const menuToggle = document.getElementById("menuToggle");
const nav = document.querySelector(".nav");
const body = document.body;

menuToggle.addEventListener("click", function () {
  // Toggle active class on menu toggle
  this.classList.toggle("active");

  // Toggle active class on navigation
  nav.classList.toggle("active");

  // Toggle overflow hidden on body to prevent scrolling when menu is open
  if (nav.classList.contains("active")) {
    body.style.overflow = "hidden";
  } else {
    body.style.overflow = "";
  }
});

// Close menu when clicking on a nav link
const navLinks = document.querySelectorAll(".nav-link");
navLinks.forEach((link) => {
  link.addEventListener("click", function () {
    if (window.innerWidth <= 992) {
      // Only for mobile view
      menuToggle.classList.remove("active");
      nav.classList.remove("active");
      body.style.overflow = "";
    }
  });
});

// Close menu when clicking outside
document.addEventListener("click", function (e) {
  if (!nav.contains(e.target) && !menuToggle.contains(e.target)) {
    if (window.innerWidth <= 992) {
      // Only for mobile view
      menuToggle.classList.remove("active");
      nav.classList.remove("active");
      body.style.overflow = "";
    }
  }
});

//
// Analytics: site visits (new vs returning)
//
function adeebUuid() {
  try { return crypto.randomUUID(); } catch { return 'v-' + Math.random().toString(36).slice(2) + Date.now().toString(36); }
}
function getVisitorId() {
  try {
    const key = 'adeeb_visitor_id';
    let id = localStorage.getItem(key);
    if (!id) {
      id = adeebUuid();
      localStorage.setItem(key, id);
      localStorage.setItem('adeeb_first_seen', new Date().toISOString());
    }
    return id;
  } catch { return adeebUuid(); }
}
function getSessionId() {
  try {
    const key = 'adeeb_session_id';
    let sid = sessionStorage.getItem(key);
    if (!sid) { sid = adeebUuid(); sessionStorage.setItem(key, sid); }
    return sid;
  } catch { return adeebUuid(); }
}
function isReturningVisitor() {
  try {
    const hasId = !!localStorage.getItem('adeeb_visitor_id');
    return hasId; // if we already have an id in localStorage then it's a returning visit
  } catch { return false; }
}
async function trackVisit() {
  try {
    const sb = window.sbClient;
    if (!sb) return; // Supabase not initialized
    const wasKnown = !!(function(){ try { return localStorage.getItem('adeeb_visitor_id'); } catch { return null; } })();
    const vid = getVisitorId();
    const sid = getSessionId();
    const url = new URL(location.href);
    const utm = Object.fromEntries(['utm_source','utm_medium','utm_campaign'].map(k => [k, url.searchParams.get(k) || null]));
    const payload = {
      visitor_id: vid,
      session_id: sid,
      is_returning: wasKnown === true || wasKnown === 'true' || (typeof wasKnown === 'string' && wasKnown.length > 0),
      path: location.pathname + location.search + location.hash,
      referrer: document.referrer || null,
      user_agent: (navigator.userAgent || '').slice(0, 500),
      language: navigator.language || null,
      screen_w: (window.screen && window.screen.width) || null,
      screen_h: (window.screen && window.screen.height) || null,
      tz: (Intl.DateTimeFormat && Intl.DateTimeFormat().resolvedOptions().timeZone) || null,
      utm_source: utm.utm_source,
      utm_medium: utm.utm_medium,
      utm_campaign: utm.utm_campaign
    };
    // Fire-and-forget insert; ignore errors (table might not exist yet or RLS not set)
    sb.from('site_visits').insert(payload).then(({ error }) => {
      if (error) console.warn('site_visits insert failed:', error.message);
      try { localStorage.setItem('adeeb_last_visit', new Date().toISOString()); } catch {}
    }).catch(() => {});
  } catch {}
}

document.addEventListener("DOMContentLoaded", function () {
  // Record a site visit (new vs returning)
  try { trackVisit(); } catch {}
  // Initialize FAQ accordion (will be re-initialized after dynamic loading)
  initFaqAccordion();

  // Smooth scrolling for navigation links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();

      const targetId = this.getAttribute("href");
      if (targetId === "#") return;

      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        // Close mobile menu if open
        if (window.innerWidth <= 992) {
          menuToggle.classList.remove("active");
          nav.classList.remove("active");
          body.style.overflow = "";
        }

        // Smooth scroll to target
        window.scrollTo({
          top: targetElement.offsetTop - 80, // Adjust for header height
          behavior: "smooth",
        });

        // Update active link
        document.querySelectorAll(".nav-link").forEach((link) => {
          link.classList.remove("active");
        });
        this.classList.add("active");
      }
    });
  });

  // Highlight nav link on scroll
  const sections = document.querySelectorAll("section[id]");
  const navLinksArray = document.querySelectorAll(".nav-link");

  window.addEventListener("scroll", () => {
    let current = "";

    sections.forEach((section) => {
      const sectionTop = section.offsetTop - 100;
      const sectionHeight = section.offsetHeight;
      if (pageYOffset >= sectionTop && pageYOffset < sectionTop + sectionHeight) {
        current = section.getAttribute("id");
      }
    });

    navLinksArray.forEach((link) => {
      link.classList.remove("active");
      if (link.getAttribute("href") === `#${current}`) {
        link.classList.add("active");
      }
    });
  });

  // Works (أعمالنا) - Dynamic Render
  async function fetchWorks() {
    try {
      const sb = window.sbClient;
      if (sb) {
        const { data, error } = await sb
          .from('works')
          .select('*')
          .order('order', { ascending: true, nullsFirst: true })
          .order('created_at', { ascending: false });
        if (error) throw error;
        const arr = Array.isArray(data) ? data : [];
        return arr;
      }
    } catch (e) {
      console.warn('Supabase works fetch failed, will try localStorage.', e);
    }
    try {
      const raw = localStorage.getItem('adeeb_works');
      const arr = raw ? JSON.parse(raw) : [];
      // local fallback: order by `order` asc, then created_at desc
      return Array.isArray(arr)
        ? arr.slice().sort((a, b) => (a.order ?? 1_000_000) - (b.order ?? 1_000_000) || (new Date(b.created_at || 0) - new Date(a.created_at || 0)))
        : [];
    } catch (e) {
      console.warn('LocalStorage works parse failed.', e);
      return [];
    }
  }

  function renderWorks(list) {
    const wrapper = document.querySelector('.works-swiper .swiper-wrapper');
    if (!wrapper) return;
    wrapper.innerHTML = '';
    list.forEach((item) => {
      const image = item.image || item.image_url || '';
      const title = item.title || '';
      const category = item.category || '';
      const link = item.link || item.link_url || '';
      const slide = document.createElement('div');
      slide.className = 'work-card swiper-slide';
      slide.innerHTML = `
        <div class="work-img-container">
          ${category ? `<span class="work-category">${category}</span>` : ''}
          <img alt="${title}" class="work-img" src="${image}" />
        </div>
        <div class="work-info">
          <h3>${title}</h3>
          ${link ? `<a class="work-link" href="${link}" target="_blank">استكشف <i class=\"fas fa-arrow-left\"></i></a>` : ''}
        </div>`;
      wrapper.appendChild(slide);
    });
  }

  // Unified Swiper configuration helper
  function buildUnifiedSwiperConfig(containerSelector, slidesCount) {
    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return {
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
        nextEl: `${containerSelector} .swiper-button-next`,
        prevEl: `${containerSelector} .swiper-button-prev`,
      },
    };
  }

  let worksSwiperInstance = null;
  function initWorksSwiper() {
    if (worksSwiperInstance && typeof worksSwiperInstance.destroy === 'function') {
      worksSwiperInstance.destroy(true, true);
    }
    const selector = '.works-swiper';
    const slidesCount = document.querySelectorAll(`${selector} .swiper-slide`).length;
    worksSwiperInstance = new Swiper(selector, buildUnifiedSwiperConfig(selector, slidesCount));
  }

  async function loadWorksSection() {
    const data = await fetchWorks();
    renderWorks(data);
    initWorksSwiper();
  }

  // Kick off dynamic works rendering
  loadWorksSection();

  // Board Members (المجلس الإداري) - Dynamic Render
  async function fetchBoardMembers() {
    try {
      const sb = window.sbClient;
      if (sb) {
        const { data, error } = await sb
          .from('board_members')
          .select('*')
          .order('order', { ascending: true, nullsFirst: true })
          .order('created_at', { ascending: false });
        if (error) throw error;
        const arr = Array.isArray(data) ? data : [];
        return arr;
      }
    } catch (e) {
      console.warn('Supabase board fetch failed, will try localStorage.', e);
    }
    try {
      const raw = localStorage.getItem('adeeb_board');
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr)
        ? arr.slice().sort((a, b) => (a.order ?? 1_000_000) - (b.order ?? 1_000_000) || (new Date(b.created_at || 0) - new Date(a.created_at || 0)))
        : [];
    } catch (e) {
      console.warn('LocalStorage board parse failed.', e);
      return [];
    }
  }

  function renderBoardMembers(list) {
    const wrapper = document.querySelector('.board-swiper .swiper-wrapper');
    if (!wrapper) return;
    wrapper.innerHTML = '';
    list.forEach((m) => {
      const img = m.image || m.image_url || '';
      const name = m.name || '';
      const pos = m.position || '';
      const twitter = m.twitter || m.twitter_url || '';
      const linkedin = m.linkedin || m.linkedin_url || '';
      const email = m.email || '';
      const slide = document.createElement('div');
      slide.className = 'board-card swiper-slide';
      slide.innerHTML = `
        <div class="board-img-container">
          <img alt="عضو المجلس الإداري" class="board-img" src="${img}" />
        </div>
        <div class="board-info">
          <h3>${name}</h3>
          ${pos ? `<span class=\"board-position\">${pos}</span>` : ''}
        </div>
        <div class="social-links-Administrators">
          ${twitter ? `<a href=\"${twitter}\" target=\"_blank\"><i class=\"fab fa-twitter\"></i></a>` : ''}
          ${linkedin ? `<a href=\"${linkedin}\" target=\"_blank\"><i class=\"fab fa-linkedin\"></i></a>` : ''}
          ${email ? `<a href=\"mailto:${email}\" target=\"_blank\"><i class=\"fas fa-envelope\"></i></a>` : ''}
        </div>`;
      wrapper.appendChild(slide);
    });
  }

  let boardSwiperInstance = null;
  function initBoardSwiper() {
    if (boardSwiperInstance && typeof boardSwiperInstance.destroy === 'function') {
      boardSwiperInstance.destroy(true, true);
    }
    const selector = '.board-swiper';
    const slidesCount = document.querySelectorAll(`${selector} .swiper-slide`).length;
    boardSwiperInstance = new Swiper(selector, buildUnifiedSwiperConfig(selector, slidesCount));
  }



  async function loadBoardSection() {
    const members = await fetchBoardMembers();
    renderBoardMembers(members);
    initBoardSwiper();
  }

  // Kick off dynamic board rendering
  loadBoardSection();

  // ===================== Testimonials (آراء الأعضاء) - Swiper Init =====================
  let testimonialsSwiperInstance = null;
  function initTestimonialsSwiper() {
    const selector = '.testimonials-swiper';
    const container = document.querySelector(selector);
    if (!container) return;
    if (testimonialsSwiperInstance && typeof testimonialsSwiperInstance.destroy === 'function') {
      testimonialsSwiperInstance.destroy(true, true);
    }
    const slidesCount = container.querySelectorAll('.swiper-slide').length;
    testimonialsSwiperInstance = new Swiper(selector, buildUnifiedSwiperConfig(selector, slidesCount));
  }
  // Cache original testimonials slides and setup filters/animations
  let testimonialsOriginalSlides = [];
  function cacheOriginalTestimonials() {
    const wrapper = document.querySelector('.testimonials-swiper .swiper-wrapper');
    if (!wrapper) return;
    // Cache as HTML strings to allow clean rebuilds
    testimonialsOriginalSlides = Array.from(wrapper.querySelectorAll('.swiper-slide')).map((el) => el.outerHTML);
  }

  function rebuildTestimonialsSlides(filterFn) {
    const wrapper = document.querySelector('.testimonials-swiper .swiper-wrapper');
    if (!wrapper || !testimonialsOriginalSlides.length) return;
    // Destroy current swiper before DOM mutations
    if (testimonialsSwiperInstance && typeof testimonialsSwiperInstance.destroy === 'function') {
      testimonialsSwiperInstance.destroy(true, true);
    }

    const temp = document.createElement('div');
    temp.innerHTML = testimonialsOriginalSlides.join('');
    const allSlides = Array.from(temp.children);
    const filtered = typeof filterFn === 'function' ? allSlides.filter(filterFn) : allSlides;

    // Rebuild wrapper with filtered slides
    wrapper.innerHTML = '';
    filtered.forEach((slide) => wrapper.appendChild(slide));

    // Re-init swiper
    initTestimonialsSwiper();
    // Re-attach animations for new cards
    initTestimonialCardsObserver();
    // Update rating summary after rebuild
    updateTestimonialsSummary();
  }

  // IntersectionObserver animations for testimonial cards
  let testimonialCardsObserver = null;
  function initTestimonialCardsObserver() {
    const cards = document.querySelectorAll('.testimonial-card');
    if (!cards.length) return;
    if (!testimonialCardsObserver) {
      testimonialCardsObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            testimonialCardsObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.2, rootMargin: '0px 0px -10% 0px' });
    }
    cards.forEach((card) => testimonialCardsObserver.observe(card));
  }

  // --- Dynamic Rating Summary ---
  function arabicReviewsLabel(n) {
    if (n === 0) return '0 تقييم';
    if (n === 1) return 'تقييم واحد';
    if (n === 2) return 'تقييمان';
    if (n >= 3 && n <= 10) return `${n} تقييمات`;
    return `${n} تقييمًا`;
  }

  function buildStarsHTML(avg) {
    const stars = [];
    const full = Math.floor(avg);
    const fraction = avg - full;
    const half = fraction >= 0.25 && fraction < 0.75 ? 1 : 0;
    const extraFull = fraction >= 0.75 ? 1 : 0;
    const totalFull = Math.min(5, full + extraFull);
    for (let i = 0; i < totalFull; i++) stars.push('<i class="fa-solid fa-star"></i>');
    if (half && stars.length < 5) stars.push('<i class="fa-solid fa-star-half-stroke"></i>');
    while (stars.length < 5) stars.push('<i class="fa-regular fa-star"></i>');
    return stars.join('');
  }

  // --- Generic Animated Counter (supports decimals) ---
  let avgRatingObserver = null;
  const avgAnimatingMap = new WeakMap();

  function resetCounter(el, decimals = 0) {
    const zero = (0).toFixed(decimals);
    el.textContent = zero;
  }

  function animateCounter(el, target, { duration = 2000, decimals = 0 } = {}) {
    const startTime = performance.now();
    const t = Number(target);
    avgAnimatingMap.set(el, true);

    function easeOutCubic(p) { return 1 - Math.pow(1 - p, 3); }

    function step(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = easeOutCubic(progress);
      const value = t * eased;
      el.textContent = value.toFixed(decimals);
      if (progress < 1 && avgAnimatingMap.get(el)) {
        requestAnimationFrame(step);
      } else {
        el.textContent = t.toFixed(decimals);
        avgAnimatingMap.set(el, true);
      }
    }

    requestAnimationFrame(step);
  }

  function initAvgRatingCounter(decimals = 1) {
    const el = document.querySelector('.rating-summary .average-rating');
    if (!el) return;

    // Create observer once
    if (!avgRatingObserver) {
      avgRatingObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const node = entry.target;
          if (entry.isIntersecting) {
            if (!avgAnimatingMap.get(node)) {
              // reset and animate to target
              resetCounter(node, decimals);
              const target = Number(node.dataset.target || node.textContent || 0);
              animateCounter(node, target, { duration: 2000, decimals });
            }
          } else {
            // allow re-animate when leaves viewport
            avgAnimatingMap.set(node, false);
          }
        });
      }, { threshold: 0.6, rootMargin: '0px 0px -10% 0px' });
    }

    avgRatingObserver.observe(el);
  }

  function updateTestimonialsSummary() {
    const summary = document.querySelector('.rating-summary');
    if (!summary) return;
    const avgEl = summary.querySelector('.average-rating');
    const starsEl = summary.querySelector('.testimonial-stars');
    const totalEl = summary.querySelector('.total-reviews');

    const slides = Array.from(document.querySelectorAll('.testimonials-swiper .swiper-wrapper > .swiper-slide'))
      .filter((el) => !el.classList.contains('swiper-slide-duplicate'));
    const ratings = slides.map((s) => Number(s.getAttribute('data-rating'))).filter((n) => !Number.isNaN(n));
    const count = ratings.length;
    if (!count) return;
    const sum = ratings.reduce((a, b) => a + b, 0);
    const avg = Math.round((sum / count) * 10) / 10; // 1 decimal

    if (avgEl) {
      // Store target and prepare animated counter
      const targetStr = avg.toFixed(1);
      avgEl.dataset.target = targetStr;
      // Reset display if not animated yet
      if (!avgAnimatingMap.get(avgEl)) {
        resetCounter(avgEl, 1);
      }
    }
    if (starsEl) {
      starsEl.setAttribute('aria-label', `${avg.toFixed(1)} من 5`);
      starsEl.innerHTML = buildStarsHTML(avg);
    }
    if (totalEl) totalEl.textContent = `بناءً على ${arabicReviewsLabel(count)}`;
    // Initialize observer-driven counter (once)
    initAvgRatingCounter(1);
  }

  // Initialize testimonials on load
  cacheOriginalTestimonials();
  initTestimonialsSwiper();
  initTestimonialCardsObserver();
  updateTestimonialsSummary();

  // Work Cards Animation - Removed

  // استبدال قسم Achievements Counter Animation بالكود التالي:

  // Achievements Counter Animation (بدون GSAP)

  // استبدال كود العداد الحالي بهذا الكود المحسن
  // عدّادات متحركة تعمل كلما ظهرت كروت الإنجازات للمستخدم (لكل كرت على حدة)
  let achievementNumObserver = null;
  const achievementsAnimatingMap = new WeakMap(); // el -> boolean

  function initAchievementCounters() {
    const numbers = document.querySelectorAll('#achievements .achievement-number');
    if (!numbers.length) return;

    // أنشئ مراقب العناصر إن لم يكن موجودًا
    if (!achievementNumObserver) {
      achievementNumObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const el = entry.target;
          if (entry.isIntersecting) {
            // عند رؤية العنصر: أعدّه للصفر ثم ابدأ عدّه فقط إذا لم يكن قيد التشغيل
            if (!achievementsAnimatingMap.get(el)) {
              resetAchievementCounter(el);
              animateAchievementCounter(el);
            }
          } else {
            // عند الخروج: اسمح بإعادة التشغيل في المرة القادمة
            achievementsAnimatingMap.set(el, false);
          }
        });
      }, { threshold: 0.6, rootMargin: '0px 0px -10% 0px' });
    }

    // اربط جميع الأرقام بالمراقب (يشمل العناصر الجديدة بعد إعادة الرسم)
    numbers.forEach((el) => {
      achievementNumObserver.observe(el);
    });
  }

  // تشغيل عدّاد عنصر واحد
  function animateAchievementCounter(el) {
    const target = Number(el.dataset.count || el.textContent.replace(/\D/g, '') || 0);
    const duration = 3000; // ms
    const startTime = performance.now();
    achievementsAnimatingMap.set(el, true);

    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

    function tick(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = easeOutCubic(progress);
      const value = Math.floor(target * eased);
      el.textContent = Number(value).toLocaleString();

      if (progress < 1 && achievementsAnimatingMap.get(el)) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = Number(target).toLocaleString();
        // تظل True حتى يخرج العنصر من الشاشة، حينها نعيدها False في المراقب
        achievementsAnimatingMap.set(el, true);
      }
    }

    requestAnimationFrame(tick);
  }

  // إعادة ضبط عدّاد عنصر واحد
  function resetAchievementCounter(el) {
    el.textContent = '0';
  }

  // ===================== Achievements (الإنجازات) - Dynamic Render =====================
  async function fetchAchievements() {
    try {
      const sb = window.sbClient;
      if (sb) {
        const { data, error } = await sb
          .from('achievements')
          .select('*')
          .order('order', { ascending: true, nullsFirst: false });
        if (error) throw error;
        return Array.isArray(data) ? data : [];
      }
    } catch (e) {
      console.warn('Supabase achievements fetch failed, will try localStorage.', e);
    }
    try {
      const raw = localStorage.getItem('adeeb_achievements');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('LocalStorage achievements parse failed.', e);
      return [];
    }
  }

  function renderAchievementsSection(list) {
    const grid = document.querySelector('.achievements-grid');
    if (!grid) return;
    if (!list || list.length === 0) return; // اترك القسم فارغاً إن لم توجد بيانات

    grid.innerHTML = '';
    list.forEach((a) => {
      const icon = a.icon_class || a.icon || 'fa-solid fa-trophy';
      const label = a.label || '';
      const count = typeof a.count_number === 'number' ? a.count_number : (typeof a.count === 'number' ? a.count : Number(a.count_number || a.count || 0));
      const plus = typeof a.plus_flag === 'boolean' ? a.plus_flag : (typeof a.plus === 'boolean' ? a.plus : true);

      const card = document.createElement('div');
      card.className = 'achievement-card';
      card.innerHTML = `
        <div class="achievement-icon">
          <i class="${icon}"></i>
        </div>
        <span class="achievement-number" data-count="${count}">0</span>
        ${plus ? '<span class="plus-sign">+</span>' : ''}
        <p class="achievement-text">${label}</p>
      `;
      grid.appendChild(card);
    });
    // لا تأثيرات hover أو دخول
  }

  async function loadAchievementsSection() {
    const list = await fetchAchievements();
    renderAchievementsSection(list);
    // بعد الرسم الديناميكي، فعّل مراقبة الظهور لتشغيل العدادات
    initAchievementCounters();
  }

  // Kick off dynamic achievements rendering
  loadAchievementsSection();

  // لا مراقبة تمرير لقسم الإنجازات — القيم ثابتة بدون تأثيرات

  // لا تأثيرات hover لقسم الإنجازات

  // Update copyright year
  document.getElementById("year").textContent = new Date().getFullYear();

  // Back to top button
  const backToTopBtn = document.getElementById("back-to-top");
  backToTopBtn.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });

  // Show/hide back to top button based on scroll position
  window.addEventListener("scroll", () => {
    if (window.pageYOffset > 300) {
      backToTopBtn.style.opacity = "1";
      backToTopBtn.style.visibility = "visible";
    } else {
      backToTopBtn.style.opacity = "0";
      backToTopBtn.style.visibility = "hidden";
    }
  });

  // Initialize tooltips for social icons
  const socialIcons = document.querySelectorAll(".social-icon");
  socialIcons.forEach((icon) => {
    icon.addEventListener("mouseenter", function () {
      const tooltip = this.querySelector(".social-wave");
      tooltip.style.top = "0";
    });

    icon.addEventListener("mouseleave", function () {
      const tooltip = this.querySelector(".social-wave");
      tooltip.style.top = "100%";
    });
  });

  // Enhanced Chat Assistant
  const chatAssistant = document.querySelector(".chat-assistant");
  const chatIcon = document.querySelector(".chat-icon");
  const chatBox = document.querySelector(".chat-box");
  const closeChat = document.querySelector(".close-chat");
  const chatMessages = document.querySelector(".chat-messages");
  const chatInput = document.querySelector(".chat-input-area input");
  const sendBtn = document.querySelector(".send-btn");
  const attachBtn = document.querySelector(".attach-btn");
  const typingIndicator = document.querySelector(".typing-indicator");

  // Toggle chat box
  chatIcon.addEventListener("click", () => {
    chatAssistant.classList.add("active");
    document.querySelector(".notification-badge").style.display = "none";
    chatInput.focus();

    // ✅ الرسالة الترحيبية بعد فتح الشات لأول مرة
    if (!chatAssistant.dataset.welcomed) {
      setTimeout(() => {
        addMessage("أهلاً أهلاً منور موقعنا!🤩<br>كيف أقدر أساعدك؟🤔", "bot");
        chatAssistant.dataset.welcomed = "true";
      }, 700); // نصف ثانية بعد فتح الشات
    }
  });

  closeChat.addEventListener("click", () => {
    chatAssistant.classList.remove("active");
  });

  // Sample questions for quick replies
  const quickQuestions = [
    "شنو هو أدِيب🤔",
    "كيف أصير في أدِيب🪶",
    "شنو هي لجان النادي📃",
    "كيف مُمكن أتواصل معكم💬",
  ];

  // Bot responses
  const botResponses = {
    "شنو هو أدِيب🤔": "نادي طلابي في جامعة الملك فيصل.",
    "كيف أصير في أدِيب🪶": "نفتح التسجيل كل سمستر دراسي.",
    "شنو هي لجان النادي📃":
      "لجان نادي أديب:\n- لجنة التأليف\n- لجنة الرواة\n- لجنة الفعاليات\n- لجنة السفراء\n- لجنة الإنتاج\n- لجنة التسويق\n- لجنة التصميم\n\nيمكنك الانضمام لأي لجنة تناسب مهاراتك.",
    "كيف مُمكن أتواصل معكم💬":
      "مقر نادي أديب:\nجامعة الملك فيصل - عمادة شؤون الطلاب\nالأحساء، المملكة العربية السعودية\n\nساعات العمل: من الأحد إلى الخميس، 8 صباحاً إلى 3 مساءً.",
  };

  // Send message function
  function sendMessage() {
    const message = chatInput.value.trim();
    if (message) {
      // Add user message
      addMessage(message, "user");
      chatInput.value = "";

      // Show typing indicator
      typingIndicator.classList.add("active");

      // Simulate bot typing delay
      setTimeout(
        () => {
          typingIndicator.classList.remove("active");

          // Check if message matches any quick question
          let botResponse =
            botResponses[message] ||
            "شُكرًا لرسالتك☺️ <br><br> تقدر تسألني عن: <br> - شنو هو أدِيب🤔 <br> - كيف أصير في أدِيب🪶 <br> - شنو هي لجان النادي📃 <br> - كيف مُمكن أتواصل معكم💬 <br>";

          // Add bot response
          addMessage(botResponse, "bot");

          // Add quick questions if it's a generic response
          if (!botResponses[message]) {
            setTimeout(() => {
              addQuickQuestions();
            }, 500);
          }
        },
        1500 + Math.random() * 2000
      ); // Random delay between 1.5-3.5 seconds
    }
  }

  // Add quick reply buttons
  function addQuickQuestions() {
    const quickReplies = document.createElement("div");
    quickReplies.classList.add("quick-replies");

    quickQuestions.forEach((question) => {
      const btn = document.createElement("button");
      btn.classList.add("quick-reply-btn");
      btn.textContent = question;
      btn.addEventListener("click", () => {
        chatInput.value = question;
        sendMessage();
        quickReplies.remove();
      });
      quickReplies.appendChild(btn);
    });

    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", "bot-message");
    messageDiv.appendChild(quickReplies);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Add message to chat
  function addMessage(text, sender) {
    const now = new Date();
    const timeString = now.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });

    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", `${sender}-message`);

    const messageContent = document.createElement("div");
    messageContent.classList.add("message-content");
    messageContent.innerHTML = `<p>${text.replace(/\n/g, "<br>")}</p>`;

    const messageTime = document.createElement("div");
    messageTime.classList.add("message-time");
    messageTime.textContent = timeString;

    messageDiv.appendChild(messageContent);
    messageDiv.appendChild(messageTime);

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Send message on button click or Enter key
  sendBtn.addEventListener("click", sendMessage);
  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  });

  // Play notification sound
  function playNotificationSound() {
    const audio = new Audio(
      "https://assets.mixkit.co/sfx/preview/mixkit-positive-interface-beep-221.mp3"
    );
    audio.volume = 0.3;
    audio.play().catch((e) => console.log("Audio play failed:", e));
  }

  // Show welcome message after 5 seconds if chat hasn't been opened
  setTimeout(() => {
    if (!chatAssistant.classList.contains("active")) {
      document.querySelector(".notification-badge").style.display = "flex";
      playNotificationSound();
    }
  }, 5000);

  // ===================== Sponsors (شركاء النجاح) - Dynamic Render =====================
  async function fetchSponsors() {
    try {
      const sb = window.sbClient;
      if (sb) {
        const { data, error } = await sb
          .from('sponsors')
          .select('*')
          .order('order', { ascending: true, nullsFirst: true })
          .order('created_at', { ascending: false });
        if (error) throw error;
        const arr = Array.isArray(data) ? data : [];
        return arr;
      }
    } catch (e) {
      console.warn('Supabase sponsors fetch failed, will try localStorage.', e);
    }
    try {
      const raw = localStorage.getItem('adeeb_sponsors');
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr)
        ? arr.slice().sort((a, b) => (a.order ?? 1_000_000) - (b.order ?? 1_000_000) || (new Date(b.created_at || 0) - new Date(a.created_at || 0)))
        : [];
    } catch (e) {
      console.warn('LocalStorage sponsors parse failed.', e);
      return [];
    }
  }

  function badgeClassFromText(txt) {
    if (!txt) return '';
    const t = (txt + '').toLowerCase();
    if (t.includes('ذه') || t.includes('gold')) return 'gold';
    if (t.includes('فض') || t.includes('silver')) return 'silver';
    if (t.includes('برون') || t.includes('bronze')) return 'bronze';
    return '';
  }

  function renderSponsors(list) {
    const wrapper = document.querySelector('.sponsors-swiper .swiper-wrapper');
    if (!wrapper) return;
    wrapper.innerHTML = '';
    list.forEach((item) => {
      const logo = item.logo || item.logo_url || '';
      const name = item.name || '';
      const desc = item.description || '';
      const link = item.link || item.link_url || '';
      const badge = item.badge || '';
      const badgeClass = badgeClassFromText(badge);
      const slide = document.createElement('div');
      slide.className = 'sponsor-card swiper-slide';
      slide.innerHTML = `
        ${badge ? `<div class="sponsor-badge ${badgeClass}">${badge}</div>` : ''}
        <div class="sponsor-img-container">
          <img alt="${name}" class="sponsor-img" src="${logo}" />
        </div>
        <div class="sponsor-info">
          <h3>${name}</h3>
          ${desc ? `<p>${desc}</p>` : ''}
          ${link ? `<a class="sponsor-link" href="${link}" target="_blank">زيارة الموقع <i class="fas fa-arrow-left"></i></a>` : ''}
        </div>`;
      wrapper.appendChild(slide);
    });
  }

  let sponsorsSwiperInstance = null;
  function initSponsorsSwiper() {
    if (sponsorsSwiperInstance && typeof sponsorsSwiperInstance.destroy === 'function') {
      sponsorsSwiperInstance.destroy(true, true);
    }
    const selector = '.sponsors-swiper';
    const slidesCount = document.querySelectorAll(`${selector} .swiper-slide`).length;
    sponsorsSwiperInstance = new Swiper(selector, buildUnifiedSwiperConfig(selector, slidesCount));
  }



  async function loadSponsorsSection() {
    const data = await fetchSponsors();
    renderSponsors(data);
    initSponsorsSwiper();
  }

  // Kick off dynamic sponsors rendering
  loadSponsorsSection();

  // ===================== FAQ (الأسئلة الشائعة) - Dynamic Render =====================
  async function fetchFaq() {
    try {
      const sb = window.sbClient;
      if (sb) {
        const { data, error } = await sb.from('faq').select('*').order('order', { ascending: true });
        if (error) throw error;
        return Array.isArray(data) ? data : [];
      }
    } catch (e) {
      console.warn('Supabase faq fetch failed, will try localStorage.', e);
    }
    try {
      const raw = localStorage.getItem('adeeb_faq');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('LocalStorage faq parse failed.', e);
      return [];
    }
  }

  function renderFaq(list) {
    const accordion = document.querySelector('.faq-accordion');
    if (!accordion) return;
    
    // If no FAQ data, keep the static content
    if (!list || list.length === 0) return;
    
    // Clear existing content and render dynamic FAQ
    accordion.innerHTML = '';
    list.forEach((item, index) => {
      const faqItem = document.createElement('div');
      faqItem.className = 'faq-item';
      faqItem.innerHTML = `
        <div class="faq-question">
          <h3>${item.question || ''}</h3>
          <i class="fas fa-chevron-down"></i>
        </div>
        <div class="faq-answer">
          <p>${(item.answer || '').replace(/\n/g, '<br>')}</p>
        </div>`;
      accordion.appendChild(faqItem);
    });
    
    // Re-initialize FAQ accordion functionality
    initFaqAccordion();
  }

  function initFaqAccordion() {
    document.querySelectorAll(".faq-question").forEach((question) => {
      // Remove existing event listeners
      question.replaceWith(question.cloneNode(true));
    });
    
    document.querySelectorAll(".faq-question").forEach((question) => {
      question.addEventListener("click", () => {
        const faqItem = question.parentElement;
        const isActive = faqItem.classList.contains("active");

        // إغلاق جميع العناصر أولاً
        document.querySelectorAll(".faq-item").forEach((item) => {
          item.classList.remove("active");
        });

        // إذا لم يكن العنصر نشطاً، افتحه
        if (!isActive) {
          faqItem.classList.add("active");
        }
      });
    });
  }

  async function loadFaqSection() {
    const data = await fetchFaq();
    renderFaq(data);
  }

  // Kick off dynamic FAQ rendering
  loadFaqSection();

  const scriptURLform =
    "https://script.google.com/macros/s/AKfycbwW--KhgxMltR6sko0Fl8ENJ9gwGlUWRfdsG6e_-8pGXFGxtGlJA00rcLf69hMV-sjm/exec";
  const formform = document.forms["contactForm"];

  // إرسال النموذج مع تأثيرات متقدمة
  formform.addEventListener("submit", async (e) => {
    e.preventDefault();

    // رسالة تحميل متحركة
    const loadingAlert = Swal.fire({
      html: `<div style="font-family:'fm';color:#274060;margin-top:15px">جاري معالجة طلبك...</div>
          <div class="progress-bar" style="height:6px;background:#f1f5f9;border-radius:3px;margin-top:20px;overflow:hidden">
            <div class="progress" style="height:100%;width:0%;background:linear-gradient(90deg,#3d8fd6,#274060);transition:width 0.4s ease"></div>
          </div>`,
      showConfirmButton: false,
      allowOutsideClick: false,
      didOpen: () => {
        // تأثير شريط التقدم
        const progressBar = document.querySelector(".progress");
        let width = 0;
        const interval = setInterval(() => {
          width += 5;
          progressBar.style.width = width + "%";
          if (width >= 90) clearInterval(interval);
        }, 200);
      },
    });

    try {
      const response = await fetch(scriptURLform, {
        method: "POST",
        body: new FormData(formform),
      });

      // إغلاق رسالة التحميل
      await Swal.close();

      if (response.ok) {
        // رسالة نجاح متحركة
        Swal.fire({
          html: `<div style="margin-top:20px">
            <h3 style="font-family:'fbb';color:#274060">تم الإرسال بنجاح!</h3>
            <p style="font-family:'fr';color:#64748b">سيتم الرد عليك خلال 24 ساعة</p>
          </div>`,
          showConfirmButton: true,
          confirmButtonText: "حسناً",
          icon: "success",
          timer: 5000,
          timerProgressBar: true,
          willClose: () => {
            formform.reset();
          },
        });
      } else {
        throw new Error("فشل في إرسال النموذج");
      }
    } catch (error) {
      await Swal.close();
      // رسالة خطأ متحركة
      Swal.fire({
        title: '<i class="fas fa-times-circle" style="color:#f27474;font-size:60px"></i>',
        html: `<div style="margin-top:20px">
            <h3 style="font-family:'fbb';color:#274060">حدث خطأ!</h3>
            <p style="font-family:'fr';color:#64748b">${error.message || "يرجى المحاولة مرة أخرى لاحقًا"}</p>
          </div>`,
        confirmButtonText: "حاول مرة أخرى",
        showCancelButton: true,
        cancelButtonText: "إلغاء",
      });
    }
  });

  const scriptURL =
    "https://script.google.com/macros/s/AKfycbzEr92YPUxGOant4pbvI5NEqStWJ1APtHg1jwa3a3Z9vovUmC5XbkjVlxzVDi6ufi7-bA/exec";
  const form = document.forms["newsletterForm"];

  // إرسال النموذج مع تأثيرات متقدمة
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // رسالة تحميل متحركة
    const loadingAlert = Swal.fire({
      html: `<div style="font-family:'fm';color:#274060;margin-top:15px">جاري معالجة طلبك...</div>
        <div class="progress-bar" style="height:6px;background:#f1f5f9;border-radius:3px;margin-top:20px;overflow:hidden">
          <div class="progress" style="height:100%;width:0%;background:linear-gradient(90deg,#3d8fd6,#274060);transition:width 0.4s ease"></div>
        </div>`,
      showConfirmButton: false,
      allowOutsideClick: false,
      didOpen: () => {
        // تأثير شريط التقدم
        const progressBar = document.querySelector(".progress");
        let width = 0;
        const interval = setInterval(() => {
          width += 5;
          progressBar.style.width = width + "%";
          if (width >= 90) clearInterval(interval);
        }, 200);
      },
    });

    try {
      const response = await fetch(scriptURL, {
        method: "POST",
        body: new FormData(form),
      });

      // إغلاق رسالة التحميل
      await Swal.close();

      if (response.ok) {
        // رسالة نجاح متحركة
        Swal.fire({
          html: `<div style="margin-top:20px">
          <h3 style="font-family:'fbb';color:#274060">تمّ الإشتراك بِنجاح!🥳</h3>
          <p style="font-family:'fr';color:#64748b">ستصلك النشرة البريدية</p>
        </div>`,
          showConfirmButton: true,
          confirmButtonText: "حسناً",
          icon: "success",
          timer: 5000,
          timerProgressBar: true,
          willClose: () => {
            form.reset();
          },
        });
      } else {
        throw new Error("فشل في إرسال النموذج");
      }
    } catch (error) {
      await Swal.close();
      // رسالة خطأ متحركة
      Swal.fire({
        title: '<i class="fas fa-times-circle" style="color:#f27474;font-size:60px"></i>',
        html: `<div style="margin-top:20px">
          <h3 style="font-family:'fbb';color:#274060">حدث خطأ!</h3>
          <p style="font-family:'fr';color:#64748b">${error.message || "يرجى المحاولة مرة أخرى لاحقًا"}</p>
        </div>`,
        confirmButtonText: "حاول مرة أخرى",
        showCancelButton: true,
        cancelButtonText: "إلغاء",
      });
    }
  });

  // Handle Join Us Button Click
  document.getElementById("joinBtn").addEventListener("click", function (e) {
    e.preventDefault();

    Swal.fire({
      title: "<span style=\"font-family:'fbb';color:#274060\">انضم إلى أدِيب</span>",
      html: `
      <div style="font-family:'fr';color:#64748b;margin-bottom:20px">
        اختر الطريقة التي تريد الانضمام بها إلى مجتمع أدِيب
      </div>
      <div style="display:flex;flex-direction:column;gap:15px;margin-top:20px">
        <button id="registerBtn" style="
          background: linear-gradient(135deg, #3d8fd6, #274060);
          color: white;
          border: none;
          padding: 12px;
          border-radius: 8px;
          font-family: 'fb';
          cursor: pointer;
          transition: all 0.3s ease;
        ">
          التسجيل في العضوية
        </button>
        <button id="loginBtn" style="
          background: white;
          color: #274060;
          border: 1px solid #3d8fd6;
          padding: 12px;
          border-radius: 8px;
          font-family: 'fb';
          cursor: pointer;
          transition: all 0.3s ease;
        ">
          تسجيل الدخول
        </button>
      </div>
    `,
      showConfirmButton: false,
      showCancelButton: false,
      customClass: {
        popup: "custom-swal-popup",
      },
      didOpen: () => {
        // Handle Register Button Click
        document.getElementById("registerBtn").addEventListener("click", function () {
          Swal.fire({
            title: "<span style=\"font-family:'fbb';color:#274060\">التسجيل مغلق حالياً</span>",
            html: "<div style=\"font-family:'fr';color:#64748b\">سيتم فتح باب التسجيل قريباً في بداية الفصل الدراسي القادم.<br><br>تابعنا على وسائل التواصل الاجتماعي لمعرفة المواعيد.</div>",
            icon: "info",
            confirmButtonText: "حسناً",
            confirmButtonColor: "#3d8fd6",
          });
        });

        // Handle Login Button Click
        document.getElementById("loginBtn").addEventListener("click", function () {
          window.location.href = "/admin/admin.html"; // تغيير هذا الرابط حسب صفحة تسجيل الدخول الخاصة بك
        });
      },
    });
  });
});

// Sponsors Swiper and animations are initialized dynamically after data render

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

// ======================== تأثيرات Scroll لبقية الأقسام (بدون GSAP) ========================


// استدعاء المراقب بعد زمن قصير لضمان تهيئة العناصر (بعد Swiper)
setTimeout(observeWorksSection, 500);

// تأثير تمرير لقسم الرعاة
// Moved to attachSponsorAnimations() which runs after dynamic render

// إضافة هذا الكود لمعالجة نموذج التواصل
document.getElementById("contactForm").addEventListener("submit", function (e) {
  e.preventDefault();

  // جمع بيانات النموذج
  const formData = {
    name: document.getElementById("name").value,
    email: document.getElementById("email").value,
    subject: document.getElementById("subject").value,
    message: document.getElementById("message").value,
  };

  // هنا يمكنك إضافة كود إرسال البيانات إلى الخادم
  console.log("تم إرسال النموذج:", formData);

  // عرض رسالة نجاح
  Swal.fire({
    title: "تم الإرسال بنجاح!",
    text: "شكراً لتواصلك معنا، سنرد عليك في أقرب وقت ممكن.",
    icon: "success",
    confirmButtonText: "حسناً",
    confirmButtonColor: "#3d8fd6",
  });

  // إعادة تعيين النموذج
  this.reset();
});


// إضافة هذا الكود لمعالجة نموذج النشرة البريدية
document.getElementById("newsletterForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const emailInput = this.querySelector('input[type="email"]');
  const email = emailInput.value;

  // هنا يمكنك إضافة كود إرسال البيانات إلى الخادم
  console.log("تم الاشتراك بنجاح:", email);

  // عرض رسالة نجاح
  Swal.fire({
    title: "تم الاشتراك بنجاح!",
    text: "شكراً لانضمامك إلى مجتمعنا، ستتلقى آخر الأخبار والعروض الحصرية قريباً.",
    icon: "success",
    confirmButtonText: "حسناً",
    confirmButtonColor: "#3d8fd6",
  });

  // إعادة تعيين النموذج
  this.reset();
});






















































