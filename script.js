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

// Close menu when clicking on a nav link
const navLinks = document.querySelectorAll('.nav-link');
navLinks.forEach(link => {
    link.addEventListener('click', function() {
        if (window.innerWidth <= 992) { // Only for mobile view
            menuToggle.classList.remove('active');
            nav.classList.remove('active');
            body.style.overflow = '';
        }
    });
});

// Close menu when clicking outside
document.addEventListener('click', function(e) {
    if (!nav.contains(e.target) && !menuToggle.contains(e.target)) {
        if (window.innerWidth <= 992) { // Only for mobile view
            menuToggle.classList.remove('active');
            nav.classList.remove('active');
            body.style.overflow = '';
        }
    }
});










document.addEventListener('DOMContentLoaded', function() {




















  
// تفعيل أكورديون الأسئلة الشائعة - محسن
document.querySelectorAll('.faq-question').forEach(question => {
  question.addEventListener('click', () => {
    const faqItem = question.parentElement;
    const isActive = faqItem.classList.contains('active');
    
    // إغلاق جميع العناصر أولاً
    document.querySelectorAll('.faq-item').forEach(item => {
      item.classList.remove('active');
    });
    
    // إذا لم يكن العنصر نشطاً، افتحه
    if (!isActive) {
      faqItem.classList.add('active');}
  });
});

// تأثيرات GSAP للقسم - محسن
gsap.utils.toArray(".faq-item").forEach((item, index) => {
  gsap.from(item, {
    opacity: 0,
    y: 50,
    duration: 0.8,
    delay: index * 0.1,
    ease: "back.out(1.2)",
    scrollTrigger: {
      trigger: item,
      start: "top 85%",
      toggleActions: "play none none none"
    }
  });
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


  // Swiper Slider
  new Swiper(".swiper", {
      slidesPerView: 1,
      spaceBetween: 30,
      loop: true,
      autoplay: true,
      breakpoints: {
          768: { slidesPerView: 2 },
          1024: { slidesPerView: 3 }
      },
      pagination: { el: ".swiper-pagination", clickable: true },
      navigation: {
          nextEl: ".swiper-button-next",
          prevEl: ".swiper-button-prev"
      }
  });

  // Work Cards Animation
  const workCards = document.querySelectorAll('.work-card');
  const animateCards = () => {
      workCards.forEach((card, index) => {
          setTimeout(() => {
              card.classList.add('animated');
          }, 200 * index);
      });
  };
  
  const workObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
          if (entry.isIntersecting) {
              animateCards();
              workObserver.unobserve(entry.target);
          }
      });
  }, {threshold: 0.1});
  
  workObserver.observe(document.querySelector('.our-works'));

// استبدال قسم Achievements Counter Animation بالكود التالي:

// Achievements Counter Animation
gsap.registerPlugin(ScrollTrigger);

// استبدال كود العداد الحالي بهذا الكود المحسن
function initAchievementCounters() {
  const counters = document.querySelectorAll('.achievement-number');
  
  counters.forEach(counter => {
      const target = +counter.getAttribute('data-count');
      counter.setAttribute('data-original', target);
      counter.textContent = '0';
      
      // إضافة فاصلة كل 3 أرقام للتنسيق
      if (target >= 1000) {
          counter.style.fontSize = '2.4rem';
      }
  });
}

// تشغيل العداد مع تأثيرات GSAP
function animateAchievementCounters() {
  const counters = document.querySelectorAll('.achievement-number');
  
  counters.forEach(counter => {
      const target = +counter.getAttribute('data-original');
      const duration = 2; // المدة بالثواني
      
      gsap.fromTo(counter, 
          { textContent: 0 },
          {
              textContent: target,
              duration: duration,
              ease: "power1.out",
              snap: { textContent: 1 },
              onUpdate: function() {
                  const value = Math.floor(this.targets()[0].textContent);
                  counter.textContent = value.toLocaleString();
              },
              onComplete: function() {
                  counter.textContent = target.toLocaleString();
              }
          }
      );
  });
  
  // إضافة تأثيرات للبطاقات
  gsap.to(".achievement-card", {
      opacity: 1,
      y: 0,
      rotationY: 0,
      duration: 1,
      stagger: 0.2,
      ease: "back.out",
      onComplete: function() {
          document.querySelectorAll('.achievement-card').forEach(card => {
              card.classList.add('animated');
          });
      }
  });
}

// تهيئة العداد عند التحميل
initAchievementCounters();

// إنشاء ScrollTrigger لإعادة التشغيل عند التمرير
ScrollTrigger.create({
  trigger: ".achievements",
  start: "top 70%",
  onEnter: animateAchievementCounters,
  onEnterBack: animateAchievementCounters,
  markers: false
});

// تأثيرات hover للبطاقات
document.querySelectorAll('.achievement-card').forEach(card => {
  card.addEventListener('mouseenter', () => {
      gsap.to(card, {
          y: -10,
          scale: 1.03,
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
          duration: 0.5
      });
      

  });
  
  card.addEventListener('mouseleave', () => {
      gsap.to(card, {
          y: 0,
          scale: 1,
          boxShadow: "0 15px 30px rgba(0,0,0,0.3)",
          duration: 0.5
      });
  });
});




// Update copyright year
document.getElementById('year').textContent = new Date().getFullYear();

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

// Initialize tooltips for social icons
const socialIcons = document.querySelectorAll('.social-icon');
socialIcons.forEach(icon => {
  icon.addEventListener('mouseenter', function() {
    const tooltip = this.querySelector('.social-wave');
    tooltip.style.top = '0';
  });
  
  icon.addEventListener('mouseleave', function() {
    const tooltip = this.querySelector('.social-wave');
    tooltip.style.top = '100%';
  });
});
















// Enhanced Chat Assistant
const chatAssistant = document.querySelector('.chat-assistant');
const chatIcon = document.querySelector('.chat-icon');
const chatBox = document.querySelector('.chat-box');
const closeChat = document.querySelector('.close-chat');
const chatMessages = document.querySelector('.chat-messages');
const chatInput = document.querySelector('.chat-input-area input');
const sendBtn = document.querySelector('.send-btn');
const attachBtn = document.querySelector('.attach-btn');
const typingIndicator = document.querySelector('.typing-indicator');

// Toggle chat box
chatIcon.addEventListener('click', () => {
  chatAssistant.classList.add('active');
  document.querySelector('.notification-badge').style.display = 'none';
  chatInput.focus();

  // ✅ الرسالة الترحيبية بعد فتح الشات لأول مرة
  if (!chatAssistant.dataset.welcomed) {
    setTimeout(() => {
      addMessage('أهلاً أهلاً منور موقعنا!🤩<br>كيف أقدر أساعدك؟🤔', 'bot');
      chatAssistant.dataset.welcomed = 'true';
    }, 700); // نصف ثانية بعد فتح الشات
  }
});


closeChat.addEventListener('click', () => {
  chatAssistant.classList.remove('active');
});

// Sample questions for quick replies
const quickQuestions = [
  "شنو هو أدِيب🤔",
  "كيف أصير في أدِيب🪶",
  "شنو هي لجان النادي📃",
  "كيف مُمكن أتواصل معكم💬"
];

// Bot responses
const botResponses = {
  "شنو هو أدِيب🤔": "نادي طلابي في جامعة الملك فيصل.",
  "كيف أصير في أدِيب🪶": "نفتح التسجيل كل سمستر دراسي.",
  "شنو هي لجان النادي📃": "لجان نادي أديب:\n- لجنة التأليف\n- لجنة الرواة\n- لجنة الفعاليات\n- لجنة السفراء\n- لجنة الإنتاج\n- لجنة التسويق\n- لجنة التصميم\n\nيمكنك الانضمام لأي لجنة تناسب مهاراتك.",
  "كيف مُمكن أتواصل معكم💬": "مقر نادي أديب:\nجامعة الملك فيصل - عمادة شؤون الطلاب\nالأحساء، المملكة العربية السعودية\n\nساعات العمل: من الأحد إلى الخميس، 8 صباحاً إلى 3 مساءً."
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
        "شُكرًا لرسالتك☺️ <br><br> تقدر تسألني عن: <br> - شنو هو أدِيب🤔 <br> - كيف أصير في أدِيب🪶 <br> - شنو هي لجان النادي📃 <br> - كيف مُمكن أتواصل معكم💬 <br>";
      
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

// Play notification sound
function playNotificationSound() {
  const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-positive-interface-beep-221.mp3');
  audio.volume = 0.3;
  audio.play().catch(e => console.log('Audio play failed:', e));
}

// Show welcome message after 5 seconds if chat hasn't been opened
setTimeout(() => {
  if (!chatAssistant.classList.contains('active')) {
    document.querySelector('.notification-badge').style.display = 'flex';
    playNotificationSound();
  }
}, 5000);














  const scriptURLform = 'https://script.google.com/macros/s/AKfycbwW--KhgxMltR6sko0Fl8ENJ9gwGlUWRfdsG6e_-8pGXFGxtGlJA00rcLf69hMV-sjm/exec'
  const formform = document.forms['contactForm']

  // إرسال النموذج مع تأثيرات متقدمة
  formform.addEventListener('submit', async (e) => {
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
    const response = await fetch(scriptURLform, { 
      method: 'POST', 
      body: new FormData(formform) 
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
      confirmButtonText: 'حسناً',
      icon: "success",
      timer: 5000,
      timerProgressBar: true,
      willClose: () => {
        formform.reset();
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
          <h3 style="font-family:'fbb';color:#274060">تم الإرسال بنجاح!</h3>
          <p style="font-family:'fr';color:#64748b">سيتم الرد عليك خلال 24 ساعة</p>
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
































});















// تأثيرات ثلاثية الأبعاد للبطاقات
gsap.utils.toArray(".feature-card").forEach((card, index) => {
  // تأثير الظهور
  gsap.from(card, {
    opacity: 0,
    y: 50,
    rotationX: 15,
    duration: 0.8,
    delay: index * 0.15,
    scrollTrigger: {
      trigger: card,
      start: "top 80%",
      toggleActions: "play none none none"
    }
  });

  // تأثيرات التحويم
  card.addEventListener("mousemove", (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateY = (x - centerX) / 20;
    const rotateX = (centerY - y) / 20;
    
    gsap.to(card, {
      rotateX: rotateX,
      rotateY: rotateY,
      duration: 0.5
    });
  });

  card.addEventListener("mouseleave", () => {
    gsap.to(card, {
      rotateX: 0,
      rotateY: 0,
      duration: 0.5
    });
  });

  // تأثير الأيقونة
  const icon = card.querySelector(".feature-icon");
  card.addEventListener("mouseenter", () => {
    gsap.to(icon, {
      y: -10,
      scale: 1.1,
      duration: 0.5,
      ease: "back.out"
    });
  });

  card.addEventListener("mouseleave", () => {
    gsap.to(icon, {
      y: 0,
      scale: 1,
      duration: 0.5,
      ease: "back.in"
    });
  });
});















  // Initialize Sponsors Swiper
  new Swiper(".sponsors-swiper", {
    slidesPerView: 1,
    spaceBetween: 30,
    loop: true,
    autoplay: {
      delay: 3000,
      disableOnInteraction: false,
    },
    breakpoints: {
      640: { slidesPerView: 2 },
      1024: { slidesPerView: 3 }
    },
    navigation: {
      nextEl: ".sponsors-swiper .swiper-button-next",
      prevEl: ".sponsors-swiper .swiper-button-prev"
    }
  });

  // Sponsor Cards Animation
  const sponsorCards = document.querySelectorAll('.sponsor-card');
  sponsorCards.forEach((card, index) => {
    gsap.from(card, {
      opacity: 0,
      y: 50,
      duration: 0.8,
      delay: index * 0.1,
      scrollTrigger: {
        trigger: card,
        start: "top 80%",
        toggleActions: "play none none none"
      }
    });
  });










  






















  new Swiper(".board-swiper", {
    slidesPerView: 1,
    spaceBetween: 30,
    loop: true,
    autoplay: {
      delay: 5000,
      disableOnInteraction: false,
    },
    breakpoints: {
      640: { 
        slidesPerView: 2,
        spaceBetween: 20
      },
      1024: { 
        slidesPerView: 3,
        spaceBetween: 30
      }
    },
    pagination: {
      el: ".board-swiper .swiper-pagination",
      clickable: true,
    },
    navigation: {
      nextEl: ".board-swiper .swiper-button-next",
      prevEl: ".board-swiper .swiper-button-prev"
    }
  });












































  // Header Scroll Effects
const logoImg = document.querySelector('.logo-img');
const logoText = document.querySelector('.logo-text');
const progressBar = document.querySelector('.progress-bar');




















const header = document.querySelector('.header');
header.classList.add('blue');
let lastScroll = 0;

window.addEventListener('scroll', () => {
  const currentScroll = window.scrollY;

  // تغيير لون الهيدر
  if (currentScroll > 100) {
    header.classList.add('scrolled');
    header.classList.remove('blue');
  } else {
    header.classList.remove('scrolled');
    header.classList.add('blue');
  }

  // إخفاء الهيدر عند النزول وإظهاره عند الصعود
  if (currentScroll > lastScroll && currentScroll > 100) {
    header.classList.add('hidden');
  } else {
    header.classList.remove('hidden');
  }

  lastScroll = currentScroll;
});













































// ======================== تأثيرات Scroll لبقية الأقسام ========================
gsap.registerPlugin(ScrollTrigger);

// تأثير تمرير لقسم "من هو أديب"
gsap.from(".feature-card", {
  opacity: 0,
  y: 50,
  duration: 1,
  stagger: 0.2,
  scrollTrigger: {
    trigger: ".adeebbook",
    start: "top 70%",
    toggleActions: "play none none none"
  }
});

// تأثير تمرير لقسم أعمالنا
ScrollTrigger.create({
  trigger: ".our-works",
  start: "top 75%",
  once: true,
  onEnter: () => {
    document.querySelectorAll('.work-card').forEach((card, index) => {
      gsap.to(card, {
        opacity: 1,
        y: 0,
        duration: 1,
        delay: index * 0.2,
        ease: "power2.out"
      });
    });
  }
});

// تأثير تمرير لقسم الرعاة
gsap.utils.toArray(".sponsor-card").forEach((card, index) => {
  gsap.from(card, {
    opacity: 0,
    y: 50,
    duration: 0.8,
    delay: index * 0.15,
    scrollTrigger: {
      trigger: card,
      start: "top 80%",
      toggleActions: "play none none none"
    }
  });
});

// تأثير تمرير لقسم المجلس الإداري
gsap.utils.toArray(".board-card").forEach((card, index) => {
  gsap.from(card, {
    opacity: 0,
    y: 60,
    duration: 1,
    delay: index * 0.1,
    scrollTrigger: {
      trigger: card,
      start: "top 85%",
      toggleActions: "play none none none"
    }
  });
});





















































// إضافة هذا الكود لمعالجة نموذج التواصل
document.getElementById('contactForm').addEventListener('submit', function(e) {
  e.preventDefault();
  
  // جمع بيانات النموذج
  const formData = {
    name: document.getElementById('name').value,
    email: document.getElementById('email').value,
    subject: document.getElementById('subject').value,
    message: document.getElementById('message').value
  };
  
  // هنا يمكنك إضافة كود إرسال البيانات إلى الخادم
  console.log('تم إرسال النموذج:', formData);
  
  // عرض رسالة نجاح
  Swal.fire({
    title: 'تم الإرسال بنجاح!',
    text: 'شكراً لتواصلك معنا، سنرد عليك في أقرب وقت ممكن.',
    icon: 'success',
    confirmButtonText: 'حسناً',
    confirmButtonColor: '#3d8fd6'
  });
  
  // إعادة تعيين النموذج
  this.reset();
});

// تأثيرات GSAP للقسم
gsap.utils.toArray(".contact-item").forEach((item, index) => {
  gsap.from(item, {
    opacity: 0,
    y: 50,
    duration: 0.8,
    delay: index * 0.15,
    scrollTrigger: {
      trigger: item,
      start: "top 80%",
      toggleActions: "play none none none"
    }
  });
});

gsap.from(".contact-form", {
  opacity: 0,
  y: 50,
  duration: 1,
  scrollTrigger: {
    trigger: ".contact-form",
    start: "top 80%",
    toggleActions: "play none none none"
  }
});







































// إضافة هذا الكود لمعالجة نموذج النشرة البريدية
document.getElementById('newsletterForm').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const emailInput = this.querySelector('input[type="email"]');
  const email = emailInput.value;
  
  // هنا يمكنك إضافة كود إرسال البيانات إلى الخادم
  console.log('تم الاشتراك بنجاح:', email);
  
  // عرض رسالة نجاح
  Swal.fire({
    title: 'تم الاشتراك بنجاح!',
    text: 'شكراً لانضمامك إلى مجتمعنا، ستتلقى آخر الأخبار والعروض الحصرية قريباً.',
    icon: 'success',
    confirmButtonText: 'حسناً',
    confirmButtonColor: '#3d8fd6'
  });
  
  // إعادة تعيين النموذج
  this.reset();
});

// تأثيرات GSAP للقسم
gsap.utils.toArray(".benefit-item").forEach((item, index) => {
  gsap.from(item, {
    opacity: 0,
    y: 50,
    duration: 0.8,
    delay: index * 0.15,
    scrollTrigger: {
      trigger: item,
      start: "top 80%",
      toggleActions: "play none none none"
    }
  });
});

gsap.from(".newsletter-form", {
  opacity: 0,
  y: 50,
  duration: 1,
  scrollTrigger: {
    trigger: ".newsletter-form",
    start: "top 80%",
    toggleActions: "play none none none"
  }
});





































// تفعيل أكورديون الأسئلة الشائعة
document.querySelectorAll('.faq-question').forEach(question => {
  question.addEventListener('click', () => {
    const faqItem = question.parentElement;
    faqItem.classList.toggle('active');
    
    // إغلاق العناصر الأخرى عند فتح عنصر جديد
    if (faqItem.classList.contains('active')) {
      document.querySelectorAll('.faq-item').forEach(item => {
        if (item !== faqItem && item.classList.contains('active')) {
          item.classList.remove('active');
        }
      });
    }
  });
});

// تأثيرات GSAP للقسم
gsap.utils.toArray(".faq-item").forEach((item, index) => {
  gsap.from(item, {
    opacity: 0,
    y: 50,
    duration: 0.8,
    delay: index * 0.1,
    scrollTrigger: {
      trigger: item,
      start: "top 80%",
      toggleActions: "play none none none"
    }
  });
});























































