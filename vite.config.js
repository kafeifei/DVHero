import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    minify: 'terser',
    sourcemap: true,
    terserOptions: {
      // 保留关键属性
      mangle: {
        reserved: ['imageSmoothingEnabled']
      },
      compress: {
        // 禁用纯函数优化，防止代码被过度优化
        pure_funcs: []
      }
    },
    rollupOptions: {
      output: {
        // 其他输出选项
      }
    }
  }
}) 