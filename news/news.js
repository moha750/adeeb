// ===== News Page JavaScript =====

// Get Supabase client
const sb = window.sbClient;

let allNews = [];
let featuredNews = [];
let currentFilter = 'all';
let displayedCount = 6;
const loadMoreIncrement = 6;

// متغيرات جديدة لتخزين الإحصائيات ومنع تكرار الطلبات
let cachedStats = null;
let isFetchingStats = false;

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  await loadNews();
  setupEventListeners();
  setupStatsObserver();
  setupHeaderColorChange();
  
  // (اختياري) يمكنك جلب الإحصائيات مسبقاً في الخلفية هنا ليكون العداد جاهزاً 100% 
  // عند وصول المستخدم للقسم:
  // fetchStatsInBackground();
});

// Setup Intersection Observer for stats animation
function setupStatsObserver() {
  const newsHeroSection = document.querySelector('.news-hero');
  if (!newsHeroSection) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // عند الدخول للقسم، شغل الأنيميشن
        updateStats();
      }
    });
  }, {
    threshold: 0.3 // يبدأ الأنيميشن عندما 30% من القسم يكون مرئياً
  });

  observer.observe(newsHeroSection);
}

// Change header color on dark sections .footer-container
function setupHeaderColorChange() {
  const header = document.querySelector('.header');
  // جلب جميع الأقسام الداكنة
  const darkSections = document.querySelectorAll('.news-hero, footer, .footer');
  
  if (!header || darkSections.length === 0) return;

  // هذه الدالة تتحقق من موقع الهيدر في كل مرة نقوم فيها بالتمرير
  function checkHeaderOverlap() {
    // 1. حساب موقع الهيدر (سنأخذ منتصف الهيدر كنقطة قياس ليكون التغيير طبيعياً)
    const headerRect = header.getBoundingClientRect();
    const headerCenter = headerRect.top + (headerRect.height / 2);

    let isOverDarkSection = false;

    // 2. المرور على كل الأقسام الداكنة لمعرفة ما إذا كان الهيدر فوقها
    darkSections.forEach(section => {
      const sectionRect = section.getBoundingClientRect();
      
      // هل منتصف الهيدر يقع بين أعلى القسم الداكن وأسفله؟
      if (headerCenter >= sectionRect.top && headerCenter <= sectionRect.bottom) {
        isOverDarkSection = true;
      }
    });

    // 3. تطبيق النتيجة
    if (isOverDarkSection) {
      header.classList.add('on-dark'); // الهيدر فوق قسم داكن (أبيض)
    } else {
      header.classList.remove('on-dark'); // الهيدر فوق قسم فاتح (داكن)
    }
  }

  // تشغيل الدالة عند التمرير
  window.addEventListener('scroll', checkHeaderOverlap);
  
  // تشغيل الدالة مرة واحدة عند تحميل الصفحة لضبط اللون الأولي
  checkHeaderOverlap();
}

// Update statistics with animation and caching
async function updateStats() {
  try {
    // إذا كانت البيانات موجودة مسبقاً، ابدأ العداد فوراً
    if (cachedStats) {
      startStatsAnimation();
      return;
    }

    // لمنع إرسال طلبات متعددة في نفس الوقت إذا تم استدعاء الدالة بسرعة
    if (isFetchingStats) return;
    isFetchingStats = true;

    // Get total news count
    const { count: newsCount } = await sb
      .from('news')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published');
    
    // Get news data for views and likes
    const { data: newsData } = await sb
      .from('news')
      .select('views, likes_count')
      .eq('status', 'published');
    
    // Get total comments count
    const { count: commentsCount } = await sb
      .from('news_public_comments')
      .select('*', { count: 'exact', head: true });
    
    // حفظ البيانات في المتغير
    cachedStats = {
      totalNews: newsCount || 0,
      totalViews: newsData?.reduce((sum, n) => sum + (n.views || 0), 0) || 0,
      totalLikes: newsData?.reduce((sum, n) => sum + (n.likes_count || 0), 0) || 0,
      totalComments: commentsCount || 0
    };
    
    isFetchingStats = false;
    
    // تشغيل العداد
    startStatsAnimation();

  } catch (error) {
    console.error('Error updating stats:', error);
    isFetchingStats = false;
  }
}

// دالة لجلب الإحصائيات في الخلفية عند تحميل الصفحة (اختياري)
async function fetchStatsInBackground() {
  if (cachedStats || isFetchingStats) return;
  isFetchingStats = true;
  try {
    const { count: newsCount } = await sb.from('news').select('*', { count: 'exact', head: true }).eq('status', 'published');
    const { data: newsData } = await sb.from('news').select('views, likes_count').eq('status', 'published');
    const { count: commentsCount } = await sb.from('news_public_comments').select('*', { count: 'exact', head: true });
    
    cachedStats = {
      totalNews: newsCount || 0,
      totalViews: newsData?.reduce((sum, n) => sum + (n.views || 0), 0) || 0,
      totalLikes: newsData?.reduce((sum, n) => sum + (n.likes_count || 0), 0) || 0,
      totalComments: commentsCount || 0
    };
  } catch (error) {
    console.error('Background fetch error:', error);
  } finally {
    isFetchingStats = false;
  }
}

// دالة مساعدة لتشغيل العدادات بناءً على البيانات المخزنة
function startStatsAnimation() {
  if (!cachedStats) return;
  animateNumber('totalNews', cachedStats.totalNews);
  animateNumber('totalViews', cachedStats.totalViews);
  animateNumber('totalLikes', cachedStats.totalLikes);
  animateNumber('totalComments', cachedStats.totalComments);
}

// Animate number counting (محسنة لمنع التداخل)
function animateNumber(elementId, targetValue) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  // إيقاف أي أنيميشن سابق يعمل على نفس العنصر
  if (element.animationId) {
    cancelAnimationFrame(element.animationId);
  }
  
  const duration = 2000;
  const startValue = 0;
  const startTime = Date.now();
  
  function update() {
    const currentTime = Date.now();
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // تأثير التباطؤ في نهاية العد (Ease Out Quart)
    const easeOutQuart = 1 - Math.pow(1 - progress, 4);
    const currentValue = Math.floor(startValue + (targetValue - startValue) * easeOutQuart);
    
    element.textContent = currentValue.toLocaleString('en-US');
    
    if (progress < 1) {
      // حفظ معرف الأنيميشن لتتمكن من إيقافه لاحقاً
      element.animationId = requestAnimationFrame(update);
    } else {
      element.textContent = targetValue.toLocaleString('en-US');
      element.animationId = null;
    }
  }
  
  // بدء حركة جديدة
  element.animationId = requestAnimationFrame(update);
}

// Load news from Supabase
async function loadNews() {
  try {
    const newsLoading = document.getElementById('newsLoading');
    const newsEmpty = document.getElementById('newsEmpty');
    const newsGrid = document.getElementById('newsGrid');
    
    newsLoading.style.display = 'block';
    newsEmpty.style.display = 'none';
    newsGrid.innerHTML = '';
    
    // Fetch published news
    const { data, error } = await sb
      .from('news')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false });
    
    if (error) throw error;
    
    allNews = data || [];
    featuredNews = allNews.filter(n => n.is_featured);
    
    newsLoading.style.display = 'none';
    
    if (allNews.length === 0) {
      newsEmpty.style.display = 'block';
      return;
    }
    
    // Show featured news section if there are featured news
    if (featuredNews.length > 0) {
      renderFeaturedNews();
      document.getElementById('featuredNewsSection').style.display = 'block';
    }
    
    // Render all news
    renderNews();
    
  } catch (error) {
    console.error('Error loading news:', error);
    document.getElementById('newsLoading').style.display = 'none';
    document.getElementById('newsEmpty').style.display = 'block';
  }
}

// Render featured news
function renderFeaturedNews() {
  const featuredGrid = document.getElementById('featuredNewsGrid');
  featuredGrid.innerHTML = '';
  
  featuredNews.slice(0, 3).forEach(news => {
    const card = createNewsCard(news, true);
    featuredGrid.appendChild(card);
  });
}

// Render news based on filter
function renderNews() {
  const newsGrid = document.getElementById('newsGrid');
  const loadMoreContainer = document.getElementById('loadMoreContainer');
  
  let filteredNews = [...allNews];
  
  // Apply filter
  if (currentFilter === 'recent') {
    filteredNews.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
  } else if (currentFilter === 'popular') {
    filteredNews.sort((a, b) => (b.views || 0) - (a.views || 0));
  }
  
  // Clear grid
  newsGrid.innerHTML = '';
  
  // Display news
  const newsToDisplay = filteredNews.slice(0, displayedCount);
  newsToDisplay.forEach(news => {
    const card = createNewsCard(news, false);
    newsGrid.appendChild(card);
  });
  
  // Show/hide load more button
  if (filteredNews.length > displayedCount) {
    loadMoreContainer.style.display = 'block';
  } else {
    loadMoreContainer.style.display = 'none';
  }
}

// Create news card element
function createNewsCard(news, isFeatured = false) {
  const card = document.createElement('div');
  card.className = `news-card${isFeatured ? ' featured' : ''}`;
  card.onclick = () => openNewsDetail(news.id, news.slug);
  
  const imageUrl = news.image_url || 'https://via.placeholder.com/400x300?text=أديب';
  const publishedDate = formatDate(news.published_at);
  const authors = news.authors || (news.author_name ? [news.author_name] : ['نادي أديب']);
  const authorsDisplay = authors.length > 1 
    ? escapeHtml(authors[0]) + (authors.length > 1 ? '...' : '')
    : escapeHtml(authors[0]);
  const authorIcon = authors.length > 1 ? 'fa-users' : 'fa-feather';
  const summary = news.summary || truncateText(stripHtml(news.content), 150);
  
  card.innerHTML = `
    <div style="position: relative;">
      <img src="${imageUrl}" alt="${escapeHtml(news.title)}" class="news-card-image" onerror="this.src='https://via.placeholder.com/400x300?text=أديب'">
      ${news.is_featured ? '<div class="news-card-badge"><i class="fas fa-star"></i> مميز</div>' : ''}
    </div>
    <div class="news-card-content">
      <div class="news-card-meta">
        <span class="news-card-meta-item">
          <i class="fas fa-calendar"></i>
          ${publishedDate}
        </span>
        <span class="news-card-meta-item">
          <i class="fas fa-eye"></i>
          ${news.views || 0}
        </span>
      </div>
      <h3 class="news-card-title">${escapeHtml(news.title)}</h3>
      <p class="news-card-summary">${escapeHtml(summary)}</p>
      <div class="news-card-footer">
        <span class="news-card-author" title="${authors.length > 1 ? escapeHtml(authors.join('، ')) : ''}">
          <i class="fa-solid ${authorIcon}"></i>
          ${authors.length > 1 ? 'بريشات' : 'بريشة'} ${authorsDisplay}
        </span>
        <span class="news-card-read-more">
          اقرأ المزيد
          <i class="fas fa-arrow-left"></i>
        </span>
      </div>
    </div>
  `;
  
  return card;
}

// Open news detail page - now uses slug for SEO-friendly URLs
function openNewsDetail(newsIdOrSlug, slug = null) {
  // إذا تم تمرير slug، استخدمه للرابط الصديق لمحركات البحث
  if (slug) {
    window.location.href = `news-detail.html?slug=${encodeURIComponent(slug)}`;
  } else {
    // للتوافق مع الكود القديم، استخدم ID
    window.location.href = `news-detail.html?id=${newsIdOrSlug}`;
  }
}

// OLD: Open news detail modal (kept for reference, not used)
async function openNewsDetailModal(newsId) {
  try {
    const modal = document.getElementById('newsModal');
    const modalBody = document.getElementById('newsModalBody');
    
    // Show loading
    modalBody.innerHTML = '<div class="news-loading"><div class="loading-spinner"></div><p>جاري التحميل...</p></div>';
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Fetch news detail
    const { data: news, error } = await sb
      .from('news')
      .select('*')
      .eq('id', newsId)
      .single();
    
    if (error) throw error;
    
    // Increment views
    await sb
      .from('news')
      .update({ views: (news.views || 0) + 1 })
      .eq('id', newsId);
    
    // Render news detail
    const imageUrl = news.image_url || 'https://via.placeholder.com/900x400?text=أديب';
    const publishedDate = formatDate(news.published_at);
    const authors = news.authors || (news.author_name ? [news.author_name] : ['نادي أديب']);
    const authorsDisplay = authors.length > 1 
      ? `${escapeHtml(authors.join('، '))}` 
      : escapeHtml(authors[0]);
    
    modalBody.innerHTML = `
      ${news.image_url ? `<img src="${imageUrl}" alt="${escapeHtml(news.title)}" class="news-detail-image" onerror="this.style.display='none'">` : ''}
      <div class="news-detail-header">
        <div class="news-detail-meta">
          <span class="news-detail-meta-item">
            <i class="fas fa-calendar"></i>
            ${publishedDate}
          </span>
          <span class="news-detail-meta-item">
            <i class="fas fa-user${authors.length > 1 ? 's' : ''}"></i>
            ${authorsDisplay}
          </span>
          <span class="news-detail-meta-item">
            <i class="fas fa-eye"></i>
            ${(news.views || 0) + 1} مشاهدة
          </span>
        </div>
        <h1 class="news-detail-title">${escapeHtml(news.title)}</h1>
        ${news.summary ? `<div class="news-detail-summary">${escapeHtml(news.summary)}</div>` : ''}
      </div>
      <div class="news-detail-content">
        ${news.content}
      </div>
    `;
    
  } catch (error) {
    console.error('Error loading news detail:', error);
    document.getElementById('newsModalBody').innerHTML = `
      <div class="news-empty">
        <i class="fas fa-exclamation-circle"></i>
        <p>حدث خطأ في تحميل الخبر</p>
      </div>
    `;
  }
}

// Close news detail modal
function closeNewsModal() {
  const modal = document.getElementById('newsModal');
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

// Setup event listeners
function setupEventListeners() {
  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      displayedCount = 9;
      renderNews();
    });
  });
  
  // Load more button
  document.getElementById('loadMoreBtn').addEventListener('click', () => {
    displayedCount += loadMoreIncrement;
    renderNews();
  });
  
  // Modal close
  document.getElementById('newsModalClose').addEventListener('click', closeNewsModal);
  document.getElementById('newsModalOverlay').addEventListener('click', closeNewsModal);
  
  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeNewsModal();
    }
  });
}

// Utility functions
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('ar-EG', options); // Gregorian calendar
}

function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength) + '...';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}