// ===== News Detail Page JavaScript =====

// Get Supabase client
const sb = window.sbClient;

// Get or create guest identifier
function getGuestIdentifier() {
  let identifier = localStorage.getItem('guestIdentifier');
  if (!identifier) {
    identifier = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('guestIdentifier', identifier);
  }
  return identifier;
}

let currentNews = null;
let allNews = [];
let currentUser = null;
let guestIdentifier = null;
let hasLiked = false;
let commentsData = [];

// Get news identifier from URL (supports both ID and Slug)
function getNewsIdentifierFromUrl() {
  const params = new URLSearchParams(window.location.search);
  
  // أولاً: التحقق من وجود slug في الرابط
  const slug = params.get('slug');
  if (slug) {
    return { type: 'slug', value: slug };
  }
  
  // ثانياً: التحقق من وجود id (للتوافق مع الروابط القديمة)
  const id = params.get('id');
  if (id) {
    return { type: 'id', value: id };
  }
  
  // ثالثاً: التحقق من المسار (للروابط النظيفة مستقبلاً)
  // مثال: /news/slug-here
  const pathParts = window.location.pathname.split('/');
  const lastPart = pathParts[pathParts.length - 1];
  if (lastPart && lastPart !== 'news-detail.html' && !lastPart.includes('.html')) {
    return { type: 'slug', value: decodeURIComponent(lastPart) };
  }
  
  return null;
}

// Legacy function for backward compatibility
function getNewsIdFromUrl() {
  const identifier = getNewsIdentifierFromUrl();
  if (identifier && identifier.type === 'id') {
    return identifier.value;
  }
  return null;
}

// Check if news was viewed in current session
function hasViewedNews(newsId) {
  try {
    const sessionViewed = sessionStorage.getItem(`viewed_${newsId}`);
    if (sessionViewed) {
      return true;
    }
    
    const viewedNews = JSON.parse(localStorage.getItem('viewedNews') || '{}');
    const viewData = viewedNews[newsId];
    
    if (!viewData) {
      return false;
    }
    
    const now = Date.now();
    const timeDiff = now - viewData.timestamp;
    const thirtyMinutes = 30 * 60 * 1000;
    
    if (timeDiff > thirtyMinutes) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error reading viewed news:', error);
    return false;
  }
}

// Mark news as viewed in session and localStorage
function markNewsAsViewed(newsId) {
  try {
    sessionStorage.setItem(`viewed_${newsId}`, 'true');
    
    const viewedNews = JSON.parse(localStorage.getItem('viewedNews') || '{}');
    viewedNews[newsId] = {
      timestamp: Date.now(),
      viewCount: (viewedNews[newsId]?.viewCount || 0) + 1
    };
    localStorage.setItem('viewedNews', JSON.stringify(viewedNews));
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
  const identifier = getNewsIdentifierFromUrl();
  
  if (!identifier) {
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

    // Fetch news by ID or Slug
    let query = sb
      .from('news')
      .select('*');
    
    // البحث بناءً على نوع المعرف
    if (identifier.type === 'slug') {
      query = query.eq('slug', identifier.value);
    } else {
      query = query.eq('id', identifier.value);
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
    const newsId = news.id; // استخدام ID الفعلي من قاعدة البيانات
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

    // Setup engagement section (likes and comments)
    await setupEngagementSection();

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
    if (news.cover_photographer) {
      const photographerItem = document.getElementById('photographerItem');
      const photographerName = document.getElementById('photographerName');
      photographerName.textContent = news.cover_photographer;
      photographerItem.style.display = 'flex';
    }
  }

  // Content
  document.getElementById('newsContent').innerHTML = news.content;

  // Additional Images Gallery (below content)
  // gallery_images هو مصفوفة URLs نصية، و gallery_photographers مصفوفة أسماء
  const galleryImgs = news.gallery_images;
  const galleryPhotographers = news.gallery_photographers || [];
  
  if (galleryImgs && Array.isArray(galleryImgs) && galleryImgs.length > 0) {
    const galleryContainer = document.getElementById('newsImagesGallery');
    const imagesSwiper = document.getElementById('newsImagesSwiper');
    
    // ملء Swiper
    imagesSwiper.innerHTML = galleryImgs.map((imgUrl, index) => {
      const photographer = galleryPhotographers[index] || '';
      return `
      <div class="swiper-slide">
        <div class="gallery-image-card">
          <div class="gallery-image-container">
            <img src="${imgUrl}" alt="${escapeHtml(news.title)} - صورة ${index + 1}" class="gallery-image" />
            <div class="gallery-image-overlay">
              <i class="fas fa-search-plus"></i>
              <span>اضغط للتكبير</span>
            </div>
          </div>
          <div class="gallery-image-content">
            ${photographer ? `
            <div class="gallery-photographer">
              <i class="fas fa-camera"></i>
              <span>${escapeHtml(photographer)}</span>
            </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
    }).join('');
    
    galleryContainer.style.display = 'block';
    
    // تهيئة Swiper
    initGallerySwiper(galleryImgs.length);
    
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
  const currentUrl = window.location.href;
  const title = news.title;
  const shareText = createShareText(news);
  const summary = news.summary || news.content.replace(/<[^>]*>/g, '').substring(0, 100) + '...';
  
  // رابط المشاركة الجديد على دومين adeeb.club
  const ogShareUrl = `https://adeeb.club/news/news-detail.html?slug=${encodeURIComponent(news.slug || news.id)}`;

  // Twitter - with enhanced text - يستخدم رابط OG لعرض صورة الخبر
  document.getElementById('shareTwitter').onclick = () => {
    const twitterText = `${shareText}\n\n📖 اقرأ المزيد:`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}&url=${encodeURIComponent(ogShareUrl)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
  };

  // Facebook - يستخدم رابط OG لعرض صورة الخبر
  document.getElementById('shareFacebook').onclick = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(ogShareUrl)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
  };

  // WhatsApp - يستخدم رابط OG لعرض صورة الخبر
  document.getElementById('shareWhatsapp').onclick = () => {
    const whatsappText = `${shareText}\n\n📖 اقرأ التفاصيل كاملة:\n${ogShareUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Copy Link - ينسخ رابط OG لعرض صورة الخبر عند المشاركة
  document.getElementById('copyLink').onclick = async () => {
    try {
      // Create full share text with OG link for proper image preview
      const fullShareText = `${shareText}\n\n📖 رابط الخبر:\n${ogShareUrl}`;
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
        await navigator.clipboard.writeText(ogShareUrl);
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
  card.href = `news-detail.html?id=${news.id}`;

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

// Get current user
async function getCurrentUser() {
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
      const { data: profile } = await sb
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', user.id)
        .single();
      return profile;
    }
    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Format likes count
function formatLikesCount(count) {
  const num = parseInt(count) || 0;
  if (num === 0) return 'لا توجد إعجابات';
  if (num === 1) return 'إعجاب واحد';
  if (num === 2) return 'إعجابان';
  if (num >= 3 && num <= 10) return `${num} إعجابات`;
  return `${num} إعجاب`;
}

// Format comments count
function formatCommentsCount(count) {
  const num = parseInt(count) || 0;
  if (num === 0) return 'لا توجد تعليقات';
  if (num === 1) return 'تعليق واحد';
  if (num === 2) return 'تعليقان';
  if (num >= 3 && num <= 10) return `${num} تعليقات`;
  return `${num} تعليق`;
}

// Check if user has liked the news
async function checkUserLike(newsId) {
  try {
    let query = sb
      .from('news_likes')
      .select('id')
      .eq('news_id', newsId);

    if (currentUser) {
      query = query.eq('user_id', currentUser.id);
    } else {
      query = query.eq('guest_identifier', guestIdentifier);
    }

    const { data, error } = await query.maybeSingle();
    
    if (error) throw error;
    return !!data;
  } catch (error) {
    console.error('Error checking user like:', error);
    return false;
  }
}

// Toggle like
async function toggleLike() {
  if (!currentNews) return;

  const likeButton = document.getElementById('likeButton');
  const likeIcon = likeButton.querySelector('i');
  const likeText = document.getElementById('likeButtonText');
  const likesCountEl = document.getElementById('likesCount');

  try {
    likeButton.disabled = true;

    if (hasLiked) {
      let query = sb
        .from('news_likes')
        .delete()
        .eq('news_id', currentNews.id);

      if (currentUser) {
        query = query.eq('user_id', currentUser.id);
      } else {
        query = query.eq('guest_identifier', guestIdentifier);
      }

      const { error } = await query;
      if (error) throw error;

      hasLiked = false;
      likeIcon.className = 'far fa-heart';
      likeText.textContent = 'أعجبني الخبر';
      likeButton.classList.remove('liked');

      currentNews.likes_count = Math.max((currentNews.likes_count || 0) - 1, 0);
    } else {
      const likeData = {
        news_id: currentNews.id,
        user_id: currentUser ? currentUser.id : null,
        guest_identifier: currentUser ? null : guestIdentifier
      };

      const { error } = await sb
        .from('news_likes')
        .insert([likeData]);

      if (error) {
        if (error.code === '23505') {
          // الإعجاب موجود مسبقاً - نحدث الواجهة فقط دون زيادة العدد
          hasLiked = true;
          likeIcon.className = 'fas fa-heart';
          likeText.textContent = 'أعجبت بالخبر';
          likeButton.classList.add('liked');
          
          // إعادة جلب العدد الصحيح من قاعدة البيانات
          const { count } = await sb
            .from('news_likes')
            .select('*', { count: 'exact', head: true })
            .eq('news_id', currentNews.id);
          
          currentNews.likes_count = count || 0;
          likesCountEl.textContent = formatLikesCount(currentNews.likes_count);
          return;
        }
        throw error;
      }

      hasLiked = true;
      likeIcon.className = 'fas fa-heart';
      likeText.textContent = 'أعجبت بالخبر';
      likeButton.classList.add('liked');

      currentNews.likes_count = (currentNews.likes_count || 0) + 1;
    }

    likesCountEl.textContent = formatLikesCount(currentNews.likes_count);
  } catch (error) {
    console.error('Error toggling like:', error);
    alert('حدث خطأ أثناء الإعجاب. يرجى المحاولة مرة أخرى.');
  } finally {
    likeButton.disabled = false;
  }
}

// Load comments
async function loadComments() {
  if (!currentNews) return;

  const commentsLoading = document.getElementById('commentsLoading');
  const commentsEmpty = document.getElementById('commentsEmpty');
  const commentsList = document.getElementById('commentsList');

  try {
    commentsLoading.style.display = 'flex';
    commentsEmpty.style.display = 'none';

    const { data: comments, error } = await sb
      .from('news_public_comments')
      .select(`
        *,
        profiles:user_id (full_name, avatar_url),
        comment_likes (id, user_id, guest_identifier)
      `)
      .eq('news_id', currentNews.id)
      .eq('is_approved', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    commentsData = comments || [];
    
    commentsLoading.style.display = 'none';

    if (commentsData.length === 0) {
      commentsEmpty.style.display = 'flex';
      document.getElementById('commentsCount').textContent = '0 تعليق';
    } else {
      commentsEmpty.style.display = 'none';
      renderComments();
      document.getElementById('commentsCount').textContent = formatCommentsCount(commentsData.length);
    }
  } catch (error) {
    console.error('Error loading comments:', error);
    commentsLoading.style.display = 'none';
    commentsEmpty.style.display = 'flex';
  }
}

// Render comments
function renderComments() {
  const commentsList = document.getElementById('commentsList');
  const commentsLoading = document.getElementById('commentsLoading');
  const commentsEmpty = document.getElementById('commentsEmpty');

  const existingComments = commentsList.querySelectorAll('.comment-item');
  existingComments.forEach(comment => comment.remove());

  commentsData.forEach(comment => {
    const commentEl = createCommentElement(comment);
    commentsList.appendChild(commentEl);
  });
}

// Create comment element
function createCommentElement(comment) {
  const commentDiv = document.createElement('div');
  commentDiv.className = 'comment-item';
  commentDiv.dataset.commentId = comment.id;

  const authorName = comment.profiles?.full_name || comment.guest_name || 'مستخدم';
  const isMember = !!comment.profiles;
  const avatarUrl = comment.profiles?.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(authorName) + '&background=3d8fd6&color=fff&size=128';
  const commentDate = new Date(comment.created_at).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const likesCount = comment.comment_likes?.length || 0;
  const userHasLiked = comment.comment_likes?.some(like => 
    currentUser ? like.user_id === currentUser.id : like.guest_identifier === guestIdentifier
  ) || false;

  const memberBadge = isMember ? '<span class="member-badge"></span>' : '';

  commentDiv.innerHTML = `
    <div class="comment-avatar">
      <img src="${avatarUrl}" alt="${escapeHtml(authorName)}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=3d8fd6&color=fff&size=128'">
    </div>
    <div class="comment-content-wrapper">
      <div class="comment-header">
        <span class="comment-author">${escapeHtml(authorName)}${memberBadge}</span>
        <span class="comment-date">${commentDate}</span>
      </div>
      <div class="comment-text">${escapeHtml(comment.content)}</div>
      <div class="comment-actions">
        <button class="comment-like-btn ${userHasLiked ? 'liked' : ''}" data-comment-id="${comment.id}">
          <i class="${userHasLiked ? 'fas' : 'far'} fa-heart"></i>
          <span class="comment-likes-count">${likesCount > 0 ? likesCount : ''}</span>
        </button>
      </div>
    </div>
  `;

  const likeBtn = commentDiv.querySelector('.comment-like-btn');
  likeBtn.addEventListener('click', () => toggleCommentLike(comment.id, likeBtn));

  return commentDiv;
}

// Toggle comment like
async function toggleCommentLike(commentId, button) {
  try {
    button.disabled = true;
    const icon = button.querySelector('i');
    const countSpan = button.querySelector('.comment-likes-count');
    const isLiked = button.classList.contains('liked');

    if (isLiked) {
      let query = sb
        .from('comment_likes')
        .delete()
        .eq('comment_id', commentId);

      if (currentUser) {
        query = query.eq('user_id', currentUser.id);
      } else {
        query = query.eq('guest_identifier', guestIdentifier);
      }

      const { error } = await query;
      if (error) throw error;

      button.classList.remove('liked');
      icon.className = 'far fa-heart';
      
      const comment = commentsData.find(c => c.id === commentId);
      if (comment && comment.comment_likes) {
        comment.comment_likes = comment.comment_likes.filter(like =>
          currentUser ? like.user_id !== currentUser.id : like.guest_identifier !== guestIdentifier
        );
        const newCount = comment.comment_likes.length;
        countSpan.textContent = newCount > 0 ? newCount : '';
      }
    } else {
      const likeData = {
        comment_id: commentId,
        user_id: currentUser ? currentUser.id : null,
        guest_identifier: currentUser ? null : guestIdentifier
      };

      const { error } = await sb
        .from('comment_likes')
        .insert([likeData]);

      if (error) throw error;

      button.classList.add('liked');
      icon.className = 'fas fa-heart';

      const comment = commentsData.find(c => c.id === commentId);
      if (comment) {
        if (!comment.comment_likes) comment.comment_likes = [];
        comment.comment_likes.push(likeData);
        countSpan.textContent = comment.comment_likes.length;
      }
    }
  } catch (error) {
    console.error('Error toggling comment like:', error);
    alert('حدث خطأ أثناء الإعجاب بالتعليق. يرجى المحاولة مرة أخرى.');
  } finally {
    button.disabled = false;
  }
}

// Submit comment
async function submitComment() {
  if (!currentNews) return;

  const contentEl = document.getElementById('commentContent');
  const authorNameEl = document.getElementById('commentAuthorName');
  const submitBtn = document.getElementById('submitCommentBtn');

  const content = contentEl.value.trim();
  
  if (!content) {
    alert('يرجى كتابة تعليق');
    return;
  }

  if (!currentUser) {
    const guestName = authorNameEl.value.trim();
    if (!guestName) {
      alert('يرجى كتابة اسمك');
      authorNameEl.focus();
      return;
    }
  }

  try {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>جاري النشر...</span>';

    const commentData = {
      news_id: currentNews.id,
      content: content,
      user_id: currentUser ? currentUser.id : null,
      guest_name: currentUser ? null : authorNameEl.value.trim(),
      is_approved: true
    };

    const { data, error } = await sb
      .from('news_public_comments')
      .insert([commentData])
      .select(`
        *,
        profiles:user_id (full_name, avatar_url),
        comment_likes (id, user_id, guest_identifier)
      `)
      .single();

    if (error) throw error;

    contentEl.value = '';
    if (!currentUser) {
      authorNameEl.value = '';
    }

    commentsData.unshift(data);
    
    const commentsEmpty = document.getElementById('commentsEmpty');
    if (commentsEmpty.style.display !== 'none') {
      commentsEmpty.style.display = 'none';
    }

    const commentEl = createCommentElement(data);
    const commentsList = document.getElementById('commentsList');
    const firstComment = commentsList.querySelector('.comment-item');
    if (firstComment) {
      commentsList.insertBefore(commentEl, firstComment);
    } else {
      commentsList.appendChild(commentEl);
    }

    document.getElementById('commentsCount').textContent = formatCommentsCount(commentsData.length);

    commentEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (error) {
    console.error('Error submitting comment:', error);
    alert('حدث خطأ أثناء نشر التعليق. يرجى المحاولة مرة أخرى.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i><span>نشر التعليق</span>';
  }
}

// Setup engagement section
async function setupEngagementSection() {
  if (!currentNews) return;

  currentUser = await getCurrentUser();
  guestIdentifier = getGuestIdentifier();

  const authorNameEl = document.getElementById('commentAuthorName');
  const memberLoginPrompt = document.getElementById('memberLoginPrompt');
  const commentUserInfo = document.getElementById('commentUserInfo');
  
  if (currentUser) {
    authorNameEl.style.display = 'none';
    memberLoginPrompt.style.display = 'none';
    commentUserInfo.style.display = 'flex';
    
    const userAvatar = document.getElementById('commentUserAvatar');
    const userName = document.getElementById('commentUserName');
    userAvatar.src = currentUser.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentUser.full_name) + '&background=3d8fd6&color=fff&size=128';
    userName.textContent = currentUser.full_name;
  } else {
    authorNameEl.style.display = 'block';
    memberLoginPrompt.style.display = 'block';
    commentUserInfo.style.display = 'none';
  }

  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      window.location.href = '../auth/login.html?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
    });
  }

  hasLiked = await checkUserLike(currentNews.id);
  
  const likeButton = document.getElementById('likeButton');
  const likeIcon = likeButton.querySelector('i');
  const likeText = document.getElementById('likeButtonText');
  const likesCountEl = document.getElementById('likesCount');

  if (hasLiked) {
    likeIcon.className = 'fas fa-heart';
    likeText.textContent = 'أعجبت بالخبر';
    likeButton.classList.add('liked');
  } else {
    likeIcon.className = 'far fa-heart';
    likeText.textContent = 'أعجبني الخبر';
    likeButton.classList.remove('liked');
  }

  likesCountEl.textContent = formatLikesCount(currentNews.likes_count || 0);

  likeButton.addEventListener('click', toggleLike);

  const submitBtn = document.getElementById('submitCommentBtn');
  submitBtn.addEventListener('click', submitComment);

  const commentContent = document.getElementById('commentContent');
  commentContent.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      submitComment();
    }
  });

  await loadComments();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadNewsDetail();
});
