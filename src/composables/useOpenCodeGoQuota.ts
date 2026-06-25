import { onMounted, onUnmounted, ref } from 'vue';
import type { OpenCodeGoQuotaResponse, OpenCodeGoWorkspaceQuota } from '@/types';

export function useOpenCodeGoQuota(intervalMs = 60_000) {
  const workspaces = ref<OpenCodeGoWorkspaceQuota[]>([]);
  const loading = ref(true);
  const error = ref<string | null>(null);
  let timer: ReturnType<typeof setInterval> | null = null;

  async function fetchData() {
    try {
      const res = await fetch('/api/opencode/go/quota');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: OpenCodeGoQuotaResponse = await res.json();
      workspaces.value = [...data.items];
      error.value = data.error;
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      loading.value = false;
    }
  }

  onMounted(() => {
    fetchData();
    timer = setInterval(fetchData, intervalMs);
  });

  onUnmounted(() => {
    if (timer) clearInterval(timer);
  });

  return { workspaces, loading, error };
}
