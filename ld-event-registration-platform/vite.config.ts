import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function releaseMetadataPlugin(): Plugin {
  return {
    name: 'release-metadata',
    generateBundle() {
      const { CI_COMMIT_SHA, CI_COMMIT_SHORT_SHA, CI_PIPELINE_CREATED_AT, GIT_COMMIT_SHA } = process.env;
      const sha = CI_COMMIT_SHA ?? GIT_COMMIT_SHA ?? 'local';

      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: `${JSON.stringify({
          sha,
          shortSha: CI_COMMIT_SHORT_SHA ?? sha.slice(0, 8),
          builtAt: CI_PIPELINE_CREATED_AT ?? new Date().toISOString(),
        }, null, 2)}\n`,
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), releaseMetadataPlugin()],
  build: {
    target: 'es2017',
    rollupOptions: {
      output: {
        // Split node_modules into stable vendor chunks so returning users cache
        // Firebase/React across deploys and only re-download changed app code.
        // App code (incl. the lazy-loaded AdminPanel) stays in its own chunks.
        //
        // Firebase is split by SDK so only what first paint needs (app + auth +
        // app-check) is eager. Firestore is reached only via the lazy AdminPanel,
        // and Functions only via a dynamic import at booking submit — giving each
        // its own chunk lets them load on demand instead of riding the eager
        // 'firebase' chunk (which previously pulled ~75 kB of Firestore on first
        // paint and neutered the Functions dynamic-import deferral).
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Markdown ecosystem (react-markdown + remark-gfm + the unified/micromark/
            // mdast/hast tree) is reached ONLY via the lazy EventDescriptionMarkdown
            // dynamic import. Group it into its own chunk so it loads on demand on the
            // event detail view instead of riding an eager vendor chunk on first paint.
            // MUST precede the '/react' rule below (else 'react-markdown' → react-vendor).
            if (/[\\/](react-markdown|remark|micromark|mdast|hast-util|unist|unified|vfile|devlop|character-entities|decode-named-character-reference|property-information|space-separated-tokens|comma-separated-tokens|html-url-attributes|trim-lines|markdown-table|longest-streak|zwitch|ccount|estree-util)/.test(id)) return 'markdown';
            if (id.includes('firestore') || id.includes('webchannel')) return 'firebase-firestore';
            if (id.includes('@firebase/functions') || id.includes('firebase/functions')) return 'firebase-functions';
            if (id.includes('firebase') || id.includes('@firebase')) return 'firebase';
            if (id.includes('/react') || id.includes('/scheduler')) return 'react-vendor';
            if (id.includes('@sentry')) return 'vendor';
            return 'vendor';
          }
        },
      },
    },
  },
});
