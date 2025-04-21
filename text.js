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