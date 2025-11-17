// ===== News Detail Page JavaScript =====

// Get Supabase client
const sb = window.sbClient;

let currentNews = null;
let allNews = [];

// Get news ID from URL
function getNewsIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

// Check if news was viewed before on this device
function hasViewedNews(newsId) {
  try {
    const viewedNews = JSON.parse(localStorage.getItem('viewedNews') || '[]');
    return viewedNews.includes(newsId);
  } catch (error) {
    console.error('Error reading viewed news:', error);
    return false;
  }
}

// Mark news as viewed on this device
function markNewsAsViewed(newsId) {
  try {
    const viewedNews = JSON.parse(localStorage.getItem('viewedNews') || '[]');
    if (!viewedNews.includes(newsId)) {
      viewedNews.push(newsId);
      localStorage.setItem('viewedNews', JSON.stringify(viewedNews));
    }
  } catch (error) {
    console.error('Error saving viewed news:', error);
  }
}

// Format date
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Load news detail
async function loadNewsDetail() {
  const newsId = getNewsIdFromUrl();
  
  if (!newsId) {
    showError();
    return;
  }

  try {
    const loadingEl = document.getElementById('newsLoading');
    const errorEl = document.getElementById('newsError');
    const contentEl = document.getElementById('newsDetailContent');
    
    loadingEl.style.display = 'flex';
    errorEl.style.display = 'none';
    contentEl.style.display = 'none';

    // Check if preview mode (from admin panel)
    const params = new URLSearchParams(window.location.search);
    const isPreview = params.get('preview') === 'true';

    // Fetch news by ID
    let query = sb
      .from('news')
      .select('*')
      .eq('id', newsId);
    
    // Only filter by status if not in preview mode
    if (!isPreview) {
      query = query.eq('status', 'published');
    }
    
    const { data: news, error } = await query
      .single();

    if (error || !news) {
      throw new Error('News not found');
    }

    currentNews = news;

    // Increment views only if not viewed before on this device
    if (!hasViewedNews(newsId)) {
      await sb
        .from('news')
        .update({ views: (news.views || 0) + 1 })
        .eq('id', newsId);

      // Mark as viewed on this device
      markNewsAsViewed(newsId);

      // Update views in current object
      currentNews.views = (news.views || 0) + 1;
    } else {
      // Keep current views count
      currentNews.views = news.views || 0;
    }

    // Render news
    renderNewsDetail(currentNews);

    // Load related news
    await loadRelatedNews(currentNews);

    loadingEl.style.display = 'none';
    contentEl.style.display = 'block';

  } catch (error) {
    console.error('Error loading news:', error);
    showError();
  }
}

// Render news detail
function renderNewsDetail(news) {
  // Update page title
  document.title = `${news.title} - نادي أديب`;

  // Breadcrumb
  document.getElementById('breadcrumbTitle').textContent = news.title;

  // Featured badge
  const featuredBadge = document.getElementById('featuredBadge');
  if (news.is_featured) {
    featuredBadge.style.display = 'inline-flex';
  }

  // Title
  document.getElementById('newsTitle').textContent = news.title;

  // Date
  document.getElementById('newsDate').textContent = formatDate(news.published_at);

  // Authors
  const authors = news.authors || (news.author_name ? [news.author_name] : ['نادي أديب']);
  const authorsIcon = document.getElementById('authorsIcon');
  authorsIcon.className = authors.length > 1 ? 'fas fa-users' : 'fas fa-user';
  document.getElementById('newsAuthors').textContent = authors.join('، ');

  // Views
  document.getElementById('newsViews').textContent = news.views || 0;

  // Cover Image
  if (news.image_url) {
    const coverContainer = document.getElementById('newsCoverImageContainer');
    const coverImage = document.getElementById('newsCoverImage');
    coverImage.src = news.image_url;
    coverImage.alt = news.title;
    coverContainer.style.display = 'block';
  }

  // Content
  document.getElementById('newsContent').innerHTML = news.content;

  // Additional Images Gallery (below content)
  if (news.images && Array.isArray(news.images) && news.images.length > 0) {
    const galleryContainer = document.getElementById('newsImagesGallery');
    const imagesGrid = document.getElementById('newsImagesGrid');
    imagesGrid.innerHTML = news.images.map((img, index) => `
      <div class="gallery-item">
        <img src="${img.url}" alt="${escapeHtml(news.title)} - صورة ${index + 1}" class="gallery-image" />
        ${img.photographer ? `<p class="photographer-credit"><i class="fas fa-camera"></i> تصوير: ${escapeHtml(img.photographer)}</p>` : ''}
      </div>
    `).join('');
    galleryContainer.style.display = 'block';
  }

  // Setup share buttons
  setupShareButtons(news);
}

// Setup share buttons
function setupShareButtons(news) {
  const url = window.location.href;
  const title = news.title;
  const text = news.summary || title;

  // Twitter
  document.getElementById('shareTwitter').onclick = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
  };

  // Facebook
  document.getElementById('shareFacebook').onclick = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
  };

  // WhatsApp
  document.getElementById('shareWhatsapp').onclick = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Copy Link
  document.getElementById('copyLink').onclick = async () => {
    try {
      await navigator.clipboard.writeText(url);
      const btn = document.getElementById('copyLink');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-check"></i> تم النسخ!';
      btn.style.background = '#10b981';
      
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.background = '#64748b';
      }, 2000);
    } catch (error) {
      console.error('Error copying link:', error);
    }
  };
}

// Load related news
async function loadRelatedNews(currentNews) {
  try {
    // Fetch other published news (excluding current)
    const { data, error } = await sb
      .from('news')
      .select('*')
      .eq('status', 'published')
      .neq('id', currentNews.id)
      .order('published_at', { ascending: false });

    if (error) throw error;

    if (data && data.length > 0) {
      // Select 2 random news
      const randomNews = [];
      const availableNews = [...data];
      const count = Math.min(2, availableNews.length);
      
      for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * availableNews.length);
        randomNews.push(availableNews[randomIndex]);
        availableNews.splice(randomIndex, 1);
      }
      
      allNews = randomNews;
      renderRelatedNews(randomNews);
      document.getElementById('relatedNewsSection').style.display = 'block';
    }

  } catch (error) {
    console.error('Error loading related news:', error);
  }
}

// Render related news
function renderRelatedNews(newsList) {
  const grid = document.getElementById('relatedNewsGrid');
  grid.innerHTML = '';

  newsList.forEach(news => {
    const card = createRelatedNewsCard(news);
    grid.appendChild(card);
  });
}

// Create related news card
function createRelatedNewsCard(news) {
  const card = document.createElement('a');
  card.className = 'related-news-card';
  card.href = `news-detail.html?id=${news.id}`;

  const imageUrl = news.image_url || 'https://via.placeholder.com/400x300?text=أديب';
  const publishedDate = formatDate(news.published_at);

  card.innerHTML = `
    <img src="${imageUrl}" alt="${escapeHtml(news.title)}" onerror="this.src='https://via.placeholder.com/400x300?text=أديب'">
    <div class="related-news-card-content">
      <h4>${escapeHtml(news.title)}</h4>
      <div class="related-news-card-meta">
        <span>
          <i class="fas fa-calendar"></i>
          ${publishedDate}
        </span>
        <span>
          <i class="fas fa-eye"></i>
          ${news.views || 0}
        </span>
      </div>
    </div>
  `;

  return card;
}

// Show error
function showError() {
  document.getElementById('newsLoading').style.display = 'none';
  document.getElementById('newsError').style.display = 'flex';
  document.getElementById('newsDetailContent').style.display = 'none';
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadNewsDetail();
});
