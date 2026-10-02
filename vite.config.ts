import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { readFileSync } from 'node:fs';

const resolvePath = (relativePath: string) => fileURLToPath(new URL(relativePath, import.meta.url));

/**
 * Content-Security-Policy for the packaged renderer only: the dev server needs inline scripts
 * for React refresh, so the policy is injected at build time. The app makes no network calls
 * at all; `file:` covers the bundled assets and profile photos stored in userData.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self' file:",
  "script-src 'self' file:",
  "style-src 'self' 'unsafe-inline' file:",
  "img-src 'self' file: data: blob:",
  "font-src 'self' file: data:",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function contentSecurityPolicy(): Plugin {
  return {
    name: 'finterest-csp',
    apply: 'build',
    transformIndexHtml: (html) =>
      html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />`),
  };
}

const appVersion = (JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }).version;

export default defineConfig({
  // Shown in the sidebar footer ("Version x.y.z").
  define: { __APP_VERSION__: JSON.stringify(appVersion) },
  plugins: [react(), contentSecurityPolicy()],
  root: '.',
  base: './',
  resolve: {
    alias: {
      '@shared': resolvePath('./src/shared'),
      '@renderer': resolvePath('./src/renderer'),
      '@electron': resolvePath('./src/electron'),
    },
  },
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
  },
});
