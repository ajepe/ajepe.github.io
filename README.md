# Babatope Ajepe — Personal Website & Technical Blog

A dark, terminal-first Jekyll site for Babatope Ajepe, Senior Odoo Specialist & Python Developer. Inspired by [Omarchy](https://omarchy.org) — Hyprland tiling, Waybar, Tokyo Night. Live at [babatopeajepe.com](https://babatopeajepe.com).

## 🎯 Overview

- **Landing**: terminal hero (`whoami`, `cat manifesto.txt`), neofetch card, stats strip, services grid, featured posts, `hire-me.sh` CTA
- **Blog**: tiling cards styled as terminal windows, Tokyo Night code highlighting
- **Pages**: About, Projects (static case studies), Contact, 404
- **SEO**: Open Graph/Twitter cards, JSON-LD Person + BlogPosting, sitemap, RSS, robots

## ✨ Features

### Design & UX
- **Omarchy / Tokyo Night theme**: near-black `#1a1b26`, cyan `#7dcfff` primary, purple/green/yellow accents
- **Waybar header**: floating blurred bar, workspace nav (`1:home … 5:contact`), live clock, availability pulse
- **Terminal windows**: traffic-light dots + `~/path — app` title bars on hero, posts, pages, cards
- **Landing interactions**: rotating typing subtitle, copy-email button, scroll reveal, hover glow
- **Responsive + accessible**: 1-col/2-col collapse under 900px, `prefers-reduced-motion`, focus-visible rings, skip link

### Technical
- **Jekyll 4.2** (per `Gemfile`), GitHub Pages compatible
- **SCSS modules**: `_variables` (tokens), `_base`, `_layout` (Waybar), `_components` (terminal/landing), `_syntax` (Tokyo Night)
- **Vanilla JS** (`assets/js/main.js`): mobile nav, Waybar clock, typing, clipboard, reveal observer, reading-time
- **Fonts**: JetBrains Mono (headings/meta) + Inter (body) via Google Fonts

## 🛠️ Stack

- Jekyll `~> 4.2.0` + `jekyll-feed`, `jekyll-sitemap`, `jekyll-seo-tag`
- SCSS, HTML5, vanilla ES6+
- Hosting: GitHub Pages, custom domain via `CNAME` (`babatopeajepe.com`)

## 📁 Structure

```
├── _config.yml            # site, author, collections (projects declared, unused), SEO
├── _layouts/
│   ├── default.html       # Waybar header, footer status bar, fonts, JSON-LD
│   ├── page.html          # terminal window wrapper
│   ├── simple-page.html   # page + subtitle
│   ├── post.html          # terminal chrome + meta + content
│   ├── blog.html          # ls ~/blog header + card grid
│   └── project.html       # reserved for future collection items
├── _sass/
│   ├── _variables.scss    # Tokyo Night tokens
│   ├── _base.scss         # dark base, dot-grid, scrollbars
│   ├── _layout.scss       # Waybar, tiling gaps, footer bar
│   ├── _components.scss   # hero/neofetch/stats/services/hire/posts
│   └── _syntax.scss       # Tokyo Night Rouge highlighting
├── _posts/                # 5 posts (YYYY-MM-DD-title.md)
├── assets/
│   ├── css/main.scss      # SCSS entry point
│   └── js/main.js         # nav, clock, typing, copy, reveal
├── index.md               # landing (layout: default, .landing)
├── about.md / blog.md / projects.md / contact.md / 404.md
├── feed.xml / sitemap.xml / robots.txt / CNAME
├── Gemfile / Dockerfile / docker-compose.yml
└── QUICK_START.md
```

> Note: `_config.yml` declares a `projects` collection, but there is no `_projects/` folder — `projects.md` is currently a static page. `project.html` is kept for future use.

## 🎨 Design tokens (`_sass/_variables.scss`)

| Token | Value |
|---|---|
| `bg-primary / bg-dark / bg-card` | `#1a1b26` / `#16161e` / `#24283b` |
| `text-primary / muted / bright` | `#c0caf5` / `#565f89` / `#ffffff` |
| `accent-primary (cyan)` | `#7dcfff` |
| `accent-secondary / green / yellow / red` | `#bb9af7` / `#9ece6a` / `#e0af68` / `#f7768e` |
| `border-color` | `#292e42` |
| `font-heading / font-mono` | JetBrains Mono |
| `font-sans` | Inter |

Layout principles: tiling gaps over dot-grid wallpaper, 12px rounded windows, Waybar-style floating chrome, mono-first labels (`$`, `➜`, `[tag]`, `//`).

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
categories: [Odoo]
tags: [odoo, python]
excerpt: "One-line preview"
---
```

- Code fences need a language for highlighting (```python).
- Excerpts fall back to first paragraph if omitted.
- `projects.md` is static — edit sections directly; no collection loop.

## 🔧 Customize

- Colors/fonts: `_sass/_variables.scss`
- Nav workspaces: `_layouts/default.html` (`.nav-menu`, `1:…5:` labels)
- Landing sections: `index.md` (`.hero-term`, `.stats-strip`, `.services-grid`, `.featured-3`, `.hire-term`)
- Card chrome: `.term-bar` in `_sass/_components.scss`

## 📊 SEO & performance

- JSON-LD Person (home) + BlogPosting (posts), OG/Twitter images (`/assets/images/og-image.png`)
- `sitemap.xml`, `robots.txt`, `feed.xml`
- No JS framework, two Google fonts with preconnect, CSS/JS minified by Pages in production

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
