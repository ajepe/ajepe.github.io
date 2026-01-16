FROM jekyll/jekyll:4.2.0

# Set working directory
WORKDIR /srv/jekyll

# Copy all files
COPY . .

# Expose port
EXPOSE 4000

# Default command
CMD ["bundle", "exec", "jekyll", "serve", "--host", "0.0.0.0", "--port", "4000"]