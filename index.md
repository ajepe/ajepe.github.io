---
layout: page
title: Babatope Ajepe
description: Senior Odoo Specialist and Python Developer. Building scalable ERP solutions, API integrations, and custom Odoo applications.
cta_text: Get In Touch
cta_link: /contact/
---

<div class="hero-section">

Software Developer & An Odoo Specialist with 6+ years of experience building enterprise-grade ERP solutions. 
I help businesses transform their operations through custom Odoo implementations, seamless API integrations, and performance optimization.

</div>

---

## Featured Articles

<div class="featured-posts">

{% for post in site.posts limit:3 %}
<article class="featured-post">
  <div class="featured-post-meta">
    <time>{{ post.date | date: "%B %d, %Y" }}</time>
    {% if post.categories %}
    <span class="separator">•</span>
    <span class="category">{{ post.categories | first }}</span>
    {% endif %}
  </div>
  <h3 class="featured-post-title">
    <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
  </h3>
  <p class="featured-post-excerpt">
    {{ post.excerpt | strip_html | truncatewords: 20 }}
  </p>
  <a href="{{ post.url | relative_url }}" class="featured-post-read">Read article →</a>
</article>
{% endfor %}

</div>

---

## Let's Work Together

Whether you need a new Odoo implementation, custom module development, or API integration, I'd love to hear about your project.

<a href="/contact/" class="cta-button">Get In Touch</a>
