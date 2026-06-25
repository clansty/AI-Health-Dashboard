import { defineComponent } from 'vue';
import { useOpenCodeGoQuota } from '@/composables/useOpenCodeGoQuota';
import type { OpenCodeGoWindowKey, OpenCodeGoWindowUsage, OpenCodeGoWorkspaceQuota } from '@/types';
import { barColor, formatRemaining, pctLabel, pctTextColor } from './accountPresentation';

const WINDOW_META: Record<OpenCodeGoWindowKey, { readonly label: string; readonly title: string }> = {
  rolling: { label: '5h', title: 'Rolling' },
  weekly: { label: '周', title: 'Weekly' },
  monthly: { label: '月', title: 'Monthly' },
};

const WINDOW_ORDER: readonly OpenCodeGoWindowKey[] = ['rolling', 'weekly', 'monthly'];

type OpenCodeGoStatusKind = 'available' | 'rateLimited' | 'error' | 'other';
const STATUS_ORDER: Record<OpenCodeGoStatusKind, number> = { available: 0, rateLimited: 1, error: 2, other: 3 };

function resetText(window: OpenCodeGoWindowUsage): string {
  return `${formatRemaining(window.resetInSec)}后重置`;
}

function workspaceWindows(workspace: OpenCodeGoWorkspaceQuota): OpenCodeGoWindowUsage[] {
  const windows: OpenCodeGoWindowUsage[] = [];
  for (const window of WINDOW_ORDER) {
    const usage = workspace[window];
    if (usage) windows.push(usage);
  }
  return windows;
}

function workspaceKind(workspace: OpenCodeGoWorkspaceQuota): OpenCodeGoStatusKind {
  if (!workspace.ok) return 'error';
  const windows = workspaceWindows(workspace);
  if (windows.length === 0) return 'other';
  return windows.some((window) => window.percentRemaining <= 0) ? 'rateLimited' : 'available';
}

function rateLimitResetTimeForSort(workspace: OpenCodeGoWorkspaceQuota): number | null {
  if (workspaceKind(workspace) !== 'rateLimited') return null;
  const resetTimes = workspaceWindows(workspace)
    .filter((window) => window.percentRemaining <= 0 && window.resetInSec > 0)
    .map((window) => window.resetInSec);
  if (resetTimes.length === 0) return null;
  return Math.min(...resetTimes);
}

function sortWorkspaces(workspaces: readonly OpenCodeGoWorkspaceQuota[]): OpenCodeGoWorkspaceQuota[] {
  return [...workspaces].sort((a, b) => {
    const ak = workspaceKind(a);
    const bk = workspaceKind(b);
    const ao = STATUS_ORDER[ak];
    const bo = STATUS_ORDER[bk];
    if (ao !== bo) return ao - bo;
    if (ak === 'rateLimited' && bk === 'rateLimited') {
      const ar = rateLimitResetTimeForSort(a);
      const br = rateLimitResetTimeForSort(b);
      if (ar != null && br != null && ar !== br) return ar - br;
    }
    return a.label.localeCompare(b.label);
  });
}

function avgUsage(workspaces: readonly OpenCodeGoWorkspaceQuota[], window: OpenCodeGoWindowKey): number | null {
  const values: number[] = [];
  for (const workspace of workspaces) {
    const usage = workspace[window];
    if (workspace.ok && usage) values.push(usage.usagePercent);
  }
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function avgText(value: number | null): string {
  return value == null ? '—' : `${Math.round(value)}%`;
}

function avgColor(value: number | null): string {
  return value == null ? 'text-zinc-600' : pctTextColor(value);
}

function countByKind(workspaces: readonly OpenCodeGoWorkspaceQuota[]): Record<OpenCodeGoStatusKind, number> {
  const counts: Record<OpenCodeGoStatusKind, number> = { available: 0, rateLimited: 0, error: 0, other: 0 };
  for (const workspace of workspaces) {
    counts[workspaceKind(workspace)] += 1;
  }
  return counts;
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

function SummaryCard(props: { workspaces: readonly OpenCodeGoWorkspaceQuota[] }) {
  const counts = countByKind(props.workspaces);
  const total = props.workspaces.length;
  const rollingAvg = avgUsage(props.workspaces, 'rolling');
  const monthlyAvg = avgUsage(props.workspaces, 'monthly');
  return (
    <div class="rounded-xl bg-white/[0.03] ring-1 ring-white/10 p-4">
      <div class="flex items-center gap-2 mb-3">
        <span class="w-1.5 h-5 rounded-full bg-gradient-to-b from-zinc-400 to-zinc-600" />
        <div class="i-simple-icons:opencode text-lg text-zinc-300" />
        <span class="text-base font-semibold text-zinc-100">OpenCode Go</span>
        <span class="text-xs text-zinc-500 ml-auto">共 {total}</span>
      </div>
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm mb-3">
        <StatPill label="可用" value={counts.available} tone="bg-emerald-500" />
        <StatPill label="限流" value={counts.rateLimited} tone="bg-amber-400" />
        <StatPill label="错误" value={counts.error} tone="bg-rose-500" />
        <StatPill label="其他" value={counts.other} tone="bg-zinc-500" />
      </div>
      <div class="flex items-center gap-3 pt-3 border-t border-white/5">
        <div class="flex-1">
          <div class="text-[11px] text-zinc-500 mb-1">5h 平均用量</div>
          <div class={`text-lg font-bold tabular-nums ${avgColor(rollingAvg)}`}>{avgText(rollingAvg)}</div>
        </div>
        <div class="flex-1">
          <div class="text-[11px] text-zinc-500 mb-1">月平均用量</div>
          <div class={`text-lg font-bold tabular-nums ${avgColor(monthlyAvg)}`}>{avgText(monthlyAvg)}</div>
        </div>
      </div>
    </div>
  );
}

function UsageWindowRow(props: { window: OpenCodeGoWindowUsage | null; windowKey: OpenCodeGoWindowKey }) {
  const meta = WINDOW_META[props.windowKey];
  const w = props.window;
  return (
    <div class="flex items-center gap-2 min-w-0">
      <span class="text-[11px] text-zinc-500 w-7 shrink-0">{meta.label}</span>
      {w ? (
        <>
          <div class="h-1.5 bg-zinc-700/60 rounded-full flex-1 min-w-12 max-w-40 inline-block overflow-hidden" title={meta.title}>
            <div class={`h-full rounded-full transition-all duration-500 ${barColor(w.usagePercent)}`} style={{ width: `${Math.min(100, w.usagePercent)}%` }} />
          </div>
          <span class={`text-xs tabular-nums font-medium w-10 shrink-0 ${pctTextColor(w.usagePercent)}`}>{pctLabel(w.usagePercent)}</span>
          <span class="text-[11px] text-zinc-500 shrink-0 whitespace-nowrap">{resetText(w)}</span>
        </>
      ) : (
        <span class="text-zinc-600 text-xs">—</span>
      )}
    </div>
  );
}

function rateLimitDetail(workspace: OpenCodeGoWorkspaceQuota): string | undefined {
  const resetInSec = rateLimitResetTimeForSort(workspace);
  return resetInSec == null ? undefined : `${formatRemaining(resetInSec)}后恢复`;
}

function statusTone(workspace: OpenCodeGoWorkspaceQuota): { readonly dot: string; readonly pill: string; readonly label: string; readonly detail?: string | undefined } {
  const kind = workspaceKind(workspace);
  if (kind === 'error') return { dot: 'bg-rose-500', pill: 'bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/20', label: '错误' };
  if (kind === 'rateLimited') {
    return { dot: 'bg-amber-400', pill: 'bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/20', label: '限流中', detail: rateLimitDetail(workspace) };
  }
  if (kind === 'other') return { dot: 'bg-zinc-500', pill: 'bg-zinc-500/10 text-zinc-400 ring-1 ring-zinc-500/20', label: '其他' };
  return { dot: 'bg-emerald-500', pill: 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20', label: '正常' };
}

function WorkspaceCard(props: { workspace: OpenCodeGoWorkspaceQuota }) {
  const tone = statusTone(props.workspace);
  return (
    <div class="rounded-lg ring-1 ring-white/10 bg-white/[0.02] px-3 py-2.5">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-xs text-zinc-500 shrink-0">{props.workspace.label}</span>
        <span class={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap ${tone.pill}`} title={props.workspace.error ?? undefined}>
          <span class={`w-1.5 h-1.5 rounded-full shrink-0 ${tone.dot}`} />
          <span>{tone.label}</span>
          {tone.detail && <span class="opacity-70 font-normal">· {tone.detail}</span>}
        </span>
      </div>

      <div class="mt-2 flex flex-col gap-1.5">
        {props.workspace.ok ? (
          WINDOW_ORDER.map((window) => (
            <UsageWindowRow key={window} window={props.workspace[window]} windowKey={window} />
          ))
        ) : (
          <span class="text-xs text-rose-400">{props.workspace.error}</span>
        )}
      </div>
    </div>
  );
}

export default defineComponent({
  setup() {
    return useOpenCodeGoQuota();
  },
  render() {
    return (
      <div class="flex flex-col gap-3">
        <SummaryCard workspaces={this.workspaces} />
        {this.loading && (
          <div class="flex items-center justify-center py-12 rounded-xl bg-white/[0.03] ring-1 ring-white/10">
            <div class="w-8 h-8 border-3 border-zinc-700 border-t-emerald-400 rounded-full animate-spin" />
          </div>
        )}

        {!this.loading && this.error && (
          <div class="text-amber-300 text-sm py-4 px-4 rounded-lg bg-amber-400/5 ring-1 ring-amber-400/15">{this.error}</div>
        )}

        {!this.loading && !this.error && this.workspaces.length === 0 && (
          <div class="text-zinc-500 text-sm py-4 px-4 rounded-lg bg-white/[0.02] ring-1 ring-white/10">未配置 Workspace</div>
        )}

        {!this.loading && this.workspaces.length > 0 && (
          <div class="flex flex-col gap-2">
            {sortWorkspaces(this.workspaces).map((workspace, index) => <WorkspaceCard key={`${workspace.label}-${index}`} workspace={workspace} />)}
          </div>
        )}
      </div>
    );
  },
});
