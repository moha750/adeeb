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
      // autoplay: true,
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







































