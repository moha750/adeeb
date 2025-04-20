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

// تهيئة العداد
function initAchievementCounters() {
    const counters = document.querySelectorAll('.achievement-number');
    
    counters.forEach(counter => {
        counter.setAttribute('data-original', counter.getAttribute('data-count'));
        counter.textContent = '0';
    });
}

// تشغيل العداد
function animateAchievementCounters() {
    const counters = document.querySelectorAll('.achievement-number');
    const speed = 2000; // مدة الحركة بالمللي ثانية
    
    counters.forEach(counter => {
        const target = +counter.getAttribute('data-original');
        const duration = speed;
        const startTime = Date.now();
        const endTime = startTime + duration;

        const updateCounter = () => {
            const now = Date.now();
            const progress = Math.min((now - startTime) / duration, 1);
            const value = Math.floor(progress * target);
            counter.textContent = value.toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                counter.textContent = target.toLocaleString();
            }
        };

        requestAnimationFrame(updateCounter);
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
    markers: false // يمكنك تغييرها لـ true للتصحيح
});

// تأثيرات الظهور للبطاقات
gsap.to(".achievement-card", {
    opacity: 1,
    y: 0,
    duration: 1,
    stagger: 0.2,
    ease: "back.out",
    scrollTrigger: {
        trigger: ".achievements",
        start: "top 80%",
        toggleActions: "play none none none"
    }
});

// Rotate icons on hover
document.querySelectorAll('.achievement-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
        const icon = card.querySelector('.achievement-icon');
        gsap.to(icon, {
            rotationY: 360,
            duration: 0.8,
            ease: "back.out"
        });
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