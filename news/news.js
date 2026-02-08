// ===== News Page JavaScript =====

// Get Supabase client
const sb = window.sbClient;

let allNews = [];
let featuredNews = [];
let currentFilter = 'all';
let displayedCount = 9;
const loadMoreIncrement = 6;

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  await loadNews();
  setupEventListeners();
});

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
    ? `${escapeHtml(authors.join('، '))}` 
    : escapeHtml(authors[0]);
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
        <span class="news-card-author">
          <i class="fa-solid fa-feather${authors.length > 1 ? 's' : ''}"></i>
          بريشة ${authorsDisplay}
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
