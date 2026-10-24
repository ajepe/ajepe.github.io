# Babatope Ajepe — Odoo Database Migration Specialist

A light, professional Jekyll site positioning Babatope Ajepe as an Odoo database migration specialist: a service landing page for migration work (version upgrades, custom module porting, data migration, PostgreSQL performance) plus a technical Odoo blog. Live at [babatopeajepe.com](https://babatopeajepe.com).

## 🎯 Overview

- **Landing**: editorial migration-focused landing page with a "migration record" hero, industry strip, migration risks, proof stats, five services, a six-step process, the featured 14 → 16 case study, FAQ (with FAQPage JSON-LD) and a closing CTA
- **Blog**: editorial index + long-form article layout with warm dark code blocks and reading time
- **Pages**: About, Projects (case studies), Contact, 404
- **SEO**: Open Graph/Twitter cards + generated OG image, JSON-LD Person + Service + BlogPosting + FAQPage, sitemap, RSS, robots

## ✨ Features

### Design
- **Warm editorial palette**: ivory paper `#f6f2e9`, ink `#1b1611`, Odoo plum `#6d485e`, quiet sage `#5b6a52`
- **Typography-first**: Instrument Serif for display, Geist for body, JetBrains Mono for labels and code
- **Composition over cards**: hairline rules, numbered rows, generous whitespace, a paper "migration record" hero visual with a verified stamp
- **Dark bookends**: ink process section + plum CTA band + ink footer
- **Responsive + accessible**: full-screen mobile menu under 900px, `prefers-reduced-motion`, focus-visible rings, skip link, no content hidden behind JavaScript

### Technical
- **Jekyll 4.2** (per `Gemfile`), GitHub Pages compatible
- **SCSS modules**: `_variables` (tokens), `_base`, `_layout` (header/footer), `_components` (landing + UI), `_syntax` (warm dark Rouge theme)
- **Vanilla JS** (`assets/js/main.js`): mobile nav, header shadow on scroll, smooth anchors, reading time, copy-email button
- **Fonts**: Instrument Serif + Geist + JetBrains Mono via Google Fonts

## 🛠️ Stack

- Jekyll `~> 4.2.0` + `jekyll-feed`, `jekyll-sitemap`, `jekyll-seo-tag`
- SCSS, HTML5, vanilla ES6+
- Hosting: GitHub Pages, custom domain via `CNAME` (`babatopeajepe.com`)

## 📁 Structure

```
├── _config.yml            # site, author, collections (projects declared, unused), SEO
├── _layouts/
│   ├── default.html       # header, footer, meta, fonts, JSON-LD
│   ├── simple-page.html   # About / Contact / Projects (page hero + prose + aside)
│   ├── page.html          # generic page shell
│   ├── post.html          # article layout with meta, prose, author footer
│   ├── blog.html          # blog index (editorial list)
│   └── project.html       # reserved for future project collection items
├── _sass/
│   ├── _variables.scss    # design tokens (colors, type, spacing)
│   ├── _base.scss         # base styles, typography, code
│   ├── _layout.scss       # header, mobile menu, footer, containers
│   ├── _components.scss   # hero, dossier, services, process, case study, FAQ, CTA
│   └── _syntax.scss       # warm dark Rouge highlighting
├── _posts/                # 5 technical posts (YYYY-MM-DD-title.md)
├── assets/
│   ├── css/main.scss      # SCSS entry point
│   ├── js/main.js         # progressive enhancement only
│   └── images/            # og-image.png, favicon.svg
├── index.md               # migration landing page
├── about.md / blog.md / projects.md / contact.md / 404.md
├── feed.xml / sitemap.xml / robots.txt / CNAME
├── Gemfile / Dockerfile / docker-compose.yml
└── QUICK_START.md
```

> Note: `_config.yml` declares a `projects` collection, but there is no `_projects/` folder — `projects.md` is a static page of case studies.

## 🎨 Design tokens (`_sass/_variables.scss`)

| Token | Value |
|---|---|
| `paper / paper-2 / paper-3` | `#f6f2e9` / `#fbf8f2` / `#efe9dc` |
| `ink / ink-2` | `#1b1611` / `#231d17` |
| `text / muted` | `#2c2620` / `#6b6257` |
| `plum / plum-deep` | `#6d485e` / `#4d3243` |
| `sage / sage-soft` | `#5b6a52` / `#e6eadf` |
| `line / line-strong` | `#ddd4c5` / `#c9beac` |
| `font-display` | Instrument Serif |
| `font-sans` | Geist |
| `font-mono` | JetBrains Mono |

## 🚀 Run locally

```bash
bundle install
bundle exec jekyll serve --livereload
# → http://localhost:4000
```

Or with Docker:

```bash
docker compose up --build
# → http://localhost:4000
```

Build only:

```bash
bundle exec jekyll build   # output in _site/
```

## 🌍 Deploy

Push to `main` — GitHub Pages builds automatically. Custom domain is pinned via `CNAME` (`babatopeajepe.com`); keep the DNS CNAME `www → <user>.github.io`.

## 📝 Content

New post: `_posts/YYYY-MM-DD-title.md`

```yaml
---
layout: post
title: "Your Post Title"
date: 2026-01-15 10:00:00 +0000
categories: [Odoo Dev]
tags: [odoo, migration]
reading_time: 9
excerpt: "One-line preview"
---
```

- Code fences need a language for highlighting (```python).
- Post URLs use Jekyll's default date permalink — **don't change the permalink scheme** unless you're ready to break existing links.
- `index.md` sections are raw HTML (kramdown doesn't parse markdown inside block HTML) — edit the markup directly.
- `projects.md` is static — edit sections directly; no collection loop.

## 🔧 Customize

- Colors/fonts: `_sass/_variables.scss`
- Header/nav items and CTA: `_layouts/default.html` (`.nav-menu`, `.nav-cta`)
- Landing sections: `index.md` (`.hero`, `.industries`, `.split`, `.proof`, `.services`, `.process`, `.work`, `.faq-layout`, `.journal`, `.cta-band`)
- Footer: `_layouts/default.html` (`.footer-top`, `.footer-cols`)
- OG image: regenerate `assets/images/og-image.png` (1200×630) if branding changes

## 📊 SEO & performance

- JSON-LD: Person + Service + FAQPage (home), BlogPosting (posts)
- OG/Twitter images (`/assets/images/og-image.png`), SVG favicon
- `sitemap.xml`, `robots.txt`, `feed.xml`
- No JS framework, progressive enhancement only; CSS/JS minified by Pages in production

## 🐛 Troubleshooting

```bash
bundle exec jekyll doctor        # config/front-matter issues
bundle exec jekyll build --verbose  # SCSS/asset errors
bundle exec jekyll clean         # stale cache
lsof -ti:4000 | xargs kill -9    # stuck server
```

No Ruby locally? Use `docker compose up` (see `QUICK_START.md`).

## 📄 License

MIT — feel free to fork the theme; attribution appreciated.
