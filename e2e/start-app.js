// Starts the production build of Ghumo for end-to-end tests: a fresh embedded MongoDB in a
// temporary folder (auto-seeded with demo data), the built client served by Express, and the
// AI provider pointed at the local stub (e2e/ai-stub.js). Never touches your dev database.
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const dbPath = fs.mkdtempSync(path.join(os.tmpdir(), 'ghumo-e2e-db-'));
const env = {
  ...process.env,
  NODE_ENV: 'production',
  PORT: process.env.E2E_APP_PORT || '5198',
  MONGODB_URI: '',
  EMBEDDED_DB_PATH: dbPath,
  // A fixed port so e2e/fixtures.js can reach this temporary database to add test-only records.
  EMBEDDED_DB_PORT: process.env.E2E_DB_PORT || '5197',
  JWT_SECRET: 'e2e-only-secret',
  // Production seeding gives the demo admin a random password unless one is set (server/src/seedData.js).
  DEMO_ADMIN_PASSWORD: 'GhumoDemo#2026',
  CLIENT_URL: `http://127.0.0.1:${process.env.E2E_APP_PORT || '5198'}`,
  AI_PROVIDER: 'openai',
  OPENAI_API_KEY: 'e2e-stub-key',
  OPENAI_BASE_URL: `http://127.0.0.1:${process.env.E2E_AI_PORT || '5199'}/v1`,
  AI_MODEL: 'stub-model',
  ANTHROPIC_API_KEY: '',
};
const child = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'src', 'index.js')], { env, stdio: 'inherit' });
const stop = () => { child.kill('SIGTERM'); try { fs.rmSync(dbPath, { recursive: true, force: true }); } catch { /* ignore */ } };
process.on('SIGTERM', () => { stop(); process.exit(0); });
process.on('SIGINT', () => { stop(); process.exit(0); });
child.on('exit', (code) => process.exit(code ?? 0));
