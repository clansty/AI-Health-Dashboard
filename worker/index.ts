import { handleOpenCodeGoQuota } from './opencodeGo';

interface Env {
  ASSETS: Fetcher;
  VPC: Fetcher;
  SUB2API_BASE_URL: string;
  SUB2API_API_KEY: string;
  OPENCODE_GO_WORKSPACE_ID?: string;
  OPENCODE_GO_WORKSPACE_IDS?: string;
  OPENCODE_GO_WORKSPACES_JSON?: string;
  OPENCODE_GO_AUTH_COOKIE?: string;
  OPENCODE_GO_WINDOWS?: string;
}

const USAGE_ALLOWED_KEYS = new Set([
  'source', 'updated_at',
  'five_hour', 'seven_day', 'seven_day_sonnet',
  'gemini_shared_daily', 'gemini_pro_daily', 'gemini_flash_daily',
  'antigravity_quota', 'subscription_tier',
  'is_forbidden', 'forbidden_reason', 'forbidden_type',
  'needs_reauth', 'needs_verify', 'error', 'error_code',
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

    if (url.pathname === '/api/opencode/go/quota' && request.method === 'GET') {
      return handleOpenCodeGoQuota(env);
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
    type: a.type,
    status: a.status,
    error_message: a.error_message ?? '',
    last_used_at: a.last_used_at ?? null,
    schedulable: a.schedulable ?? true,
    rate_limited_at: a.rate_limited_at ?? null,
    rate_limit_reset_at: a.rate_limit_reset_at ?? null,
    overload_until: a.overload_until ?? null,
    temp_unschedulable_until: a.temp_unschedulable_until ?? null,
    temp_unschedulable_reason: a.temp_unschedulable_reason ?? '',
    // 容量
    concurrency: a.concurrency ?? 0,
    current_concurrency: a.current_concurrency ?? 0,
    window_cost_limit: a.window_cost_limit ?? null,
    current_window_cost: a.current_window_cost ?? null,
    window_cost_sticky_reserve: a.window_cost_sticky_reserve ?? null,
    max_sessions: a.max_sessions ?? null,
    active_sessions: a.active_sessions ?? null,
    session_idle_timeout_minutes: a.session_idle_timeout_minutes ?? null,
    base_rpm: a.base_rpm ?? null,
    current_rpm: a.current_rpm ?? null,
    rpm_strategy: a.rpm_strategy ?? null,
    rpm_sticky_buffer: a.rpm_sticky_buffer ?? null,
    quota_daily_limit: a.quota_daily_limit ?? null,
    quota_daily_used: a.quota_daily_used ?? null,
    quota_weekly_limit: a.quota_weekly_limit ?? null,
    quota_weekly_used: a.quota_weekly_used ?? null,
    quota_limit: a.quota_limit ?? null,
    quota_used: a.quota_used ?? null,
  }));

  return Response.json({ items });
}

async function fetchUsageData(env: Env, id: string, query: string): Promise<Record<string, any> | null> {
  const res = await fetch(`${env.SUB2API_BASE_URL}/api/v1/admin/accounts/${id}/usage${query}`, {
    headers: { 'x-api-key': env.SUB2API_API_KEY },
  });
  if (!res.ok) return null;
  const upstream = await res.json() as any;
  return upstream.data ?? upstream;
}

// 被动采样数据可能为空（账号没跑过流量），此时视为「无数据」需回退实时查询
function isEmptyUsage(d: Record<string, any>): boolean {
  const fh = d.five_hour;
  const hasFive = fh && (fh.utilization > 0 || fh.resets_at);
  const hasOther = d.seven_day || d.seven_day_sonnet || d.gemini_shared_daily ||
    d.gemini_pro_daily || d.gemini_flash_daily ||
    (d.antigravity_quota && Object.keys(d.antigravity_quota).length > 0);
  const hasErr = d.is_forbidden || d.needs_reauth || d.error;
  return !hasFive && !hasOther && !hasErr;
}

async function handleAccountUsage(env: Env, id: string): Promise<Response> {
  // 先取被动采样（便宜，不打上游）；为空时回退实时查询
  let data = await fetchUsageData(env, id, '?source=passive');
  if (!data || isEmptyUsage(data)) {
    const active = await fetchUsageData(env, id, '');
    if (active) data = active;
  }

  if (!data) {
    return Response.json({ error: 'upstream error' }, { status: 502 });
  }

  const stripped: Record<string, any> = {};
  for (const key of USAGE_ALLOWED_KEYS) {
    if (key in data) {
      stripped[key] = data[key];
    }
  }

  return Response.json(stripped);
}
