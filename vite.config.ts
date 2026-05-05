import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
      // 使用相对路径，兼容桌面 WebView 加载静态资源
      base: './',
      server: {
        port: 3000,
        strictPort: true,
        host: '0.0.0.0',
        // 避免 Vite 扫描桌面打包输出目录，防止 dep-scan 把 release/ 内的 html 当作入口
        fs: {
          allow: ['.'],
        },
        watch: {
          ignored: ['**/release/**', '**/dist/**', '**/build/**'],
        },
      },
      plugins: [react()],
      // [安全] 不再把任何环境变量编译到前端产物中。
      // Key 完全由运行时的 ApiSettingsModal（localStorage: moke_vision_api_config）注入，
      // 确保打包产物永不含 API Key。
      define: {
        'process.env.API_KEY': 'undefined',
        'process.env.GEMINI_API_KEY': 'undefined',
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      // 显式声明入口，避免 Vite 扫描到 release/ 等桌面打包产物目录
      optimizeDeps: {
        entries: ['index.html', 'index.tsx', 'App.tsx'],
      },
      build: {
        outDir: 'dist',
        // 确保资源文件使用相对路径
        assetsDir: 'assets',
      }
    };
});
