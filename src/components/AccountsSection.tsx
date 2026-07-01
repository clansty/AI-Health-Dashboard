import { defineComponent, ref, type PropType } from 'vue';
import { useAccounts } from '@/composables/useAccounts';
import type { AccountWithUsage, UsageWindow } from '@/types';
import OpenCodeGoSection from './OpenCodeGoSection';
import {
  absoluteTime,
  barColor,
  compactNumber,
  computeCapacity,
  computeStats,
  computeStatus,
  computeUsageError,
  formatLastUsed,
  pctLabel,
  pctTextColor,
  sortByStatus,
  windowReset,
  type PlatformStats,
} from './accountPresentation';

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
        <span class="inline-flex items-center gap-1 text-[11px] text-zinc-500 shrink-0 whitespace-nowrap" title={absoluteTime(a.last_used_at)}>
          <span class="i-ph:clock shrink-0" />
          {formatLastUsed(a.last_used_at)}
        </span>
        {caps.length > 0 && (
          <div class="flex items-center gap-1 flex-wrap ml-auto">
            {caps.map((c) => (
              <span key={c.label} class={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap ${c.cls}`} title={c.tooltip}>
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

const CollapsibleErrors = defineComponent({
  props: { list: { type: Array as PropType<AccountWithUsage[]>, required: true } },
  setup(props) {
    const open = ref(false);
    return () => (
      <div class="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => (open.value = !open.value)}
          class="flex items-center gap-2 w-full text-left px-1 py-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <span class={open.value ? 'i-ph:caret-down' : 'i-ph:caret-right'} />
          <span class="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
          <span class="font-medium">账号错误</span>
          <span class="tabular-nums text-zinc-500">{props.list.length}</span>
        </button>
        {open.value && props.list.map((item) => <AccountCard key={item.account.id} item={item} />)}
      </div>
    );
  },
});

function PlatformSection(props: { platform: string; list: AccountWithUsage[] }) {
  const meta = platformMeta[props.platform] ?? { label: props.platform, accent: 'from-zinc-400 to-zinc-500' };
  if (!props.list.length) return null;
  const sorted = sortByStatus(props.list);
  const errors = sorted.filter((item) => computeStatus(item.account).kind === 'error');
  const normal = sorted.filter((item) => computeStatus(item.account).kind !== 'error');
  return (
    <div>
      <div class="flex items-center gap-2 mb-2.5">
        {meta.icon && <div class={`${meta.icon} text-base`} />}
        <h3 class="text-sm font-semibold text-zinc-200">{meta.label}</h3>
        <span class="text-xs text-zinc-500">{props.list.length} 个账号</span>
      </div>
      <div class="flex flex-col gap-2">
        {normal.map((item) => <AccountCard key={item.account.id} item={item} />)}
        {errors.length > 0 && <CollapsibleErrors list={errors} />}
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
              <div class="flex flex-col gap-6">
                <PlatformSection platform="anthropic" list={anthropic} />
                <OpenCodeGoSection />
              </div>
              <PlatformSection platform="openai" list={openai} />
            </div>
          </div>
        )}
      </div>
    );
  },
});
