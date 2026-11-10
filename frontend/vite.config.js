import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {execFileSync} from 'node:child_process';
let revision=process.env.VERCEL_GIT_COMMIT_SHA;
if(!revision){try{revision=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();}catch{revision='development';}}

const futuresProxy = {
  target:'https://futures.kraken.com',
  changeOrigin:true,
  rewrite:path=>path.replace('/api/futures-candles/','/api/charts/v1/trade/')+'?count=120'
};

export default defineConfig({
  define:{__APP_REVISION__:JSON.stringify(revision)},
  plugins: [react(),{name:'public-build-version',generateBundle(){this.emitFile({type:'asset',fileName:'version.json',source:JSON.stringify({revision})});}}],
  server: {
    port: 5173,
    proxy: {
      '/api/futures-candles': futuresProxy,
      '/api': {
        target: process.env.WASTAKE_PREVIEW_API || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  preview:{proxy:{'/api/futures-candles':futuresProxy,'/api':{target:process.env.WASTAKE_PREVIEW_API||'http://localhost:3001',changeOrigin:true}}},
});
