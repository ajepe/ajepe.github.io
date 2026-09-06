---
layout: page
title: Babatope Ajepe
description: Senior Odoo Specialist and Python Developer. Building scalable ERP solutions, API integrations, and custom Odoo applications.
cta_text: Get In Touch
cta_link: /contact/
---

<div class="hero-term">
<div class="term-bar">
<span class="dot dot-r"></span><span class="dot dot-y"></span><span class="dot dot-g"></span>
<span class="term-title">babatope@omarchy: ~ — zsh</span>
</div>
<div class="hero-body">
<div class="hero-line"><span class="p-user">➜ ~</span> <span class="p-cmd">whoami</span></div>
<h1 class="hero-title">Babatope Ajepe<span class="hl">_</span></h1>
<div class="hero-line"><span class="p-user">➜ ~</span> <span class="p-cmd">cat ./manifesto.txt</span></div>
<p class="hero-desc">
Senior Odoo Specialist & Python Developer with 6+ years shipping enterprise-grade ERP.
Custom modules, API integrations, PostgreSQL tuning — opinionated, fast, no bloat. Like Omarchy, but for ERP.
</p>
<div class="hero-badges">
<span class="hbadge"><b>●</b> odoo</span>
<span class="hbadge"><b>●</b> python</span>
<span class="hbadge"><b>●</b> postgres</span>
<span class="hbadge"><b>●</b> redis</span>
<span class="hbadge"><b>●</b> vue.js</span>
</div>
<div class="hero-line" style="margin-top:1.2rem"><span class="p-user">➜ ~</span> <span class="p-cmd">open ./hire-me.sh</span> <span class="p-comment"># available for new builds</span></div>
<p><a href="/contact/" class="cta-button">./hire-me.sh — Get In Touch</a> <a href="/blog/" class="cta-button btn-secondary">ls ~/blog</a></p>
<div class="key-hints"><span><kbd>SUPER</kbd> + <kbd>1-5</kbd> navigate</span><span><kbd>SUPER</kbd> + <kbd>T</kbd> terminal</span><span><kbd>SUPER</kbd> + <kbd>D</kbd> blog</span></div>
</div>
</div>

<div class="section-head">featured_articles.md — 3 tiles</div>

<div class="featured-posts">

{% for post in site.posts limit:3 %}
<article class="featured-post">
  <div class="featured-post-meta">
    <time>{{ post.date | date: "%Y-%m-%d" }}</time>
    {% if post.categories %}
    <span class="separator">|</span>
    <span class="category">[{{ post.categories | first }}]</span>
    {% endif %}
  </div>
  <h3 class="featured-post-title">
    <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
  </h3>
  <p class="featured-post-excerpt">
    {{ post.excerpt | strip_html | truncatewords: 20 }}
  </p>
  <a href="{{ post.url | relative_url }}" class="featured-post-read">cat ./post.md</a>
</article>
{% endfor %}

</div>

<div class="section-head">hire-me.sh</div>

Whether you need a new Odoo implementation, custom module development, or API integration, I'd love to hear about your project.

<a href="/contact/" class="cta-button">Get In Touch</a>
