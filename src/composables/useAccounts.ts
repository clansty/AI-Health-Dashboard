import { ref, onMounted, onUnmounted } from 'vue';
import type { Sub2ApiAccount, Sub2ApiUsage, AccountWithUsage } from '@/types';

// 只关心 openai / anthropic
const WANTED_PLATFORMS = new Set(['openai', 'anthropic']);

export function useAccounts(intervalMs = 60_000) {
  const accounts = ref<AccountWithUsage[]>([]);
  const loading = ref(true);
  const error = ref<string | null>(null);
  let timer: ReturnType<typeof setInterval> | null = null;

  async function fetchUsage(account: Sub2ApiAccount): Promise<{ usage: Sub2ApiUsage | null; error: string | null }> {
    try {
      const res = await fetch(`/api/sub2api/accounts/${account.id}/usage`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Sub2ApiUsage = await res.json();
      return { usage: data, error: null };
    } catch (e) {
      return { usage: null, error: e instanceof Error ? e.message : String(e) };
    }
  }

  async function fetchAll() {
    try {
      const res = await fetch('/api/sub2api/accounts');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { items: Sub2ApiAccount[] };
      const items = data.items.filter(a => WANTED_PLATFORMS.has(a.platform));

      // 合并旧数据，避免刷新时整屏闪烁
      const prev = new Map(accounts.value.map(x => [x.account.id, x]));
      accounts.value = items.map(a => {
        const old = prev.get(a.id);
        return {
          account: a,
          usage: old?.usage ?? null,
          loading: old ? false : true,
          error: old?.error ?? null,
        };
      });
      error.value = null;
      loading.value = false;

      // 逐个拉取用量：加载完一个就更新一个（增量渲染）
      items.forEach(async (a) => {
        const { usage, error: uErr } = await fetchUsage(a);
        const item = accounts.value.find(x => x.account.id === a.id);
        if (!item) return;
        if (usage) item.usage = usage; // 失败时保留上一次数据
        item.error = uErr;
        item.loading = false;
      });
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      loading.value = false;
    }
  }

  onMounted(() => {
    fetchAll();
    timer = setInterval(fetchAll, intervalMs);
  });

  onUnmounted(() => {
    if (timer) clearInterval(timer);
  });

  return { accounts, loading, error };
}
