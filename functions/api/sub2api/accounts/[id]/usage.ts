interface Env {
  SUB2API_BASE_URL: string;
  SUB2API_API_KEY: string;
}

const ALLOWED_KEYS = new Set([
  'source', 'updated_at',
  'five_hour', 'seven_day', 'seven_day_sonnet',
  'gemini_shared_daily', 'gemini_pro_daily', 'gemini_flash_daily',
  'antigravity_quota', 'subscription_tier',
  'is_forbidden', 'forbidden_reason', 'needs_reauth', 'error',
]);

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { SUB2API_BASE_URL, SUB2API_API_KEY } = context.env;
  const id = context.params.id as string;

  const res = await fetch(`${SUB2API_BASE_URL}/api/v1/admin/accounts/${id}/usage?source=passive`, {
    headers: { 'x-api-key': SUB2API_API_KEY },
  });

  if (!res.ok) {
    return new Response(JSON.stringify({ error: 'upstream error' }), {
      status: res.status,
      headers: { 'content-type': 'application/json' },
    });
  }

  const upstream = await res.json() as any;
  const data = upstream.data ?? upstream;

  const stripped: Record<string, any> = {};
  for (const key of ALLOWED_KEYS) {
    if (key in data) {
      stripped[key] = data[key];
    }
  }

  return new Response(JSON.stringify(stripped), {
    headers: { 'content-type': 'application/json' },
  });
};
