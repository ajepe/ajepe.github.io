# Babatope Ajepe — Odoo Database Migration Specialist

A light, professional Jekyll site positioning Babatope Ajepe as an Odoo database migration specialist: a service landing page for migration work (version upgrades, custom module porting, data migration, PostgreSQL performance) plus a technical Odoo blog. Live at [babatopeajepe.com](https://babatopeajepe.com).

## 🎯 Overview

- **Landing**: migration-focused hero with a "migration plan" status card, trust stats, "why migrations go wrong", six services, a six-step process, the featured 14 → 16 case study, testimonials, FAQ (with FAQPage JSON-LD) and a closing CTA
- **Blog**: clean card grid, light-theme syntax highlighting, reading time
- **Pages**: About, Projects (case studies), Contact, 404
- **SEO**: Open Graph/Twitter cards + generated OG image, JSON-LD Person + Service + BlogPosting + FAQPage, sitemap, RSS, robots

## ✨ Features

### Design
- **Light, professional palette**: white surfaces, Odoo plum accent `#714b67`, teal highlight `#0d8f86`, soft neutral bands
- **Typography-first**: Inter for everything, JetBrains Mono reserved for code and version chips
- **Clean components**: bordered cards, subtle shadows on hover, numbered process steps, `details`-based FAQ, pill tags
- **Dark bookends**: plum CTA band + deep plum-black footer
- **Responsive + accessible**: single-column collapse under 640px, mobile nav drawer, `prefers-reduced-motion`, focus-visible rings, skip link, scroll reveal only when JS is present

### Technical
- **Jekyll 4.2** (per `Gemfile`), GitHub Pages compatible
- **SCSS modules**: `_variables` (tokens), `_base`, `_layout` (header/footer), `_components` (landing + UI), `_syntax` (light Rouge theme)
- **Vanilla JS** (`assets/js/main.js`): mobile nav, header shadow on scroll, smooth anchors, reveal observer, reading time, copy-email button
- **Fonts**: Inter + JetBrains Mono via Google Fonts

## 🛠️ Stack

- Jekyll `~> 4.2.0` + `jekyll-feed`, `jekyll-sitemap`, `jekyll-seo-tag`
- SCSS, HTML5, vanilla ES6+
- Hosting: GitHub Pages, custom domain via `CNAME` (`babatopeajepe.com`)

## 📁 Structure

```
├── _config.yml            # site, author, collections (projects declared, unused), SEO
├── _layouts/
│   ├── default.html       # header, footer, meta, fonts, JSON-LD
│   ├── simple-page.html   # About / Contact / Projects (title + subtitle + prose)
│   ├── page.html          # generic title + prose page
│   ├── post.html          # article layout with meta, prose, footer CTA
│   ├── blog.html          # blog index (card grid)
│   └── project.html       # reserved for future project collection items
├── _sass/
│   ├── _variables.scss    # design tokens (colors, type, spacing)
│   ├── _base.scss         # light base styles, typography, code
│   ├── _layout.scss       # header, nav drawer, footer, containers
│   ├── _components.scss   # hero, cards, process, case study, FAQ, CTA
│   └── _syntax.scss       # light Rouge highlighting
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
| `bg-primary / bg-soft / bg-dark` | `#ffffff` / `#f8f7f9` / `#1c1520` |
| `text-primary / secondary / muted` | `#1d1a20` / `#4d4953` / `#767079` |
| `accent (Odoo plum)` | `#714b67` |
| `accent-dark / accent-soft` | `#593a51` / `#f6eef4` |
| `teal` | `#0d8f86` |
| `border-color / border-strong` | `#e7e4e9` / `#d6d0d9` |
| `font-sans` | Inter |
| `font-mono` | JetBrains Mono (code only) |

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
- Landing sections: `index.md` (`.hero`, `.stats-strip`, `.services-grid`, `.process-grid`, `.case-card`, `.faq`, `.cta-band`)
- Footer: `_layouts/default.html` (`.footer-grid`)
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
