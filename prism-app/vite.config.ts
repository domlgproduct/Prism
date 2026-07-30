import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    {
      name: 'html-title-transform',
      transformIndexHtml(html) {
        const title = mode === 'production' ? 'Prism' : 'DEV Prism';
        return html.replace(/<title>(.*?)<\/title>/, `<title>${title}</title>`);
      },
    },
  ],
}))
