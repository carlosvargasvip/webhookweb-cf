interface Env {
  WEBHOOKS: KVNamespace;
}

interface WebhookEntry {
  id: string;
  timestamp: string;
  method: string;
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  payload: unknown;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

export const onRequest: PagesFunction<Env> = async ({ request, params, env }) => {
  const sessionId = params.sessionId as string;

  if (!sessionId) {
    return Response.json(
      { error: 'Session ID required' },
      { status: 400, headers: corsHeaders }
    );
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const kvKey = `session:${sessionId}`;

  // GET = polling for webhooks
  if (request.method === 'GET') {
    const stored = await env.WEBHOOKS.get<WebhookEntry[]>(kvKey, 'json');
    const webhooks = stored || [];

    // Clear after returning
    if (webhooks.length > 0) {
      await env.WEBHOOKS.delete(kvKey);
    }

    return Response.json(
      { success: true, webhooks },
      { headers: corsHeaders }
    );
  }

  // Any other method = receiving a webhook
  try {
    const url = new URL(request.url);
    const contentType = request.headers.get('content-type') || '';
    let payload: unknown;

    const body = await request.text();
    if (body) {
      if (contentType.includes('application/json')) {
        try {
          payload = JSON.parse(body);
        } catch {
          payload = { raw: body };
        }
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const formParams = new URLSearchParams(body);
        payload = Object.fromEntries(formParams);
      } else {
        payload = { raw: body };
      }
    } else {
      payload = { message: 'Empty body received' };
    }

    // Build headers object
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Build query params
    const queryParams: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    const webhookEntry: WebhookEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      method: request.method,
      headers,
      queryParams,
      payload,
    };

    // Append to existing webhooks in KV
    const existing = await env.WEBHOOKS.get<WebhookEntry[]>(kvKey, 'json') || [];
    existing.push(webhookEntry);

    // Keep max 50 webhooks, expire after 1 hour
    const trimmed = existing.slice(-50);
    await env.WEBHOOKS.put(kvKey, JSON.stringify(trimmed), {
      expirationTtl: 3600,
    });

    return Response.json(
      { success: true, message: 'Webhook received', id: webhookEntry.id },
      { headers: corsHeaders }
    );
  } catch (error) {
    return Response.json(
      { error: 'Failed to process webhook: ' + (error as Error).message },
      { status: 500, headers: corsHeaders }
    );
  }
};
