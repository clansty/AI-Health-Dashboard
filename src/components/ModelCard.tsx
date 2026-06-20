import { defineComponent, type PropType } from 'vue';
import type { ModelEntry } from '@/types';
import UptimeBar from './UptimeBar';

export default defineComponent({
  props: {
    model: {
      type: Object as PropType<ModelEntry>,
      required: true,
    },
  },
  render() {
    const { model } = this;
    return (
      <div class="bg-zinc-800/40 ring-1 ring-zinc-800 hover:ring-zinc-700 rounded-xl px-3.5 py-3 transition-colors">
        <div class="flex items-center justify-between mb-2.5">
          <div class="flex items-center gap-2 min-w-0">
            {model.icon && <div class={`${model.icon} text-base shrink-0`} />}
            <span class="text-sm font-medium text-zinc-200 truncate">{model.name}</span>
          </div>
          <span
            class={`text-xs font-medium px-1.5 py-0.5 rounded shrink-0 ml-2 ${
              model.available
                ? 'text-emerald-300 bg-emerald-500/10'
                : 'text-rose-300 bg-rose-500/10'
            }`}
          >
            {model.channelCount}
          </span>
        </div>
        <UptimeBar bars={model.bars} />
      </div>
    );
  },
});
