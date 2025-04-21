document.addEventListener('DOMContentLoaded', function() {
  // GSAP Animation for Menu
  const menuToggle = document.getElementById('menuToggle');
  const nav = document.getElementById('nav');
  const navItems = document.querySelectorAll('.nav a, .nav .mobile-only');
  
  const menuAnimation = gsap.timeline({paused: true})
      .to(nav, {
          right: 0,
          duration: 0.5,
          ease: "power2.out"
      })
      .to(navItems, {
          opacity: 1,
          x: 0,
          stagger: 0.1,
          duration: 0.3,
          ease: "back.out"
      }, "-=0.4");
  
  menuToggle.addEventListener('click', function() {
      this.classList.toggle('active');
      if (this.classList.contains('active')) {
          document.body.style.overflow = 'hidden';
          menuAnimation.play();
      } else {
          document.body.style.overflow = '';
          menuAnimation.reverse();
      }
  });
  
  document.addEventListener('click', function(e) {
      if (!nav.contains(e.target) && e.target !== menuToggle && !menuToggle.contains(e.target)) {
          if (menuToggle.classList.contains('active')) {
              menuToggle.classList.remove('active');
              document.body.style.overflow = '';
              menuAnimation.reverse();
          }
      }
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
      
      const icon = card.querySelector('.achievement-icon');
      gsap.to(icon, {
          rotationY: 360,
          duration: 0.8,
          ease: "back.out"
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















// Ink blot animation
gsap.to(".ink-blot-1", {
  duration: 20,
  x: 50,
  y: 30,
  scale: 1.2,
  repeat: -1,
  yoyo: true,
  ease: "sine.inOut"
});

gsap.to(".ink-blot-2", {
  duration: 25,
  x: -40,
  y: -20,
  scale: 1.3,
  repeat: -1,
  yoyo: true,
  ease: "sine.inOut",
  delay: 5
});

// Title letter spacing animation
gsap.from(".calligraphy-title", {
  scrollTrigger: {
    trigger: ".adeebbook",
    start: "top 70%",
    toggleActions: "play none none none"
  },
  letterSpacing: "20px",
  opacity: 0,
  duration: 1.5,
  ease: "power3.out"
});

// Feature cards 3D effect
document.querySelectorAll('.feature-card').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const xAxis = (window.innerWidth / 2 - e.pageX) / 25;
    const yAxis = (window.innerHeight / 2 - e.pageY) / 25;
    gsap.to(card, {
      duration: 0.5,
      rotateY: xAxis,
      rotateX: yAxis,
      ease: "power1.out"
    });
  });
  
  card.addEventListener('mouseleave', () => {
    gsap.to(card, {
      duration: 0.7,
      rotateY: 0,
      rotateX: 0,
      ease: "elastic.out(1, 0.5)"
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













