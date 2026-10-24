// Progressive enhancement only — the site works without this file.
// (The `js` class on <html> is set inline in <head> to avoid a flash.)

document.addEventListener('DOMContentLoaded', function () {
  // Mobile navigation
  const navToggle = document.getElementById('navToggle');
  const mainNav = document.getElementById('mainNav');
  const navOverlay = document.getElementById('navOverlay');

  if (navToggle && mainNav && navOverlay) {
    function closeNav() {
      mainNav.classList.remove('nav-open');
      navOverlay.classList.remove('overlay-open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.setAttribute('aria-label', 'Open navigation');
      document.body.style.overflow = '';
    }

    navToggle.addEventListener('click', function () {
      const isOpen = mainNav.classList.toggle('nav-open');
      navOverlay.classList.toggle('overlay-open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      navToggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    navOverlay.addEventListener('click', closeNav);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mainNav.classList.contains('nav-open')) {
        closeNav();
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 900 && mainNav.classList.contains('nav-open')) {
        closeNav();
      }
    });

    mainNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeNav);
    });
  }

  // Header shadow on scroll
  const header = document.getElementById('siteHeader');
  if (header) {
    const onScroll = function () {
      header.classList.toggle('scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Smooth scroll for in-page anchors
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href !== '#') {
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });

  // Reading time fallback when front matter doesn't set it
  const postContent = document.querySelector('.post-content');
  const readingTimeElement = document.querySelector('.post-reading-time');
  if (postContent && readingTimeElement && !readingTimeElement.textContent) {
    const words = postContent.textContent.trim().split(/\s+/).length;
    const minutes = Math.max(1, Math.ceil(words / 200));
    readingTimeElement.textContent = minutes + ' min read';
  }

  // Copy-to-clipboard buttons
  document.querySelectorAll('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', async function () {
      const text = btn.getAttribute('data-copy') || '';
      try {
        await navigator.clipboard.writeText(text);
        const original = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(function () { btn.textContent = original; }, 1600);
      } catch (e) {
        window.location.href = 'mailto:' + text;
      }
    });
  });
});
