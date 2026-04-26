import { defineComponent, type PropType } from 'vue';
import type { AggregatedBar } from '@/types';

function formatTime(ts: number): string {
  const d = new Date(ts * 1000);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default defineComponent({
  props: {
    bars: {
      type: Array as PropType<AggregatedBar[]>,
      required: true,
    },
  },
  render() {
    return (
      <div class="flex items-end gap-px rounded overflow-hidden">
        {this.bars.map((bar, i) => (
          <div class="group relative cursor-default" key={i}>
            <div
              class={`w-[3px] h-5 rounded-sm ${
                bar.available ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <div
              class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5
                     whitespace-nowrap rounded bg-zinc-700 px-2 py-1 text-xs text-zinc-200
                     opacity-0 group-hover:opacity-100 transition-opacity duration-150
                     shadow-lg z-50"
            >
              <div>{formatTime(bar.timestampStart)} – {formatTime(bar.timestampEnd)}</div>
              <div class={bar.available ? 'text-green-400' : 'text-red-400'}>
                {bar.available ? '正常' : '不可用'}
              </div>
              <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-700" />
            </div>
          </div>
        ))}
      </div>
    );
  },
});
