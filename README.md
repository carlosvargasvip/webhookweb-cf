# Webhook Tester

A webhook testing tool built on Cloudflare Pages. Send test webhooks with customizable JSON payloads or receive and inspect incoming webhooks in real-time.

**Live:** https://webhooktester.pages.dev

## Features

- **Send Webhooks** — POST customizable JSON payloads to any URL and view the full response (body + headers)
- **Receive Webhooks** — Get a unique endpoint URL, send webhooks to it, and inspect payloads, headers, and query params in real-time
- **Payload Preview** — Live preview of the JSON payload as you fill in form fields
- **Copy to Clipboard** — One-click copy for URLs, payloads, headers, and responses

## Tech Stack

- **Cloudflare Pages** — Static asset hosting
- **Cloudflare Pages Functions** — Serverless API endpoints (TypeScript)
- **Cloudflare KV** — Webhook storage with 1-hour TTL

## Project Structure

```
├── public/                          # Static assets
│   ├── index.html                   # Main UI with Send/Receive tabs
│   ├── app.js                       # Client-side logic
│   └── styles.css                   # Styling
├── functions/api/                   # Pages Functions (auto-routed)
│   ├── send-webhook.ts              # POST /api/send-webhook
│   └── receive-webhook/
│       └── [sessionId].ts           # /api/receive-webhook/:sessionId
├── wrangler.toml                    # Cloudflare configuration
└── package.json
```

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/send-webhook` | Proxies a webhook to an external URL, returns response |
| `GET` | `/api/receive-webhook/:sessionId` | Polls for received webhooks (clears after fetch) |
| `POST/PUT/DELETE` | `/api/receive-webhook/:sessionId` | Receives and stores incoming webhooks |

## Development

```bash
npm install
npm run dev
```

This starts a local dev server with KV bindings at `http://localhost:8788`.

## Deployment

```bash
npm run deploy
```

## Setup from Scratch

1. Create a KV namespace:
   ```bash
   wrangler kv namespace create WEBHOOKS
   ```
2. Add the returned `id` to `wrangler.toml`
3. Deploy:
   ```bash
   npm run deploy
   ```
