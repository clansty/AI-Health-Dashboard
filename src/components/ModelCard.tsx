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
      <div class="bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-2">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2 min-w-0">
            {model.icon && <div class={`${model.icon} text-base shrink-0`} />}
            <span class="text-sm font-medium text-zinc-200 truncate">{model.name}</span>
          </div>
          <span
            class={`text-xs font-medium px-1.5 py-0.5 rounded shrink-0 ml-2 ${
              model.available
                ? 'text-green-400 bg-green-400/10'
                : 'text-red-400 bg-red-400/10'
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
