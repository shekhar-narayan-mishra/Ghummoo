// Test-only records for e2e journeys. Connects straight to the temporary embedded database that
// e2e/start-app.js starts on a fixed port, and reuses the server's models and fixture code.
// Never points at a developer or production database: the URI is always the local e2e instance.
const path = require('path');

const serverDir = path.join(__dirname, '..', 'server');
// The server's own mongoose, so its models (loaded below) are registered on this connection.
const mongoose = require(require.resolve('mongoose', { paths: [serverDir] }));
const { createCompletedTrip, removeCompletedTrip } = require('../server/test/fixtures/completedTrip');

const E2E_DB_URI = `mongodb://127.0.0.1:${process.env.E2E_DB_PORT || '5197'}/ghumo`;

async function connectFixtures() {
  if (mongoose.connection.readyState !== 1) await mongoose.connect(E2E_DB_URI, { serverSelectionTimeoutMS: 10000 });
}

async function disconnectFixtures() {
  await mongoose.disconnect();
}

module.exports = { connectFixtures, disconnectFixtures, createCompletedTrip, removeCompletedTrip };
