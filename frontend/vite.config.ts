import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { viteMockServe } from 'vite-plugin-mock'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const useMock = env.VITE_USE_MOCK !== 'false'

  return {
    plugins: [
      react(),
      viteMockServe({
        mockPath: 'mock',
        enable: command === 'serve' && useMock,
        logger: true,
      }),
    ],
    server: {
      port: 9002,
      proxy: useMock
        ? undefined
        : {
            '/api': {
              target: env.VITE_API_PROXY_TARGET || 'http://localhost:9000',
              changeOrigin: true,
            },
          },
    },
  }
})
