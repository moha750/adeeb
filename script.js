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
