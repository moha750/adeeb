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

// Get news slug from URL
function getNewsSlugFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('slug');
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

// Format date - Gregorian calendar
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('ar-EG', {
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

// Format views count with proper Arabic grammar
function formatViewsCount(count) {
  const num = parseInt(count) || 0;
  
  if (num === 0) {
    return 'لا توجد مشاهدات';
  } else if (num === 1) {
    return 'مُشاهدة واحدة';
  } else if (num === 2) {
    return 'مُشاهدتان';
  } else if (num >= 3 && num <= 10) {
    return `${num} مُشاهدات`;
  } else if (num >= 11 && num <= 99) {
    return `${num} مُشاهدة`;
  } else if (num >= 100 && num <= 199) {
    return `${num} مُشاهدة`;
  } else if (num >= 200 && num <= 299) {
    return `${num} مُشاهدة`;
  } else if (num % 100 === 0) {
    return `${num} مُشاهدة`;
  } else {
    const lastTwoDigits = num % 100;
    if (lastTwoDigits === 1) {
      return `${num} مُشاهدة`;
    } else if (lastTwoDigits === 2) {
      return `${num} مُشاهدة`;
    } else if (lastTwoDigits >= 3 && lastTwoDigits <= 10) {
      return `${num} مُشاهدات`;
    } else {
      return `${num} مُشاهدة`;
    }
  }
}

// Update Meta Tags for Rich Preview
function updateMetaTags(news) {
  const url = window.location.href;
  const title = news.title;
  const description = news.summary || news.content.replace(/<[^>]*>/g, '').substring(0, 160) + '...';
  const image = news.image_url || 'https://lh3.googleusercontent.com/d/195w-tUBF_VKwFOm3Sh06fmwnlYzIyw0e';
  
  // Update standard meta tags
  const metaDescription = document.getElementById('metaDescription');
  if (metaDescription) metaDescription.setAttribute('content', description);
  
  // Update Open Graph tags
  const ogTitle = document.getElementById('ogTitle');
  const ogDescription = document.getElementById('ogDescription');
  const ogImage = document.getElementById('ogImage');
  const ogUrl = document.getElementById('ogUrl');
  
  if (ogTitle) ogTitle.setAttribute('content', title);
  if (ogDescription) ogDescription.setAttribute('content', description);
  if (ogImage) ogImage.setAttribute('content', image);
  if (ogUrl) ogUrl.setAttribute('content', url);
  
  // Update Twitter Card tags
  const twitterTitle = document.getElementById('twitterTitle');
  const twitterDescription = document.getElementById('twitterDescription');
  const twitterImage = document.getElementById('twitterImage');
  
  if (twitterTitle) twitterTitle.setAttribute('content', title);
  if (twitterDescription) twitterDescription.setAttribute('content', description);
  if (twitterImage) twitterImage.setAttribute('content', image);
}

// Create enhanced share text with emojis and hashtags
function createShareText(news) {
  const title = news.title;
  const emoji = news.is_featured ? '⭐' : '📰';
  const hashtags = '\n\n#نادي_أديب #جامعة_الملك_فيصل #أخبار_أديب';
  
  return `${emoji} ${title}${hashtags}`;
}

// Load news detail
async function loadNewsDetail() {
  const newsId = getNewsIdFromUrl();
  const newsSlug = getNewsSlugFromUrl();
  
  if (!newsId && !newsSlug) {
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

    // Fetch news by slug or ID
    let query = sb
      .from('news')
      .select('*');

    if (newsSlug) {
      query = query.eq('slug', newsSlug);
    } else {
      query = query.eq('id', newsId);
    }
    
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
    // Use id for view tracking
    const viewKey = String(currentNews.id || newsId || newsSlug);
    if (!hasViewedNews(viewKey)) {
      await sb
        .from('news')
        .update({ views: (news.views || 0) + 1 })
        .eq('id', currentNews.id);

      // Mark as viewed on this device
      markNewsAsViewed(viewKey);

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

  // Update Meta Tags for Rich Preview
  updateMetaTags(news);

  // Breadcrumb
  document.getElementById('breadcrumbTitle').textContent = news.title;

  // Featured badge - always show but change style
  const featuredBadge = document.getElementById('featuredBadge');
  const badgeText = document.getElementById('badgeText');
  const badgeIcon = featuredBadge.querySelector('i');
  
  if (news.is_featured) {
    featuredBadge.classList.remove('regular-badge');
    featuredBadge.classList.add('featured-badge');
    badgeIcon.className = 'fas fa-star';
    badgeText.textContent = 'خبر مميز';
  } else {
    featuredBadge.classList.remove('featured-badge');
    featuredBadge.classList.add('regular-badge');
    badgeIcon.className = 'fas fa-newspaper';
    badgeText.textContent = 'خبر صحفي';
  }

  // Title
  document.getElementById('newsTitle').textContent = news.title;

  // Date - Gregorian format
  const dateObj = new Date(news.published_at);
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  const gregorianDate = dateObj.toLocaleDateString('ar-EG', options);
  document.getElementById('newsDate').textContent = gregorianDate;

  // Authors with proper formatting
  const authors = news.authors || (news.author_name ? [news.author_name] : ['نادي أديب']);
  const authorsIcon = document.getElementById('authorsIcon');
  const authorsLabel = document.getElementById('authorsLabel');
  
  if (authors.length > 1) {
    authorsIcon.className = 'fa-solid fa-feather';
    authorsLabel.textContent = 'بريشات';
    // Join with 'و' instead of comma
    let authorsText = '';
    if (authors.length === 2) {
      authorsText = authors[0] + ' و ' + authors[1];
    } else {
      authorsText = authors.slice(0, -1).join(' و ') + ' و ' + authors[authors.length - 1];
    }
    document.getElementById('newsAuthors').textContent = authorsText;
  } else {
    authorsIcon.className = 'fa-solid fa-feather';
    authorsLabel.textContent = 'بريشة';
    document.getElementById('newsAuthors').textContent = authors[0];
  }

  // Views with proper Arabic grammar
  document.getElementById('newsViews').textContent = formatViewsCount(news.views || 0);

  // Cover Image
  if (news.image_url) {
    const coverContainer = document.getElementById('newsCoverImageContainer');
    const coverImage = document.getElementById('newsCoverImage');
    coverImage.src = news.image_url;
    coverImage.alt = news.title;
    coverContainer.style.display = 'block';
    
    // Photographer name
    if (news.photographer) {
      const photographerItem = document.getElementById('photographerItem');
      const photographerName = document.getElementById('photographerName');
      photographerName.textContent = news.photographer;
      photographerItem.style.display = 'flex';
    }
  }

  // Content
  document.getElementById('newsContent').innerHTML = news.content;

  // Additional Images Gallery (below content)
  if (news.images && Array.isArray(news.images) && news.images.length > 0) {
    const galleryContainer = document.getElementById('newsImagesGallery');
    const imagesSwiper = document.getElementById('newsImagesSwiper');
    
    // إنشاء HTML للصور
    const imageHTML = news.images.map((img, index) => `
      <div class="gallery-image-card">
        <div class="gallery-image-container">
          <img src="${img.url}" alt="${escapeHtml(news.title)} - صورة ${index + 1}" class="gallery-image" />
        </div>
      </div>
    `).join('');
    
    // ملء Swiper
    imagesSwiper.innerHTML = news.images.map((img, index) => `
      <div class="swiper-slide">
        <div class="gallery-image-card">
          <div class="gallery-image-container">
            <img src="${img.url}" alt="${escapeHtml(news.title)} - صورة ${index + 1}" class="gallery-image" />
            <div class="gallery-image-overlay">
              <i class="fas fa-search-plus"></i>
              <span>اضغط للتكبير</span>
            </div>
          </div>
          <div class="gallery-image-content">
            ${img.photographer ? `
            <div class="gallery-photographer">
              <i class="fas fa-camera"></i>
              <span>${escapeHtml(img.photographer)}</span>
            </div>
            ` : ''}
          </div>
        </div>
      </div>
    `).join('');
    
    galleryContainer.style.display = 'block';
    
    // تهيئة Swiper
    initGallerySwiper(news.images.length);
    
    // تهيئة Lightbox بعد تحميل الصور
    setTimeout(() => {
      initImageLightbox();
    }, 100);
  }

  // Setup share buttons
  setupShareButtons(news);
}

// Setup share buttons
function setupShareButtons(news) {
  const url = window.location.href;
  const newsId = news?.id;
  const newsSlug = news?.slug;
  const cacheBuster = news?.updated_at || news?.published_at || '';
  const shareUrl = (newsId && window.SUPABASE_URL)
    ? `${window.SUPABASE_URL.replace(/\/$/, '')}/functions/v1/news-share?${newsSlug ? `slug=${encodeURIComponent(newsSlug)}` : `id=${encodeURIComponent(newsId)}`}&v=${encodeURIComponent(cacheBuster)}`
    : url;
  const title = news.title;
  const shareText = createShareText(news);
  const summary = news.summary || news.content.replace(/<[^>]*>/g, '').substring(0, 100) + '...';

  // Twitter - with enhanced text
  document.getElementById('shareTwitter').onclick = () => {
    const twitterText = `${shareText}\n\n📖 اقرأ المزيد:`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
  };

  // Facebook - will use Open Graph meta tags automatically
  document.getElementById('shareFacebook').onclick = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
  };

  // WhatsApp - with enhanced text and emojis
  document.getElementById('shareWhatsapp').onclick = () => {
    const whatsappText = `${shareText}\n\n📖 اقرأ التفاصيل كاملة:\n${shareUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Copy Link - with enhanced message
  document.getElementById('copyLink').onclick = async () => {
    try {
      // Create full share text with link
      const fullShareText = `${shareText}\n\n📖 رابط الخبر:\n${shareUrl}`;
      await navigator.clipboard.writeText(fullShareText);
      
      // Show success with toast
      showShareToast('تم نسخ الرابط مع نص المشاركة! 🎉');
      
      // Update button temporarily
      const btn = document.getElementById('copyLink');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-check"></i> تم النسخ!';
      btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
      
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.background = 'linear-gradient(135deg, #64748b, #475569)';
      }, 2000);
    } catch (error) {
      console.error('Error copying link:', error);
      // Fallback: copy URL only
      try {
        await navigator.clipboard.writeText(shareUrl);
        showShareToast('تم نسخ الرابط بنجاح! ✓');
        
        const btn = document.getElementById('copyLink');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> تم النسخ!';
        btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.style.background = 'linear-gradient(135deg, #64748b, #475569)';
        }, 2000);
      } catch (err) {
        console.error('Fallback copy also failed:', err);
        showShareToast('حدث خطأ في النسخ ❌', 'error');
      }
    }
  };
}

// Show share toast notification
function showShareToast(message, type = 'success') {
  const toast = document.getElementById('shareToast');
  const toastMessage = document.getElementById('shareToastMessage');
  
  if (!toast || !toastMessage) return;
  
  // Update message
  toastMessage.textContent = message;
  
  // Update style based on type
  if (type === 'error') {
    toast.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
  } else {
    toast.style.background = 'linear-gradient(135deg, #10b981, #059669)';
  }
  
  // Show toast
  toast.classList.add('show');
  
  // Hide after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
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
      // Select random news - minimum 1, maximum 4
      const randomNews = [];
      const availableNews = [...data];
      const count = Math.min(4, availableNews.length);
      
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
  const swiperWrapper = document.getElementById('relatedNewsSwiper');
  
  swiperWrapper.innerHTML = '';

  // ملء Swiper (لجميع الشاشات)
  newsList.forEach(news => {
    const slide = document.createElement('div');
    slide.className = 'swiper-slide';
    const card = createRelatedNewsCard(news);
    slide.appendChild(card);
    swiperWrapper.appendChild(slide);
  });

  // تهيئة Swiper مع عدد الأخبار
  initRelatedNewsSwiper(newsList.length);
}

// Create related news card
function createRelatedNewsCard(news) {
  const card = document.createElement('a');
  card.className = 'related-news-card';
  card.href = news.slug ? `news-detail.html?slug=${encodeURIComponent(news.slug)}` : `news-detail.html?id=${news.id}`;

  const imageUrl = news.image_url || 'https://via.placeholder.com/400x300?text=أديب';
  const publishedDate = formatDate(news.published_at);

  card.innerHTML = `
    <div class="related-news-image-container">
      <img src="${imageUrl}" alt="${escapeHtml(news.title)}" class="related-news-image" onerror="this.src='https://via.placeholder.com/400x300?text=أديب'">
    </div>
    <div class="related-news-content">
      <h4 class="related-news-title">${escapeHtml(news.title)}</h4>
      <div class="related-news-meta">
        <div class="related-news-date">
          <i class="fas fa-calendar-alt"></i>
          <span>${publishedDate}</span>
        </div>
        <div class="related-news-views">
          <i class="fas fa-eye"></i>
          <span>${formatViewsCount(news.views || 0)}</span>
        </div>
      </div>
    </div>
  `;

  return card;
}

// Initialize Gallery Swiper
function initGallerySwiper(imagesCount) {
  // التحقق من وجود Swiper
  if (typeof Swiper === 'undefined') {
    console.warn('Swiper library not loaded');
    return;
  }

  new Swiper('.gallery-swiper', {
    slidesPerView: 1,
    spaceBetween: 20,
    loop: imagesCount > 1, // تفعيل loop فقط إذا كان هناك أكثر من صورة
    
    // عرض متعدد حسب حجم الشاشة
    breakpoints: {
      // الشاشات الصغيرة (أقل من 576px) - صورة واحدة
      320: {
        slidesPerView: 1,
        spaceBetween: 20,
      },
      // الشاشات المتوسطة والكبيرة (576px وأكبر) - صورتان
      500: {
        slidesPerView: Math.min(2, imagesCount),
        spaceBetween: 20,
      },
    },
    
    navigation: {
      nextEl: '.gallery-swiper .swiper-button-next',
      prevEl: '.gallery-swiper .swiper-button-prev',
    },
    
    autoplay: imagesCount > 1 ? {
      delay: 4000,
      disableOnInteraction: false,
      pauseOnMouseEnter: true,
    } : false,
    
    effect: 'slide',
    speed: 600,
    
    // تأثيرات إضافية
    grabCursor: true,
    centeredSlides: false,
    
    // إخفاء الأزرار إذا كانت هناك صورة واحدة فقط
    on: {
      init: function() {
        if (imagesCount === 1) {
          const nextBtn = document.querySelector('.gallery-swiper .swiper-button-next');
          const prevBtn = document.querySelector('.gallery-swiper .swiper-button-prev');
          if (nextBtn) nextBtn.style.display = 'none';
          if (prevBtn) prevBtn.style.display = 'none';
        }
      }
    }
  });
}

// Initialize Related News Swiper
function initRelatedNewsSwiper(newsCount) {
  // التحقق من وجود Swiper
  if (typeof Swiper === 'undefined') {
    console.warn('Swiper library not loaded');
    return;
  }

  new Swiper('.related-news-swiper', {
    slidesPerView: 1,
    spaceBetween: 20,
    loop: newsCount > 1, // تفعيل loop فقط إذا كان هناك أكثر من خبر
    
    // عرض متعدد حسب حجم الشاشة
    breakpoints: {
      // الشاشات الصغيرة (أقل من 768px) - خبر واحد
      320: {
        slidesPerView: 1,
        spaceBetween: 20,
      },
      // الشاشات الكبيرة (768px وأكبر) - خبران
      768: {
        slidesPerView: Math.min(2, newsCount),
        spaceBetween: 30,
      },
    },
    
    navigation: {
      nextEl: '.related-news-swiper .swiper-button-next',
      prevEl: '.related-news-swiper .swiper-button-prev',
    },
    
    autoplay: newsCount > 1 ? {
      delay: 5000,
      disableOnInteraction: false,
      pauseOnMouseEnter: true,
    } : false,
    
    effect: 'slide',
    speed: 600,
    
    // تأثيرات إضافية
    grabCursor: true,
    centeredSlides: false,
    
    // إخفاء الأزرار إذا كان هناك خبر واحد فقط
    on: {
      init: function() {
        if (newsCount === 1) {
          const nextBtn = document.querySelector('.related-news-swiper .swiper-button-next');
          const prevBtn = document.querySelector('.related-news-swiper .swiper-button-prev');
          if (nextBtn) nextBtn.style.display = 'none';
          if (prevBtn) prevBtn.style.display = 'none';
        }
      }
    }
  });
}

// Show error
function showError() {
  document.getElementById('newsLoading').style.display = 'none';
  document.getElementById('newsError').style.display = 'flex';
  document.getElementById('newsDetailContent').style.display = 'none';
}

// Image Lightbox functionality
let currentImageIndex = 0;
let galleryImages = [];

function initImageLightbox() {
  const lightbox = document.getElementById('imageLightbox');
  const lightboxImage = document.getElementById('lightboxImage');
  const lightboxTitle = document.getElementById('lightboxTitle');
  const lightboxCounter = document.getElementById('lightboxCounter');
  const closeLightbox = document.getElementById('closeLightbox');
  const prevImage = document.getElementById('prevImage');
  const nextImage = document.getElementById('nextImage');
  const overlay = document.querySelector('.lightbox-overlay');

  // Get all gallery images
  const imageElements = document.querySelectorAll('.gallery-image');
  galleryImages = Array.from(imageElements).map((img, index) => {
    const card = img.closest('.gallery-image-card');
    const photographerElement = card?.querySelector('.gallery-photographer span');
    const photographer = photographerElement?.textContent || '';
    
    return {
      src: img.src,
      alt: img.alt,
      photographer: photographer,
      index: index
    };
  });

  // Add click event to each image
  imageElements.forEach((img, index) => {
    img.style.cursor = 'pointer';
    img.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openLightbox(index);
    });
  });

  // Close lightbox
  function closeLightboxHandler() {
    lightbox.style.display = 'none';
    document.body.style.overflow = '';
  }

  closeLightbox.addEventListener('click', closeLightboxHandler);
  overlay.addEventListener('click', closeLightboxHandler);

  // Navigate images
  prevImage.addEventListener('click', () => {
    if (currentImageIndex > 0) {
      showImage(currentImageIndex - 1);
    }
  });

  nextImage.addEventListener('click', () => {
    if (currentImageIndex < galleryImages.length - 1) {
      showImage(currentImageIndex + 1);
    }
  });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (lightbox.style.display === 'flex' || lightbox.style.display === 'block') {
      if (e.key === 'Escape') {
        closeLightboxHandler();
      } else if (e.key === 'ArrowRight' && currentImageIndex > 0) {
        showImage(currentImageIndex - 1);
      } else if (e.key === 'ArrowLeft' && currentImageIndex < galleryImages.length - 1) {
        showImage(currentImageIndex + 1);
      }
    }
  });

  function openLightbox(index) {
    currentImageIndex = index;
    showImage(index);
    lightbox.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function showImage(index) {
    currentImageIndex = index;
    const image = galleryImages[index];
    
    lightboxImage.src = image.src;
    lightboxImage.alt = image.alt;
    lightboxTitle.textContent = image.photographer ? `الصورة بعدسة ${image.photographer}` : `صورة ${index + 1}`;
    lightboxCounter.textContent = `${index + 1} / ${galleryImages.length}`;

    // Update button states
    prevImage.disabled = index === 0;
    nextImage.disabled = index === galleryImages.length - 1;
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadNewsDetail();
});
