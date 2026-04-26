import { defineComponent } from 'vue';
import { useAccounts } from '@/composables/useAccounts';
import type { UsageWindow, AntigravityQuotaEntry } from '@/types';

function formatRemaining(seconds: number): string {
  if (seconds <= 0) return '即将恢复';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h 后恢复`;
  if (h > 0) return `${h}h ${m}m 后恢复`;
  return `${m}m 后恢复`;
}

function formatResetsAt(resetsAt: string): string {
  const diff = (new Date(resetsAt).getTime() - Date.now()) / 1000;
  return formatRemaining(Math.max(0, diff));
}

function barColor(utilization: number): string {
  if (utilization >= 80) return 'bg-red-500';
  if (utilization >= 60) return 'bg-yellow-500';
  return 'bg-green-500';
}

const platformStyle: Record<string, { cls: string; label: string }> = {
  anthropic: { cls: 'bg-orange-500/20 text-orange-400', label: 'Anthropic' },
  openai:    { cls: 'bg-green-500/20 text-green-400', label: 'OpenAI' },
  gemini:    { cls: 'bg-blue-500/20 text-blue-400', label: 'Gemini' },
  antigravity: { cls: 'bg-purple-500/20 text-purple-400', label: 'Antigravity' },
};

function UsageBar(props: { window: UsageWindow | null }) {
  if (!props.window) return <span class="text-zinc-600">—</span>;
  const pct = Math.min(100, Math.round(props.window.utilization));
  const remaining = formatRemaining(props.window.remaining_seconds);
  return (
    <div class="flex flex-col gap-1">
      <div class="flex items-center gap-2">
        <div class="h-2 bg-zinc-700 rounded-full w-32 inline-block overflow-hidden">
          <div
            class={`h-full rounded-full transition-all duration-500 ${barColor(pct)}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span class="text-zinc-300 text-xs tabular-nums">{pct}%</span>
      </div>
      <span class="text-xs text-zinc-500">{remaining}</span>
    </div>
  );
}

export default defineComponent({
  setup() {
    return useAccounts();
  },
  render() {
    return (
      <div>
        <h2 class="text-xl font-semibold mb-4 text-zinc-100">账号状态</h2>

        {this.error && (
          <div class="text-red-400 text-sm py-4">{this.error}</div>
        )}

        {this.loading && (
          <div class="flex items-center justify-center py-12">
            <div class="w-8 h-8 border-3 border-zinc-600 border-t-green-400 rounded-full animate-spin" />
          </div>
        )}

        {!this.loading && !this.error && (
          <div class="w-full overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-zinc-400 border-b border-zinc-700">
                  <th class="px-3 py-2 font-medium">ID</th>
                  <th class="px-3 py-2 font-medium">类型</th>
                  <th class="px-3 py-2 font-medium">状态</th>
                  <th class="px-3 py-2 font-medium">5h 用量</th>
                  <th class="px-3 py-2 font-medium">7d 用量</th>
                </tr>
              </thead>
              <tbody>
                {this.accounts.map((item) => {
                  const { account, usage, loading: itemLoading, error: itemError } = item;
                  const style = platformStyle[account.platform]
                    ?? { cls: 'bg-zinc-500/20 text-zinc-400', label: account.platform };

                  const extraWindows: { label: string; window: UsageWindow }[] = [];
                  if (usage?.seven_day_sonnet) extraWindows.push({ label: '7d Sonnet', window: usage.seven_day_sonnet });
                  if (usage?.gemini_shared_daily) extraWindows.push({ label: 'Gemini Shared', window: usage.gemini_shared_daily });
                  if (usage?.gemini_pro_daily) extraWindows.push({ label: 'Gemini Pro', window: usage.gemini_pro_daily });
                  if (usage?.gemini_flash_daily) extraWindows.push({ label: 'Gemini Flash', window: usage.gemini_flash_daily });

                  const antigravityEntries = usage?.antigravity_quota
                    ? Object.entries(usage.antigravity_quota) as [string, AntigravityQuotaEntry][]
                    : [];

                  return (
                    <>
                      <tr class="border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                        <td class="px-3 py-2.5 text-zinc-300 font-mono">{account.id}</td>

                        <td class="px-3 py-2.5">
                          <span class={`text-xs font-medium px-2 py-0.5 rounded-full ${style.cls}`}>
                            {style.label}
                          </span>
                        </td>

                        <td class="px-3 py-2.5">
                          {account.status === 'active' ? (
                            <span class="inline-flex items-center gap-1.5">
                              <span class="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                              <span class="text-zinc-300">正常</span>
                            </span>
                          ) : (
                            <span
                              class="inline-flex items-center gap-1.5"
                              title={account.error_message || undefined}
                            >
                              <span class="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                              <span class="text-red-400">{account.status}</span>
                            </span>
                          )}
                        </td>

                        <td class="px-3 py-2.5">
                          {itemLoading ? (
                            <div class="h-2 bg-zinc-700 rounded-full w-32 animate-pulse" />
                          ) : itemError ? (
                            <span class="text-xs text-red-400">{itemError}</span>
                          ) : (
                            <UsageBar window={usage?.five_hour ?? null} />
                          )}
                        </td>

                        <td class="px-3 py-2.5">
                          {itemLoading ? (
                            <div class="h-2 bg-zinc-700 rounded-full w-32 animate-pulse" />
                          ) : itemError ? (
                            <span class="text-xs text-red-400">{itemError}</span>
                          ) : (
                            <UsageBar window={usage?.seven_day ?? null} />
                          )}
                        </td>
                      </tr>

                      {extraWindows.map((w) => (
                        <tr key={`${account.id}-${w.label}`} class="border-b border-zinc-800/50">
                          <td class="px-3 py-1.5" />
                          <td class="px-3 py-1.5" />
                          <td class="px-3 py-1.5 pl-8">
                            <span class="text-xs text-zinc-500">{w.label}</span>
                          </td>
                          <td class="px-3 py-1.5" />
                          <td class="px-3 py-1.5">
                            <UsageBar window={w.window} />
                          </td>
                        </tr>
                      ))}

                      {antigravityEntries.map(([model, quota]) => (
                        <tr key={`${account.id}-ag-${model}`} class="border-b border-zinc-800/50">
                          <td class="px-3 py-1.5" />
                          <td class="px-3 py-1.5" />
                          <td class="px-3 py-1.5 pl-8">
                            <span class="text-xs text-zinc-500">{model}</span>
                          </td>
                          <td class="px-3 py-1.5">
                            <span class="text-xs text-zinc-400 tabular-nums">
                              {Math.round(quota.utilization)}%
                            </span>
                          </td>
                          <td class="px-3 py-1.5">
                            <span class="text-xs text-zinc-500">{formatResetsAt(quota.reset_time)}</span>
                          </td>
                        </tr>
                      ))}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  },
});
