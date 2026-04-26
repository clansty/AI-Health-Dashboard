import { ref, onMounted, onUnmounted } from 'vue';
import type { Sub2ApiAccount, Sub2ApiUsage, AccountWithUsage } from '@/types';

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

      accounts.value = data.items.map(a => ({
        account: a,
        usage: null,
        loading: true,
        error: null,
      }));
      error.value = null;
      loading.value = false;

      const usageResults = await Promise.allSettled(
        data.items.map(a => fetchUsage(a))
      );

      accounts.value = data.items.map((a, i) => {
        const result = usageResults[i];
        if (result.status === 'fulfilled') {
          return { account: a, usage: result.value.usage, loading: false, error: result.value.error };
        }
        return { account: a, usage: null, loading: false, error: 'fetch failed' };
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
