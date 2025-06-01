// إعدادات Supabase
const supabaseUrl = 'https://ihawihvbhynxexawjajz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloYXdpaHZiaHlueGV4YXdqYWp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4MzgyOTksImV4cCI6MjA2MzQxNDI5OX0.19-qWfJUqv8Y5WYkts36dXsx_kxDBCGbJDBnx2hQUNg';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let currentUserRating = 0;
let newsId = null;

function formatNames(role, namesArray) {
  if (!namesArray || namesArray.length === 0) return '';
  if (namesArray.length === 1) {
    if (role === 'editors') return `<p><strong>تحرير:</strong> ${namesArray[0]}</p>`;
    if (role === 'photographers') return `<p><strong>تصوير:</strong> ${namesArray[0]}</p>`;
  } else {
    const joinedNames = namesArray.join(' و ');
    if (role === 'editors') return `<p><strong>المحررون:</strong> ${joinedNames}</p>`;
    if (role === 'photographers') return `<p><strong>المصورون:</strong> ${joinedNames}</p>`;
  }
  return '';
}

// دالة لتحميل الصور عند ظهورها (lazy loading)
function lazyLoadImages() {
    const lazyImages = document.querySelectorAll('.lazy');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                observer.unobserve(img);
            }
        });
    });
    lazyImages.forEach(img => observer.observe(img));
}

// دالة تنسيق التاريخ
function formatDate(dateString) {
    if (!dateString) return 'تاريخ غير معروف';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// دالة تنسيق الأرقام
function formatNumber(num) {
    return new Intl.NumberFormat('ar-EG').format(num);
}

// عرض الخبر المفرد
async function displaySingleNews() {
    showLoading();

    const urlParams = new URLSearchParams(window.location.search);
    newsId = urlParams.get('id');

    const newsArticle = document.getElementById('newsArticle');
    if (!newsId) {
        newsArticle.innerHTML = '<p class="error">لم يتم العثور على الخبر</p>';
        hideLoading();
        return;
    }

    try {
        const { data: news, error } = await supabaseClient
            .from('news')
            .select('*')
            .eq('id', newsId)
            .single();

        if (error) throw error;

        if (news) {
            // فصل المحررين والمصورين وتحضير نص العرض
const editorsList = news.editors ? news.editors.split(',').map(e => e.trim()).filter(Boolean) : [];
const photographersList = news.photographers ? news.photographers.split(',').map(p => p.trim()).filter(Boolean) : [];

const editorsHTML = formatNames('editors', editorsList);
const photographersHTML = formatNames('photographers', photographersList);

            const articleContent = `
                <h2>${news.title}</h2>
                ${news.image_url ? `
                    <div class="image-container">
                        <img 
                            src="${news.image_url}?width=300" 
                            data-src="${news.image_url}" 
                            alt="${news.title}" 
                            class="news-image lazy"
                            loading="lazy"
                        >
                        <div class="image-placeholder"></div>
                    </div>
                ` : ''}
                <div class="news-meta">
                    <span class="news-date">${formatDate(news.created_at)}</span>
                    ${news.views_count ? `<span class="news-views">عدد المشاهدات: ${formatNumber(news.views_count)}</span>` : ''}
                </div>
                <div class="news-content">${news.content}</div>
                <div class="news-credits">
                    ${editorsHTML}
                    ${photographersHTML}
                </div>
            `;

            newsArticle.innerHTML = articleContent;

            lazyLoadImages();

            // تحميل التعليقات والتقييمات بشكل متوازي
            await Promise.all([loadComments(), loadRatings()]);

            // عرض قسم التفاعل
            const commentsSection = document.getElementById('commentsSection');
            if (commentsSection) commentsSection.style.display = 'block';
        } else {
            newsArticle.innerHTML = '<p class="error">لم يتم العثور على الخبر</p>';
        }
    } catch (error) {
        console.error("Error getting news: ", error);
        newsArticle.innerHTML = '<p class="error">حدث خطأ أثناء تحميل الخبر</p>';
        showNotification('حدث خطأ أثناء تحميل الخبر', 'error');
    } finally {
        hideLoading();
    }
}


// تحميل التعليقات
async function loadComments() {
    const commentsList = document.getElementById('commentsList');
    if (!commentsList) return;

    commentsList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> جاري تحميل التعليقات...</div>';

    try {
        const { data: comments, error } = await supabaseClient
            .from('comments')
            .select('id, user_name, text, created_at, user_id')
            .eq('news_id', newsId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        commentsList.innerHTML = '';

        if (!comments || comments.length === 0) {
            commentsList.innerHTML = '<p class="no-comments">لا توجد تعليقات بعد. كن أول من يعلق!</p>';
            document.getElementById('commentsCount').textContent = '(0)';
            return;
        }

        document.getElementById('commentsCount').textContent = `(${comments.length})`;

        // جلب صور المستخدمين
        const userIds = comments.map(c => c.user_id).filter(id => id);
        const { data: profiles } = await supabaseClient
            .from('profiles')
            .select('id, avatar_url')
            .in('id', [...new Set(userIds)]);

        comments.forEach(comment => {
            const userProfile = profiles?.find(p => p.id === comment.user_id);
            const commentElement = document.createElement('div');
            commentElement.className = 'comment-item';
            commentElement.innerHTML = `
                <div class="comment-header">
<div class="comment-author-info">
  <span class="comment-author">${comment.user_name || 'مجهول'}</span>
</div>

                    <span class="comment-date">${formatDate(comment.created_at)}</span>
                </div>
                <div class="comment-text">${comment.text}</div>
            `;
            commentsList.appendChild(commentElement);
        });
    } catch (error) {
        console.error("Error loading comments: ", error);
        commentsList.innerHTML = '<p class="error">حدث خطأ أثناء تحميل التعليقات</p>';
    }
}

// تظليل النجوم حسب التقييم
function highlightStars(rating) {
    const stars = document.querySelectorAll('.rating-stars span');
    const numericRating = typeof rating === 'string' ? parseFloat(rating) : rating;
    
    stars.forEach((star, index) => {
        star.textContent = index < Math.round(numericRating) ? '★' : '☆';
        star.classList.toggle('active', index < Math.round(numericRating));
    });
}

// التحقق من تقييم المستخدم الحالي
async function checkUserRating(userId) {
    if (!newsId || !userId) {
        console.warn('Missing newsId or userId for checkUserRating');
        return;
    }

    try {
        const { data: userRating, error } = await supabaseClient
            .from('ratings')
            .select('*')
            .eq('news_id', newsId)
            .eq('user_id', userId)
            .single();

        if (!error && userRating) {
            currentUserRating = userRating.rating;
            highlightStars(currentUserRating);
        }
    } catch (error) {
        console.error("Error checking user rating: ", error);
    }
}

// إرسال تعليق جديد
document.getElementById('commentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const userName = document.getElementById('commentName').value.trim();
    const commentText = document.getElementById('commentText').value.trim();

    if (!userName || !commentText) {
        Swal.fire({
            icon: 'warning',
            title: 'حقل مطلوب',
            text: 'الرجاء إدخال اسمك وتعليقك',
            confirmButtonColor: '#3d8fd6'
        });
        return;
    }

    try {
        const btn = e.target.querySelector('button');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';

        const { data: { user } } = await supabaseClient.auth.getUser();

        const { error } = await supabaseClient
            .from('comments')
            .insert([{
                news_id: newsId,
                user_name: userName,
                text: commentText,
                user_id: user?.id || null
            }]);

        if (error) throw error;

        e.target.reset();
        await loadComments();

        Swal.fire({
            icon: 'success',
            title: 'تم بنجاح!',
            text: 'تم إضافة تعليقك بنجاح',
            confirmButtonColor: '#3d8fd6',
            timer: 2000
        });
    } catch (error) {
        console.error("Error adding comment: ", error);
        Swal.fire({
            icon: 'error',
            title: 'خطأ',
            text: 'حدث خطأ أثناء إضافة التعليق',
            confirmButtonColor: '#3d8fd6'
        });
    } finally {
        const btn = e.target.querySelector('button');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span>إرسال التعليق</span><i class="fas fa-paper-plane"></i>';
        }
    }
});

// إضافة تقييم على النجوم
document.querySelector('.rating-stars')?.addEventListener('click', async (e) => {
    if (e.target.tagName !== 'SPAN') return;
    
    const rating = parseInt(e.target.dataset.value);
    if (isNaN(rating)) return;

    try {
        showLoading();
        
        const { data: { user } } = await supabaseClient.auth.getUser();
        const userId = user?.id || null;
        
        // التحقق من التقييم السابق
        const ratingKey = `rated_${newsId}_${userId || 'guest'}`;
        if (localStorage.getItem(ratingKey)) {
            showNotification('لقد قمت بالتقييم مسبقاً', 'info');
            return;
        }

        const { error } = await supabaseClient.rpc('upsert_rating', {
            p_news_id: newsId,
            p_user_id: userId,
            p_rating: rating
        });

        if (error) throw error;

        localStorage.setItem(ratingKey, 'true');
        currentUserRating = rating;
        await loadRatings();
        
        showNotification(`شكراً لك! تم تسجيل تقييمك: ${rating} نجوم`, 'success');
    } catch (error) {
        console.error("Error submitting rating:", error);
        showNotification('حدث خطأ أثناء حفظ التقييم', 'error');
    } finally {
        hideLoading();
    }
});


// تسجيل المشاهدة (مرة واحدة)
async function recordView() {
    if (!newsId) return;

    try {
        const viewedKey = `viewed_${newsId}`;
        if (localStorage.getItem(viewedKey)) return;

        localStorage.setItem(viewedKey, 'true');

        const { data: { user } } = await supabaseClient.auth.getUser();

        await supabaseClient.rpc('increment_views', {
            p_news_id: newsId,
            p_user_id: user?.id || null
        });
    } catch (error) {
        console.error("Error recording view:", error);
    }
}

// إشعارات التحميل والتنبيهات
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    if (!notification) return;

    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';

    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'flex';
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
}

// تشغيل التحميل عند فتح الصفحة
window.onload = async () => {
    await displaySingleNews();
    await recordView();
};

// إضافة هذه الدوال في news.js
function setupStarHoverEffects() {
    const stars = document.querySelectorAll('.rating-stars span');
    stars.forEach(star => {
        star.addEventListener('mouseover', () => {
            const value = parseInt(star.dataset.value);
            highlightStars(value);
            stars.forEach((s, i) => {
                if (i < value) {
                    s.classList.add('hover');
                } else {
                    s.classList.remove('hover');
                }
            });
        });

        star.addEventListener('mouseout', () => {
            stars.forEach(s => s.classList.remove('hover'));
            highlightStars(currentUserRating || document.querySelector('.average-rating').textContent.split(' ')[2]);
        });
    });
}








































































// دالة لعرض النجوم (للقراءة فقط)
function displayRatingStars(rating) {
    const starsContainer = document.getElementById('starsDisplay');
    const stars = starsContainer.querySelectorAll('span');
    const numericRating = typeof rating === 'string' ? parseFloat(rating) : rating;
    
    stars.forEach((star, index) => {
        star.textContent = index < Math.round(numericRating) ? '★' : '☆';
    });
}

// دالة لتحديث عرض التقييم
function updateRatingDisplay(average, count) {
    document.getElementById('avgRating').textContent = average;
    document.getElementById('ratingsCount').textContent = count;
    displayRatingStars(average);
}

// دالة تحميل التقييمات المعدلة
async function loadRatings() {
    if (!newsId) return;

    try {
        const { data: ratings, error } = await supabaseClient
            .from('ratings')
            .select('*')
            .eq('news_id', newsId);

        if (error) throw error;

        const total = ratings.reduce((sum, rating) => sum + rating.rating, 0);
        const average = ratings.length > 0 ? (total / ratings.length).toFixed(1) : '0.0';
        const count = ratings.length;

        updateRatingDisplay(average, count);
        setupStarRating(); // تهيئة النجوم التفاعلية

        // التحقق من تقييم المستخدم الحالي
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) await checkUserRating(user.id);
    } catch (error) {
        console.error("Error loading ratings:", error);
        showNotification('حدث خطأ أثناء تحميل التقييمات', 'error');
    }
}

// دالة تهيئة النجوم التفاعلية
function setupStarRating() {
    const stars = document.querySelectorAll('.rating-stars span');
    const ratingMessage = document.getElementById('ratingMessage');
    
    stars.forEach(star => {
        star.addEventListener('mouseover', () => {
            const value = parseInt(star.dataset.value);
            stars.forEach((s, i) => {
                s.classList.toggle('active', i < value);
            });
            ratingMessage.textContent = getRatingText(value);
        });

        star.addEventListener('mouseout', () => {
            stars.forEach(s => s.classList.remove('active'));
            ratingMessage.textContent = '';
        });

        star.addEventListener('click', async () => {
            const value = parseInt(star.dataset.value);
            await submitRating(value);
        });
    });
}

// دالة الحصول على نص التقييم
function getRatingText(rating) {
    const texts = {
        1: 'سيء',
        2: 'غير جيد',
        3: 'متوسط',
        4: 'جيد',
        5: 'ممتاز'
    };
    return texts[rating] || '';
}

// دالة إرسال التقييم
async function submitRating(rating) {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        const userId = user?.id || null;
        
        const ratingKey = `rated_${newsId}_${userId || 'guest'}`;
        if (localStorage.getItem(ratingKey)) {
            document.getElementById('ratingMessage').textContent = 'لقد قمت بالتقييم مسبقاً';
            return;
        }

        const { error } = await supabaseClient.rpc('upsert_rating', {
            p_news_id: newsId,
            p_user_id: userId,
            p_rating: rating
        });

        if (error) throw error;

        localStorage.setItem(ratingKey, 'true');
        document.getElementById('ratingMessage').textContent = `شكراً لك! تقييمك: ${rating} نجوم`;
        await loadRatings();
    } catch (error) {
        console.error("Error submitting rating:", error);
        document.getElementById('ratingMessage').textContent = 'حدث خطأ أثناء حفظ التقييم';
    }
}













































































































































