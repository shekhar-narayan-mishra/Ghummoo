// Applies the V0.1 data foundation migration:  npm run migrate  [-- --recount]
// Idempotent and non-destructive (never deletes). See src/migrations/v0_1.js.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });
const { connectDB, disconnectDB } = require('./config/db');
const { runFoundation } = require('./migrations/v0_1');

(async () => {
  await connectDB();
  await runFoundation({ recount: process.argv.includes('--recount'), log: console.log });
  await disconnectDB();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
