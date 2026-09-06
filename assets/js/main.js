document.addEventListener('DOMContentLoaded', function() {
  // Mobile navigation toggle
  const navToggle = document.getElementById('navToggle');
  const mainNav = document.getElementById('mainNav');
  const navOverlay = document.getElementById('navOverlay');
  
  if (navToggle && mainNav && navOverlay) {
    navToggle.addEventListener('click', function() {
      const isOpen = mainNav.classList.toggle('nav-open');
      navOverlay.classList.toggle('overlay-open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
    
    navOverlay.addEventListener('click', function() {
      mainNav.classList.remove('nav-open');
      navOverlay.classList.remove('overlay-open');
      navToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
    
    // Close nav when clicking on a link
    const navLinks = mainNav.querySelectorAll('a');
    navLinks.forEach(link => {
      link.addEventListener('click', function() {
        mainNav.classList.remove('nav-open');
        navOverlay.classList.remove('overlay-open');
        navToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }
  
  // Smooth scroll for anchor links
  const anchorLinks = document.querySelectorAll('a[href^="#"]');
  anchorLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href !== '#') {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }
    });
  });
  
  // Add fade-in animation to elements
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in-up');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);
  
  // Observe cards and sections
  const cards = document.querySelectorAll('.blog-card, .service-card, .project-card');
  cards.forEach(card => {
    observer.observe(card);
  });
  
  // Reading time calculation for blog posts
  const postContent = document.querySelector('.post-content');
  const readingTimeElement = document.querySelector('.post-reading-time');
  
  if (postContent && readingTimeElement && !readingTimeElement.textContent) {
    const text = postContent.textContent;
    const wordsPerMinute = 200;
    const words = text.trim().split(/\s+/).length;
    const readingTime = Math.ceil(words / wordsPerMinute);
    readingTimeElement.textContent = `${readingTime} min read`;
  }

  // Waybar clock - Omarchy style HH:MM
  const clock = document.getElementById('waybarClock');
  function tick() {
    if (!clock) return;
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    clock.textContent = `${hh}:${mm}`;
  }
  tick();
  setInterval(tick, 15000);
});
