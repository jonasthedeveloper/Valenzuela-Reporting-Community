#!/usr/bin/env node
/**
 * Build the React frontend and copy the result into backend/public/.
 *
 * Vercel serves `public/**` from the CDN for this project (Root Directory =
 * backend/), so the built site must live inside this folder — Vercel cannot
 * reach ../frontend during its build ("include source files outside of the
 * Root Directory" is not required or used).
 *
 * Run locally whenever frontend code changes:  npm run build:web
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const backendDir = path.resolve(__dirname, '..');
const frontendDir = path.resolve(backendDir, '..', 'frontend');
const distDir = path.join(frontendDir, 'dist');
const publicDir = path.join(backendDir, 'public');

// The API is served from this same deployment. Both vars are forced through
// the environment so they win over any local .env file during the build.
const API_ORIGIN = process.env.VERCEL_PROD_ORIGIN
  || 'https://valenzuela-reporting-community.vercel.app';
const API_URL = process.env.VERCEL_PROD_API_URL || `${API_ORIGIN}/api`;

console.log(`Building frontend with VITE_API_URL=${API_URL}`);
// Run Vite directly through the current Node binary — works on every OS
// without a shell (npm.cmd would need shell:true, which warns on new Node).
const viteBin = path.join(frontendDir, 'node_modules', 'vite', 'bin', 'vite.js');
if (!fs.existsSync(viteBin)) {
  console.error(`Vite is not installed in ${frontendDir} — run npm install there first.`);
  process.exit(1);
}
const build = spawnSync(process.execPath, [viteBin, 'build'], {
  cwd: frontendDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_API_ORIGIN: API_ORIGIN,
    VITE_API_URL: API_URL,
  },
});
if (build.status !== 0) {
  console.error('Frontend build failed — public/ was not touched.');
  process.exit(build.status || 1);
}
if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  console.error(`Build produced no index.html at ${distDir}`);
  process.exit(1);
}

fs.rmSync(publicDir, { recursive: true, force: true });
fs.cpSync(distDir, publicDir, { recursive: true });
console.log(`Copied ${distDir} -> ${publicDir}`);
