import { defineComponent } from 'vue';
import { useModelStatus } from '@/composables/useModelStatus';
import ModelCard from '@/components/ModelCard';
import AccountsSection from '@/components/AccountsSection';

export default defineComponent({
  setup() {
    return useModelStatus();
  },
  render() {
    return (
      <div class="min-h-screen bg-zinc-900 text-zinc-100 p-6">
        <div class="mb-10">
          <AccountsSection />
        </div>

        <h1 class="text-xl font-semibold mb-4">模型状态</h1>

        {this.loading && (
          <div class="flex items-center justify-center py-20">
            <div class="w-8 h-8 border-3 border-zinc-600 border-t-green-400 rounded-full animate-spin" />
          </div>
        )}

        {this.error && (
          <div class="text-red-400 text-sm py-4">{this.error}</div>
        )}

        {!this.loading && !this.error && (
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {this.models.map((model) => (
              <ModelCard key={model.name} model={model} />
            ))}
          </div>
        )}
      </div>
    );
  },
});
