import { defineConfig } from 'vite'
import { resolve } from 'path'
import fs from 'fs-extra'

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
  // 设置公共目录，这样开发时也能访问到静态资源
  publicDir: 'images',
  // 添加解析别名配置，使得无论在开发还是生产环境都能正确找到图片
  resolve: {
    alias: {
      '/images': '.',
      '/3dres': '.'
    }
  },
  // 使用插件手动复制静态资源目录
  plugins: [
    {
      name: 'copy-static-dirs',
      apply: 'build',
      closeBundle() {
        // 在构建完成后复制目录到dist
        fs.copySync('images', 'dist/images');
        fs.copySync('3dres', 'dist/3dres');
        console.log('静态资源目录已复制到dist');
      }
    }
  ]
}) 