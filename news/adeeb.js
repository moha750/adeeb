// في بداية ملف adeeb.js
// إعدادات Supabase (نفس الإعدادات المستخدمة في admin.js)
const supabaseUrl = 'https://ihawihvbhynxexawjajz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloYXdpaHZiaHlueGV4YXdqYWp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4MzgyOTksImV4cCI6MjA2MzQxNDI5OX0.19-qWfJUqv8Y5WYkts36dXsx_kxDBCGbJDBnx2hQUNg';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// ======================== عرض الأخبار ========================
function initNews() {
  const newsContainer = document.getElementById('newsContainer');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const pagination = document.getElementById('pagination');

  if (!newsContainer) return;

  let allNews = [];
  let filteredNews = [];
  let currentFilter = 'all';
  let currentPage = 1;
  const perPage = 4;

  async function loadNews() {
    try {
      newsContainer.innerHTML = `
        <div class="loading">
          <div class="loading-spinner">
            <div class="spinner-circle"></div>
            <img src="https://lh3.googleusercontent.com/d/195w-tUBF_VKwFOm3Sh06fmwnlYzIyw0e" 
                 class="spinner-logo" alt="شعار نادي أديب">
          </div>
          <p>جاري تحميل الأخبار...</p>
        </div>
      `;

      const { data: newsList, error } = await supabaseClient
        .from('news')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      allNews = newsList || [];
      filteredNews = [...allNews];
      renderNews();
    } catch (error) {
      console.error("Error getting news: ", error);
      newsContainer.innerHTML = `
        <div class="error">
          <i class="fas fa-exclamation-triangle"></i>
          <p>حدث خطأ أثناء تحميل الأخبار</p>
          <button class="retry-btn" onclick="initNews()">إعادة المحاولة</button>
        </div>
      `;
    }
  }

function filterNews(category) {
  currentFilter = category;
  currentPage = 1;
  if (category === 'all') {
    filteredNews = [...allNews];
  } else {
    filteredNews = allNews.filter(news => news.category === category);
  }
  renderNews();
  updateActiveFilterBtn();
}

  function renderNews() {
    const start = (currentPage - 1) * perPage;
    const end = start + perPage;
    const visibleNews = filteredNews.slice(start, end);
    newsContainer.innerHTML = '';

    if (visibleNews.length === 0) {
      newsContainer.innerHTML = `
        <div class="no-news">
          <i class="far fa-newspaper"></i>
          <p>لا توجد أخبار متاحة حالياً</p>
        </div>
      `;
      return;
    }

  visibleNews.forEach(news => {
    const newsDate = new Date(news.created_at).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const newsCard = `
      <div class="news-card" data-category="${news.category || 'عام'}">
        <div class="news-card-header">
          ${news.image_url ? `<img src="${news.image_url}" alt="${news.title}" class="news-image">` : `
            <div class="news-image-placeholder">
              <i class="far fa-newspaper"></i>
            </div>
          `}
          <div class="news-badge">
            ${news.category || 'عام'}
          </div>
        </div>
        <div class="news-card-content">
          <div class="news-meta">
            <span class="news-date"><i class="far fa-calendar-alt"></i> ${newsDate}</span>
            <span class="news-views"><i class="far fa-eye"></i> ${news.views || 0}</span>
          </div>
          <h3 class="news-title">${news.title}</h3>
          <p class="news-excerpt">${stripHtml(news.content).substring(0, 60)}...</p>
          <div class="news-actions">
            <a href="news.html?id=${news.id}" class="read-more">
              اقرأ المزيد <i class="fas fa-arrow-left"></i>
            </a>
            <div class="news-social">
              <a href="#" class="share-btn" data-id="${news.id}">
                <i class="fas fa-share-alt"></i>
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
    newsContainer.innerHTML += newsCard;
  });

    updatePagination();

    document.querySelectorAll('.share-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const newsId = btn.getAttribute('data-id');
        const news = allNews.find(n => n.id == newsId);
        shareNews(news);
      });
    });
  }

  function updatePagination() {
  if (!pagination) return;

  const totalPages = Math.ceil(filteredNews.length / perPage);
  pagination.innerHTML = '';

  // زر السابق
  const prevBtn = document.createElement('button');
  prevBtn.textContent = 'السابق';
  prevBtn.className = 'pagination-btn nav-btn';
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderNews();
    }
  });
  pagination.appendChild(prevBtn);

  // تحديد نطاق الصفحات المرئية (نطاق 4 صفحات)
let startPage = Math.max(1, currentPage - 1);
let endPage = Math.min(totalPages, startPage + 3);
if (endPage - startPage < 3) {
  startPage = Math.max(1, endPage - 3);
}

  // إذا كان هناك صفحات قبل النطاق الحالي نعرض ...
  if (startPage > 1) {
    const dotsStart = document.createElement('span');
    dotsStart.textContent = '...';
    dotsStart.className = 'pagination-dots';
    pagination.appendChild(dotsStart);
  }

  // أزرار الصفحات
  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
    btn.addEventListener('click', () => {
      currentPage = i;
      renderNews();
    });
    pagination.appendChild(btn);
  }

  // إذا كان هناك صفحات بعد النطاق الحالي نعرض ...
  if (endPage < totalPages) {
    const dotsEnd = document.createElement('span');
    dotsEnd.textContent = '...';
    dotsEnd.className = 'pagination-dots';
    pagination.appendChild(dotsEnd);
  }

  // زر التالي
  const nextBtn = document.createElement('button');
  nextBtn.textContent = 'التالي';
  nextBtn.className = 'pagination-btn nav-btn';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderNews();
    }
  });
  pagination.appendChild(nextBtn);
}

  function updateActiveFilterBtn() {
    filterBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === currentFilter);
    });
  }

  function shareNews(news) {
    if (navigator.share) {
      navigator.share({
        title: news.title,
        text: news.content.substring(0, 100),
        url: window.location.href + `news.html?id=${news.id}`
      }).catch(err => {
        console.log('Error sharing:', err);
        showShareFallback(news);
      });
    } else {
      showShareFallback(news);
    }
  }

  function showShareFallback(news) {
    Swal.fire({
      title: 'مشاركة الخبر',
      html: `
        <p>شارك هذا الخبر عبر:</p>
        <div class="share-options">
          <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(news.title)}&url=${encodeURIComponent(window.location.href + `news.html?id=${news.id}`)}" target="_blank" class="social-share twitter"><i class="fab fa-twitter"></i></a>
          <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href + `news.html?id=${news.id}`)}" target="_blank" class="social-share facebook"><i class="fab fa-facebook-f"></i></a>
          <a href="whatsapp://send?text=${encodeURIComponent(news.title + '\\n' + window.location.href + `news.html?id=${news.id}`)}" class="social-share whatsapp"><i class="fab fa-whatsapp"></i></a>
          <button onclick="copyToClipboard('${window.location.href + `news.html?id=${news.id}`}')" class="social-share copy"><i class="fas fa-copy"></i></button>
        </div>
      `,
      showConfirmButton: false,
      showCloseButton: true
    });
  }

  function getCategoryName(category) {
    const categories = {
      'events': 'فعاليات',
      'achievements': 'إنجازات',
      'announcements': 'إعلانات',
      'general': 'عام'
    };
    return categories[category] || category;
  }

  function initEvents() {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterNews(btn.dataset.filter);
      });
    });
  }

  window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text).then(() => {
      Swal.fire({
        icon: 'success',
        title: 'تم النسخ!',
        text: 'تم نسخ رابط الخبر إلى الحافظة',
        timer: 2000,
        showConfirmButton: false
      });
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  initEvents();
  loadNews();
}


// ======================== تهيئة عامة ========================
document.addEventListener('DOMContentLoaded', function () {
  // ======================== متغيرات عامة ========================
  const menuToggle = document.getElementById('menuToggle');
  const nav = document.querySelector('.nav');
  const body = document.body;
  const navLinks = document.querySelectorAll('.nav-link');
  const backToTopBtn = document.getElementById('back-to-top');
  const socialIcons = document.querySelectorAll('.social-icon');
  const chatAssistant = document.querySelector('.chat-assistant');
  const chatIcon = document.querySelector('.chat-icon');
  const chatBox = document.querySelector('.chat-box');
  const closeChat = document.querySelector('.close-chat');
  const chatMessages = document.querySelector('.chat-messages');
  const chatInput = document.querySelector('.chat-input-area input');
  const sendBtn = document.querySelector('.send-btn');
  const typingIndicator = document.querySelector('.typing-indicator');

  // ======================== وظائف القائمة ========================
  function initMenu() {
    menuToggle.addEventListener('click', function () {
      this.classList.toggle('active');
      nav.classList.toggle('active');
      body.style.overflow = nav.classList.contains('active') ? 'hidden' : '';
    });

    navLinks.forEach(link => {
      link.addEventListener('click', function () {
        if (window.innerWidth <= 992) {
          menuToggle.classList.remove('active');
          nav.classList.remove('active');
          body.style.overflow = '';
        }
      });
    });

    document.addEventListener('click', function (e) {
      if (!nav.contains(e.target) && !menuToggle.contains(e.target) && window.innerWidth <= 992) {
        menuToggle.classList.remove('active');
        nav.classList.remove('active');
        body.style.overflow = '';
      }
    });
  }

  // ======================== وظائف عامة ========================
  function initGeneralFunctions() {
    // تحديث سنة حقوق النشر
    document.getElementById('year').textContent = new Date().getFullYear();

    // زر العودة للأعلى
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    window.addEventListener('scroll', () => {
      backToTopBtn.style.opacity = window.pageYOffset > 300 ? '1' : '0';
      backToTopBtn.style.visibility = window.pageYOffset > 300 ? 'visible' : 'hidden';
    });

    // تلميحات الأدوات للأيقونات الاجتماعية
    socialIcons.forEach(icon => {
      icon.addEventListener('mouseenter', function () {
        const tooltip = this.querySelector('.social-wave');
        tooltip && (tooltip.style.top = '0');
      });

      icon.addEventListener('mouseleave', function () {
        const tooltip = this.querySelector('.social-wave');
        tooltip && (tooltip.style.top = '100%');
      });
    });

    // زر لوحة التحكم
    const adminBtn = document.getElementById('adminBtn');
    if (adminBtn) {
      adminBtn.addEventListener('click', function (e) {
        e.preventDefault();

        Swal.fire({
          title: '<span style="font-family:\'fbb\';color:#274060">تسجيل الدخول</span>',
          html: `
          <div style="font-family:'fr';color:#64748b;margin-bottom:20px">
            <div class="form-group" style="margin-bottom:15px">
              <label style="display:block;margin-bottom:5px">اسم المستخدم</label>
              <input type="text" id="adminUsername" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px">
            </div>
            <div class="form-group">
              <label style="display:block;margin-bottom:5px">كلمة المرور</label>
              <input type="password" id="adminPassword" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px">
            </div>
          </div>
        `,
          showCancelButton: true,
          confirmButtonText: 'دخول',
          cancelButtonText: 'إلغاء',
          confirmButtonColor: '#3d8fd6',
          preConfirm: () => {
            const username = document.getElementById('adminUsername').value;
            const password = document.getElementById('adminPassword').value;

            if (!username || !password) {
              Swal.showValidationMessage('يجب إدخال اسم المستخدم وكلمة المرور');
              return false;
            }

            // هنا يمكنك إضافة التحقق من بيانات الدخول
            return { username, password };
          }
        }).then((result) => {
          if (result.isConfirmed) {
            // إذا كانت بيانات الدخول صحيحة، توجيه إلى لوحة التحكم
            window.location.href = 'admin/dashboard.html';
          }
        });
      });
    }
  }



  // ======================== مساعد الدردشة ========================
  function initChatAssistant() {
    const quickQuestions = [
      "شنو هو أدِيب🤔",
      "كيف أصير في أدِيب🪶",
      "شنو هي لجان النادي📃",
      "كيف مُمكن أتواصل معكم💬"
    ];

    const botResponses = {
      "شنو هو أدِيب🤔": "نادي طلابي في جامعة الملك فيصل.",
      "كيف أصير في أدِيب🪶": "نفتح التسجيل كل سمستر دراسي.",
      "شنو هي لجان النادي📃": "لجان نادي أديب:\n- لجنة التأليف\n- لجنة الرواة\n- لجنة الفعاليات\n- لجنة السفراء\n- لجنة الإنتاج\n- لجنة التسويق\n- لجنة التصميم\n\nيمكنك الانضمام لأي لجنة تناسب مهاراتك.",
      "كيف مُمكن أتواصل معكم💬": "مقر نادي أديب:\nجامعة الملك فيصل - عمادة شؤون الطلاب\nالأحساء، المملكة العربية السعودية\n\nساعات العمل: من الأحد إلى الخميس، 8 صباحاً إلى 3 مساءً."
    };

    function sendMessage() {
      const message = chatInput.value.trim();
      if (message) {
        addMessage(message, 'user');
        chatInput.value = '';
        typingIndicator.classList.add('active');

        setTimeout(() => {
          typingIndicator.classList.remove('active');
          let botResponse = botResponses[message] ||
            "شُكرًا لرسالتك☺️ <br><br> تقدر تسألني عن: <br> - شنو هو أدِيب🤔 <br> - كيف أصير في أدِيب🪶 <br> - شنو هي لجان النادي📃 <br> - كيف مُمكن أتواصل معكم💬 <br>";

          addMessage(botResponse, 'bot');

          if (!botResponses[message]) {
            setTimeout(() => addQuickQuestions(), 500);
          }
        }, 1500 + Math.random() * 2000);
      }
    }

    function addQuickQuestions() {
      const quickReplies = document.createElement('div');
      quickReplies.classList.add('quick-replies');

      quickQuestions.forEach(question => {
        const btn = document.createElement('button');
        btn.classList.add('quick-reply-btn');
        btn.textContent = question;
        btn.addEventListener('click', () => {
          chatInput.value = question;
          sendMessage();
          quickReplies.remove();
        });
        quickReplies.appendChild(btn);
      });

      const messageDiv = document.createElement('div');
      messageDiv.classList.add('message', 'bot-message');
      messageDiv.appendChild(quickReplies);
      chatMessages.appendChild(messageDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function addMessage(text, sender) {
      const now = new Date();
      const timeString = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

      const messageDiv = document.createElement('div');
      messageDiv.classList.add('message', `${sender}-message`);

      const messageContent = document.createElement('div');
      messageContent.classList.add('message-content');
      messageContent.innerHTML = `<p>${text.replace(/\n/g, '<br>')}</p>`;

      const messageTime = document.createElement('div');
      messageTime.classList.add('message-time');
      messageTime.textContent = timeString;

      messageDiv.appendChild(messageContent);
      messageDiv.appendChild(messageTime);

      chatMessages.appendChild(messageDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function playNotificationSound() {
      const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-positive-interface-beep-221.mp3');
      audio.volume = 0.3;
      audio.play().catch(e => console.log('Audio play failed:', e));
    }

    chatIcon.addEventListener('click', () => {
      chatAssistant.classList.add('active');
      document.querySelector('.notification-badge').style.display = 'none';
      chatInput.focus();

      if (!chatAssistant.dataset.welcomed) {
        setTimeout(() => {
          addMessage('أهلاً أهلاً منور موقعنا!🤩<br>كيف أقدر أساعدك؟🤔', 'bot');
          chatAssistant.dataset.welcomed = 'true';
        }, 700);
      }
    });

    closeChat.addEventListener('click', () => {
      chatAssistant.classList.remove('active');
    });

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => e.key === 'Enter' && sendMessage());

    setTimeout(() => {
      if (!chatAssistant.classList.contains('active')) {
        document.querySelector('.notification-badge').style.display = 'flex';
        playNotificationSound();
      }
    }, 5000);
  }

  // ======================== معالجة النماذج ========================
  function initForms() {
    // نموذج التواصل
    const scriptURLform = 'https://script.google.com/macros/s/AKfycbwW--KhgxMltR6sko0Fl8ENJ9gwGlUWRfdsG6e_-8pGXFGxtGlJA00rcLf69hMV-sjm/exec';
    const formform = document.forms['contactForm'];

    formform.addEventListener('submit', async (e) => {
      e.preventDefault();

      const loadingAlert = Swal.fire({
        html: `<div style="font-family:'fm';color:#274060;margin-top:15px">جاري معالجة طلبك...</div>
              <div class="progress-bar" style="height:6px;background:#f1f5f9;border-radius:3px;margin-top:20px;overflow:hidden">
                <div class="progress" style="height:100%;width:0%;background:linear-gradient(90deg,#3d8fd6,#274060);transition:width 0.4s ease"></div>
              </div>`,
        showConfirmButton: false,
        allowOutsideClick: false,
        didOpen: () => {
          const progressBar = document.querySelector('.progress');
          let width = 0;
          const interval = setInterval(() => {
            width += 5;
            progressBar.style.width = width + '%';
            if (width >= 90) clearInterval(interval);
          }, 200);
        }
      });

      try {
        const response = await fetch(scriptURLform, {
          method: 'POST',
          body: new FormData(formform)
        });

        await Swal.close();

        if (response.ok) {
          Swal.fire({
            html: `<div style="margin-top:20px">
                  <h3 style="font-family:'fbb';color:#274060">تم الإرسال بنجاح!</h3>
                  <p style="font-family:'fr';color:#64748b">سيتم الرد عليك خلال 24 ساعة</p>
                </div>`,
            showConfirmButton: true,
            confirmButtonText: 'حسناً',
            icon: "success",
            timer: 5000,
            timerProgressBar: true,
            willClose: () => formform.reset()
          });
        } else {
          throw new Error('فشل في إرسال النموذج');
        }
      } catch (error) {
        await Swal.close();
        Swal.fire({
          title: '<i class="fas fa-times-circle" style="color:#f27474;font-size:60px"></i>',
          html: `<div style="margin-top:20px">
                <h3 style="font-family:'fbb';color:#274060">حدث خطأ!</h3>
                <p style="font-family:'fr';color:#64748b">${error.message || 'يرجى المحاولة مرة أخرى لاحقًا'}</p>
              </div>`,
          confirmButtonText: 'حاول مرة أخرى',
          showCancelButton: true,
          cancelButtonText: 'إلغاء'
        });
      }
    });

    // نموذج النشرة البريدية
    const scriptURL = 'https://script.google.com/macros/s/AKfycbzEr92YPUxGOant4pbvI5NEqStWJ1APtHg1jwa3a3Z9vovUmC5XbkjVlxzVDi6ufi7-bA/exec';
    const form = document.forms['newsletterForm'];

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const loadingAlert = Swal.fire({
        html: `<div style="font-family:'fm';color:#274060;margin-top:15px">جاري معالجة طلبك...</div>
              <div class="progress-bar" style="height:6px;background:#f1f5f9;border-radius:3px;margin-top:20px;overflow:hidden">
                <div class="progress" style="height:100%;width:0%;background:linear-gradient(90deg,#3d8fd6,#274060);transition:width 0.4s ease"></div>
              </div>`,
        showConfirmButton: false,
        allowOutsideClick: false,
        didOpen: () => {
          const progressBar = document.querySelector('.progress');
          let width = 0;
          const interval = setInterval(() => {
            width += 5;
            progressBar.style.width = width + '%';
            if (width >= 90) clearInterval(interval);
          }, 200);
        }
      });

      try {
        const response = await fetch(scriptURL, {
          method: 'POST',
          body: new FormData(form)
        });

        await Swal.close();

        if (response.ok) {
          Swal.fire({
            html: `<div style="margin-top:20px">
                  <h3 style="font-family:'fbb';color:#274060">تمّ الإشتراك بِنجاح!🥳</h3>
                  <p style="font-family:'fr';color:#64748b">ستصلك النشرة البريدية</p>
                </div>`,
            showConfirmButton: true,
            confirmButtonText: 'حسناً',
            icon: "success",
            timer: 5000,
            timerProgressBar: true,
            willClose: () => form.reset()
          });
        } else {
          throw new Error('فشل في إرسال النموذج');
        }
      } catch (error) {
        await Swal.close();
        Swal.fire({
          title: '<i class="fas fa-times-circle" style="color:#f27474;font-size:60px"></i>',
          html: `<div style="margin-top:20px">
                <h3 style="font-family:'fbb';color:#274060">حدث خطأ!</h3>
                <p style="font-family:'fr';color:#64748b">${error.message || 'يرجى المحاولة مرة أخرى لاحقًا'}</p>
              </div>`,
          confirmButtonText: 'حاول مرة أخرى',
          showCancelButton: true,
          cancelButtonText: 'إلغاء'
        });
      }
    });

    // زر الانضمام
    document.getElementById('joinBtn').addEventListener('click', function (e) {
      e.preventDefault();

      Swal.fire({
        title: '<span style="font-family:\'fbb\';color:#274060">التسجيل مغلق حالياً</span>',
        html: '<div style="font-family:\'fr\';color:#64748b">سيتم فتح باب التسجيل قريباً في بداية الفصل الدراسي القادم.<br><br>تابعنا على وسائل التواصل الاجتماعي لمعرفة المواعيد.</div>',
        icon: 'info',
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#3d8fd6',
        customClass: { popup: 'custom-swal-popup' }
      });
    });
  }

  // ======================== تأثيرات الرسوم المتحركة ========================
  function initAnimations() {
    // تأثيرات قسم الرعاة
    new Swiper(".sponsors-swiper", {
      slidesPerView: 1,
      spaceBetween: 30,
      loop: true,
      autoplay: { delay: 3000, disableOnInteraction: false },
      breakpoints: { 640: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } },
      navigation: {
        nextEl: ".sponsors-swiper .swiper-button-next",
        prevEl: ".sponsors-swiper .swiper-button-prev"
      }
    });
  }

  // ======================== تهيئة جميع الوظائف ========================
  function initAll() {
    initNews(); // أضفنا هذا السطر
    initMenu();
    initGeneralFunctions();
    initChatAssistant();
    initForms();
    initAnimations();
  }

  // بدء تشغيل التطبيق
  initAll();
});



























































// Highlight nav link on scroll
const sections = document.querySelectorAll("section[id]");
const navLinksArray = document.querySelectorAll(".nav-link");

window.addEventListener("scroll", () => {
  let current = "";

  sections.forEach(section => {
    const sectionTop = section.offsetTop - 100;
    const sectionHeight = section.offsetHeight;
    if (pageYOffset >= sectionTop && pageYOffset < sectionTop + sectionHeight) {
      current = section.getAttribute("id");
    }
  });

  navLinksArray.forEach(link => {
    link.classList.remove("active");
    if (link.getAttribute("href") === `#${current}`) {
      link.classList.add("active");
    }
  });
});

function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}
