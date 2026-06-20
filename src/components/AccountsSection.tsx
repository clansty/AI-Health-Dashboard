import { defineComponent } from 'vue';
import { useAccounts } from '@/composables/useAccounts';
import type { Sub2ApiAccount, Sub2ApiUsage, UsageWindow, AccountWithUsage } from '@/types';

// ===== 时间格式化 =====

function formatRemaining(seconds: number): string {
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

function windowReset(w: UsageWindow): string {
  const sec = w.resets_at ? remainingFromIso(w.resets_at) : w.remaining_seconds;
  return formatRemaining(Math.max(0, sec));
}

function isFuture(iso: string | null): boolean {
  return remainingFromIso(iso) > 0;
}

function compactNumber(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(Math.round(n));
}

function money(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

// ===== 进度条颜色（与 sub2api 一致：80% 转黄，100% 转红）=====

function barColor(u: number): string {
  if (u >= 100) return 'bg-rose-500';
  if (u >= 80) return 'bg-amber-400';
  return 'bg-emerald-500';
}

function pctTextColor(u: number): string {
  if (u >= 100) return 'text-rose-400';
  if (u >= 80) return 'text-amber-300';
  return 'text-zinc-300';
}

function pctLabel(u: number): string {
  const v = Math.round(u);
  return v > 999 ? '>999%' : `${v}%`;
}

// ===== 账号状态判定（复刻 sub2api AccountStatusIndicator 的优先级）=====

type StatusKind = 'available' | 'rateLimited' | 'error' | 'other';

interface StatusView {
  kind: StatusKind;
  dot: string;
  pill: string;
  label: string;
  detail?: string;
  tooltip?: string;
}

function computeStatus(a: Sub2ApiAccount): StatusView {
  if (isFuture(a.rate_limit_reset_at)) {
    return {
      kind: 'rateLimited', dot: 'bg-amber-400', pill: 'bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/20',
      label: '限流中', detail: `${formatRemaining(remainingFromIso(a.rate_limit_reset_at))}后恢复`,
    };
  }
  if (isFuture(a.overload_until)) {
    return {
      kind: 'rateLimited', dot: 'bg-amber-400', pill: 'bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/20',
      label: '过载中', detail: `${formatRemaining(remainingFromIso(a.overload_until))}后恢复`,
    };
  }
  if (a.status === 'error') {
    return {
      kind: 'error', dot: 'bg-rose-500', pill: 'bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/20',
      label: '账号错误', tooltip: a.error_message || undefined,
    };
  }
  if (isFuture(a.temp_unschedulable_until)) {
    return {
      kind: 'other', dot: 'bg-zinc-400', pill: 'bg-zinc-400/10 text-zinc-300 ring-1 ring-zinc-400/20',
      label: '临时不可调度', detail: `${formatRemaining(remainingFromIso(a.temp_unschedulable_until))}后恢复`,
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

// ===== usage 级别错误（403 封禁 / 401 重新授权 / 限流）=====

interface UsageErrorView { cls: string; label: string; tooltip?: string; }

function computeUsageError(u: Sub2ApiUsage): UsageErrorView | null {
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

// ===== 容量徽章（复刻 sub2api AccountCapacityCell）=====

const CAP_RED = 'bg-rose-500/15 text-rose-300';
const CAP_ORANGE = 'bg-orange-500/15 text-orange-300';
const CAP_YELLOW = 'bg-amber-400/15 text-amber-300';
const CAP_GREEN = 'bg-emerald-500/15 text-emerald-300';
const CAP_GRAY = 'bg-zinc-500/15 text-zinc-400';

interface CapBadge { label: string; value: string; cls: string; tooltip?: string; }

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

function computeCapacity(a: Sub2ApiAccount): CapBadge[] {
  const badges: CapBadge[] = [];
  // 并发槽位
  if (a.concurrency > 0) {
    const cur = a.current_concurrency || 0;
    let cls = CAP_GRAY;
    if (cur >= a.concurrency) cls = CAP_RED;
    else if (cur > 0) cls = CAP_YELLOW;
    badges.push({ label: '并发', value: `${cur}/${a.concurrency}`, cls });
  }
  const anth = isAnthropicOAuth(a);
  // 5h 窗口费用
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
  // 会话数
  if (anth && a.max_sessions != null && a.max_sessions > 0) {
    const cur = a.active_sessions ?? 0;
    const max = a.max_sessions;
    let cls = CAP_GREEN;
    if (cur >= max) cls = CAP_RED;
    else if (cur >= max * 0.8) cls = CAP_YELLOW;
    badges.push({ label: '会话', value: `${cur}/${max}`, cls });
  }
  // RPM
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
  // API Key / Bedrock 配额
  if (a.type === 'apikey' || a.type === 'bedrock') {
    if (a.quota_daily_limit != null && a.quota_daily_limit > 0) badges.push(quotaBadge('日额', a.quota_daily_used ?? 0, a.quota_daily_limit));
    if (a.quota_weekly_limit != null && a.quota_weekly_limit > 0) badges.push(quotaBadge('周额', a.quota_weekly_used ?? 0, a.quota_weekly_limit));
    if (a.quota_limit != null && a.quota_limit > 0) badges.push(quotaBadge('总额', a.quota_used ?? 0, a.quota_limit));
  }
  return badges;
}

// ===== 平台汇总统计 =====

interface PlatformStats {
  available: number; rateLimited: number; error: number; other: number;
  avg5h: number | null; avg7d: number | null;
}

function computeStats(list: AccountWithUsage[]): PlatformStats {
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
  const mean = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  return { available, rateLimited, error, other, avg5h: mean(fives), avg7d: mean(sevens) };
}

// 排序权重：正常 → 限流 → 错误 → 其他
const STATUS_ORDER: Record<StatusKind, number> = { available: 0, rateLimited: 1, error: 2, other: 3 };

function sortByStatus(list: AccountWithUsage[]): AccountWithUsage[] {
  return [...list].sort((a, b) => {
    const oa = STATUS_ORDER[computeStatus(a.account).kind];
    const ob = STATUS_ORDER[computeStatus(b.account).kind];
    if (oa !== ob) return oa - ob;
    return a.account.id - b.account.id;
  });
}

// ===== 子组件 =====

function UsageBar(props: { window: UsageWindow | null; label: string }) {
  const w = props.window;
  return (
    <div class="flex items-center gap-2 min-w-0">
      <span class="text-[11px] text-zinc-500 w-7 shrink-0">{props.label}</span>
      {w ? (
        <>
          <div class="h-1.5 bg-zinc-700/60 rounded-full flex-1 min-w-12 max-w-40 inline-block overflow-hidden">
            <div class={`h-full rounded-full transition-all duration-500 ${barColor(w.utilization)}`} style={{ width: `${Math.min(100, w.utilization)}%` }} />
          </div>
          <span class={`text-xs tabular-nums font-medium w-10 shrink-0 ${pctTextColor(w.utilization)}`}>{pctLabel(w.utilization)}</span>
          <span class="text-[11px] text-zinc-500 shrink-0 whitespace-nowrap">{windowReset(w)}后重置</span>
        </>
      ) : (
        <span class="text-zinc-600 text-xs">—</span>
      )}
    </div>
  );
}

function UsageBlock(props: { item: AccountWithUsage }) {
  const { usage, loading, error } = props.item;
  if (loading) {
    return (
      <div class="flex flex-col gap-1.5">
        <div class="h-1.5 bg-zinc-700/50 rounded-full w-40 animate-pulse" />
        <div class="h-1.5 bg-zinc-700/50 rounded-full w-40 animate-pulse" />
      </div>
    );
  }
  if (error && !usage) return <span class="text-xs text-rose-400">{error}</span>;
  const usageError = usage ? computeUsageError(usage) : null;
  if (usageError) {
    return <span class={`text-xs font-medium px-2 py-1 rounded-md ${usageError.cls}`} title={usageError.tooltip}>{usageError.label}</span>;
  }
  const stats = usage?.five_hour?.window_stats;
  return (
    <div class="flex flex-col gap-1.5">
      <UsageBar window={usage?.five_hour ?? null} label="5h" />
      <UsageBar window={usage?.seven_day ?? null} label="7d" />
      {usage?.seven_day_sonnet && <UsageBar window={usage.seven_day_sonnet} label="Son" />}
      {stats && (stats.requests > 0 || stats.tokens > 0) && (
        <div class="flex items-center gap-2 text-[10px] text-zinc-500 tabular-nums pl-9">
          <span>{compactNumber(stats.requests)} req</span>
          <span>{compactNumber(stats.tokens)} tok</span>
          <span title="按账号计费">${stats.cost.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}

function AccountCard(props: { item: AccountWithUsage }) {
  const a = props.item.account;
  const status = computeStatus(a);
  const caps = computeCapacity(a);
  return (
    <div class="rounded-lg ring-1 ring-white/10 bg-white/[0.02] px-3 py-2.5">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="font-mono text-xs text-zinc-500 shrink-0">#{a.id}</span>
        <span class={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap ${status.pill}`} title={status.tooltip}>
          <span class={`w-1.5 h-1.5 rounded-full shrink-0 ${status.dot}`} />
          <span>{status.label}</span>
          {status.detail && <span class="opacity-70 font-normal">· {status.detail}</span>}
        </span>
        {caps.length > 0 && (
          <div class="flex items-center gap-1 flex-wrap ml-auto">
            {caps.map((c) => (
              <span key={c.label} class={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded ${c.cls}`} title={c.tooltip}>
                <span class="opacity-60">{c.label}</span>
                <span class="tabular-nums">{c.value}</span>
              </span>
            ))}
          </div>
        )}
      </div>
      <div class="mt-2">
        <UsageBlock item={props.item} />
      </div>
    </div>
  );
}

function StatPill(props: { label: string; value: number; tone: string }) {
  return (
    <div class="flex items-center gap-1.5">
      <span class={`w-1.5 h-1.5 rounded-full ${props.tone}`} />
      <span class="text-zinc-400">{props.label}</span>
      <span class="text-zinc-100 font-semibold tabular-nums">{props.value}</span>
    </div>
  );
}

const platformMeta: Record<string, { label: string; accent: string; icon?: string }> = {
  anthropic: { label: 'Anthropic', accent: 'from-orange-400 to-amber-500', icon: 'i-logos:claude-icon' },
  openai:    { label: 'OpenAI', accent: 'from-teal-400 to-emerald-500', icon: 'i-bi:openai' },
};

function avgText(v: number | null): string {
  return v == null ? '—' : `${Math.round(v)}%`;
}

function PlatformSummaryCard(props: { platform: string; stats: PlatformStats }) {
  const meta = platformMeta[props.platform] ?? { label: props.platform, accent: 'from-zinc-400 to-zinc-500' };
  const s = props.stats;
  const total = s.available + s.rateLimited + s.error + s.other;
  return (
    <div class="rounded-xl bg-white/[0.03] ring-1 ring-white/10 p-4">
      <div class="flex items-center gap-2 mb-3">
        <span class={`w-1.5 h-5 rounded-full bg-gradient-to-b ${meta.accent}`} />
        {meta.icon && <div class={`${meta.icon} text-lg`} />}
        <span class="text-base font-semibold text-zinc-100">{meta.label}</span>
        <span class="text-xs text-zinc-500 ml-auto">共 {total}</span>
      </div>
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm mb-3">
        <StatPill label="可用" value={s.available} tone="bg-emerald-500" />
        <StatPill label="限流" value={s.rateLimited} tone="bg-amber-400" />
        <StatPill label="错误" value={s.error} tone="bg-rose-500" />
        {s.other > 0 && <StatPill label="其他" value={s.other} tone="bg-zinc-500" />}
      </div>
      <div class="flex items-center gap-3 pt-3 border-t border-white/5">
        <div class="flex-1">
          <div class="text-[11px] text-zinc-500 mb-1">5h 平均用量</div>
          <div class={`text-lg font-bold tabular-nums ${s.avg5h == null ? 'text-zinc-600' : pctTextColor(s.avg5h)}`}>{avgText(s.avg5h)}</div>
        </div>
        <div class="flex-1">
          <div class="text-[11px] text-zinc-500 mb-1">7d 平均用量</div>
          <div class={`text-lg font-bold tabular-nums ${s.avg7d == null ? 'text-zinc-600' : pctTextColor(s.avg7d)}`}>{avgText(s.avg7d)}</div>
        </div>
      </div>
    </div>
  );
}

function PlatformSection(props: { platform: string; list: AccountWithUsage[] }) {
  const meta = platformMeta[props.platform] ?? { label: props.platform, accent: 'from-zinc-400 to-zinc-500' };
  if (!props.list.length) return null;
  const list = sortByStatus(props.list);
  return (
    <div>
      <div class="flex items-center gap-2 mb-2.5">
        {meta.icon && <div class={`${meta.icon} text-base`} />}
        <h3 class="text-sm font-semibold text-zinc-200">{meta.label}</h3>
        <span class="text-xs text-zinc-500">{props.list.length} 个账号</span>
      </div>
      <div class="flex flex-col gap-2">
        {list.map((item) => <AccountCard key={item.account.id} item={item} />)}
      </div>
    </div>
  );
}

export default defineComponent({
  setup() {
    return useAccounts();
  },
  render() {
    const anthropic = this.accounts.filter((a) => a.account.platform === 'anthropic');
    const openai = this.accounts.filter((a) => a.account.platform === 'openai');

    return (
      <div>
        {this.error && (
          <div class="text-rose-400 text-sm py-4 px-4 rounded-lg bg-rose-500/5 ring-1 ring-rose-500/15">{this.error}</div>
        )}

        {this.loading && (
          <div class="flex items-center justify-center py-12">
            <div class="w-8 h-8 border-3 border-zinc-700 border-t-emerald-400 rounded-full animate-spin" />
          </div>
        )}

        {!this.loading && !this.error && (
          <div class="flex flex-col gap-6">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PlatformSummaryCard platform="anthropic" stats={computeStats(anthropic)} />
              <PlatformSummaryCard platform="openai" stats={computeStats(openai)} />
            </div>

            <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
              <PlatformSection platform="anthropic" list={anthropic} />
              <PlatformSection platform="openai" list={openai} />
            </div>
          </div>
        )}
      </div>
    );
  },
});
