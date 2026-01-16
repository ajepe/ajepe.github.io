---
layout: page
title: Contact
description: Get in touch to discuss your Odoo development needs, API integration projects, or custom ERP solutions. Available for freelance and contract opportunities.
---

<div class="section">
  <div class="grid grid-2">
    <div class="card">
      <h2>Let's Start a Conversation</h2>
      <p>I'm always interested in discussing challenging Odoo projects, custom ERP solutions, and opportunities to help businesses optimize their operations through technology.</p>
      
      <p>Whether you need a complete Odoo implementation, custom module development, API integrations, or performance optimization, I'm here to help you achieve your goals.</p>
      
      <div style="margin-top: 2rem;">
        <h3>📧 Direct Contact</h3>
        <p><strong>Email:</strong> <a href="mailto:{{ site.email }}">{{ site.email }}</a></p>
        <p>I typically respond within 24 hours for project inquiries.</p>
      </div>
      
      <div style="margin-top: 2rem;">
        <h3>💼 Professional Profiles</h3>
        <div class="social-links" style="margin-top: 1rem;">
          <a href="{{ site.upwork }}" aria-label="Upwork Profile" style="width: 50px; height: 50px; font-size: 1.2rem;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm4.441 16.892c-2.375.698-4.486-2.232-7.016-2.232.624 1.632 1.084 3.363 1.084 5.34h-2.549c0-5.18 2.975-9.35 6.639-9.35 1.642 0 2.893.699 3.842 1.632v2.61zm1.632-7.016c-.698 0-1.232-.534-1.232-1.232s.534-1.232 1.232-1.232 1.232.534 1.232 1.232-.534 1.232-1.232 1.232z"/>
            </svg>
          </a>
          <a href="{{ site.linkedin }}" aria-label="LinkedIn Profile" style="width: 50px; height: 50px; font-size: 1.2rem;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
            </svg>
          </a>
          <a href="{{ site.github }}" aria-label="GitHub Profile" style="width: 50px; height: 50px; font-size: 1.2rem;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
    
    <div class="card">
      <h2>Send Me a Message</h2>
      <form class="contact-form" id="contactForm">
        <div class="form-group">
          <label for="name">Full Name *</label>
          <input type="text" id="name" name="name" required placeholder="Your name">
        </div>
        
        <div class="form-group">
          <label for="email">Email Address *</label>
          <input type="email" id="email" name="email" required placeholder="your.email@example.com">
        </div>
        
        <div class="form-group">
          <label for="company">Company</label>
          <input type="text" id="company" name="company" placeholder="Your company name">
        </div>
        
        <div class="form-group">
          <label for="project-type">Project Type</label>
          <select id="project-type" name="project_type">
            <option value="">Select a project type</option>
            <option value="odoo-implementation">Odoo Implementation</option>
            <option value="custom-development">Custom Module Development</option>
            <option value="api-integration">API Integration</option>
            <option value="migration">Odoo Migration</option>
            <option value="performance-optimization">Performance Optimization</option>
            <option value="consulting">Consulting</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="message">Project Details *</label>
          <textarea id="message" name="message" required placeholder="Tell me about your project, requirements, timeline, and any specific challenges you're facing..."></textarea>
        </div>
        
        <div class="form-group">
          <label for="budget">Budget Range</label>
          <select id="budget" name="budget">
            <option value="">Select budget range</option>
            <option value="5k-10k">$5,000 - $10,000</option>
            <option value="10k-25k">$10,000 - $25,000</option>
            <option value="25k-50k">$25,000 - $50,000</option>
            <option value="50k-100k">$50,000 - $100,000</option>
            <option value="100k+">$100,000+</option>
            <option value="discuss">Prefer to discuss</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="timeline">Timeline</label>
          <select id="timeline" name="timeline">
            <option value="">Select timeline</option>
            <option value="asap">ASAP</option>
            <option value="1-2-months">1-2 months</option>
            <option value="3-6-months">3-6 months</option>
            <option value="6-months+">6+ months</option>
            <option value="flexible">Flexible</option>
          </select>
        </div>
        
        <button type="submit" class="form-submit">Send Message</button>
      </form>
    </div>
  </div>
</div>

<div class="section">
  <h2 class="section-title">Services I Offer</h2>
  <div class="grid grid-3">
    <div class="card">
      <h3>🎯 Odoo Implementation</h3>
      <p>Complete Odoo deployments from requirements gathering to go-live, including configuration, customization, and user training.</p>
    </div>
    
    <div class="card">
      <h3>🔧 Custom Development</h3>
      <p>Bespoke Odoo modules, workflow automation, and specialized functionality tailored to your unique business requirements.</p>
    </div>
    
    <div class="card">
      <h3>🔗 API Integration</h3>
      <p>Seamless connections with third-party systems, custom API development, and data synchronization solutions.</p>
    </div>
    
    <div class="card">
      <h3>📈 Performance Optimization</h3>
      <p>Database tuning, query optimization, caching strategies, and system performance enhancements for large-scale deployments.</p>
    </div>
    
    <div class="card">
      <h3>🔄 Migration Services</h3>
      <p>Odoo version upgrades, data migration from legacy systems, and seamless transitions with minimal business disruption.</p>
    </div>
    
    <div class="card">
      <h3>🛡️ Consulting & Support</h3>
      <p>Technical consulting, code reviews, architecture design, and ongoing support for Odoo environments.</p>
    </div>
  </div>
</div>

<div class="section">
  <div class="card">
    <h2>What to Expect</h2>
    <div class="grid grid-2">
      <div>
        <h3>📋 Initial Consultation</h3>
        <p>We'll schedule a call to discuss your project requirements, technical challenges, and business objectives. This helps me understand your needs and provide accurate recommendations.</p>
      </div>
      
      <div>
        <h3>📄 Detailed Proposal</h3>
        <p>After our consultation, I'll provide a comprehensive proposal including project scope, timeline, deliverables, and transparent pricing.</p>
      </div>
      
      <div>
        <h3>🚅 Project Kickoff</h3>
        <p>Once we agree on the terms, we'll establish communication channels, set up project management tools, and begin the development process.</p>
      </div>
      
      <div>
        <h3>📊 Regular Updates</h3>
        <p>You'll receive regular progress reports, demo sessions, and opportunities for feedback throughout the project lifecycle.</p>
      </div>
    </div>
  </div>
</div>

<div class="section">
  <div class="card">
    <h2>Frequently Asked Questions</h2>
    
    <div style="margin-bottom: 2rem;">
      <h4>How quickly can you start a new project?</h4>
      <p>My availability varies, but I can typically start new projects within 2-4 weeks depending on current commitments and project complexity.</p>
    </div>
    
    <div style="margin-bottom: 2rem;">
      <h4>Do you work with clients outside of my time zone?</h4>
      <p>Yes! I work with clients globally and can accommodate different time zones for meetings and communication.</p>
    </div>
    
    <div style="margin-bottom: 2rem;">
      <h4>What is your typical project structure?</h4>
      <p>I follow an agile approach with regular sprints, demo sessions, and feedback loops. Projects typically include discovery, development, testing, and deployment phases.</p>
    </div>
    
    <div style="margin-bottom: 2rem;">
      <h4>Can you provide references from past clients?</h4>
      <p>Absolutely. I can share references and case studies from similar projects once we've had an initial consultation.</p>
    </div>
    
    <div>
      <h4>What kind of support do you provide after project completion?</h4>
      <p>I offer ongoing support packages, bug fixes, and enhancements. We can discuss support options based on your specific needs.</p>
    </div>
  </div>
</div>