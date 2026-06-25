import { defineConfig, presetIcons, presetTypography, presetUno } from 'unocss';

export default defineConfig({
  presets: [
    presetUno(),
    presetTypography(),
    presetIcons(),
  ],
  // 动态拼接的图标类名需要 safelist 才能被 UnoCSS 识别
  safelist: [
    'i-logos:qwen-icon',
    'i-logos:claude-icon',
    'i-bi:openai',
    'i-simple-icons:opencode',
    'i-logos:deepseek-icon',
    'i-simple-icons:xiaomi',
    'i-vscode-icons:file-type-gemini',
    'i-hugeicons:kimi-ai',
    'i-simple-icons:minimax',
    'i-bxl:grok',
    'i-mynaui:letter-z-solid',
    'i-simple-icons:ollama',
  ],
});
