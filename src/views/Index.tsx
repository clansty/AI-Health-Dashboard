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
      <div class="min-h-screen bg-gradient-to-b from-zinc-800 to-[#1f2024] text-zinc-100">
        <div class="max-w-[1700px] mx-auto px-4 py-8 sm:px-6 sm:py-10">
          <header class="mb-8 flex items-center gap-3">
            <div class="w-2 h-8 rounded-full bg-gradient-to-b from-emerald-400 to-sky-500" />
            <div>
              <h1 class="text-2xl font-bold tracking-tight text-zinc-50">AI 健康面板</h1>
              <p class="text-xs text-zinc-400 mt-0.5">账号与模型可用性实时监控</p>
            </div>
          </header>

          <section class="mb-10">
            <AccountsSection />
          </section>

          <section>
            <h2 class="text-lg font-semibold mb-4 text-zinc-100">模型状态</h2>

            {this.loading && (
              <div class="flex items-center justify-center py-20">
                <div class="w-8 h-8 border-3 border-zinc-600 border-t-emerald-400 rounded-full animate-spin" />
              </div>
            )}

            {this.error && (
              <div class="text-rose-400 text-sm py-4 px-4 rounded-lg bg-rose-500/5 ring-1 ring-rose-500/15">{this.error}</div>
            )}

            {!this.loading && !this.error && (
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {this.models.map((model) => (
                  <ModelCard key={model.name} model={model} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    );
  },
});
