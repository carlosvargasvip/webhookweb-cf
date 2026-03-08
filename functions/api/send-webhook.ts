interface Env {
  WEBHOOKS: KVNamespace;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { headers: corsHeaders });
};

export const onRequestPost: PagesFunction<Env> = async ({ request }) => {
  try {
    const { webhookUrl, payload } = await request.json<{
      webhookUrl: string;
      payload: unknown;
    }>();

    if (!webhookUrl || !payload) {
      return Response.json(
        { error: 'Missing webhookUrl or payload' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate URL
    try {
      new URL(webhookUrl);
    } catch {
      return Response.json(
        { error: 'Invalid webhook URL' },
        { status: 400, headers: corsHeaders }
      );
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    let responseText = '';
    try {
      responseText = await response.text();
    } catch {
      // ignore
    }

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return Response.json(
      {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        responseHeaders,
        responseBody: responseText,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    return Response.json(
      { success: false, error: (error as Error).message },
      { status: 500, headers: corsHeaders }
    );
  }
};
