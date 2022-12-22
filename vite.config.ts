import { defineConfig } from 'vite';
import replace from '@rollup/plugin-replace';
import * as ChildProcess from 'child_process';
import * as path from 'path';

const gitHash = ChildProcess.execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
const dateStr = new Date().toISOString().substring(0, 16).replace('T', ' ');
const version = `${dateStr} ${gitHash}`;

console.log(`Building version: ${version}`);

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      input: '/app/public/scripts.js',
      output: {
        dir: path.join(__dirname, 'app/public/dist'),
        assetFileNames: '[name][extname]',
        entryFileNames: 'bundle.js',
        sanitizeFileName(fileName) {
          return fileName.replace('scripts.css', 'bundle.css');
        },
      },
      plugins: [
        //  Toggle the booleans here to enable / disable Phaser 3 features:
        replace({
          preventAssignment: true,
          __VERSION__: `${version}`,
          'typeof CANVAS_RENDERER': "'true'",
          'typeof WEBGL_RENDERER': "'true'",
          'typeof EXPERIMENTAL': "'true'",
          'typeof PLUGIN_CAMERA3D': "'false'",
          'typeof PLUGIN_FBINSTANT': "'false'",
          'typeof FEATURE_SOUND': "'true'"
        })
      ]
    }
  }
});
