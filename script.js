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