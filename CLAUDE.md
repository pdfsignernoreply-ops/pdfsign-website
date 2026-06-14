# pdfsign.in website — authoring rules

Static site on Cloudflare Pages (advanced mode via `_worker.js`). Deployed by `git push`.

## Blog posts — canonical URL convention (IMPORTANT)

Blog posts live at `blog/<slug>.html` but are **served at the clean URL** `https://pdfsign.in/blog/<slug>` (no `.html`). The `.html` form 301-redirects to the clean form (see `_worker.js`).

Because the clean URL is what Google crawls and indexes, **every self-referencing URL in a blog post must point to the clean URL (no `.html`)**. Getting this wrong triggers Google Search Console's *"Alternative page with proper canonical tag"* error and the page never gets indexed.

When creating or editing a blog post, all THREE of these must use the clean (no-`.html`) URL:

1. `<link rel="canonical" href="https://pdfsign.in/blog/<slug>"/>`
2. `<meta property="og:url" content="https://pdfsign.in/blog/<slug>"/>`
3. JSON-LD `"mainEntityOfPage":{"@type":"WebPage","@id":"https://pdfsign.in/blog/<slug>"}`

Do **not** add `.html` to any of these. Internal links between blog posts should also use clean URLs.

`_worker.js` rewrites all three at the edge as a safety net, but the source must still be correct — never rely on the worker alone.

### Add new posts to the sitemap
After creating a post, add its clean URL to `sitemap.xml` (clean form, no `.html`).

### Quick audit
```bash
# Should output 0 — any blog post self-referencing its own .html is a bug:
cd blog && for f in *.html; do [ "$f" = index.html ] && continue; s="${f%.html}"; \
  c=$(grep -o "pdfsign.in/blog/${s}.html" "$f" | wc -l); [ "$c" -gt 0 ] && echo "$c  $f"; done
```

## Non-blog pages
Non-blog pages (index, privacy, etc.) use the **opposite** convention: their canonical IS the `.html` URL, and the worker 301-redirects clean → `.html`. Don't change this.
