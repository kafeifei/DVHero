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
  },
  // 直接使用images目录作为静态资源
  publicDir: 'images',
  // 添加解析别名配置，使得无论在开发还是生产环境都能正确找到图片
  resolve: {
    alias: {
      '/images': '.'
    }
  }
}) 