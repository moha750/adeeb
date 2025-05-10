// Initialize Swiper for breaking news
const breakingNewsSwiper = new Swiper('.breaking-news-slider', {
    slidesPerView: 1,
    spaceBetween: 30,
    loop: true,
    autoplay: {
        delay: 5000,
        disableOnInteraction: false,
    },
    pagination: {
        el: '.breaking-news-slider .swiper-pagination',
        clickable: true,
    },
    breakpoints: {
        768: {
            slidesPerView: 2,
        }
    }
});

// Filter news by category
document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        const category = this.dataset.category;
        const newsCards = document.querySelectorAll('.news-card');
        
        newsCards.forEach(card => {
            if (category === 'all' || card.dataset.category === category) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    });
});

// Load more news
document.querySelector('.load-more-btn').addEventListener('click', function() {
    // Simulate loading more news
    this.innerHTML = 'جاري التحميل <i class="fas fa-spinner fa-spin"></i>';
    
    setTimeout(() => {
        // In a real scenario, you would fetch more news from the server
        this.innerHTML = 'تم التحميل <i class="fas fa-check"></i>';
        setTimeout(() => {
            this.innerHTML = 'تحميل المزيد <i class="fas fa-sync-alt"></i>';
        }, 2000);
    }, 1500);
});

// Back to top button
const backToTopBtn = document.getElementById('back-to-top');
backToTopBtn.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// Show/hide back to top button based on scroll position
window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
        backToTopBtn.style.opacity = '1';
        backToTopBtn.style.visibility = 'visible';
    } else {
        backToTopBtn.style.opacity = '0';
        backToTopBtn.style.visibility = 'hidden';
    }
});

// Update copyright year
document.getElementById('year').textContent = new Date().getFullYear();

// Chat assistant functionality
const chatAssistant = document.querySelector('.chat-assistant');
const chatIcon = document.querySelector('.chat-icon');
const chatBox = document.querySelector('.chat-box');
const closeChat = document.querySelector('.close-chat');
const chatMessages = document.querySelector('.chat-messages');
const chatInput = document.querySelector('.chat-input-area input');
const sendBtn = document.querySelector('.send-btn');
const typingIndicator = document.querySelector('.typing-indicator');

// Toggle chat box
chatIcon.addEventListener('click', () => {
    chatAssistant.classList.add('active');
    document.querySelector('.notification-badge').style.display = 'none';
    chatInput.focus();
});

closeChat.addEventListener('click', () => {
    chatAssistant.classList.remove('active');
});

// Sample questions for quick replies
const quickQuestions = [
    "ما هي آخر أخبار النادي؟",
    "كيف أشارك في الفعاليات؟",
    "ما هي مواعيد اللقاءات القادمة؟",
    "كيف أنضم إلى لجنة في النادي؟"
];

// Bot responses
const botResponses = {
    "ما هي آخر أخبار النادي؟": "يمكنك الاطلاع على آخر أخبار النادي في قسم الأخبار الرئيسي. لدينا أخبار عن ورش العمل القادمة والمسابقات والإنجازات.",
    "كيف أشارك في الفعاليات؟": "للمشاركة في الفعاليات، يمكنك التسجيل عبر الروابط المرفقة مع كل فعالية، أو زيارة مقر النادي خلال أوقات العمل.",
    "ما هي مواعيد اللقاءات القادمة؟": "اللقاء القادم سيكون يوم الخميس الموافق 25 مايو في قاعة النشاط الطلابي الساعة 7 مساءً.",
    "كيف أنضم إلى لجنة في النادي؟": "يمكنك تعبئة نموذج الانضمام إلى اللجان عبر موقع النادي أو زيارة المقر الرئيسي خلال أوقات العمل."
};

// Send message function
function sendMessage() {
    const message = chatInput.value.trim();
    if (message) {
        // Add user message
        addMessage(message, 'user');
        chatInput.value = '';
        
        // Show typing indicator
        typingIndicator.classList.add('active');
        
        // Simulate bot typing delay
        setTimeout(() => {
            typingIndicator.classList.remove('active');
            
            // Check if message matches any quick question
            let botResponse = botResponses[message] || 
                "شكراً لسؤالك! يمكنني مساعدتك في معرفة:<br>- آخر أخبار النادي<br- الفعاليات القادمة<br>- كيفية الانضمام للجان<br>- مواعيد اللقاءات";
            
            // Add bot response
            addMessage(botResponse, 'bot');
            
            // Add quick questions if it's a generic response
            if (!botResponses[message]) {
                setTimeout(() => {
                    addQuickQuestions();
                }, 500);
            }
        }, 1500 + Math.random() * 2000); // Random delay between 1.5-3.5 seconds
    }
}

// Add quick reply buttons
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

// Add message to chat
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

// Send message on button click or Enter key
sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Show welcome message after 5 seconds if chat hasn't been opened
setTimeout(() => {
    if (!chatAssistant.classList.contains('active')) {
        document.querySelector('.notification-badge').style.display = 'flex';
    }
}, 5000);

// GSAP animations
// gsap.registerPlugin(ScrollTrigger);

// Animate elements on scroll
// gsap.utils.toArray(".news-card, .event-card, .gallery-item").forEach((item, index) => {
//     gsap.from(item, {
//         opacity: 0,
//         y: 50,
//         duration: 0.8,
//         delay: index * 0.1,
//         scrollTrigger: {
//             trigger: item,
//             start: "top 80%",
//             toggleActions: "play none none none"
//         }
//     });
// });

// Menu Toggle Functionality
const menuToggle = document.getElementById('menuToggle');
const nav = document.querySelector('.nav');
const body = document.body;

menuToggle.addEventListener('click', function() {
    // Toggle active class on menu toggle
    this.classList.toggle('active');
    
    // Toggle active class on navigation
    nav.classList.toggle('active');
    
    // Toggle overflow hidden on body to prevent scrolling when menu is open
    if (nav.classList.contains('active')) {
        body.style.overflow = 'hidden';
    } else {
        body.style.overflow = '';
    }
});

  // Smooth scrolling for navigation links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        // Close mobile menu if open
        if (window.innerWidth <= 992) {
          menuToggle.classList.remove('active');
          nav.classList.remove('active');
          body.style.overflow = '';
        }
        
        // Smooth scroll to target
        window.scrollTo({
          top: targetElement.offsetTop - 80, // Adjust for header height
          behavior: 'smooth'
        });
        
        // Update active link
        document.querySelectorAll('.nav-link').forEach(link => {
          link.classList.remove('active');
        });
        this.classList.add('active');
      }
    });
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

// Join button click handler
document.getElementById('joinBtn').addEventListener('click', function(e) {
    e.preventDefault();
    
    Swal.fire({
        title: '<span style="font-family:\'fbb\';color:#274060">التسجيل مغلق حالياً</span>',
        html: '<div style="font-family:\'fr\';color:#64748b">سيتم فتح باب التسجيل قريباً في بداية الفصل الدراسي القادم.<br><br>تابعنا على وسائل التواصل الاجتماعي لمعرفة المواعيد.</div>',
        icon: 'info',
        confirmButtonText: 'حسناً',
        confirmButtonColor: '#3d8fd6',
        customClass: {
            popup: 'custom-swal-popup'
        }
    });
});











const scriptURL = 'https://script.google.com/macros/s/AKfycbzEr92YPUxGOant4pbvI5NEqStWJ1APtHg1jwa3a3Z9vovUmC5XbkjVlxzVDi6ufi7-bA/exec'
const form = document.forms['newsletterForm']

// إرسال النموذج مع تأثيرات متقدمة
form.addEventListener('submit', async (e) => {
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
    confirmButtonText: 'حسناً',
    icon: "success",
    timer: 5000,
    timerProgressBar: true,
    willClose: () => {
      form.reset();
    }
  });
  } else {
    throw new Error('فشل في إرسال النموذج');
  }
} catch (error) {
  await Swal.close();
  // رسالة خطأ متحركة
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
