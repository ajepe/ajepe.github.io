# Quick Start

Three ways to run the site locally. Pick whichever matches your machine.

## 1. Ruby + Bundler

Jekyll needs Ruby with its development headers, because some gems compile native extensions. On Ubuntu/Debian:

```bash
sudo apt update
sudo apt install ruby-full ruby-dev build-essential zlib1g-dev
```

Then, from the repo root:

```bash
bundle install
bundle exec jekyll serve --livereload
# → http://localhost:4000
```

If `bundle install` fails while building a native extension, the Ruby dev headers are usually what's missing.

## 2. Docker (no local Ruby)

The repo already includes a `Dockerfile` and `docker-compose.yml`:

```bash
docker compose up --build
# → http://localhost:4000
```

The compose file mounts the repo into the container, so edits show up on reload without rebuilding.

## 3. GitHub Pages

Push to `main` and GitHub Pages builds and deploys the site. The custom domain is set by the `CNAME` file. This is the slowest feedback loop, so it's best for final checks rather than day-to-day editing.
