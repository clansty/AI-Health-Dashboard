import type { AccountWithUsage, Sub2ApiAccount, Sub2ApiUsage, UsageWindow } from '@/types';

export function formatRemaining(seconds: number): string {
  if (seconds <= 0) return '现在';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function remainingFromIso(iso: string | null): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return (t - Date.now()) / 1000;
}

export function windowReset(w: UsageWindow): string {
  const sec = w.resets_at ? remainingFromIso(w.resets_at) : w.remaining_seconds;
  return formatRemaining(Math.max(0, sec));
}

export function formatLastUsed(iso: string | null): string {
  if (!iso) return '从未使用';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const diffSec = (Date.now() - t) / 1000;
  if (diffSec < 60) return '刚刚';
  return `${formatRemaining(diffSec)}前`;
}

export function absoluteTime(iso: string | null): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d.toLocaleString();
}

function isFuture(iso: string | null): boolean {
  return remainingFromIso(iso) > 0;
}

export function compactNumber(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(Math.round(n));
}

function money(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

export function barColor(u: number): string {
  if (u >= 100) return 'bg-rose-500';
  if (u >= 80) return 'bg-amber-400';
  return 'bg-emerald-500';
}

export function pctTextColor(u: number): string {
  if (u >= 100) return 'text-rose-400';
  if (u >= 80) return 'text-amber-300';
  return 'text-zinc-300';
}

export function pctLabel(u: number): string {
  const v = Math.round(u);
  return v > 999 ? '>999%' : `${v}%`;
}

export type StatusKind = 'available' | 'rateLimited' | 'error' | 'other';

export interface StatusView {
  readonly kind: StatusKind;
  readonly dot: string;
  readonly pill: string;
  readonly label: string;
  readonly detail?: string;
  readonly tooltip?: string | undefined;
}

export function computeStatus(a: Sub2ApiAccount): StatusView {
  if (isFuture(a.rate_limit_reset_at)) {
    return {
      kind: 'rateLimited',
      dot: 'bg-amber-400',
      pill: 'bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/20',
      label: '限流中',
      detail: `${formatRemaining(remainingFromIso(a.rate_limit_reset_at))}后恢复`,
    };
  }
  if (isFuture(a.overload_until)) {
    return {
      kind: 'rateLimited',
      dot: 'bg-amber-400',
      pill: 'bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/20',
      label: '过载中',
      detail: `${formatRemaining(remainingFromIso(a.overload_until))}后恢复`,
    };
  }
  if (a.status === 'error') {
    return {
      kind: 'error',
      dot: 'bg-rose-500',
      pill: 'bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/20',
      label: '账号错误',
      tooltip: a.error_message || undefined,
    };
  }
  if (isFuture(a.temp_unschedulable_until)) {
    return {
      kind: 'other',
      dot: 'bg-zinc-400',
      pill: 'bg-zinc-400/10 text-zinc-300 ring-1 ring-zinc-400/20',
      label: '临时不可调度',
      detail: `${formatRemaining(remainingFromIso(a.temp_unschedulable_until))}后恢复`,
      tooltip: a.temp_unschedulable_reason || undefined,
    };
  }
  if (a.status === 'disabled') {
    return { kind: 'other', dot: 'bg-zinc-500', pill: 'bg-zinc-500/10 text-zinc-400 ring-1 ring-zinc-500/20', label: '停用' };
  }
  if (!a.schedulable) {
    return { kind: 'other', dot: 'bg-zinc-500', pill: 'bg-zinc-500/10 text-zinc-400 ring-1 ring-zinc-500/20', label: '暂停' };
  }
  return { kind: 'available', dot: 'bg-emerald-500', pill: 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20', label: '正常' };
}

export interface UsageErrorView {
  readonly cls: string;
  readonly label: string;
  readonly tooltip?: string | undefined;
}

export function computeUsageError(u: Sub2ApiUsage): UsageErrorView | null {
  if (u.is_forbidden) {
    if (u.forbidden_type === 'validation') return { cls: 'bg-amber-400/15 text-amber-300', label: '需要验证', tooltip: u.forbidden_reason || undefined };
    if (u.forbidden_type === 'violation') return { cls: 'bg-rose-500/15 text-rose-300', label: '违规封禁', tooltip: u.forbidden_reason || undefined };
    return { cls: 'bg-rose-500/15 text-rose-300', label: '已封禁', tooltip: u.forbidden_reason || undefined };
  }
  if (u.needs_reauth) return { cls: 'bg-orange-500/15 text-orange-300', label: '需要重新授权' };
  if (u.error) {
    if (u.error_code === 'rate_limited') return { cls: 'bg-amber-400/15 text-amber-300', label: '限流中', tooltip: u.error || undefined };
    return { cls: 'bg-amber-400/15 text-amber-300', label: '获取失败', tooltip: u.error || undefined };
  }
  return null;
}

const CAP_RED = 'bg-rose-500/15 text-rose-300';
const CAP_ORANGE = 'bg-orange-500/15 text-orange-300';
const CAP_YELLOW = 'bg-amber-400/15 text-amber-300';
const CAP_GREEN = 'bg-emerald-500/15 text-emerald-300';
const CAP_GRAY = 'bg-zinc-500/15 text-zinc-400';

export interface CapBadge {
  readonly label: string;
  readonly value: string;
  readonly cls: string;
  readonly tooltip?: string | undefined;
}

function isAnthropicOAuth(a: Sub2ApiAccount): boolean {
  return a.platform === 'anthropic' && (a.type === 'oauth' || a.type === 'setup-token');
}

function quotaBadge(label: string, used: number, limit: number): CapBadge {
  const ratio = limit > 0 ? used / limit : 0;
  let cls = CAP_GREEN;
  if (ratio >= 1) cls = CAP_RED;
  else if (ratio >= 0.8) cls = CAP_YELLOW;
  return { label, value: `$${money(used)}/$${money(limit)}`, cls };
}

export function computeCapacity(a: Sub2ApiAccount): CapBadge[] {
  const badges: CapBadge[] = [];
  if (a.concurrency > 0) {
    const cur = a.current_concurrency || 0;
    let cls = CAP_GRAY;
    if (cur >= a.concurrency) cls = CAP_RED;
    else if (cur > 0) cls = CAP_YELLOW;
    badges.push({ label: '并发', value: `${cur}/${a.concurrency}`, cls });
  }
  const anth = isAnthropicOAuth(a);
  if (anth && a.window_cost_limit != null && a.window_cost_limit > 0) {
    const cur = a.current_window_cost ?? 0;
    const limit = a.window_cost_limit;
    const reserve = a.window_cost_sticky_reserve ?? 10;
    let cls = CAP_GREEN;
    if (cur >= limit + reserve) cls = CAP_RED;
    else if (cur >= limit) cls = CAP_ORANGE;
    else if (cur >= limit * 0.8) cls = CAP_YELLOW;
    badges.push({ label: '5h费用', value: `$${money(cur)}/$${money(limit)}`, cls });
  }
  if (anth && a.max_sessions != null && a.max_sessions > 0) {
    const cur = a.active_sessions ?? 0;
    const max = a.max_sessions;
    let cls = CAP_GREEN;
    if (cur >= max) cls = CAP_RED;
    else if (cur >= max * 0.8) cls = CAP_YELLOW;
    badges.push({ label: '会话', value: `${cur}/${max}`, cls });
  }
  if (anth && a.base_rpm != null && a.base_rpm > 0) {
    const cur = a.current_rpm ?? 0;
    const base = a.base_rpm;
    const strategy = a.rpm_strategy || 'tiered';
    const buffer = a.rpm_sticky_buffer ?? Math.max(1, Math.floor(base / 5));
    let cls = CAP_GREEN;
    if (strategy === 'tiered') {
      if (cur >= base + buffer) cls = CAP_RED;
      else if (cur >= base) cls = CAP_ORANGE;
      else if (cur >= base * 0.8) cls = CAP_YELLOW;
    } else {
      if (cur >= base) cls = CAP_ORANGE;
      else if (cur >= base * 0.8) cls = CAP_YELLOW;
    }
    const tag = strategy === 'sticky_exempt' ? '[S]' : '[T]';
    badges.push({ label: 'RPM', value: `${cur}/${base}${tag}`, cls });
  }
  if (a.type === 'apikey' || a.type === 'bedrock') {
    if (a.quota_daily_limit != null && a.quota_daily_limit > 0) badges.push(quotaBadge('日额', a.quota_daily_used ?? 0, a.quota_daily_limit));
    if (a.quota_weekly_limit != null && a.quota_weekly_limit > 0) badges.push(quotaBadge('周额', a.quota_weekly_used ?? 0, a.quota_weekly_limit));
    if (a.quota_limit != null && a.quota_limit > 0) badges.push(quotaBadge('总额', a.quota_used ?? 0, a.quota_limit));
  }
  return badges;
}

export interface PlatformStats {
  readonly available: number;
  readonly rateLimited: number;
  readonly error: number;
  readonly other: number;
  readonly avg5h: number | null;
  readonly avg7d: number | null;
}

export function computeStats(list: readonly AccountWithUsage[]): PlatformStats {
  let available = 0, rateLimited = 0, error = 0, other = 0;
  const fives: number[] = [];
  const sevens: number[] = [];
  for (const item of list) {
    const st = computeStatus(item.account);
    if (st.kind === 'available') available++;
    else if (st.kind === 'rateLimited') rateLimited++;
    else if (st.kind === 'error') error++;
    else other++;
    if ((st.kind === 'available' || st.kind === 'rateLimited') && item.usage) {
      if (item.usage.five_hour) fives.push(item.usage.five_hour.utilization);
      if (item.usage.seven_day) sevens.push(item.usage.seven_day.utilization);
    }
  }
  const mean = (xs: readonly number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  return { available, rateLimited, error, other, avg5h: mean(fives), avg7d: mean(sevens) };
}

const STATUS_ORDER: Record<StatusKind, number> = { available: 0, rateLimited: 1, error: 2, other: 3 };

function rateLimitResetTimeForSort(a: Sub2ApiAccount, now: number): number | null {
  if (!a.rate_limit_reset_at) return null;
  const resetAt = new Date(a.rate_limit_reset_at).getTime();
  if (Number.isNaN(resetAt) || resetAt <= now) return null;
  return resetAt;
}

export function sortByStatus(list: readonly AccountWithUsage[]): AccountWithUsage[] {
  const now = Date.now();
  return [...list].sort((a, b) => {
    const sa = computeStatus(a.account);
    const sb = computeStatus(b.account);
    const oa = STATUS_ORDER[sa.kind];
    const ob = STATUS_ORDER[sb.kind];
    if (oa !== ob) return oa - ob;
    if (sa.label === '限流中' && sb.label === '限流中') {
      const ra = rateLimitResetTimeForSort(a.account, now);
      const rb = rateLimitResetTimeForSort(b.account, now);
      if (ra != null && rb != null && ra !== rb) return ra - rb;
    }
    return a.account.id - b.account.id;
  });
}
