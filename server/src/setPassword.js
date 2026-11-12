// Sets a new password for one account, e.g. to secure the seeded demo admin on a deployment.
// Read the password (and the database URI) without echoing them, so they stay out of shell history:
//   read -rs NEW_PASSWORD && export NEW_PASSWORD
//   read -rs MONGODB_URI && export MONGODB_URI
//   npm run set-password --prefix server -- admin@ghumo.demo
//   unset NEW_PASSWORD MONGODB_URI
// The password is hashed by the User model exactly like a normal sign-up. Existing sessions stay
// valid until they expire (JWT_EXPIRES_IN, default 7 days); rotate JWT_SECRET on the host to end
// them immediately.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true });
const { connectDB, disconnectDB } = require('./config/db');
const { User } = require('./models');

// Shows which database will be changed without printing credentials.
const target = (uri) => (uri ? String(uri).replace(/\/\/[^@/]+@/, '//***@') : 'the embedded local database (MONGODB_URI is not set)');

(async () => {
  const email = String(process.argv[2] || '').trim().toLowerCase();
  const password = process.env.NEW_PASSWORD || '';
  if (!email) throw new Error('Usage: NEW_PASSWORD=... npm run set-password --prefix server -- <email>');
  if (password.length < 12) throw new Error('Set NEW_PASSWORD to at least 12 characters.');
  console.log(`Database: ${target(process.env.MONGODB_URI)}`);
  await connectDB();
  const user = await User.findOne({ email });
  if (!user) throw new Error(`No account with the email ${email} in this database. Nothing was changed.`);
  user.passwordHash = password;
  await user.save();
  console.log(`Password updated for ${email}. Sessions already signed in stay valid until they expire; rotate JWT_SECRET on the host to sign everyone out now.`);
  await disconnectDB();
  process.exit(0);
})().catch(async (e) => {
  console.error(e.message);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
