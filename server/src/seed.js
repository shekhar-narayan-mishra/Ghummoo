// Resets the database and loads demo data:  npm run seed [-- --force]
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });
const { connectDB, disconnectDB } = require('./config/db');
const { seed, clearAll } = require('./seedData');
const { runFoundation } = require('./migrations/v0_1');
const { seedTarget } = require('./utils/seedTarget');

async function main() {
  const target = seedTarget(process.env, process.argv.slice(2));
  if (!target.allowed) {
    console.error(`${target.reason} Target: ${target.label}. Re-run with --force if you are sure.`);
    process.exit(1);
  }
  console.log(`About to wipe and reseed: ${target.label}`);
  await connectDB();
  await clearAll();
  await seed();
  await runFoundation({ log: console.log });
  console.log('Demo data loaded. Demo accounts are listed in README.md.');
  await disconnectDB();
  process.exit(0);
}

if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { main };
