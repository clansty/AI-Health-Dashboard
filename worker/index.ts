interface Env {
  ASSETS: Fetcher;
  VPC: Fetcher;
  SUB2API_BASE_URL: string;
  SUB2API_API_KEY: string;
}

const USAGE_ALLOWED_KEYS = new Set([
  'source', 'updated_at',
  'five_hour', 'seven_day', 'seven_day_sonnet',
  'gemini_shared_daily', 'gemini_pro_daily', 'gemini_flash_daily',
  'antigravity_quota', 'subscription_tier',
  'is_forbidden', 'forbidden_reason', 'needs_reauth', 'error',
]);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/stats/models' && request.method === 'GET') {
      return env.VPC.fetch('http://internal-api/stats/models');
    }

    if (url.pathname === '/api/sub2api/accounts' && request.method === 'GET') {
      return handleAccounts(env);
    }

    const usageMatch = url.pathname.match(/^\/api\/sub2api\/accounts\/([^/]+)\/usage$/);
    if (usageMatch && request.method === 'GET') {
      return handleAccountUsage(env, usageMatch[1]);
    }

    return new Response('Not Found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;

async function handleAccounts(env: Env): Promise<Response> {
  const res = await fetch(`${env.SUB2API_BASE_URL}/api/v1/admin/accounts?lite=true&page_size=500`, {
    headers: { 'x-api-key': env.SUB2API_API_KEY },
  });

  if (!res.ok) {
    return Response.json({ error: 'upstream error' }, { status: res.status });
  }

  const upstream = await res.json() as any;
  const items = (upstream.data?.items ?? []).map((a: any) => ({
    id: a.id,
    platform: a.platform,
    status: a.status,
    error_message: a.error_message ?? '',
  }));

  return Response.json({ items });
}

async function handleAccountUsage(env: Env, id: string): Promise<Response> {
  let res = await fetch(`${env.SUB2API_BASE_URL}/api/v1/admin/accounts/${id}/usage?source=passive`, {
    headers: { 'x-api-key': env.SUB2API_API_KEY },
  });

  if (!res.ok) {
    res = await fetch(`${env.SUB2API_BASE_URL}/api/v1/admin/accounts/${id}/usage`, {
      headers: { 'x-api-key': env.SUB2API_API_KEY },
    });
  }

  if (!res.ok) {
    return Response.json({ error: 'upstream error' }, { status: res.status });
  }

  const upstream = await res.json() as any;
  const data = upstream.data ?? upstream;

  const stripped: Record<string, any> = {};
  for (const key of USAGE_ALLOWED_KEYS) {
    if (key in data) {
      stripped[key] = data[key];
    }
  }

  return Response.json(stripped);
}
