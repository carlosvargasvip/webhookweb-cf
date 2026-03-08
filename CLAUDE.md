# CLAUDE.md

## Project Overview

Webhook Tester — a Cloudflare Pages application for testing webhook endpoints. Send POST requests with customizable JSON payloads or receive/inspect incoming webhooks in real-time.

## Architecture

- **Cloudflare Pages** serves static assets from `public/`
- **Pages Functions** (in `functions/`) handle API routes
- **Cloudflare KV** (`WEBHOOKS` namespace) stores received webhooks with 1-hour TTL

### API Routes

- `POST /api/send-webhook` — Proxies a webhook POST to an external URL and returns the response
- `GET /api/receive-webhook/:sessionId` — Polls for received webhooks (clears after fetch)
- `POST|PUT|DELETE /api/receive-webhook/:sessionId` — Receives and stores incoming webhooks

### Static Files (public/)

- `index.html` — Main UI with Send/Receive tabs
- `app.js` — Client-side logic (template variables, polling, clipboard)
- `styles.css` — Styling with purple gradient theme

### Sanitization

Sensitive fields in the payload template are pre-redacted: `stripe_customer_id`, `stripe_charge_id`, `integrations_external_id`.

## Development

```bash
npm install
npm run dev    # Starts local dev server with KV binding
```

## Deployment

```bash
npm run deploy
```

KV namespace must be created first:
```bash
wrangler kv namespace create WEBHOOKS
```
Then update the `id` in `wrangler.toml`.

## Common Tasks

### Add a form field
1. Add input in `public/index.html`
2. Add replacement pattern in `public/app.js` `replaceTemplateVariables()`
3. Update form submit handler values object

### Modify payload template
Edit `payloadTemplate` in `public/app.js`. Keep sensitive data as `"[REDACTED]"`.
