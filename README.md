# Babatope Ajepe - Personal Website & Technical Blog

A professional, elegant Jekyll website showcasing Babatope Ajepe's expertise as a Senior Odoo Specialist and Python Developer. Built with modern web technologies and optimized for GitHub Pages deployment at [babatopeajepe.com](https://babatopeajepe.com).

## 🎯 Overview

This website serves as a comprehensive personal brand hub featuring:

- **Professional Portfolio**: Showcase of Odoo expertise and technical skills
- **Technical Blog**: In-depth articles on Odoo development, API integrations, and best practices
- **Project Case Studies**: Real-world implementations and success stories
- **Contact Platform**: Direct connection for freelance opportunities
- **SEO Optimized**: Fast, search-engine friendly structure

## 🚀 Features

### Design & User Experience
- **Modern Design**: Clean, professional aesthetic with warm color palette
- **Responsive Layout**: Mobile-first approach, works seamlessly on all devices
- **Smooth Animations**: Subtle micro-interactions and transitions
- **Typography**: Optimized readability with serif headings and sans-serif body text

### Technical Implementation
- **Jekyll 4.3**: Static site generator with GitHub Pages compatibility
- **SCSS Styling**: Modular CSS architecture with custom variables
- **Semantic HTML5**: Accessible and SEO-friendly markup
- **Vanilla JavaScript**: Lightweight, performant interactions
- **SEO Features**: Meta tags, sitemaps, Open Graph, and structured data

### Content Management
- **Blog System**: Categorized posts with reading time estimation
- **Project Portfolio**: Dynamic showcase of technical work
- **Contact Form**: Client-side validation with fallback to email
- **Social Integration**: Links to GitHub, LinkedIn, and Upwork profiles

## 🛠️ Technology Stack

- **Static Site Generator**: Jekyll 4.3.0
- **CSS Preprocessor**: SCSS with modular architecture
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Typography**: Google Fonts (Inter, Fira Code)
- **Hosting**: GitHub Pages
- **Domain**: Custom domain (babatopeajepe.com)

## 📁 Project Structure

```
blog/
├── _config.yml              # Jekyll configuration
├── _layouts/                # Page templates
│   ├── default.html         # Base layout
│   ├── page.html           # Static pages
│   ├── post.html           # Blog posts
│   ├── blog.html           # Blog listing
│   └── project.html       # Project pages
├── _includes/              # Reusable components
├── _sass/                  # SCSS partials
│   ├── _variables.scss     # Color palette & design tokens
│   ├── _base.scss          # Base styles
│   ├── _layout.scss        # Layout components
│   ├── _components.scss    # UI components
│   └── _syntax.scss        # Code highlighting
├── _posts/                 # Blog posts
├── _projects/              # Project showcase items
├── assets/                 # Static assets
│   ├── css/
│   │   └── main.scss       # Main SCSS entry point
│   └── js/
│       └── main.js         # Main JavaScript file
├── index.md                # Homepage
├── about.md                # About page
├── blog.md                 # Blog listing page
├── projects.md             # Projects page
├── contact.md              # Contact page
├── feed.xml                # RSS feed
├── sitemap.xml             # Sitemap
├── robots.txt              # Search engine instructions
└── README.md               # This file
```

## 🎨 Design System

### Color Palette
- **Warm White** (#FAF9F6): Background and subtle elements
- **Light Brown** (#D6C3A3): Accent highlights and borders
- **Medium Brown** (#B89B72): Primary actions and emphasis
- **Dark Brown** (#5D4037): Text and high-contrast elements

### Typography
- **Headings**: Georgia, serif (professional, traditional)
- **Body**: Inter, sans-serif (modern, readable)
- **Code**: Fira Code, monospace (developer-friendly)

### Layout Principles
- **Mobile-First**: Responsive design from 320px to 1200px+
- **Accessibility**: Semantic HTML, ARIA labels, keyboard navigation
- **Performance**: Optimized images, minimal JavaScript, efficient CSS

## 🚀 Deployment Guide

### Local Development

1. **Prerequisites**
   ```bash
   # Install Ruby (3.0+ recommended)
   ruby --version
   
   # Install Bundler
   gem install bundler
   ```

2. **Setup Project**
   ```bash
   # Clone the repository
   git clone <repository-url>
   cd blog
   
   # Install dependencies
   bundle install
   ```

3. **Run Locally**
   ```bash
   # Start development server
   bundle exec jekyll serve
   
   # Or with live reload
   bundle exec jekyll serve --livereload
   
   # Open browser
   # Navigate to http://localhost:4000
   ```

4. **Build for Production**
   ```bash
   # Generate static site
   bundle exec jekyll build
   
   # Generated files in _site/ directory
   ```

### GitHub Pages Deployment

1. **Repository Setup**
   ```bash
   # Ensure repository has GitHub Pages enabled
   # Settings > Pages > Source: Deploy from a branch
   # Select main branch and / (root) folder
   ```

2. **Automatic Deployment**
   - GitHub Pages will automatically build and deploy on push
   - Build logs available in repository settings
   - Custom domain configured through GitHub Pages settings

3. **Custom Domain**
   ```bash
   # Configure CNAME record
   # In DNS settings:
   # CNAME: www.babatopeajepe.com -> babatopeajepe.github.io
   
   # Create CNAME file in repository root
   echo "babatopeajepe.com" > CNAME
   git add CNAME
   git commit -m "Add custom domain"
   git push
   ```

### Environment Variables

Configure site-specific settings in `_config.yml`:

```yaml
# Site settings
title: "Your Name - Professional Title"
description: "Brief description of expertise"
url: "https://yourdomain.com"
baseurl: ""

# Author info
author: "Your Name"
email: "contact@yourdomain.com"
linkedin: "https://linkedin.com/in/yourprofile"
github: "https://github.com/yourprofile"
upwork: "https://upwork.com/freelancers/~yourprofile"
```

## 📝 Content Management

### Adding Blog Posts

1. **Create New Post**
   ```bash
   # Create new post with Jekyll naming convention
   # Format: YYYY-MM-DD-title.md
   touch _posts/2024-01-15-your-post-title.md
   ```

2. **Front Matter Template**
   ```yaml
   ---
   layout: post
   title: "Your Post Title"
   date: 2024-01-15 10:00:00 +0000
   categories: [Category1, Category2]
   tags: [tag1, tag2, tag3]
   reading_time: 5
   excerpt: "Brief description for previews"
   ---
   ```

3. **Writing Tips**
   - Use markdown syntax for formatting
   - Include code blocks with language hints
   - Add appropriate images with alt text
   - Keep posts under 1500 words for optimal engagement

### Adding Projects

1. **Create New Project**
   ```bash
   # Create project file
   touch _projects/project-name.md
   ```

2. **Project Template**
   ```yaml
   ---
   layout: project
   title: "Project Title"
   technologies: [Technology1, Technology2, Technology3]
   demo_url: "https://demo.example.com"
   github_url: "https://github.com/user/repo"
   ---
   
   Project description and challenges...
   ```

## 🔧 Customization Guide

### Modifying Colors

Update color variables in `_sass/_variables.scss`:

```scss
// Color Palette
$warm-white: #FAF9F6;
$light-brown: #D6C3A3;
$medium-brown: #B89B72;
$dark-brown: #5D4037;
```

### Typography Changes

Update font settings in `_sass/_variables.scss`:

```scss
// Typography
$font-family-serif: 'Your Serif Font', serif;
$font-family-sans: 'Your Sans Font', sans-serif;
$font-family-mono: 'Your Mono Font', monospace;
```

### Adding New Sections

1. **Create Page File**
   ```bash
   touch new-section.md
   ```

2. **Add Navigation Item**
   ```html
   <!-- In _layouts/default.html -->
   <li><a href="/new-section/" class="{% if page.url == '/new-section/' %}active{% endif %}">New Section</a></li>
   ```

3. **Add Page Content**
   ```yaml
   ---
   layout: page
   title: "New Section Title"
   ---
   
   Page content goes here...
   ```

## 📊 SEO Optimization

### Meta Tags
- Automatic generation from Jekyll SEO tag plugin
- Custom Open Graph images for social sharing
- Structured data for search engines

### Performance
- Optimized images with lazy loading
- Minimal JavaScript for fast loading
- CSS minification in production builds

### Sitemap & Indexing
- Automatic sitemap generation
- Robots.txt for search engine guidance
- RSS feed for blog subscribers

## 🔒 Security Considerations

### Contact Form
- Client-side validation only (no server-side processing)
- Fallback to direct email contact
- No sensitive data collection

### Dependencies
- Minimal third-party dependencies
- Regular security updates via Bundler
- No database or server-side processing

## 🐛 Troubleshooting

### Common Issues

1. **Build Fails on GitHub Pages**
   ```bash
   # Check Jekyll version compatibility
   bundle exec jekyll --version
   
   # Update dependencies
   bundle update
   
   # Check for syntax errors
   bundle exec jekyll doctor
   ```

2. **Styles Not Loading**
   ```bash
   # Check SCSS compilation
   bundle exec jekyll build --verbose
   
   # Verify asset paths
   # Check _config.yml url and baseurl settings
   ```

3. **Local Server Issues**
   ```bash
   # Clear cache
   bundle exec jekyll clean
   
   # Kill existing processes
   lsof -ti:4000 | xargs kill -9
   
   # Restart server
   bundle exec jekyll serve
   ```

## 📈 Performance Monitoring

### Google Analytics
```yaml
# In _config.yml
google_analytics: UA-XXXXXXXX-X
```

### Core Web Vitals
- LCP (Largest Contentful Paint): Optimized images and CSS
- FID (First Input Delay): Minimal JavaScript
- CLS (Cumulative Layout Shift): Proper image dimensions

## 🔄 Maintenance

### Regular Updates
```bash
# Update Ruby gems
bundle update

# Update Node modules (if applicable)
npm update

# Check for security vulnerabilities
bundle audit
```

### Content Updates
- Review and update project descriptions quarterly
- Add new blog posts monthly
- Update contact information as needed

## 📚 Resources

### Jekyll Documentation
- [Official Jekyll Docs](https://jekyllrb.com/docs/)
- [GitHub Pages Guide](https://docs.github.com/en/pages)

### Design Inspiration
- [Design Systems](https://designsystemsrepo.com/)
- [Color Palettes](https://coolors.co/)
- [Typography Resources](https://www.typography.com/)

### SEO & Performance
- [Google PageSpeed Insights](https://pagespeed.web.dev/)
- [GTmetrix](https://gtmetrix.com/)
- [Schema.org](https://schema.org/)

## 📄 License

This project is licensed under the MIT License. Feel free to use and adapt for your own personal website.

## 🤝 Contributing

While this is a personal website, suggestions and feedback are welcome:

1. Open an issue for bugs or suggestions
2. Submit pull requests for improvements
3. Share feedback on design or functionality

## 📞 Contact

For questions about this website or collaboration opportunities:

- **Email**: {{ site.email }}
- **LinkedIn**: {{ site.linkedin }}
- **GitHub**: {{ site.github }}
- **Upwork**: {{ site.upwork }}

---

**Built with ❤️ by Babatope Ajepe**  
Senior Odoo Specialist & Python Developer