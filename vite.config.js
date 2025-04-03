import { defineConfig } from 'vite'
import { resolve } from 'path'
import fs from 'fs-extra'
import serveStatic from 'serve-static'

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
  // 禁用默认的public目录复制，完全由插件控制
  publicDir: false,
  // 添加解析别名配置，使得无论在开发还是生产环境都能正确找到图片
  resolve: {
    alias: {
      '/images': resolve(__dirname, 'images'),
      '/3dres': resolve(__dirname, '3dres')
    }
  },
  // 使用插件手动复制静态资源目录
  plugins: [
    // 开发环境插件 - 提供静态资源服务
    {
      name: 'serve-static-dirs',
      apply: 'serve',
      configureServer(server) {
        // 为images目录设置静态服务
        server.middlewares.use('/images', serveStatic(resolve(__dirname, 'images'), {
          index: false
        }));
        
        // 为3dres目录设置静态服务
        server.middlewares.use('/3dres', serveStatic(resolve(__dirname, '3dres'), {
          index: false
        }));
      }
    },
    // 构建环境插件 - 复制静态资源到dist
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