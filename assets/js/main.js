document.addEventListener('DOMContentLoaded', function() {
  // Mobile navigation toggle
  const navToggle = document.getElementById('navToggle');
  const mainNav = document.getElementById('mainNav');
  const navOverlay = document.getElementById('navOverlay');
  
  if (navToggle && mainNav && navOverlay) {
    navToggle.addEventListener('click', function() {
      mainNav.classList.toggle('nav-open');
      navOverlay.classList.toggle('overlay-open');
      document.body.style.overflow = mainNav.classList.contains('nav-open') ? 'hidden' : '';
    });
    
    navOverlay.addEventListener('click', function() {
      mainNav.classList.remove('nav-open');
      navOverlay.classList.remove('overlay-open');
      document.body.style.overflow = '';
    });
    
    // Close nav when clicking on a link
    const navLinks = mainNav.querySelectorAll('a');
    navLinks.forEach(link => {
      link.addEventListener('click', function() {
        mainNav.classList.remove('nav-open');
        navOverlay.classList.remove('overlay-open');
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
  const cards = document.querySelectorAll('.card, .section');
  cards.forEach(card => {
    observer.observe(card);
  });
  
  // Form validation (if contact form exists)
  const contactForm = document.querySelector('.contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const formData = new FormData(this);
      const submitButton = this.querySelector('.form-submit');
      const originalText = submitButton.textContent;
      
      // Basic validation
      const name = formData.get('name') || '';
      const email = formData.get('email') || '';
      const message = formData.get('message') || '';
      
      if (!name || !email || !message) {
        showAlert('Please fill in all required fields.', 'error');
        return;
      }
      
      if (!isValidEmail(email)) {
        showAlert('Please enter a valid email address.', 'error');
        return;
      }
      
      // Show loading state
      submitButton.disabled = true;
      submitButton.textContent = 'Sending...';
      
      // Simulate form submission (replace with actual implementation)
      setTimeout(() => {
        showAlert('Thank you for your message! I\'ll get back to you soon.', 'success');
        this.reset();
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }, 2000);
    });
  }
  
  // Helper functions
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  function showAlert(message, type) {
    // Remove existing alerts
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
      existingAlert.remove();
    }
    
    // Create new alert
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    // Insert after form title or at the beginning of form
    const formTitle = document.querySelector('.contact-form h2');
    if (formTitle) {
      formTitle.insertAdjacentElement('afterend', alert);
    } else {
      contactForm.insertAdjacentElement('afterbegin', alert);
    }
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      alert.remove();
    }, 5000);
    
    // Scroll to alert
    alert.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  
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
});