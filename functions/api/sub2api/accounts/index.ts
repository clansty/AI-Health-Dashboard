interface Env {
  SUB2API_BASE_URL: string;
  SUB2API_API_KEY: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { SUB2API_BASE_URL, SUB2API_API_KEY } = context.env;

  const res = await fetch(`${SUB2API_BASE_URL}/api/v1/admin/accounts?lite=true&page_size=500`, {
    headers: { 'x-api-key': SUB2API_API_KEY },
  });

  if (!res.ok) {
    return new Response(JSON.stringify({ error: 'upstream error' }), {
      status: res.status,
      headers: { 'content-type': 'application/json' },
    });
  }

  const upstream = await res.json() as any;
  const items = (upstream.data?.items ?? []).map((a: any) => ({
    id: a.id,
    platform: a.platform,
    status: a.status,
    error_message: a.error_message ?? '',
  }));

  return new Response(JSON.stringify({ items }), {
    headers: { 'content-type': 'application/json' },
  });
};
