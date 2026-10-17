# FuTech website

Static site (HTML, CSS, JS, no build step) plus an optional Cloudflare Worker for the AI chat.

## Run locally
    python3 -m http.server 8080      # then open http://localhost:8080

## Files
- index.html, style.css, script.js: the site (edit WHATSAPP_NUMBER, FORMSPREE_URL, NEWSLETTER_URL at the top of script.js)
- chatbot.js, chatbot.css: chat widget (guided mode works without a backend)
- worker/index.js, worker/wrangler.toml: optional AI backend

## Enable AI chat (optional)
    cd worker && npm i -g wrangler && wrangler login
    wrangler secret put ANTHROPIC_API_KEY
    wrangler deploy
Paste the *.workers.dev URL into CHAT.API_URL in chatbot.js and set ALLOWED_ORIGIN in worker/wrangler.toml.

## Publish
Upload everything except /worker to any static host (GitHub Pages, Netlify, Cloudflare Pages).
