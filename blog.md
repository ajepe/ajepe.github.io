---
layout: page
title: Blog
description: Technical articles, tutorials, and insights about Odoo development, ERP implementation, API integrations, and best practices for enterprise software solutions.
---

<div class="home">
  <h1 class="page-heading">{{ page.title | escape }}</h1>
  
  <ul class="post-list">
    {% for post in site.posts %}
      <li>
        <span class="post-meta">{{ post.date | date: "%b %-d, %Y" }}</span>
        <h3>
          <a class="post-link" href="{{ post.url | relative_url }}">
            {{ post.title | escape }}
          </a>
        </h3>
        {% if post.excerpt %}
          <p class="post-excerpt">{{ post.excerpt | strip_html | strip }}</p>
        {% endif %}
      </li>
    {% endfor %}
  </ul>

  <p class="rss-subscribe">subscribe <a href="{{ "/feed.xml" | relative_url }}">via RSS</a></p>
</div>