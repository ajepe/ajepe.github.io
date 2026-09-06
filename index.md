---
layout: default
title: Babatope Ajepe
description: Senior Odoo Specialist and Python Developer. Building scalable ERP solutions, API integrations, and custom Odoo applications.
---

<div class="landing">

<div class="hero-term reveal">
<div class="term-bar">
<span class="dot dot-r"></span><span class="dot dot-y"></span><span class="dot dot-g"></span>
<span class="term-title">babatope@omarchy: ~ — zsh</span>
<span class="term-live"><span class="pulse"></span> available</span>
</div>
<div class="hero-body">
<div class="hero-main">
<div class="hero-line"><span class="p-user">➜ ~</span> <span class="p-cmd">whoami</span></div>
<h1 class="hero-title">Babatope Ajepe<span class="hl">_</span></h1>
<div class="hero-sub" id="typingLine">Senior Odoo Specialist & Python Developer</div>
<div class="hero-line"><span class="p-user">➜ ~</span> <span class="p-cmd">cat ./manifesto.txt</span></div>
<p class="hero-desc">
6+ years shipping enterprise-grade ERP. Custom modules, API integrations,
PostgreSQL tuning — opinionated, fast, no bloat. Like Omarchy, but for ERP.
</p>
<div class="hero-badges">
<span class="hbadge"><b>●</b> odoo</span>
<span class="hbadge"><b>●</b> python</span>
<span class="hbadge"><b>●</b> postgres</span>
<span class="hbadge"><b>●</b> redis</span>
<span class="hbadge"><b>●</b> vue.js</span>
</div>
<div class="hero-cta">
<a href="/contact/" class="cta-button">./hire-me.sh — Get In Touch</a>
<a href="/blog/" class="cta-button btn-secondary">ls ~/blog</a>
</div>
<div class="key-hints"><span><kbd>SUPER</kbd> + <kbd>1-5</kbd> navigate</span><span><kbd>T</kbd> terminal</span><span><kbd>D</kbd> blog</span></div>
</div>
<aside class="hero-side">
<div class="neofetch">
<div class="neo-head">$ neofetch</div>
<div class="neo-grid">
<div class="neo-logo" aria-hidden="true">▲<br>▲▲<br>▲▲▲</div>
<div class="neo-lines">
<div><b>babatope@omarchy</b></div>
<div><span>role</span> senior odoo / python</div>
<div><span>exp</span> 6+ yrs, 50+ projects</div>
<div><span>stack</span> odoo, pg, redis, vue</div>
<div><span>status</span> <i>● top-rated 100% JSS</i></div>
<div><span>uptime</span> available now</div>
</div>
</div>
<div class="neo-foot">
<a href="/about/">cat ~/about.md →</a>
</div>
</div>
</aside>
</div>
</div>

<div class="stats-strip reveal">
<div class="stat"><b>6+</b><span>years odoo</span></div>
<div class="stat"><b>50+</b><span>projects shipped</span></div>
<div class="stat"><b>100%</b><span>job success</span></div>
<div class="stat"><b>Top</b><span>rated plus</span></div>
</div>

<div class="section-head">services.sh — what i run</div>

<div class="services-grid">
<div class="service-card reveal" data-index="01">
<h3>custom_modules</h3>
<p>Tailored Odoo apps for your exact workflow — clean ORM, tested, upgrade-safe.</p>
</div>
<div class="service-card reveal" data-index="02">
<h3>api_integrations</h3>
<p>REST APIs, webhooks, third-party sync that just stays up. No spaghetti.</p>
</div>
<div class="service-card reveal" data-index="03">
<h3>perf_tuning</h3>
<p>Postgres, Redis, workers — find the bottleneck, kill it, prove it with numbers.</p>
</div>
</div>

<div class="section-head">featured_articles.md — 3 tiles <a class="section-more" href="/blog/">ls -a →</a></div>

<div class="featured-posts featured-3">

{% for post in site.posts limit:3 %}
<article class="featured-post reveal">
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
    {{ post.excerpt | strip_html | truncatewords: 18 }}
  </p>
  <a href="{{ post.url | relative_url }}" class="featured-post-read">cat ./post.md</a>
</article>
{% endfor %}

</div>

<div class="hire-term reveal">
<div class="term-bar">
<span class="dot dot-r"></span><span class="dot dot-y"></span><span class="dot dot-g"></span>
<span class="term-title">~/hire-me.sh — zsh</span>
</div>
<div class="hire-body">
<div class="hero-line"><span class="p-user">➜ ~</span> <span class="p-cmd">./hire-me.sh --fast --clean</span></div>
<p>New Odoo build, custom module, or rescue mission? Send the spec — you'll get a straight answer and a plan within 24h.</p>
<div class="hire-row">
<a href="/contact/" class="cta-button">Start a Conversation</a>
<button class="cta-button btn-secondary copy-btn" data-copy="contact@babatopeajepe.com" type="button">⧉ contact@babatopeajepe.com</button>
</div>
</div>
</div>

</div>
