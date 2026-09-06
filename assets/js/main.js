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
  
  // Reveal on scroll (.reveal -> .in) + legacy fade
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  const revealObserver = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        entry.target.classList.add('fade-in-up');
        revealObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);
  
  // Observe cards and sections
  const cards = document.querySelectorAll('.blog-card, .service-card, .project-card, .reveal');
  cards.forEach(card => {
    revealObserver.observe(card);
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

  // Typing rotate for hero subtitle
  const typingEl = document.getElementById('typingLine');
  const roles = [
    'Senior Odoo Specialist & Python Developer',
    'Custom modules that survive upgrades',
    'APIs + Postgres tuning for scale',
    'Top-Rated Plus — 100% Job Success'
  ];
  if (typingEl && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let ri = 0, ci = roles[0].length, deleting = true, pause = 0;
    setInterval(() => {
      if (pause > 0) { pause -= 1; return; }
      const full = roles[ri];
      if (deleting) {
        ci -= 1;
        if (ci <= 0) { ci = 0; deleting = false; ri = (ri + 1) % roles.length; }
      } else {
        ci += 1;
        if (ci >= roles[ri].length) { ci = roles[ri].length; deleting = true; pause = 22; }
      }
      typingEl.textContent = roles[ri].slice(0, ci);
    }, 45);
  }

  // Copy email button
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const text = btn.getAttribute('data-copy') || '';
      try {
        await navigator.clipboard.writeText(text);
        const orig = btn.innerHTML;
        btn.innerHTML = '✓ copied!';
        setTimeout(() => { btn.innerHTML = orig; }, 1600);
      } catch (e) {
        window.location.href = 'mailto:' + text;
      }
    });
  });
});
