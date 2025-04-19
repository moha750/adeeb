document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.getElementById('menuToggle');
    const nav = document.getElementById('nav');
    const navItems = document.querySelectorAll('.nav a, .nav .mobile-only');
  
    // إنشاء أنيميشن GSAP
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
  
    // حدث النقر على زر القائمة
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
  
    // إغلاق القائمة عند النقر خارجها
    document.addEventListener('click', function(e) {
      if (!nav.contains(e.target) && e.target !== menuToggle && !menuToggle.contains(e.target)) {
        if (menuToggle.classList.contains('active')) {
          menuToggle.classList.remove('active');
          document.body.style.overflow = '';
          menuAnimation.reverse();
        }
      }
    });
  });





































    // Animation for cards
    document.addEventListener('DOMContentLoaded', function() {
        const cards = document.querySelectorAll('.work-card');
        
        const animateCards = () => {
          cards.forEach((card, index) => {
            setTimeout(() => {
              card.classList.add('animated');
            }, 200 * index);
          });
        };
        
        // Intersection Observer for better performance
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              animateCards();
              observer.unobserve(entry.target);
            }
          });
        }, {threshold: 0.1});
        
        observer.observe(document.querySelector('.our-works'));
      });


      
  document.addEventListener("DOMContentLoaded", function () {
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
  });




























  // أضف هذا الكود في ملف script.js
// Counter Animation for Achievements
document.addEventListener('DOMContentLoaded', function() {
  const counters = document.querySelectorAll('.achievement-number');
  const speed = 2500; // Animation duration in ms
  
  function animateCounters() {
    counters.forEach(counter => {
      const target = +counter.getAttribute('data-count');
      const count = +counter.innerText;
      const increment = target / speed;
      
      if (count < target) {
        counter.innerText = Math.ceil(count + increment);
        setTimeout(animateCounters, 1);
      } else {
        counter.innerText = target;
      }
    });
  }
  
  // Start animation when section is in view
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounters();
        observer.unobserve(entry.target);
      }
    });
  }, {threshold: 0.5});
  
  observer.observe(document.querySelector('.achievements'));
});





















document.addEventListener('DOMContentLoaded', function() {
    // تسجيل ScrollTrigger مع GSAP
    gsap.registerPlugin(ScrollTrigger);
    
    // تأثيرات الظهور للبطاقات
    gsap.to(".achievement-card", {
        opacity: 1,
        y: 0,
        duration: 1,
        stagger: 0.2,
        ease: "back.out",
        scrollTrigger: {
            trigger: ".achievements",
            start: "top 70%",
            toggleActions: "play none none none"
        },
        onComplete: animateAll
    });
    
    function animateAll() {
        animateCounters();
        animateProgressBars();
    }
    
    // عداد الأرقام
    function animateCounters() {
        document.querySelectorAll('.achievement-number').forEach(counter => {
            const target = +counter.getAttribute('data-count');
            const duration = 2;
            const start = 0;
            const increment = target / (duration * 60);
            
            const updateCounter = () => {
                const current = +counter.textContent;
                if (current < target) {
                    counter.textContent = Math.ceil(current + increment);
                    setTimeout(updateCounter, 1000/60);
                } else {
                    counter.textContent = target;
                }
            };
            
            updateCounter();
        });
    }
    
    // شريط التقدم
    function animateProgressBars() {
        gsap.to(".progress-fill", {
            width: (i, el) => el.getAttribute("data-width"),
            duration: 2,
            ease: "power3.out",
            stagger: 0.2
        });
    }
    
    // تأثير الدوران للأيقونات عند hover
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