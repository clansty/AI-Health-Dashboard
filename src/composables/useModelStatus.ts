import { ref, onMounted, onUnmounted } from 'vue';
import type { ModelStatusResponse, ModelEntry, AggregatedBar } from '@/types';

const ICON_MAP: [RegExp, string][] = [
  [/claude/i, 'i-logos:claude-icon'],
  [/gpt|^o[134]-|^openai/i, 'i-logos:openai-icon'],
  [/deepseek/i, 'i-logos:deepseek-icon'],
  [/qwen/i, 'i-logos:qwen-icon'],
  [/gemini/i, 'i-vscode-icons:file-type-gemini'],
  [/kimi|moonshot/i, 'i-hugeicons:kimi-ai'],
  [/minimax/i, 'i-simple-icons:minimax'],
  [/grok/i, 'i-logos:grok-icon'],
  [/mimo/i, 'i-simple-icons:xiaomi'],
];

function resolveIcon(name: string): string | undefined {
  for (const [pattern, icon] of ICON_MAP) {
    if (pattern.test(name)) return icon;
  }
}

const TARGET_BARS = 90;

function aggregateHistory(history: { timestamp: number; available: boolean }[]): AggregatedBar[] {
  if (!history.length) return [];

  const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);
  const chunkSize = Math.max(1, Math.ceil(sorted.length / TARGET_BARS));
  const bars: AggregatedBar[] = [];

  for (let i = 0; i < sorted.length; i += chunkSize) {
    const chunk = sorted.slice(i, i + chunkSize);
    bars.push({
      available: chunk.every(p => p.available),
      timestampStart: chunk[0].timestamp,
      timestampEnd: chunk[chunk.length - 1].timestamp,
    });
  }

  return bars;
}

export function useModelStatus(intervalMs = 60_000) {
  const models = ref<ModelEntry[]>([]);
  const loading = ref(true);
  const error = ref<string | null>(null);
  let timer: ReturnType<typeof setInterval> | null = null;

  async function fetchData() {
    try {
      const res = await fetch('/stats/models');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ModelStatusResponse = await res.json();

      models.value = Object.entries(data.models)
        .map(([name, info]) => ({
          name,
          channelCount: info.current_channel_count,
          available: info.available,
          bars: aggregateHistory(info.history),
          icon: resolveIcon(name),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      error.value = null;
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

  return { models, loading, error };
}
