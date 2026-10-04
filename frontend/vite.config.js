import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const publicUrl = (env.VITE_PUBLIC_URL || '').replace(/\/$/, '')
  return {
    plugins: [
      react(),
      {
        // Οι κοινωνικές πλατφόρμες θέλουν απόλυτη διεύθυνση για την εικόνα προεπισκόπησης (og:image).
        name: 'lasca-absolute-og-image',
        transformIndexHtml(html) {
          return publicUrl ? html.replaceAll('content="/og-image.png"', `content="${publicUrl}/og-image.png"`) : html
        },
      },
    ],
    build: {
      // Ποτέ source maps στον server: δεν δείχνουμε τον αρχικό κώδικα σε όποιον ανοίξει τα DevTools.
      sourcemap: false,
      chunkSizeWarningLimit: 1500,
    },
    server: {
      watch: {
        ignored: ['**/backend/**', '**/*.json']
      },
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:5000',
          changeOrigin: true,
        }
      }
    }
  }
})
